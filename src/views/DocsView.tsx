import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { DOCUMENTATION_ARTICLES } from '../data/docsData.ts';
import { MarkdownRenderer } from '../components/MarkdownRenderer.tsx';

export const DocsView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(DOCUMENTATION_ARTICLES[0].id);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DOCUMENTATION_ARTICLES;
    return DOCUMENTATION_ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q)
    );
  }, [query]);

  const active = filtered.find((a) => a.id === selectedId) ?? filtered[0];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-[#101010]/90 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F5F5F5]">Documentation Center</h1>
          <p className="text-xs text-[#969696] mt-1">
            Installation, API configuration, system architecture, security controls, troubleshooting, FAQ, and roadmap.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-[#969696] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documentation..."
            className="w-full rounded-lg border border-white/15 bg-[#080808] pl-9 pr-3 py-2 text-xs text-[#F5F5F5] focus:border-[#E32636] focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-4 rounded-xl border border-white/10 bg-[#171717]/90 divide-y divide-white/10">
          {filtered.length === 0 ? (
            <div className="p-4 text-xs text-[#969696]">No documentation articles matched "{query}".</div>
          ) : (
            filtered.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => setSelectedId(doc.id)}
                className={`w-full text-left p-3.5 transition-colors ${
                  active?.id === doc.id ? 'bg-[#E32636]/12' : 'hover:bg-white/[0.03]'
                }`}
              >
                <div className="text-[11px] font-mono text-[#E32636]">{doc.category}</div>
                <div className="text-sm font-medium text-[#F5F5F5] mt-0.5">{doc.title}</div>
                <div className="text-xs text-[#969696] mt-0.5 line-clamp-1">{doc.summary}</div>
              </button>
            ))
          )}
        </aside>

        <article className="lg:col-span-8 rounded-xl border border-white/10 bg-[#171717]/90 p-6 min-h-[420px]">
          {active ? (
            <div className="space-y-4">
              <div className="border-b border-white/10 pb-4">
                <div className="text-xs font-mono text-[#E32636]">{active.category}</div>
                <h2 className="font-display text-xl font-bold text-[#F5F5F5] mt-1">{active.title}</h2>
                <p className="text-xs text-[#969696] mt-1">{active.summary}</p>
              </div>
              <MarkdownRenderer content={active.body} />
            </div>
          ) : (
            <p className="text-xs text-[#969696]">Select an article to read.</p>
          )}
        </article>
      </div>
    </div>
  );
};
