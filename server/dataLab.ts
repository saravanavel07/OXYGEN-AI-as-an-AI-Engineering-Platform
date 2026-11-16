import * as XLSX from 'xlsx';
import type { ColumnProfile, DatasetProfile } from '../src/types/oxygen.ts';

export type CleanOperation = 'drop_duplicates' | 'impute_missing' | 'trim_whitespace';

export function parseTabularBuffer(
  fileName: string,
  buffer: Buffer
): Record<string, string | number | boolean | null>[] {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  if (ext === 'csv' || ext === 'tsv') {
    const workbook = XLSX.read(buffer.toString('utf8'), { type: 'string' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
      defval: null,
    });
    return normalizeRows(rows);
  }
  if (ext === 'xlsx' || ext === 'xls') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
      defval: null,
    });
    return normalizeRows(rows);
  }
  throw new Error('Unsupported file format. Upload .csv, .tsv, .xlsx, or .xls.');
}

function normalizeRows(
  rows: Record<string, unknown>[]
): Record<string, string | number | boolean | null>[] {
  return rows.map((row) => {
    const clean: Record<string, string | number | boolean | null> = {};
    for (const [k, v] of Object.entries(row)) {
      const key = String(k).trim();
      if (v === undefined || v === null || v === '') {
        clean[key] = null;
      } else if (typeof v === 'number' || typeof v === 'boolean') {
        clean[key] = v;
      } else {
        const str = String(v).trim();
        if (str === '') {
          clean[key] = null;
        } else if (!Number.isNaN(Number(str)) && str !== '') {
          clean[key] = Number(str);
        } else {
          clean[key] = str;
        }
      }
    }
    return clean;
  });
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  if (den === 0) return 0;
  return Number((num / den).toFixed(3));
}

export function profileDataset(
  id: string,
  name: string,
  rows: Record<string, string | number | boolean | null>[]
): DatasetProfile {
  const rowCount = rows.length;
  const colNames = rowCount > 0 ? Array.from(new Set(rows.flatMap((r) => Object.keys(r)))) : [];
  const columnCount = colNames.length;

  // Duplicate detection
  const seen = new Set<string>();
  let duplicateRowCount = 0;
  for (const r of rows) {
    const sig = JSON.stringify(r);
    if (seen.has(sig)) duplicateRowCount++;
    else seen.add(sig);
  }

  let totalMissingCells = 0;
  const columns: ColumnProfile[] = [];
  const numericCols: string[] = [];

  for (const col of colNames) {
    const values = rows.map((r) => r[col] ?? null);
    const nonNull = values.filter((v) => v !== null && v !== '');
    const missingCount = rowCount - nonNull.length;
    totalMissingCells += missingCount;

    const uniqueSet = new Set(nonNull.map((v) => String(v)));
    const numericVals = nonNull.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    const boolVals = nonNull.filter((v) => typeof v === 'boolean' || v === 'true' || v === 'false');

    let type: ColumnProfile['type'] = 'categorical';
    if (nonNull.length > 0 && numericVals.length / nonNull.length >= 0.85) {
      type = 'numeric';
      numericCols.push(col);
    } else if (nonNull.length > 0 && boolVals.length === nonNull.length) {
      type = 'boolean';
    } else if (
      nonNull.length > 0 &&
      nonNull.every((v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v))
    ) {
      type = 'date';
    }

    // Frequency table for top values
    const freq = new Map<string, number>();
    for (const v of nonNull) {
      const k = String(v);
      freq.set(k, (freq.get(k) ?? 0) + 1);
    }
    const topValues = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([value, count]) => ({ value, count }));

    const profile: ColumnProfile = {
      name: col,
      type,
      nonNullCount: nonNull.length,
      missingCount,
      uniqueCount: uniqueSet.size,
      topValues,
    };

    if (type === 'numeric' && numericVals.length > 0) {
      const sorted = [...numericVals].sort((a, b) => a - b);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const mean = numericVals.reduce((a, b) => a + b, 0) / numericVals.length;
      const median = quantile(sorted, 0.5);
      const q25 = quantile(sorted, 0.25);
      const q75 = quantile(sorted, 0.75);
      const variance =
        numericVals.length > 1
          ? numericVals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (numericVals.length - 1)
          : 0;
      const stdDev = Math.sqrt(variance);
      const iqr = q75 - q25;
      const lowFence = q25 - 1.5 * iqr;
      const highFence = q75 + 1.5 * iqr;
      const outlierCount = numericVals.filter((v) => v < lowFence || v > highFence).length;

      // 8-bin histogram
      const binCount = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(numericVals.length))));
      const span = max - min || 1;
      const step = span / binCount;
      const bins = Array.from({ length: binCount }, (_, i) => ({
        bin: `${(min + i * step).toFixed(1)}`,
        count: 0,
      }));
      for (const v of numericVals) {
        const idx = Math.min(binCount - 1, Math.floor((v - min) / step));
        bins[idx].count++;
      }

      profile.min = Number(min.toFixed(3));
      profile.max = Number(max.toFixed(3));
      profile.mean = Number(mean.toFixed(3));
      profile.median = Number(median.toFixed(3));
      profile.stdDev = Number(stdDev.toFixed(3));
      profile.q25 = Number(q25.toFixed(3));
      profile.q75 = Number(q75.toFixed(3));
      profile.outlierCount = outlierCount;
      profile.histogram = bins;
    }

    columns.push(profile);
  }

  // Correlation matrix for up to first 8 numeric columns
  const corrCols = numericCols.slice(0, 8);
  const matrix: number[][] = corrCols.map((c1) =>
    corrCols.map((c2) => {
      if (c1 === c2) return 1;
      const pairs: Array<[number, number]> = [];
      for (const r of rows) {
        const v1 = r[c1];
        const v2 = r[c2];
        if (typeof v1 === 'number' && typeof v2 === 'number') {
          pairs.push([v1, v2]);
        }
      }
      return pearson(
        pairs.map((p) => p[0]),
        pairs.map((p) => p[1])
      );
    })
  );

  return {
    id,
    name,
    rowCount,
    columnCount,
    duplicateRowCount,
    totalMissingCells,
    columns,
    correlations: {
      numericColumns: corrCols,
      matrix,
    },
    sampleRows: rows.slice(0, 25),
    createdAt: new Date().toISOString(),
  };
}

export function cleanDatasetRows(
  rows: Record<string, string | number | boolean | null>[],
  profile: DatasetProfile,
  operations: CleanOperation[]
): Record<string, string | number | boolean | null>[] {
  let working = rows.map((r) => ({ ...r }));

  if (operations.includes('trim_whitespace')) {
    working = working.map((r) => {
      const next: Record<string, string | number | boolean | null> = {};
      for (const [k, v] of Object.entries(r)) {
        next[k] = typeof v === 'string' ? v.trim() : v;
      }
      return next;
    });
  }

  if (operations.includes('drop_duplicates')) {
    const seen = new Set<string>();
    working = working.filter((r) => {
      const sig = JSON.stringify(r);
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    });
  }

  if (operations.includes('impute_missing')) {
    const fillMap = new Map<string, string | number | boolean>();
    for (const col of profile.columns) {
      if (col.type === 'numeric' && col.median !== undefined) {
        fillMap.set(col.name, col.median);
      } else if (col.topValues.length > 0) {
        fillMap.set(col.name, col.topValues[0].value);
      } else {
        fillMap.set(col.name, 'unknown');
      }
    }
    working = working.map((r) => {
      const next = { ...r };
      for (const [col, fallback] of fillMap.entries()) {
        if (next[col] === null || next[col] === undefined || next[col] === '') {
          next[col] = fallback;
        }
      }
      return next;
    });
  }

  return working;
}

export const SAMPLE_ENGINEERING_CSV = `run_id,model,task_category,prompt_tokens,output_tokens,latency_ms,accuracy_score,status
run_001,gemini-4-hydrogen,code_gen,420,680,392.4,0.94,nominal
run_002,gemini-4-hydrogen,data_analysis,510,540,418.1,0.92,nominal
run_003,gemini-3.1-flash-lite,classification,180,95,112.6,0.89,nominal
run_004,gemini-4-argon,stem_reasoning,840,910,745.2,0.96,nominal
run_005,gemini-4-carbon,security_audit,1120,1340,1190.5,0.98,nominal
run_006,gemini-4-hydrogen,json_schema,310,240,295.0,0.97,nominal
run_007,gemini-3.1-flash-lite,quick_explain,210,160,134.8,0.88,nominal
run_008,gemini-4-hydrogen,agent_route,650,420,468.9,0.95,nominal
run_009,gemini-4-argon,refactoring,790,820,698.4,0.95,nominal
run_001,gemini-4-hydrogen,code_gen,420,680,392.4,0.94,nominal
run_011,gemini-4-carbon,architecture,1350,1490,1310.2,,nominal
run_012,gemini-4-hydrogen,debugging,580,610,442.0,0.93,nominal
`;
