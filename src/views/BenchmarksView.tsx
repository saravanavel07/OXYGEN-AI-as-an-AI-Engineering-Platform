import React, { useEffect, useState } from 'react';
import { Gauge, Play } from 'lucide-react';
import type { BenchmarkRunRecord, GeminiModelId, ThinkingLevelOption } from '../types/oxygen.ts';

interface BenchmarksViewProps {
  onTelemetryRefresh: () => void;
}

export const BenchmarksView: React.FC<BenchmarksViewProps> = ({ onTelemetryRefresh }) => {
  const [runs, setRuns] = useState<BenchmarkRunRecord[]>([]);
  const [selectedRun, setSelectedRun] = useState<BenchmarkRunRecord | null>(null);
  const [model, setModel] = useState<GeminiModelId>('gemini-4-hydrogen');
  const [thinking, setThinking] = useState<ThinkingLevelOption>('LOW');
  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadRuns = async () => {
    const res = await fetch('/api/benchmarks');
    const data = (await res.json()) as { runs: BenchmarkRunRecord[] };
    const list = data.runs ?? [];
    setRuns(list);
    if (!selectedRun && list.length > 0) {
      setSelectedRun(list[0]);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  const handleRunSuite = async () => {
    setRunning(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/benchmarks/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, thinkingLevel: thinking }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Benchmark run failed.');
      setSelectedRun(data.run);
      await loadRuns();
      onTelemetryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  const maxLatency = Math.max(1, ...runs.map((r) => r.avgLatencyMs));

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-[#101010]/90 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F5F5F5]">
            Model Evaluation & Benchmark Center
          </h1>
          <p className="text-xs text-[#969696] mt-0.5">
            Executes real reproducible checks (Strict JSON schema, Python sandbox unit assertions, and Technical Q&A) and records empirical wall-clock measurements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as GeminiModelId)}
            className="rounded-lg border border-white/15 bg-[#080808] px-3 py-2 text-xs text-[#F5F5F5]"
          >
            <option value="gemini-4-hydrogen">gemini-4-hydrogen</option>
            <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
          </select>

          <select
            value={thinking}
            onChange={(e) => setThinking(e.target.value as ThinkingLevelOption)}
            className="rounded-lg border border-white/15 bg-[#080808] px-3 py-2 text-xs font-mono text-[#B8B8B8]"
          >
            {model === 'gemini-3.1-flash-lite' ? (
              <>
                <option value="MINIMAL">MINIMAL</option>
                <option value="LOW">LOW</option>
              </>
            ) : (
              <>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </>
            )}
          </select>

          <button
            type="button"
            disabled={running}
            onClick={handleRunSuite}
            className="inline-flex items-center gap-2 rounded-lg bg-[#E32636] px-4 py-2 text-xs font-semibold text-[#F5F5F5] hover:bg-[#8F101D] disabled:opacity-40 whitespace-nowrap"
          >
            <Play className="h-3.5 w-3.5" />
            <span>{running ? 'Running Suite...' : 'Run Verification Suite'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-[#E32636]/50 bg-[#E32636]/10 px-4 py-3 text-xs text-[#F5F5F5]">
          {errorMsg}
        </div>
      )}

      {runs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-[#171717]/70 p-12 text-center space-y-3">
          <Gauge className="h-7 w-7 text-[#969696] mx-auto" />
          <div className="text-base font-medium text-[#F5F5F5]">No Benchmark Runs Recorded</div>
          <p className="text-xs text-[#969696] max-w-md mx-auto">
            OXYGEN AI never fabricates benchmark tables. Click "Run Verification Suite" above to execute live prompts and measure real latency, token counts, and Python sandbox pass rates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Historical Measured Runs & Latency Bar Chart */}
          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-xl border border-white/10 bg-[#171717]/90 p-5 space-y-3">
              <h2 className="font-display text-sm font-semibold text-[#F5F5F5]">
                Measured Average Latency Comparison (ms)
              </h2>
              <div className="space-y-3">
                {runs.slice(0, 6).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRun(r)}
                    className={`w-full text-left space-y-1 p-2 rounded-lg transition-colors ${
                      selectedRun?.id === r.id ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-[#F5F5F5]">
                        {r.model} ({r.thinkingLevel})
                      </span>
                      <span className="text-[#B8B8B8] tabular-nums">
                        {r.avgLatencyMs}ms · {r.passedCases}/{r.totalCases} pass
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#0C0C0C] overflow-hidden">
                      <div
                        className="h-full bg-[#E32636] transition-all duration-300"
                        style={{ width: `${Math.max(6, Math.round((r.avgLatencyMs / maxLatency) * 100))}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Case Breakdown for Selected Run */}
          <div className="lg:col-span-6 rounded-xl border border-white/10 bg-[#171717]/90 p-5 space-y-4">
            {selectedRun && (
              <>
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <div className="text-xs text-[#969696]">{selectedRun.suiteName}</div>
                    <h2 className="font-display text-base font-semibold text-[#F5F5F5]">
                      {selectedRun.model} · {selectedRun.thinkingLevel}
                    </h2>
                  </div>
                  <div className="text-right font-mono text-xs tabular-nums">
                    <div className="text-[#F5F5F5]">
                      JSON: {selectedRun.jsonValidityRate}% · Code: {selectedRun.codePassRate}%
                    </div>
                    <div className="text-[#969696]">{selectedRun.totalTokens} total tokens</div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {selectedRun.details.map((d) => (
                    <div
                      key={d.caseId}
                      className="rounded-lg border border-white/10 bg-[#101010] p-3 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-medium text-[#F5F5F5]">
                          <span className={d.passed ? 'text-emerald-400 mr-1.5' : 'text-[#E32636] mr-1.5'}>
                            {d.passed ? '● PASS' : '✖ FAIL'}
                          </span>
                          {d.caseName}
                        </div>
                        <div className="text-[11px] text-[#969696] mt-0.5">{d.notes}</div>
                      </div>
                      <div className="text-right font-mono text-[11px] text-[#B8B8B8] tabular-nums shrink-0">
                        <div>{d.latencyMs}ms</div>
                        <div className="text-[#969696]">{d.tokens} tok</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
