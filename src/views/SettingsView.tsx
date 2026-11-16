import React, { useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';

interface SettingsViewProps {
  particleDensity: 'high' | 'medium' | 'low';
  onChangeDensity: (d: 'high' | 'medium' | 'low') => void;
  reducedMotion: boolean;
  onToggleReducedMotion: (val: boolean) => void;
  defaultHumanApproval: boolean;
  onToggleHumanApproval: (val: boolean) => void;
  geminiConfigured: boolean;
  onResetWorkspace: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  particleDensity,
  onChangeDensity,
  reducedMotion,
  onToggleReducedMotion,
  defaultHumanApproval,
  onToggleHumanApproval,
  geminiConfigured,
  onResetWorkspace,
}) => {
  const [confirming, setConfirming] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const handleReset = async () => {
    await onResetWorkspace();
    setConfirming(false);
    setResetMessage('Cleared stored conversations, agent runs, benchmarks, and activity logs.');
    setTimeout(() => setResetMessage(''), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="rounded-xl border border-white/10 bg-[#101010]/90 p-5">
        <h1 className="font-display text-2xl font-bold text-[#F5F5F5]">Platform Settings</h1>
        <p className="text-xs text-[#969696] mt-1">
          Configure rendering performance, multi-agent approval policy, and workspace persistence.
        </p>
      </div>

      {/* Server Environment Status (Read-only, zero API key inputs) */}
      <section className="rounded-xl border border-white/10 bg-[#171717]/90 p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#F5F5F5]">
          <ShieldCheck className="h-4 w-4 text-[#E32636]" />
          <span>Server-Side Model Runtime</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="rounded-lg border border-white/10 bg-[#101010] p-3.5">
            <div className="text-[#969696]">Environment Status</div>
            <div className="mt-1 font-mono text-sm text-[#F5F5F5]">
              {geminiConfigured ? '● GEMINI_API_KEY Active (Server-Side)' : '▲ GEMINI_API_KEY Not Configured'}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#101010] p-3.5">
            <div className="text-[#969696]">Secrets Management</div>
            <div className="mt-1 text-[#B8B8B8]">
              Managed externally via Settings &gt; Secrets. Never exposed to browser bundles.
            </div>
          </div>
        </div>
      </section>

      {/* Visual & Particle Engine */}
      <section className="rounded-xl border border-white/10 bg-[#171717]/90 p-5 space-y-4">
        <h2 className="font-display text-base font-semibold text-[#F5F5F5]">
          Particle Engine & Motion
        </h2>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="text-sm font-medium text-[#F5F5F5]">Particle Density</div>
            <div className="text-xs text-[#969696]">
              Controls active Canvas nodes (automatically scales down on mobile & hidden tabs).
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-[#101010] p-1 border border-white/10">
            {(['low', 'medium', 'high'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onChangeDensity(d)}
                className={`px-3 py-1.5 rounded text-xs capitalize transition-colors ${
                  particleDensity === d
                    ? 'bg-[#E32636] text-[#F5F5F5]'
                    : 'text-[#B8B8B8] hover:text-[#F5F5F5]'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <div className="text-sm font-medium text-[#F5F5F5]">Reduce Motion Override</div>
            <div className="text-xs text-[#969696]">
              Freeze ambient particle drift while keeping functional controls responsive.
            </div>
          </div>
          <input
            type="checkbox"
            checked={reducedMotion}
            onChange={(e) => onToggleReducedMotion(e.target.checked)}
            className="h-4 w-4 accent-[#E32636]"
          />
        </label>
      </section>

      {/* Agent Safety Policy */}
      <section className="rounded-xl border border-white/10 bg-[#171717]/90 p-5 space-y-4">
        <h2 className="font-display text-base font-semibold text-[#F5F5F5]">
          Autonomous Agent Governance
        </h2>
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <div className="text-sm font-medium text-[#F5F5F5]">
              Default Human Approval Checkpoint
            </div>
            <div className="text-xs text-[#969696]">
              Require operator approval after Orchestrator planning before executing downstream agents.
            </div>
          </div>
          <input
            type="checkbox"
            checked={defaultHumanApproval}
            onChange={(e) => onToggleHumanApproval(e.target.checked)}
            className="h-4 w-4 accent-[#E32636]"
          />
        </label>
      </section>

      {/* SQLite Maintenance */}
      <section className="rounded-xl border border-white/10 bg-[#171717]/90 p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-[#F5F5F5]">
              Workspace Database Maintenance
            </h2>
            <p className="text-xs text-[#969696] mt-0.5">
              Clear saved conversations, workflow runs, benchmark history, and activity logs from SQLite.
            </p>
          </div>
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E32636]/50 bg-[#101010] px-3.5 py-2 text-xs font-medium text-[#E32636] hover:bg-[#E32636] hover:text-[#F5F5F5] transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reset Telemetry History</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-[#B8B8B8]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg bg-[#E32636] px-3.5 py-1.5 text-xs font-semibold text-[#F5F5F5]"
              >
                Confirm Clear
              </button>
            </div>
          )}
        </div>
        {resetMessage && <div className="text-xs text-[#B8B8B8]">{resetMessage}</div>}
      </section>
    </div>
  );
};
