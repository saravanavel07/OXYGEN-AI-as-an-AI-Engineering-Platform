import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  BookOpen,
  Bot,
  ChevronRight,
  Code2,
  Database,
  FlaskConical,
  FolderGit2,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  MapPin,
  Menu,
  MessageSquare,
  Search,
  Settings,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type {
  ActivityLogRecord,
  CodingLanguage,
  DashboardTelemetry,
  ModelSpec,
  NavSectionId,
} from './types/oxygen.ts';
import { OxygenLogo } from './components/OxygenLogo.tsx';
import { ParticleEngine } from './components/ParticleEngine.tsx';
import { CommandCenterView } from './views/CommandCenterView.tsx';
import { MasterclassView } from './views/MasterclassView.tsx';
import { PlaygroundView } from './views/PlaygroundView.tsx';
import { CodingStudioView } from './views/CodingStudioView.tsx';
import { AgentsView } from './views/AgentsView.tsx';
import { DataLabView } from './views/DataLabView.tsx';
import { GeospatialView } from './views/GeospatialView.tsx';
import { ApiLabView } from './views/ApiLabView.tsx';
import { BenchmarksView } from './views/BenchmarksView.tsx';
import { ProjectsView } from './views/ProjectsView.tsx';
import { DocsView } from './views/DocsView.tsx';
import { SettingsView } from './views/SettingsView.tsx';

interface NavItem {
  id: NavSectionId;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'command-center', label: 'Command Center', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'masterclass', label: 'Hydrogen Masterclass', icon: <GraduationCap className="h-4 w-4" /> },
  { id: 'playground', label: 'Model Playground', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'coding-studio', label: 'AI Coding Studio', icon: <Code2 className="h-4 w-4" /> },
  { id: 'agents', label: 'Agent Control Center', icon: <Bot className="h-4 w-4" /> },
  { id: 'data-lab', label: 'Data Intelligence Lab', icon: <Database className="h-4 w-4" /> },
  { id: 'geospatial', label: 'Geospatial Explorer', icon: <MapPin className="h-4 w-4" /> },
  { id: 'api-lab', label: 'API Laboratory', icon: <FlaskConical className="h-4 w-4" /> },
  { id: 'benchmarks', label: 'Benchmark Center', icon: <Gauge className="h-4 w-4" /> },
  { id: 'projects', label: 'Project Workshop', icon: <FolderGit2 className="h-4 w-4" /> },
  { id: 'docs', label: 'Documentation', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
];

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSectionId>(() => {
    const saved = localStorage.getItem('oxygen_active_section') as NavSectionId | null;
    return saved && NAV_ITEMS.some((n) => n.id === saved) ? saved : 'command-center';
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [telemetry, setTelemetry] = useState<DashboardTelemetry | null>(null);
  const [models, setModels] = useState<ModelSpec[]>([]);
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [loadingDash, setLoadingDash] = useState(true);
  const [logs, setLogs] = useState<ActivityLogRecord[]>([]);
  const [masterclassProgress, setMasterclassProgress] = useState<
    Record<string, { completed: boolean; quizScore?: number }>
  >({});

  // Cross-view handoff states
  const [playgroundConvId, setPlaygroundConvId] = useState<string | null>(null);
  const [studioExternalFile, setStudioExternalFile] = useState<{
    name: string;
    language: CodingLanguage;
    content: string;
  } | null>(null);

  // User preferences
  const [particleDensity, setParticleDensity] = useState<'high' | 'medium' | 'low'>('medium');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [defaultHumanApproval, setDefaultHumanApproval] = useState(true);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  const refreshDashboard = useCallback(async () => {
    try {
      const [healthRes, dashRes, progRes, logsRes] = await Promise.all([
        fetch('/api/health').then((r) => r.json()),
        fetch('/api/dashboard').then((r) => r.json()),
        fetch('/api/masterclass/progress').then((r) => r.json()),
        fetch('/api/logs').then((r) => r.json()),
      ]);
      setModels(healthRes.models ?? []);
      setGeminiConfigured(Boolean(healthRes.geminiConfigured));
      setTelemetry(dashRes);
      setMasterclassProgress(progRes.progress ?? {});
      setLogs(logsRes.logs ?? []);
    } finally {
      setLoadingDash(false);
    }
  }, []);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  useEffect(() => {
    const onQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  const navigate = (section: NavSectionId) => {
    setActiveSection(section);
    localStorage.setItem('oxygen_active_section', section);
    setMobileMenuOpen(false);
  };

  const handleSaveMasterclassProgress = async (
    lessonId: string,
    completed: boolean,
    quizScore?: number
  ) => {
    const res = await fetch('/api/masterclass/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId, completed, quizScore }),
    });
    const data = await res.json();
    setMasterclassProgress(data.progress ?? {});
    refreshDashboard();
  };

  const handleOpenInStudio = (name: string, language: CodingLanguage, content: string) => {
    setStudioExternalFile({ name, language, content });
    navigate('coding-studio');
  };

  const handleOpenConversation = (convId: string) => {
    setPlaygroundConvId(convId);
    navigate('playground');
  };

  const handleResetWorkspace = async () => {
    await fetch('/api/settings/reset', { method: 'POST' });
    await refreshDashboard();
  };

  const activeNavItem = NAV_ITEMS.find((n) => n.id === activeSection) ?? NAV_ITEMS[0];
  const filteredNavSearch = NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="relative min-h-screen bg-[#080808] text-[#F5F5F5] flex">
      {/* Live Canvas Particle Engine */}
      <ParticleEngine density={particleDensity} reducedMotionOverride={reducedMotion} />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30 border-r border-white/10 bg-[#101010]/95 backdrop-blur-sm">
        <div className="h-16 px-5 flex items-center border-b border-white/10">
          <OxygenLogo size={26} />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const active = item.id === activeSection;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#E32636]/15 text-[#F5F5F5] border border-[#E32636]/40'
                    : 'text-[#B8B8B8] hover:text-[#F5F5F5] hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <span className={active ? 'text-[#E32636]' : 'text-[#969696]'}>{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 text-xs">
          <div className="text-[#969696]">Active Hydrogen Tier</div>
          <div className="mt-1 font-mono text-[#F5F5F5]">gemini-4-hydrogen</div>
          <div className="mt-0.5 text-[11px] text-[#969696]">
            {geminiConfigured ? '● Runtime Key Active' : '▲ Key Required in Secrets'}
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[80vw] bg-[#101010] border-r border-white/10 flex flex-col">
            <div className="h-14 px-4 flex items-center justify-between border-b border-white/10">
              <OxygenLogo size={24} />
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-[#969696] hover:text-[#F5F5F5]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = item.id === activeSection;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium ${
                      active
                        ? 'bg-[#E32636]/15 text-[#F5F5F5] border border-[#E32636]/40'
                        : 'text-[#B8B8B8] hover:text-[#F5F5F5]'
                    }`}
                  >
                    <span className={active ? 'text-[#E32636]' : 'text-[#969696]'}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 relative z-10">
        {mapsQuotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}
        {/* Top Bar (Clean Breadcrumb + Search + Notifications + Profile/Model) */}
        <header className="sticky top-0 z-20 h-14 border-b border-white/10 bg-[#080808]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-white/10 text-[#B8B8B8] hover:text-[#F5F5F5]"
            >
              <Menu className="h-4 w-4" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs min-w-0">
              <button
                type="button"
                onClick={() => navigate('command-center')}
                className="text-[#969696] hover:text-[#F5F5F5] whitespace-nowrap shrink-0"
              >
                OXYGEN AI
              </button>
              <ChevronRight className="h-3.5 w-3.5 text-[#969696] shrink-0" />
              <span className="font-medium text-[#F5F5F5] truncate">{activeNavItem.label}</span>
            </nav>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#101010] px-3 py-1.5 text-xs text-[#B8B8B8] hover:text-[#F5F5F5] whitespace-nowrap shrink-0"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Jump to Module</span>
            </button>

            <button
              type="button"
              aria-label="Notifications and audit activity"
              onClick={() => setNotificationsOpen((v) => !v)}
              className="relative rounded-lg border border-white/10 bg-[#101010] p-2 text-[#B8B8B8] hover:text-[#F5F5F5]"
            >
              <Bell className="h-4 w-4" />
              {logs.length > 0 && (
                <span className="sr-only">{logs.length} activity items</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('settings')}
              className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#101010] px-3 py-1.5 text-xs text-[#F5F5F5] hover:border-[#E32636]/50 whitespace-nowrap shrink-0"
            >
              <span className="font-mono text-[11px] text-[#B8B8B8]">
                {geminiConfigured ? '● Hydrogen Ready' : '▲ Key Missing'}
              </span>
            </button>
          </div>
        </header>

        {/* Quick Module Search Dropdown */}
        {searchOpen && (
          <div className="border-b border-white/10 bg-[#101010] px-4 sm:px-6 py-3">
            <div className="max-w-xl space-y-2">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter platform modules..."
                className="w-full rounded-lg border border-white/15 bg-[#080808] px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#E32636] focus:outline-none"
              />
              <div className="flex flex-wrap gap-1.5">
                {filteredNavSearch.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      navigate(item.id);
                      setSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#171717] px-2.5 py-1.5 text-xs text-[#E5E5E5] hover:border-[#E32636]"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Notifications Drawer */}
        {notificationsOpen && (
          <div className="border-b border-white/10 bg-[#101010] px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#F5F5F5]">Recent Activity Feed</span>
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                className="text-xs text-[#969696] hover:text-[#F5F5F5]"
              >
                Close
              </button>
            </div>
            {logs.length === 0 ? (
              <p className="text-xs text-[#969696]">No recent workspace events recorded.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {logs.slice(0, 6).map((l) => (
                  <div key={l.id} className="rounded-lg border border-white/10 bg-[#171717] p-2.5 text-xs">
                    <div className="font-medium text-[#F5F5F5] truncate">{l.action}</div>
                    <div className="text-[11px] text-[#969696] truncate">{l.detail}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active View Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeSection === 'command-center' && (
                <CommandCenterView
                  telemetry={telemetry}
                  loading={loadingDash}
                  activeModel="gemini-4-hydrogen"
                  onNavigate={navigate}
                  onOpenConversation={handleOpenConversation}
                />
              )}
              {activeSection === 'masterclass' && (
                <MasterclassView
                  progress={masterclassProgress}
                  onSaveProgress={handleSaveMasterclassProgress}
                  onOpenInStudio={handleOpenInStudio}
                />
              )}
              {activeSection === 'playground' && (
                <PlaygroundView
                  models={models}
                  initialConversationId={playgroundConvId}
                  onTelemetryRefresh={refreshDashboard}
                />
              )}
              {activeSection === 'coding-studio' && (
                <CodingStudioView
                  externalFile={studioExternalFile}
                  onTelemetryRefresh={refreshDashboard}
                />
              )}
              {activeSection === 'agents' && (
                <AgentsView
                  defaultHumanApproval={defaultHumanApproval}
                  onTelemetryRefresh={refreshDashboard}
                />
              )}
              {activeSection === 'data-lab' && (
                <DataLabView onTelemetryRefresh={refreshDashboard} />
              )}
              {activeSection === 'geospatial' && <GeospatialView />}
              {activeSection === 'api-lab' && <ApiLabView />}
              {activeSection === 'benchmarks' && (
                <BenchmarksView onTelemetryRefresh={refreshDashboard} />
              )}
              {activeSection === 'projects' && (
                <ProjectsView onOpenInStudio={handleOpenInStudio} />
              )}
              {activeSection === 'docs' && <DocsView />}
              {activeSection === 'settings' && (
                <SettingsView
                  particleDensity={particleDensity}
                  onChangeDensity={setParticleDensity}
                  reducedMotion={reducedMotion}
                  onToggleReducedMotion={setReducedMotion}
                  defaultHumanApproval={defaultHumanApproval}
                  onToggleHumanApproval={setDefaultHumanApproval}
                  geminiConfigured={geminiConfigured}
                  onResetWorkspace={handleResetWorkspace}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
