import React, { useEffect, useState } from 'react';
import {
  Bolt,
  Download,
  FilePlus,
  Play,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  CodingFileRecord,
  CodingLanguage,
  GeminiModelId,
  SandboxExecutionResult,
} from '../types/oxygen.ts';
import { CodeBlock, MarkdownRenderer } from '../components/MarkdownRenderer.tsx';

interface CodingStudioViewProps {
  externalFile?: { name: string; language: CodingLanguage; content: string } | null;
  onTelemetryRefresh: () => void;
}

const LANGUAGES: CodingLanguage[] = [
  'python',
  'sql',
  'pyspark',
  'javascript',
  'java',
  'html',
  'css',
];

const AI_ACTIONS = [
  'Generate',
  'Explain',
  'Debug',
  'Refactor',
  'Code Review',
  'Generate Tests',
  'Generate Docs',
  'Error Analysis',
];

export const CodingStudioView: React.FC<CodingStudioViewProps> = ({
  externalFile,
  onTelemetryRefresh,
}) => {
  const [files, setFiles] = useState<CodingFileRecord[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>('');
  const [fileName, setFileName] = useState('script.py');
  const [language, setLanguage] = useState<CodingLanguage>('python');
  const [code, setCode] = useState('');
  const [aiModel, setAiModel] = useState<GeminiModelId>('gemini-4-hydrogen');
  const [instruction, setInstruction] = useState('');

  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMeta, setAiMeta] = useState<string>('');
  const [execResult, setExecResult] = useState<SandboxExecutionResult | null>(null);
  const [execLoading, setExecLoading] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [previousCode, setPreviousCode] = useState('');

  // Low-latency Flash-Lite quick assist bar
  const [quickQuery, setQuickQuery] = useState('');
  const [quickAnswer, setQuickAnswer] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);

  const loadFiles = async () => {
    const res = await fetch('/api/coding/files');
    const data = (await res.json()) as { files: CodingFileRecord[] };
    setFiles(data.files ?? []);
    return data.files ?? [];
  };

  useEffect(() => {
    loadFiles().then((list) => {
      if (externalFile) {
        const id = `file-${Date.now()}`;
        setActiveFileId(id);
        setFileName(externalFile.name);
        setLanguage(externalFile.language);
        setCode(externalFile.content);
        setPreviousCode(externalFile.content);
      } else if (list.length > 0 && !activeFileId) {
        selectFile(list[0]);
      }
    });
  }, [externalFile]);

  const selectFile = (f: CodingFileRecord) => {
    setActiveFileId(f.id);
    setFileName(f.name);
    setLanguage(f.language);
    setCode(f.content);
    setPreviousCode(f.content);
    setExecResult(null);
  };

  const handleNewFile = () => {
    const id = `file-${Date.now()}`;
    setActiveFileId(id);
    setFileName('new_module.py');
    setLanguage('python');
    setCode('# Write your Python module here\nprint("OXYGEN Sandbox Ready")\n');
    setPreviousCode('');
    setExecResult(null);
  };

  const handleSaveFile = async () => {
    const id = activeFileId || `file-${Date.now()}`;
    const res = await fetch('/api/coding/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        name: fileName,
        language,
        content: code,
        updatedAt: new Date().toISOString(),
      }),
    });
    const data = (await res.json()) as { file: CodingFileRecord };
    setActiveFileId(data.file.id);
    await loadFiles();
    onTelemetryRefresh();
  };

  const handleDeleteFile = async (id: string) => {
    await fetch(`/api/coding/files/${id}`, { method: 'DELETE' });
    const list = await loadFiles();
    if (activeFileId === id && list.length > 0) {
      selectFile(list[0]);
    }
  };

  const handleRunSandbox = async () => {
    setExecLoading(true);
    setExecResult(null);
    try {
      const res = await fetch('/api/coding/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExecResult({
          success: false,
          language,
          stdout: '',
          stderr: data.error || 'Sandbox execution unavailable for this language.',
          exitCode: 1,
          durationMs: 0,
          timedOut: false,
        });
      } else {
        setExecResult(data);
        onTelemetryRefresh();
      }
    } finally {
      setExecLoading(false);
    }
  };

  const handleAiAction = async (action: string) => {
    setAiLoading(true);
    setAiResponse('');
    setAiMeta('');
    setPreviousCode(code);
    try {
      const res = await fetch('/api/coding/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          language,
          code,
          instruction,
          model: aiModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiResponse(`**Error**: ${data.error || 'Request failed.'}`);
      } else {
        setAiResponse(data.text);
        setAiMeta(`${data.model} · ${data.latencyMs}ms · ${data.outputTokens} out tokens`);
        onTelemetryRefresh();
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyCodeFromAi = () => {
    const match = aiResponse.match(/```[a-zA-Z]*\s*([\s\S]*?)```/);
    if (match && match[1]) {
      setPreviousCode(code);
      setCode(match[1].trim());
      setShowCompare(true);
    }
  };

  const handleQuickAssist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuery.trim() || quickLoading) return;
    setQuickLoading(true);
    try {
      const res = await fetch('/api/fast-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: quickQuery, context: code }),
      });
      const data = await res.json();
      setQuickAnswer(res.ok ? `${data.text} (${data.latencyMs}ms · Flash-Lite)` : data.error);
    } finally {
      setQuickLoading(false);
    }
  };

  const handleExportSource = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Top Studio Bar */}
      <div className="rounded-xl border border-white/10 bg-[#101010]/90 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            aria-label="File name"
            className="rounded-lg border border-white/15 bg-[#080808] px-3 py-1.5 font-mono text-xs text-[#F5F5F5] w-48 focus:border-[#E32636] focus:outline-none"
          />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as CodingLanguage)}
            aria-label="Programming language"
            className="rounded-lg border border-white/15 bg-[#080808] px-2.5 py-1.5 text-xs text-[#F5F5F5] focus:border-[#E32636] focus:outline-none"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
          <select
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value as GeminiModelId)}
            aria-label="AI coding model"
            className="rounded-lg border border-white/15 bg-[#080808] px-2.5 py-1.5 text-xs text-[#B8B8B8] focus:border-[#E32636] focus:outline-none"
          >
            <option value="gemini-4-hydrogen">gemini-4-hydrogen (Flagship)</option>
            <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast)</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleNewFile}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#171717] px-3 py-1.5 text-xs text-[#F5F5F5] hover:border-[#E32636] whitespace-nowrap shrink-0"
          >
            <FilePlus className="h-3.5 w-3.5" />
            <span>New</span>
          </button>
          <button
            type="button"
            onClick={handleSaveFile}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#171717] px-3 py-1.5 text-xs text-[#F5F5F5] hover:border-[#E32636] whitespace-nowrap shrink-0"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save</span>
          </button>
          <button
            type="button"
            onClick={handleExportSource}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#171717] px-3 py-1.5 text-xs text-[#B8B8B8] hover:text-[#F5F5F5] whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>
          <button
            type="button"
            disabled={execLoading || (language !== 'python' && language !== 'sql')}
            onClick={handleRunSandbox}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#E32636] px-4 py-1.5 text-xs font-semibold text-[#F5F5F5] hover:bg-[#8F101D] disabled:opacity-40 whitespace-nowrap shrink-0"
          >
            <Play className="h-3.5 w-3.5" />
            <span>{execLoading ? 'Running...' : 'Run in Sandbox'}</span>
          </button>
        </div>
      </div>

      {/* Low-Latency Flash-Lite Quick Assist Strip */}
      <form
        onSubmit={handleQuickAssist}
        className="rounded-xl border border-white/10 bg-[#171717]/90 px-4 py-2.5 flex flex-wrap items-center gap-3"
      >
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E32636] shrink-0">
          <Bolt className="h-3.5 w-3.5" />
          <span>Quick Assist (3.1 Flash-Lite)</span>
        </div>
        <input
          type="text"
          value={quickQuery}
          onChange={(e) => setQuickQuery(e.target.value)}
          placeholder="Ask a fast question about this code (e.g., What is the time complexity?)..."
          className="flex-1 min-w-[200px] bg-transparent text-xs text-[#F5F5F5] placeholder-[#737373] focus:outline-none"
        />
        <button
          type="submit"
          disabled={quickLoading || !quickQuery.trim()}
          className="rounded px-3 py-1 bg-[#101010] border border-white/15 text-xs text-[#F5F5F5] hover:border-[#E32636] disabled:opacity-40 whitespace-nowrap shrink-0"
        >
          {quickLoading ? 'Asking...' : 'Ask Fast'}
        </button>
      </form>
      {quickAnswer && (
        <div className="rounded-lg border border-white/10 bg-[#101010] px-4 py-2.5 text-xs text-[#D4D4D4]">
          {quickAnswer}
        </div>
      )}

      {/* Workspace Grid: Files | Editor + Sandbox | AI Assistant */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* File Workspace */}
        <aside className="lg:col-span-3 rounded-xl border border-white/10 bg-[#171717]/90 p-3 space-y-2">
          <div className="text-xs font-semibold text-[#B8B8B8] px-1">Workspace Files</div>
          <div className="space-y-1 max-h-[540px] overflow-y-auto">
            {files.map((f) => (
              <div
                key={f.id}
                className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors ${
                  f.id === activeFileId ? 'bg-[#E32636]/15 text-[#F5F5F5]' : 'text-[#B8B8B8] hover:bg-white/[0.03]'
                }`}
              >
                <button type="button" onClick={() => selectFile(f)} className="flex-1 text-left truncate">
                  <div className="font-mono truncate">{f.name}</div>
                  <div className="text-[10px] text-[#969696] uppercase">{f.language}</div>
                </button>
                <button
                  type="button"
                  aria-label="Delete file"
                  onClick={() => handleDeleteFile(f.id)}
                  className="p-1 text-[#969696] hover:text-[#E32636]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Code Editor + Sandbox Output */}
        <section className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#0B0B0B] overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 bg-[#141414] px-3.5 py-2 text-xs text-[#969696]">
              <span className="font-mono text-[#F5F5F5]">{fileName}</span>
              <button
                type="button"
                onClick={() => setShowCompare((s) => !s)}
                className="text-xs text-[#B8B8B8] hover:text-[#E32636]"
              >
                {showCompare ? 'Hide Compare' : 'Compare Previous'}
              </button>
            </div>
            <textarea
              rows={18}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="w-full bg-[#080808] p-3.5 font-mono text-xs leading-relaxed text-[#F5F5F5] focus:outline-none resize-y"
            />
          </div>

          {showCompare && previousCode && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#B8B8B8]">Previous Snapshot Comparison</div>
              <CodeBlock code={previousCode} language={language} title="Previous Revision" />
            </div>
          )}

          {/* Sandbox Result */}
          <div className="rounded-xl border border-white/10 bg-[#171717]/90 p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#F5F5F5]">
                Isolated Sandbox Output ({language === 'python' || language === 'sql' ? 'Enabled' : 'Static Preview Only'})
              </span>
              {execResult && (
                <span className="font-mono text-[#969696] tabular-nums">
                  {execResult.success ? '● Exit 0' : `✖ Exit ${execResult.exitCode}`} · {execResult.durationMs}ms
                </span>
              )}
            </div>
            {!execResult ? (
              <p className="text-xs text-[#969696]">
                Python 3 runs inside an isolated temporary directory (5s timeout, restricted imports). SQL runs against an isolated SQLite `:memory:` warehouse.
              </p>
            ) : (
              <div className="space-y-2">
                {execResult.stdout && (
                  <pre className="rounded-lg bg-[#080808] border border-white/10 p-3 font-mono text-xs text-[#F5F5F5] overflow-x-auto">
                    {execResult.stdout}
                  </pre>
                )}
                {execResult.stderr && (
                  <pre className="rounded-lg bg-[#E32636]/10 border border-[#E32636]/40 p-3 font-mono text-xs text-[#F5F5F5] overflow-x-auto">
                    {execResult.stderr}
                  </pre>
                )}
                {execResult.sqlRows && execResult.sqlColumns && execResult.sqlRows.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#101010] text-[#B8B8B8]">
                        <tr>
                          {execResult.sqlColumns.map((col) => (
                            <th key={col} className="px-3 py-2 font-mono font-medium">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 bg-[#080808]">
                        {execResult.sqlRows.map((row, idx) => (
                          <tr key={idx}>
                            {execResult.sqlColumns!.map((col) => (
                              <td key={col} className="px-3 py-1.5 font-mono text-[#E5E5E5] tabular-nums">
                                {String(row[col] ?? 'NULL')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* AI Coding Assistant Panel */}
        <section className="lg:col-span-4 rounded-xl border border-white/10 bg-[#171717]/90 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-[#F5F5F5] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#E32636]" />
              <span>AI Engineering Assistant</span>
            </h2>
          </div>

          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Optional guidance (e.g., Add strict type hints & pytest cases)..."
            className="w-full rounded-lg border border-white/15 bg-[#0C0C0C] px-3 py-2 text-xs text-[#F5F5F5] placeholder-[#737373] focus:border-[#E32636] focus:outline-none"
          />

          <div className="grid grid-cols-2 gap-1.5">
            {AI_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                disabled={aiLoading}
                onClick={() => handleAiAction(action)}
                className="rounded-lg border border-white/10 bg-[#101010] px-2.5 py-2 text-xs font-medium text-[#E5E5E5] hover:border-[#E32636]/70 hover:text-white disabled:opacity-40 transition-colors text-left"
              >
                {action}
              </button>
            ))}
          </div>

          {aiMeta && <div className="text-[11px] font-mono text-[#969696]">{aiMeta}</div>}

          <div className="rounded-lg border border-white/10 bg-[#0B0B0B] p-3.5 min-h-[290px] max-h-[420px] overflow-y-auto">
            {aiLoading ? (
              <div className="text-xs text-[#969696]">Analyzing with {aiModel}...</div>
            ) : aiResponse ? (
              <div className="space-y-3">
                {aiResponse.includes('```') && (
                  <button
                    type="button"
                    onClick={handleApplyCodeFromAi}
                    className="rounded bg-[#E32636] px-3 py-1 text-xs font-semibold text-[#F5F5F5] hover:bg-[#8F101D]"
                  >
                    Apply Code Block to Editor
                  </button>
                )}
                <MarkdownRenderer content={aiResponse} />
              </div>
            ) : (
              <p className="text-xs text-[#969696]">
                Select an AI action above to explain, debug, refactor, review, or generate tests for the active file.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
