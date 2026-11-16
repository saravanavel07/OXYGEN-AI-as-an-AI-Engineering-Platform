import React, { useEffect, useState } from 'react';
import { Bot, CheckCircle2, Play, ShieldAlert, XCircle } from 'lucide-react';
import type { AgentNodeId, AgentWorkflowRecord, GeminiModelId } from '../types/oxygen.ts';
import { MarkdownRenderer } from '../components/MarkdownRenderer.tsx';
import { ProcessingWaveform } from '../components/ParticleEngine.tsx';

interface AgentsViewProps {
  defaultHumanApproval: boolean;
  onTelemetryRefresh: () => void;
}

const GRAPH_NODES: Array<{ id: AgentNodeId; title: string; x: number; y: number }> = [
  { id: 'orchestrator', title: 'Orchestrator', x: 70, y: 110 },
  { id: 'research', title: 'Research', x: 245, y: 45 },
  { id: 'coding', title: 'Coding', x: 245, y: 110 },
  { id: 'data_analyst', title: 'Data Analyst', x: 245, y: 175 },
  { id: 'testing', title: 'Testing Sandbox', x: 430, y: 110 },
  { id: 'documentation', title: 'Documentation', x: 605, y: 110 },
];

const GRAPH_EDGES: Array<[AgentNodeId, AgentNodeId]> = [
  ['orchestrator', 'research'],
  ['orchestrator', 'coding'],
  ['orchestrator', 'data_analyst'],
  ['research', 'testing'],
  ['coding', 'testing'],
  ['data_analyst', 'testing'],
  ['testing', 'documentation'],
];

export const AgentsView: React.FC<AgentsViewProps> = ({
  defaultHumanApproval,
  onTelemetryRefresh,
}) => {
  const [workflows, setWorkflows] = useState<AgentWorkflowRecord[]>([]);
  const [activeWf, setActiveWf] = useState<AgentWorkflowRecord | null>(null);
  const [selectedNode, setSelectedNode] = useState<AgentNodeId>('orchestrator');

  const [goal, setGoal] = useState(
    'Design and test a Python rolling z-score latency anomaly detector with unit assertions.'
  );
  const [model, setModel] = useState<GeminiModelId>('gemini-4-hydrogen');
  const [requireApproval, setRequireApproval] = useState(defaultHumanApproval);
  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadWorkflows = async () => {
    const res = await fetch('/api/agents/workflows');
    const data = (await res.json()) as { workflows: AgentWorkflowRecord[] };
    const list = data.workflows ?? [];
    setWorkflows(list);
    if (!activeWf && list.length > 0) {
      setActiveWf(list[0]);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  const handleStartWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim() || running) return;
    setRunning(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: goal.trim(),
          model,
          requireHumanApproval: requireApproval,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Agent workflow failed.');
      }
      setActiveWf(data.workflow);
      setSelectedNode('orchestrator');
      await loadWorkflows();
      onTelemetryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      await loadWorkflows();
    } finally {
      setRunning(false);
    }
  };

  const handleApproval = async (approved: boolean) => {
    if (!activeWf || running) return;
    setRunning(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/agents/${activeWf.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Approval transition failed.');
      }
      setActiveWf(data.workflow);
      setSelectedNode(approved ? 'documentation' : 'orchestrator');
      await loadWorkflows();
      onTelemetryRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  const getStepStatus = (nodeId: AgentNodeId) => {
    return activeWf?.steps.find((s) => s.agent === nodeId)?.status ?? 'pending';
  };

  const selectedStep = activeWf?.steps.find((s) => s.agent === selectedNode);

  return (
    <div className="space-y-6">
      {/* Task Launcher */}
      <form
        onSubmit={handleStartWorkflow}
        className="rounded-xl border border-white/10 bg-[#101010]/90 p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#F5F5F5]">
              Autonomous Multi-Agent Control Center
            </h1>
            <p className="text-xs text-[#969696] mt-0.5">
              LangGraph-inspired directed execution with real Gemini synthesis, isolated Python sandbox verification, and human-in-the-loop checkpoints.
            </p>
          </div>
          <ProcessingWaveform active={running} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Describe an engineering task for the agent graph..."
            className="lg:col-span-6 rounded-lg border border-white/15 bg-[#080808] px-3.5 py-2.5 text-sm text-[#F5F5F5] focus:border-[#E32636] focus:outline-none"
          />

          <select
            value={model}
            onChange={(e) => setModel(e.target.value as GeminiModelId)}
            className="lg:col-span-2 rounded-lg border border-white/15 bg-[#080808] px-3 py-2.5 text-xs text-[#F5F5F5] focus:border-[#E32636] focus:outline-none"
          >
            <option value="gemini-4-hydrogen">gemini-4-hydrogen</option>
            <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
          </select>

          <label className="lg:col-span-2 inline-flex items-center gap-2 text-xs text-[#B8B8B8] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={requireApproval}
              onChange={(e) => setRequireApproval(e.target.checked)}
              className="accent-[#E32636] h-4 w-4"
            />
            <span>Require Approval Gate</span>
          </label>

          <button
            type="submit"
            disabled={running || !goal.trim()}
            className="lg:col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[#E32636] px-4 py-2.5 text-xs font-semibold text-[#F5F5F5] hover:bg-[#8F101D] disabled:opacity-40 whitespace-nowrap"
          >
            <Play className="h-3.5 w-3.5" />
            <span>{running ? 'Executing...' : 'Dispatch Graph'}</span>
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-lg border border-[#E32636]/50 bg-[#E32636]/10 px-3.5 py-2 text-xs text-[#F5F5F5]">
            {errorMsg}
          </div>
        )}
      </form>

      {/* Human Approval Banner when paused */}
      {activeWf?.status === 'awaiting_approval' && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-[#F5F5F5]">
                Human Approval Checkpoint Active
              </div>
              <p className="text-xs text-[#D4D4D4] mt-0.5">
                Inspect the Orchestrator plan below before authorizing Research, Coding, Sandbox Testing, and Documentation execution.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={running}
              onClick={() => handleApproval(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#101010] px-3.5 py-2 text-xs font-medium text-[#E5E5E5] hover:border-[#E32636]"
            >
              <XCircle className="h-3.5 w-3.5 text-[#E32636]" />
              <span>Reject</span>
            </button>
            <button
              type="button"
              disabled={running}
              onClick={() => handleApproval(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#E32636] px-4 py-2 text-xs font-semibold text-[#F5F5F5] hover:bg-[#8F101D]"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{running ? 'Running Downstream...' : 'Approve & Execute'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Agent Execution Graph SVG */}
      <section className="rounded-xl border border-white/10 bg-[#171717]/90 p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-sm font-semibold text-[#F5F5F5]">
            Directed Agent Execution Graph
          </h2>
          {activeWf && (
            <div className="text-xs font-mono text-[#969696]">
              Workflow {activeWf.id} · Status:{' '}
              <span className="text-[#F5F5F5]">{activeWf.status}</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <svg viewBox="0 0 740 220" className="w-full min-w-[640px] h-[220px]">
            {GRAPH_EDGES.map(([fromId, toId]) => {
              const a = GRAPH_NODES.find((n) => n.id === fromId)!;
              const b = GRAPH_NODES.find((n) => n.id === toId)!;
              const activeEdge =
                getStepStatus(fromId) === 'completed' && getStepStatus(toId) !== 'skipped';
              return (
                <line
                  key={`${fromId}-${toId}`}
                  x1={a.x + 62}
                  y1={a.y}
                  x2={b.x - 62}
                  y2={b.y}
                  stroke={activeEdge ? '#E32636' : 'rgba(255,255,255,0.14)'}
                  strokeWidth={activeEdge ? 1.8 : 1.2}
                />
              );
            })}

            {GRAPH_NODES.map((node) => {
              const st = getStepStatus(node.id);
              const isSelected = selectedNode === node.id;
              const strokeColor =
                st === 'completed'
                  ? '#10B981'
                  : st === 'awaiting_approval'
                    ? '#F59E0B'
                    : st === 'failed'
                      ? '#E32636'
                      : st === 'running'
                        ? '#E32636'
                        : 'rgba(255,255,255,0.16)';

              return (
                <g
                  key={node.id}
                  onClick={() => setSelectedNode(node.id)}
                  className="cursor-pointer"
                >
                  <rect
                    x={node.x - 62}
                    y={node.y - 22}
                    width={124}
                    height={44}
                    rx={8}
                    fill={isSelected ? '#1E1E1E' : '#0E0E0E'}
                    stroke={isSelected ? '#E32636' : strokeColor}
                    strokeWidth={isSelected ? 2 : 1.3}
                  />
                  <text
                    x={node.x}
                    y={node.y - 3}
                    textAnchor="middle"
                    fill="#F5F5F5"
                    fontSize="11"
                    fontWeight="600"
                    fontFamily="Outfit, sans-serif"
                  >
                    {node.title}
                  </text>
                  <text
                    x={node.x}
                    y={node.y + 13}
                    textAnchor="middle"
                    fill="#969696"
                    fontSize="9.5"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {st}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </section>

      {/* Step Details, Tool Calls, & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#171717]/90 p-4 space-y-2.5">
            <div className="text-xs font-semibold text-[#B8B8B8]">Tool-Call Trace</div>
            {!activeWf || activeWf.toolCalls.length === 0 ? (
              <p className="text-xs text-[#969696]">No tool calls recorded in current workflow.</p>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {activeWf.toolCalls.map((tc) => (
                  <div key={tc.id} className="rounded-lg border border-white/10 bg-[#101010] p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-[#E32636]">{tc.toolName}</span>
                      <span className="text-[#969696] tabular-nums">{tc.durationMs}ms</span>
                    </div>
                    <div className="text-[#D4D4D4] truncate">{tc.outputSummary}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-[#171717]/90 p-4 space-y-2.5">
            <div className="text-xs font-semibold text-[#B8B8B8]">Workflow History</div>
            {workflows.length === 0 ? (
              <p className="text-xs text-[#969696]">No saved workflows yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                {workflows.map((wf) => (
                  <button
                    key={wf.id}
                    type="button"
                    onClick={() => setActiveWf(wf)}
                    className={`w-full text-left rounded-lg p-2.5 text-xs border transition-colors ${
                      activeWf?.id === wf.id
                        ? 'border-[#E32636]/50 bg-[#E32636]/10 text-[#F5F5F5]'
                        : 'border-white/10 bg-[#101010] text-[#B8B8B8] hover:text-[#F5F5F5]'
                    }`}
                  >
                    <div className="truncate font-medium">{wf.goal}</div>
                    <div className="mt-1 font-mono text-[11px] text-[#969696]">
                      {wf.status} · {wf.model}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="lg:col-span-8 rounded-xl border border-white/10 bg-[#171717]/90 p-5 space-y-4 min-h-[420px]">
          {!activeWf ? (
            <div className="h-[340px] flex flex-col items-center justify-center text-center space-y-2">
              <Bot className="h-6 w-6 text-[#969696]" />
              <div className="text-sm font-medium text-[#F5F5F5]">Dispatch a Multi-Agent Pipeline</div>
              <p className="text-xs text-[#969696] max-w-md">
                Enter an engineering goal above. The Orchestrator plans specialist steps, Coding writes Python, Testing verifies it inside the isolated sandbox, and Documentation compiles the final report.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <div className="text-xs text-[#969696]">Selected Node Output</div>
                  <h3 className="font-display text-lg font-semibold text-[#F5F5F5]">
                    {selectedStep?.label ?? selectedNode}
                  </h3>
                </div>
                <div className="font-mono text-xs text-[#B8B8B8]">
                  Status: {selectedStep?.status}
                  {selectedStep?.latencyMs ? ` · ${selectedStep.latencyMs}ms` : ''}
                </div>
              </div>

              {selectedStep?.error && (
                <div className="rounded-lg border border-[#E32636]/40 bg-[#E32636]/10 p-3 text-xs text-[#F5F5F5]">
                  {selectedStep.error}
                </div>
              )}

              <div className="max-h-[460px] overflow-y-auto pr-1">
                {selectedStep?.output ? (
                  <MarkdownRenderer content={selectedStep.output} />
                ) : (
                  <p className="text-xs text-[#969696]">
                    No output emitted for this node yet.
                  </p>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};
