import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { SandboxExecutionResult } from '../src/types/oxygen.ts';

const FORBIDDEN_PYTHON_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bimport\s+(os|subprocess|socket|shutil|ctypes|importlib|urllib|requests|http|ftplib|telnetlib)\b/, reason: 'Restricted system or network module import' },
  { pattern: /\bfrom\s+(os|subprocess|socket|shutil|ctypes|importlib|urllib|requests|http)\s+import\b/, reason: 'Restricted system or network module import' },
  { pattern: /\b(__import__|eval|exec|compile)\s*\(/, reason: 'Dynamic code execution calls are blocked in sandbox' },
  { pattern: /\bopen\s*\(\s*['"](\/|~|\.\.)/, reason: 'Filesystem path traversal outside sandbox is blocked' },
];

export function validatePythonSafety(code: string): string | null {
  for (const rule of FORBIDDEN_PYTHON_PATTERNS) {
    if (rule.pattern.test(code)) {
      return rule.reason;
    }
  }
  return null;
}

export async function runIsolatedPython(code: string, timeoutMs = 5000): Promise<SandboxExecutionResult> {
  const started = Date.now();
  const blocked = validatePythonSafety(code);
  if (blocked) {
    return {
      success: false,
      language: 'python',
      stdout: '',
      stderr: `Sandbox Security Guard: ${blocked}.`,
      exitCode: 1,
      durationMs: Date.now() - started,
      timedOut: false,
      blockedReason: blocked,
    };
  }

  const sandboxDir = await fs.mkdtemp(path.join(os.tmpdir(), 'oxygen-sandbox-'));
  const scriptPath = path.join(sandboxDir, 'main.py');

  // Prepend lightweight resource limits inside Python itself (CPU & memory cap) where supported on Linux
  const wrappedCode = `import resource, sys
try:
    resource.setrlimit(resource.RLIMIT_CPU, (4, 4))
    resource.setrlimit(resource.RLIMIT_AS, (256 * 1024 * 1024, 256 * 1024 * 1024))
except Exception:
    pass
${code}
`;

  try {
    await fs.writeFile(scriptPath, wrappedCode, 'utf8');

    const result = await new Promise<SandboxExecutionResult>((resolve) => {
      const child = spawn('python3', ['-I', scriptPath], {
        cwd: sandboxDir,
        env: {
          PATH: process.env.PATH ?? '/usr/bin:/bin',
          PYTHONDONTWRITEBYTECODE: '1',
          PYTHONNOUSERSITE: '1',
        },
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;
      const MAX_BYTES = 128 * 1024;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, timeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        if (stdout.length < MAX_BYTES) {
          stdout += chunk.toString('utf8');
        }
      });
      child.stderr.on('data', (chunk: Buffer) => {
        if (stderr.length < MAX_BYTES) {
          stderr += chunk.toString('utf8');
        }
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          success: false,
          language: 'python',
          stdout,
          stderr: err.message,
          exitCode: 1,
          durationMs: Date.now() - started,
          timedOut,
        });
      });

      child.on('close', (codeExit) => {
        clearTimeout(timer);
        resolve({
          success: codeExit === 0 && !timedOut,
          language: 'python',
          stdout: stdout.trimEnd(),
          stderr: timedOut
            ? `Execution timed out after ${timeoutMs}ms.`
            : stderr.trimEnd(),
          exitCode: codeExit,
          durationMs: Date.now() - started,
          timedOut,
        });
      });
    });

    return result;
  } finally {
    await fs.rm(sandboxDir, { recursive: true, force: true }).catch(() => {});
  }
}

export function runIsolatedSql(sqlQuery: string): SandboxExecutionResult {
  const started = Date.now();
  const trimmed = sqlQuery.trim();
  if (!trimmed) {
    return {
      success: false,
      language: 'sql',
      stdout: '',
      stderr: 'SQL query is empty.',
      exitCode: 1,
      durationMs: Date.now() - started,
      timedOut: false,
    };
  }

  // Create a fresh in-memory SQLite warehouse with realistic engineering telemetry tables
  const memDb = new DatabaseSync(':memory:');
  try {
    memDb.exec(`
      CREATE TABLE inference_logs (
        id INTEGER PRIMARY KEY,
        model_name TEXT NOT NULL,
        task_type TEXT NOT NULL,
        latency_ms REAL NOT NULL,
        prompt_tokens INTEGER NOT NULL,
        output_tokens INTEGER NOT NULL,
        status TEXT NOT NULL,
        executed_at TEXT NOT NULL
      );

      INSERT INTO inference_logs VALUES
        (1, 'gemini-4-hydrogen', 'agent_routing', 342.5, 410, 290, 'nominal', '2026-11-15T10:00:00Z'),
        (2, 'gemini-4-hydrogen', 'code_generation', 498.2, 620, 840, 'nominal', '2026-11-15T10:05:00Z'),
        (3, 'gemini-3.1-flash-lite', 'quick_lint', 118.4, 190, 95, 'nominal', '2026-11-15T10:12:00Z'),
        (4, 'gemini-4-carbon', 'security_audit', 1240.0, 1420, 1180, 'nominal', '2026-11-15T10:18:00Z'),
        (5, 'gemini-4-argon', 'stem_analysis', 810.3, 980, 760, 'nominal', '2026-11-15T10:25:00Z'),
        (6, 'gemini-4-hydrogen', 'json_extraction', 284.7, 320, 210, 'nominal', '2026-11-15T10:31:00Z');
    `);

    const upper = trimmed.toUpperCase();
    if (upper.startsWith('SELECT') || upper.startsWith('WITH') || upper.startsWith('PRAGMA')) {
      const rows = memDb.prepare(trimmed).all() as Record<string, unknown>[];
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      return {
        success: true,
        language: 'sql',
        stdout: `Returned ${rows.length} row(s) from isolated SQLite :memory: sandbox.`,
        stderr: '',
        exitCode: 0,
        durationMs: Date.now() - started,
        timedOut: false,
        sqlRows: rows.slice(0, 100),
        sqlColumns: columns,
      };
    } else {
      memDb.exec(trimmed);
      return {
        success: true,
        language: 'sql',
        stdout: 'Statement executed inside isolated SQLite :memory: sandbox.',
        stderr: '',
        exitCode: 0,
        durationMs: Date.now() - started,
        timedOut: false,
      };
    }
  } catch (err) {
    return {
      success: false,
      language: 'sql',
      stdout: '',
      stderr: err instanceof Error ? err.message : String(err),
      exitCode: 1,
      durationMs: Date.now() - started,
      timedOut: false,
    };
  } finally {
    memDb.close();
  }
}
