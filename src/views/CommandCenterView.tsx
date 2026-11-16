import React from 'react';
import {
  Activity,
  ArrowRight,
  Bot,
  Code2,
  Database,
  Gauge,
  GraduationCap,
  MapPin,
  MessageSquare,
  Terminal,
} from 'lucide-react';
import type { DashboardTelemetry, GeminiModelId, NavSectionId } from '../types/oxygen.ts';
import { NeuralOrbitStage } from '../components/ParticleEngine.tsx';

interface CommandCenterViewProps {
  telemetry: DashboardTelemetry | null;
  loading: boolean;
  activeModel: GeminiModelId;
  onNavigate: (section: NavSectionId) => void;
  onOpenConversation: (convId: string) => void;
}

export const CommandCenterView: React.FC<CommandCenterViewProps> = ({
  telemetry,
  loading,
  activeModel,
  onNavigate,
  onOpenConversation,
}) => {
  const isLive = Boolean(telemetry?.geminiConfigured);

  const quickTools: Array<{
    id: NavSectionId;
    title: string;
    desc: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'playground',
      title: 'Hydrogen Playground',
      desc: 'Stream multi-turn prompts and customize system instructions.',
      icon: <MessageSquare className="h-4 w-4 text-[#E32636]" />,
    },
    {
      id: 'masterclass',
      title: 'Hydrogen Masterclass',
      desc: '7 levels from neural foundations to agentic deployment.',
      icon: <GraduationCap className="h-4 w-4 text-[#E32636]" />,
    },
    {
      id: 'coding-studio',
      title: 'AI Coding Studio',
      desc: 'Refactor, review, and test Python & SQL in an isolated sandbox.',
      icon: <Code2 className="h-4 w-4 text-[#E32636]" />,
    },
    {
      id: 'agents',
      title: 'Agent Control Center',
      desc: 'Run multi-agent pipelines with human approval checkpoints.',
      icon: <Bot className="h-4 w-4 text-[#E32636]" />,
    },
    {
      id: 'data-lab',
      title: 'Data Intelligence Lab',
      desc: 'Profile CSV/Excel datasets, clean nulls, and query with AI.',
      icon: <Database className="h-4 w-4 text-[#E32636]" />,
    },
    {
      id: 'geospatial',
      title: 'Geospatial Explorer',
      desc: 'Explore places, autocomplete, and compute live routes on Google Maps.',
      icon: <MapPin className="h-4 w-4 text-[#E32636]" />,
    },
    {
      id: 'benchmarks',
      title: 'Benchmark Center',
      desc: 'Measure real latency, tokens, and sandbox pass rates.',
      icon: <Gauge className="h-4 w-4 text-[#E32636]" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Split: Welcome + Neural Orbit Stage */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 rounded-xl border border-white/10 bg-[#101010]/90 p-6 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#969696]">
              <span>OXYGEN AI Platform</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[#B8B8B8]">{activeModel}</span>
              <span aria-hidden="true">·</span>
              <span className={isLive ? 'text-[#B8B8B8]' : 'text-[#E32636]'}>
                {loading ? 'Checking Connection' : isLive ? 'API Key Configured' : 'API Key Needed in Secrets'}
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F5F5F5] max-w-2xl">
              Intelligence in Motion. Engineering Without Limits.
            </h1>
            <p className="text-sm sm:text-base text-[#B8B8B8] leading-relaxed max-w-2xl">
              Unified workspace for mastering Google Gemini Hydrogen, prototyping multi-turn and visual pipelines, running isolated Python and SQL sandboxes, and orchestrating auditable multi-agent workflows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('playground')}
              className="inline-flex items-center gap-2 rounded-lg bg-[#E32636] px-4 py-2.5 text-sm font-semibold text-[#F5F5F5] hover:bg-[#8F101D] transition-colors whitespace-nowrap shrink-0"
            >
              <span>Open Model Playground</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('masterclass')}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#171717] px-4 py-2.5 text-sm font-medium text-[#F5F5F5] hover:border-[#E32636]/60 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Start Masterclass</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('agents')}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#171717] px-4 py-2.5 text-sm font-medium text-[#B8B8B8] hover:text-[#F5F5F5] transition-colors whitespace-nowrap shrink-0"
            >
              <span>Launch Agents</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 flex items-center justify-center rounded-lg border border-white/10 bg-[#080808]/80">
          <NeuralOrbitStage activeModel={activeModel} isLive={isLive} />
        </div>
      </section>

      {/* Real Application Metrics Strip (Zero fabricated figures) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/10 bg-[#171717]/90 p-4">
          <div className="text-xs text-[#969696]">Measured Tokens</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-[#F5F5F5] tabular-nums">
            {(telemetry?.totalTokensMeasured ?? 0).toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-[#969696] tabular-nums">
            {telemetry?.messageCount ?? 0} logged messages
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#171717]/90 p-4">
          <div className="text-xs text-[#969696]">Avg Response Latency</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-[#F5F5F5] tabular-nums">
            {telemetry?.avgLatencyMs ? `${telemetry.avgLatencyMs} ms` : '—'}
          </div>
          <div className="mt-1 text-xs text-[#969696]">
            {telemetry?.avgLatencyMs ? 'From recorded turns' : 'No inference runs yet'}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#171717]/90 p-4">
          <div className="text-xs text-[#969696]">Masterclass Progress</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-[#F5F5F5] tabular-nums">
            {telemetry?.completedLessons ?? 0} / {telemetry?.totalLessons ?? 21}
          </div>
          <div className="mt-1 text-xs text-[#969696]">
            7-level Hydrogen curriculum
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#171717]/90 p-4">
          <div className="text-xs text-[#969696]">Active Artifacts</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-[#F5F5F5] tabular-nums">
            {(telemetry?.codingFilesCount ?? 0) + (telemetry?.agentRunsCount ?? 0) + (telemetry?.datasetsCount ?? 0)}
          </div>
          <div className="mt-1 text-xs text-[#969696] tabular-nums">
            {telemetry?.codingFilesCount ?? 0} files · {telemetry?.agentRunsCount ?? 0} workflows · {telemetry?.datasetsCount ?? 0} datasets
          </div>
        </div>
      </section>

      {/* Quick Access Workbench Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-[#F5F5F5]">Engineering Workbenches</h2>
          <span className="text-xs text-[#969696]">Select a module to begin</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickTools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => onNavigate(tool.id)}
              className="group text-left rounded-xl border border-white/10 bg-[#171717]/90 p-4 hover:border-[#E32636]/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {tool.icon}
                  <span className="font-display text-sm font-semibold text-[#F5F5F5] group-hover:text-white">
                    {tool.title}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-[#969696] group-hover:text-[#E32636] transition-colors" />
              </div>
              <p className="mt-2 text-xs text-[#969696] leading-relaxed">{tool.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Recent Conversations & System Activity Log */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 rounded-xl border border-white/10 bg-[#171717]/90 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-[#F5F5F5]">Recent Conversations</h2>
            <button
              type="button"
              onClick={() => onNavigate('playground')}
              className="text-xs text-[#B8B8B8] hover:text-[#E32636] transition-colors whitespace-nowrap shrink-0"
            >
              Open Playground
            </button>
          </div>
          {telemetry && telemetry.recentConversations.length > 0 ? (
            <div className="divide-y divide-white/10">
              {telemetry.recentConversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onOpenConversation(c.id)}
                  className="w-full py-3 text-left flex items-center justify-between gap-3 hover:bg-white/[0.02] px-2 -mx-2 rounded transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#F5F5F5] truncate">{c.title}</div>
                    <div className="mt-0.5 text-xs text-[#969696]">
                      <span className="font-mono">{c.model}</span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span className="tabular-nums">{c.messageCount ?? 0} messages</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#969696] shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-white/10 bg-[#101010] p-6 text-center space-y-2">
              <Terminal className="h-5 w-5 text-[#969696] mx-auto" />
              <div className="text-sm font-medium text-[#F5F5F5]">No conversations recorded yet</div>
              <p className="text-xs text-[#969696]">
                Send a prompt in Model Playground to begin tracking real tokens and latency.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('playground')}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#E32636] px-3 py-1.5 text-xs font-semibold text-[#F5F5F5] hover:bg-[#8F101D] transition-colors"
              >
                Start First Session
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-6 rounded-xl border border-white/10 bg-[#171717]/90 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-[#F5F5F5]">System Activity Log</h2>
            <span className="text-xs text-[#969696]">SQLite Audit Feed</span>
          </div>
          {telemetry && telemetry.recentActivities.length > 0 ? (
            <div className="divide-y divide-white/10 max-h-[290px] overflow-y-auto pr-1">
              {telemetry.recentActivities.map((act) => (
                <div key={act.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[#F5F5F5] flex items-center gap-2">
                      <span
                        className={
                          act.status === 'error'
                            ? 'text-[#E32636]'
                            : act.status === 'warning'
                              ? 'text-amber-400'
                              : 'text-[#B8B8B8]'
                        }
                      >
                        {act.status === 'error' ? '✖' : act.status === 'warning' ? '▲' : '●'}
                      </span>
                      <span className="truncate">{act.action}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-[#969696] truncate">{act.detail}</div>
                  </div>
                  <div className="text-right shrink-0 font-mono text-[11px] text-[#969696] tabular-nums">
                    {act.latencyMs ? `${act.latencyMs}ms` : new Date(act.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-white/10 bg-[#101010] p-6 text-center space-y-2">
              <Activity className="h-5 w-5 text-[#969696] mx-auto" />
              <div className="text-sm font-medium text-[#F5F5F5]">Audit log is clean</div>
              <p className="text-xs text-[#969696]">
                Actions from Playground, Coding Sandbox, Agents, Data Lab, and Benchmarks appear here in real time.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
