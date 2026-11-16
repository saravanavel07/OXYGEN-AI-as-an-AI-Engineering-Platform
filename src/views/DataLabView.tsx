import React, { useEffect, useState } from 'react';
import { Database, Download, Send, Sparkles, Upload } from 'lucide-react';
import type { DatasetProfile } from '../types/oxygen.ts';
import { MarkdownRenderer } from '../components/MarkdownRenderer.tsx';

interface DataLabViewProps {
  onTelemetryRefresh: () => void;
}

export const DataLabView: React.FC<DataLabViewProps> = ({ onTelemetryRefresh }) => {
  const [datasets, setDatasets] = useState<DatasetProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<DatasetProfile | null>(null);
  const [selectedColName, setSelectedColName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [question, setQuestion] = useState('');
  const [qaAnswer, setQaAnswer] = useState('');
  const [qaLoading, setQaLoading] = useState(false);

  const loadDatasets = async () => {
    const res = await fetch('/api/data/datasets');
    const data = (await res.json()) as { datasets: DatasetProfile[] };
    const list = data.datasets ?? [];
    setDatasets(list);
    if (!activeProfile && list.length > 0) {
      setActiveProfile(list[0]);
      if (list[0].columns.length > 0) {
        setSelectedColName(list[0].columns[0].name);
      }
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  const handleLoadSample = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/data/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useSample: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActiveProfile(data.profile);
      setSelectedColName(data.profile.columns[0]?.name ?? '');
      await loadDatasets();
      onTelemetryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File exceeds 5MB upload limit.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Content = btoa(binary);

      const res = await fetch('/api/data/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, base64Content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActiveProfile(data.profile);
      setSelectedColName(data.profile.columns[0]?.name ?? '');
      await loadDatasets();
      onTelemetryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleClean = async () => {
    if (!activeProfile) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/data/${activeProfile.id}/clean`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operations: ['drop_duplicates', 'impute_missing', 'trim_whitespace'],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActiveProfile(data.profile);
      await loadDatasets();
      onTelemetryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    if (!activeProfile) return;
    const res = await fetch(`/api/data/${activeProfile.id}/export`);
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProfile.name}-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAskData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile || !question.trim() || qaLoading) return;
    setQaLoading(true);
    setQaAnswer('');
    try {
      const res = await fetch(`/api/data/${activeProfile.id}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setQaAnswer(res.ok ? data.text : `**Error**: ${data.error}`);
    } finally {
      setQaLoading(false);
    }
  };

  const selectedCol =
    activeProfile?.columns.find((c) => c.name === selectedColName) ?? activeProfile?.columns[0];

  const maxHistCount = selectedCol?.histogram
    ? Math.max(1, ...selectedCol.histogram.map((h) => h.count))
    : 1;

  return (
    <div className="space-y-6">
      {/* Header & Upload Controls */}
      <div className="rounded-xl border border-white/10 bg-[#101010]/90 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F5F5F5]">Data Intelligence Lab</h1>
          <p className="text-xs text-[#969696] mt-0.5">
            Upload CSV or Excel (.xlsx/.xls) datasets up to 5MB for statistical profiling, correlation heatmaps, cleaning, and Hydrogen NL Q&A.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={handleLoadSample}
            className="rounded-lg border border-white/15 bg-[#171717] px-3.5 py-2 text-xs font-medium text-[#F5F5F5] hover:border-[#E32636] whitespace-nowrap"
          >
            Load Telemetry Sample
          </button>

          <label className="inline-flex items-center gap-2 rounded-lg bg-[#E32636] px-4 py-2 text-xs font-semibold text-[#F5F5F5] hover:bg-[#8F101D] cursor-pointer whitespace-nowrap">
            <Upload className="h-3.5 w-3.5" />
            <span>Upload CSV / Excel</span>
            <input
              type="file"
              accept=".csv,.tsv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-[#E32636]/50 bg-[#E32636]/10 px-4 py-3 text-xs text-[#F5F5F5]">
          {errorMsg}
        </div>
      )}

      {!activeProfile ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-[#171717]/70 p-12 text-center space-y-3">
          <Database className="h-7 w-7 text-[#969696] mx-auto" />
          <div className="text-base font-medium text-[#F5F5F5]">No Dataset Profiled Yet</div>
          <p className="text-xs text-[#969696] max-w-md mx-auto">
            Upload a local CSV/Excel workbook or load the built-in Hydrogen telemetry sample to inspect statistical distributions, correlations, and missing cells.
          </p>
        </div>
      ) : (
        <>
          {/* Dataset Summary Bar + Actions */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="rounded-xl border border-white/10 bg-[#171717]/90 p-4">
              <div className="text-xs text-[#969696]">Dataset Rows</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-[#F5F5F5] tabular-nums">
                {activeProfile.rowCount}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#171717]/90 p-4">
              <div className="text-xs text-[#969696]">Columns</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-[#F5F5F5] tabular-nums">
                {activeProfile.columnCount}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#171717]/90 p-4">
              <div className="text-xs text-[#969696]">Missing Cells</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-[#E32636] tabular-nums">
                {activeProfile.totalMissingCells}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#171717]/90 p-4">
              <div className="text-xs text-[#969696]">Duplicate Rows</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-[#B8B8B8] tabular-nums">
                {activeProfile.duplicateRowCount}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#171717]/90 p-4 flex flex-col justify-between gap-2">
              <button
                type="button"
                onClick={handleClean}
                className="w-full rounded bg-[#E32636] py-1.5 text-xs font-semibold text-[#F5F5F5] hover:bg-[#8F101D]"
              >
                Auto-Clean Dataset
              </button>
              <button
                type="button"
                onClick={handleExportReport}
                className="w-full inline-flex items-center justify-center gap-1 rounded border border-white/15 bg-[#101010] py-1.5 text-xs text-[#B8B8B8] hover:text-[#F5F5F5]"
              >
                <Download className="h-3 w-3" />
                <span>Export Report</span>
              </button>
            </div>
          </div>

          {/* Dataset Selector if multiple */}
          {datasets.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto">
              {datasets.map((ds) => (
                <button
                  key={ds.id}
                  type="button"
                  onClick={() => {
                    setActiveProfile(ds);
                    setSelectedColName(ds.columns[0]?.name ?? '');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap border ${
                    ds.id === activeProfile.id
                      ? 'bg-[#E32636] border-[#E32636] text-[#F5F5F5]'
                      : 'bg-[#171717] border-white/10 text-[#B8B8B8]'
                  }`}
                >
                  {ds.name}
                </button>
              ))}
            </div>
          )}

          {/* Column Profiler + Interactive Distribution Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 rounded-xl border border-white/10 bg-[#171717]/90 p-4 space-y-3 overflow-x-auto">
              <h2 className="font-display text-sm font-semibold text-[#F5F5F5]">Column Schema & Statistics</h2>
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 text-[#969696]">
                  <tr>
                    <th className="py-2 pr-3">Column</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3 text-right">Missing</th>
                    <th className="py-2 pr-3 text-right">Unique</th>
                    <th className="py-2 text-right">Mean / Top</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {activeProfile.columns.map((c) => (
                    <tr
                      key={c.name}
                      onClick={() => setSelectedColName(c.name)}
                      className={`cursor-pointer transition-colors ${
                        selectedCol?.name === c.name ? 'bg-[#E32636]/12' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <td className="py-2 pr-3 font-mono text-[#F5F5F5]">{c.name}</td>
                      <td className="py-2 pr-3 text-[#B8B8B8]">{c.type}</td>
                      <td className="py-2 pr-3 text-right font-mono tabular-nums">{c.missingCount}</td>
                      <td className="py-2 pr-3 text-right font-mono tabular-nums">{c.uniqueCount}</td>
                      <td className="py-2 text-right font-mono tabular-nums text-[#B8B8B8]">
                        {c.mean !== undefined ? c.mean : c.topValues[0]?.value ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:col-span-6 rounded-xl border border-white/10 bg-[#171717]/90 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-[#969696]">Feature Distribution</div>
                  <h2 className="font-display text-base font-semibold text-[#F5F5F5]">
                    {selectedCol?.name} ({selectedCol?.type})
                  </h2>
                </div>
                {selectedCol?.outlierCount !== undefined && (
                  <div className="text-xs font-mono text-[#B8B8B8] tabular-nums">
                    IQR Outliers: {selectedCol.outlierCount}
                  </div>
                )}
              </div>

              {selectedCol?.histogram ? (
                <div className="space-y-3">
                  <svg viewBox="0 0 420 170" className="w-full h-[170px]">
                    {selectedCol.histogram.map((bin, i) => {
                      const barW = 420 / selectedCol.histogram!.length - 8;
                      const x = i * (barW + 8) + 4;
                      const barH = Math.max(4, (bin.count / maxHistCount) * 120);
                      const y = 135 - barH;
                      return (
                        <g key={i}>
                          <rect x={x} y={y} width={barW} height={barH} rx={3} fill="#E32636" fillOpacity={0.85} />
                          <text
                            x={x + barW / 2}
                            y={y - 5}
                            textAnchor="middle"
                            fill="#F5F5F5"
                            fontSize="10"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            {bin.count}
                          </text>
                          <text
                            x={x + barW / 2}
                            y={154}
                            textAnchor="middle"
                            fill="#969696"
                            fontSize="9"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            {bin.bin}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  <div className="grid grid-cols-4 gap-2 text-xs font-mono bg-[#101010] p-3 rounded-lg border border-white/10 tabular-nums">
                    <div>
                      <span className="text-[#969696] block">Min</span>
                      {selectedCol.min}
                    </div>
                    <div>
                      <span className="text-[#969696] block">Median</span>
                      {selectedCol.median}
                    </div>
                    <div>
                      <span className="text-[#969696] block">StdDev</span>
                      {selectedCol.stdDev}
                    </div>
                    <div>
                      <span className="text-[#969696] block">Max</span>
                      {selectedCol.max}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedCol?.topValues.map((tv) => (
                    <div key={tv.value} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-mono text-[#F5F5F5]">{tv.value}</span>
                        <span className="font-mono text-[#969696] tabular-nums">{tv.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#101010] overflow-hidden">
                        <div
                          className="h-full bg-[#E32636]"
                          style={{ width: `${Math.round((tv.count / activeProfile.rowCount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Correlation Matrix + Natural Language Q&A */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 rounded-xl border border-white/10 bg-[#171717]/90 p-5 space-y-3 overflow-x-auto">
              <h2 className="font-display text-sm font-semibold text-[#F5F5F5]">
                Pearson Correlation Matrix
              </h2>
              {activeProfile.correlations.numericColumns.length < 2 ? (
                <p className="text-xs text-[#969696]">At least 2 numeric columns are required.</p>
              ) : (
                <table className="w-full text-xs font-mono tabular-nums">
                  <thead>
                    <tr>
                      <th className="p-1.5 text-left text-[#969696]" />
                      {activeProfile.correlations.numericColumns.map((col) => (
                        <th key={col} className="p-1.5 text-center text-[#B8B8B8] truncate max-w-[80px]">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeProfile.correlations.numericColumns.map((rowCol, rIdx) => (
                      <tr key={rowCol}>
                        <td className="p-1.5 text-[#B8B8B8] truncate max-w-[90px]">{rowCol}</td>
                        {activeProfile.correlations.matrix[rIdx].map((val, cIdx) => {
                          const intensity = Math.min(0.65, Math.abs(val) * 0.55);
                          const bg =
                            val >= 0
                              ? `rgba(227, 38, 54, ${intensity})`
                              : `rgba(184, 184, 184, ${intensity})`;
                          return (
                            <td
                              key={cIdx}
                              className="p-2 text-center border border-white/5 text-[#F5F5F5]"
                              style={{ backgroundColor: bg }}
                            >
                              {val.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="lg:col-span-6 rounded-xl border border-white/10 bg-[#171717]/90 p-5 space-y-3">
              <h2 className="font-display text-sm font-semibold text-[#F5F5F5] flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#E32636]" />
                <span>Natural-Language Data Q&A (Hydrogen)</span>
              </h2>
              <form onSubmit={handleAskData} className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about outliers, correlations, or model latency trends..."
                  className="flex-1 rounded-lg border border-white/15 bg-[#080808] px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#E32636] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={qaLoading || !question.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#E32636] px-3.5 py-2 text-xs font-semibold text-[#F5F5F5] hover:bg-[#8F101D] disabled:opacity-40 whitespace-nowrap"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{qaLoading ? 'Analyzing' : 'Ask'}</span>
                </button>
              </form>
              <div className="rounded-lg border border-white/10 bg-[#0B0B0B] p-3.5 min-h-[160px] max-h-[260px] overflow-y-auto">
                {qaAnswer ? (
                  <MarkdownRenderer content={qaAnswer} />
                ) : (
                  <p className="text-xs text-[#969696]">
                    Gemini Hydrogen answers strictly using the computed statistical profile and sample rows above.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
