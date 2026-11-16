import React, { useState } from 'react';
import { Code2, Play } from 'lucide-react';
import { WORKSHOP_PROJECTS } from '../data/projectsData.ts';
import { CodeBlock } from '../components/MarkdownRenderer.tsx';
import type { CodingLanguage } from '../types/oxygen.ts';

interface ProjectsViewProps {
  onOpenInStudio: (name: string, language: CodingLanguage, content: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ onOpenInStudio }) => {
  const [selectedId, setSelectedId] = useState(WORKSHOP_PROJECTS[0].id);
  const project = WORKSHOP_PROJECTS.find((p) => p.id === selectedId) ?? WORKSHOP_PROJECTS[0];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-[#101010]/90 p-5">
        <h1 className="font-display text-2xl font-bold text-[#F5F5F5]">Engineering Project Workshop</h1>
        <p className="text-xs text-[#969696] mt-1">
          10 hands-on engineering blueprints with verified architecture, runnable Python/SQL/PySpark code, tests, and direct Coding Studio integration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-4 rounded-xl border border-white/10 bg-[#171717]/90 divide-y divide-white/10">
          {WORKSHOP_PROJECTS.map((p) => {
            const active = p.id === project.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left p-3.5 transition-colors ${
                  active ? 'bg-[#E32636]/12' : 'hover:bg-white/[0.03]'
                }`}
              >
                <div className="text-[11px] font-mono text-[#969696]">
                  {p.number} · {p.difficulty} · {p.language.toUpperCase()}
                </div>
                <div className={`text-sm font-medium mt-0.5 ${active ? 'text-[#F5F5F5]' : 'text-[#D4D4D4]'}`}>
                  {p.title}
                </div>
              </button>
            );
          })}
        </aside>

        <article className="lg:col-span-8 rounded-xl border border-white/10 bg-[#171717]/90 p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="text-xs font-mono text-[#969696]">
                Project {project.number} · {project.difficulty} · Model: {project.recommendedModel}
              </div>
              <h2 className="font-display text-xl font-bold text-[#F5F5F5] mt-1">
                {project.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => onOpenInStudio(project.fileName, project.language, project.sourceCode)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#E32636] px-4 py-2 text-xs font-semibold text-[#F5F5F5] hover:bg-[#8F101D] whitespace-nowrap shrink-0"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Open in Coding Studio</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-white/10 bg-[#101010] p-4 space-y-2">
              <div className="text-xs font-semibold text-[#F5F5F5]">Objectives</div>
              <ul className="list-disc pl-4 space-y-1 text-xs text-[#D4D4D4]">
                {project.objectives.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#101010] p-4 space-y-2">
              <div className="text-xs font-semibold text-[#F5F5F5]">Prerequisites</div>
              <div className="text-xs text-[#B8B8B8] leading-relaxed">
                {project.prerequisites.join(' · ')}
              </div>
              <div className="text-xs font-semibold text-[#F5F5F5] pt-2">Architecture Flow</div>
              <div className="text-xs font-mono text-[#969696]">
                {project.architecture.join(' -> ')}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#F5F5F5]">
              <Code2 className="h-4 w-4 text-[#E32636]" />
              <span>Source Implementation ({project.fileName})</span>
            </div>
            <CodeBlock code={project.sourceCode} language={project.language} title={project.fileName} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-white/10 bg-[#101010] p-4 space-y-1.5">
              <div className="text-xs font-semibold text-[#F5F5F5]">Execution Steps</div>
              <ol className="list-decimal pl-4 space-y-1 text-xs text-[#D4D4D4]">
                {project.executionSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#101010] p-4 space-y-2">
              <div className="text-xs font-semibold text-[#F5F5F5]">Verification & Expected Result</div>
              <div className="font-mono text-[11px] text-[#B8B8B8]">{project.testCases}</div>
              <p className="text-xs text-[#969696]">{project.expectedResults}</p>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};
