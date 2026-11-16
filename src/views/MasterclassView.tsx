import React, { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Circle, Code2, Play } from 'lucide-react';
import { MASTERCLASS_CURRICULUM, type MasterclassLesson } from '../data/masterclassData.ts';
import { CodeBlock } from '../components/MarkdownRenderer.tsx';
import type { CodingLanguage } from '../types/oxygen.ts';

interface MasterclassViewProps {
  progress: Record<string, { completed: boolean; quizScore?: number }>;
  onSaveProgress: (lessonId: string, completed: boolean, quizScore?: number) => Promise<void>;
  onOpenInStudio: (name: string, language: CodingLanguage, content: string) => void;
}

export const MasterclassView: React.FC<MasterclassViewProps> = ({
  progress,
  onSaveProgress,
  onOpenInStudio,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<number>(0);
  const [activeLessonId, setActiveLessonId] = useState<string>(MASTERCLASS_CURRICULUM[0].id);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const filteredLessons = useMemo(() => {
    if (selectedLevel === 0) return MASTERCLASS_CURRICULUM;
    return MASTERCLASS_CURRICULUM.filter((l) => l.level === selectedLevel);
  }, [selectedLevel]);

  const activeLesson: MasterclassLesson = useMemo(() => {
    return MASTERCLASS_CURRICULUM.find((l) => l.id === activeLessonId) ?? MASTERCLASS_CURRICULUM[0];
  }, [activeLessonId]);

  const completedCount = useMemo(
    () => MASTERCLASS_CURRICULUM.filter((l) => progress[l.id]?.completed).length,
    [progress]
  );

  const completionPct = Math.round((completedCount / MASTERCLASS_CURRICULUM.length) * 100);

  const handleSelectLesson = (id: string) => {
    setActiveLessonId(id);
    setSelectedOption(null);
    setQuizSubmitted(false);
  };

  const handleQuizSubmit = async () => {
    if (selectedOption === null) return;
    setQuizSubmitted(true);
    const isCorrect = selectedOption === activeLesson.quiz.correctIndex;
    await onSaveProgress(activeLesson.id, true, isCorrect ? 100 : 50);
  };

  const isDone = Boolean(progress[activeLesson.id]?.completed);

  return (
    <div className="space-y-6">
      {/* Header & Progress Bar */}
      <div className="rounded-xl border border-white/10 bg-[#101010]/90 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-[#969696]">Complete Curriculum · Levels 1 to 7</div>
          <h1 className="font-display text-2xl font-bold text-[#F5F5F5] mt-1">
            Hydrogen Engineering Masterclass
          </h1>
          <p className="text-xs text-[#B8B8B8] mt-1">
            Verified Google Gemini SDK facts separated clearly from general LLM and software engineering principles.
          </p>
        </div>

        <div className="min-w-[240px] space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#969696]">Curriculum Completion</span>
            <span className="font-mono text-[#F5F5F5] tabular-nums">
              {completedCount}/{MASTERCLASS_CURRICULUM.length} ({completionPct}%)
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-[#171717] overflow-hidden border border-white/10">
            <div
              className="h-full bg-[#E32636] transition-all duration-300"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Level Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedLevel(0)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
            selectedLevel === 0
              ? 'bg-[#E32636] text-[#F5F5F5]'
              : 'bg-[#171717] text-[#B8B8B8] hover:text-[#F5F5F5] border border-white/10'
          }`}
        >
          All Levels
        </button>
        {[1, 2, 3, 4, 5, 6, 7].map((lvl) => (
          <button
            key={lvl}
            type="button"
            onClick={() => setSelectedLevel(lvl)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              selectedLevel === lvl
                ? 'bg-[#E32636] text-[#F5F5F5]'
                : 'bg-[#171717] text-[#B8B8B8] hover:text-[#F5F5F5] border border-white/10'
            }`}
          >
            Level {lvl}
          </button>
        ))}
      </div>

      {/* Two-Column Curriculum Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Lesson Sidebar List */}
        <aside className="lg:col-span-4 rounded-xl border border-white/10 bg-[#171717]/90 divide-y divide-white/10 max-h-[760px] overflow-y-auto">
          {filteredLessons.map((lesson) => {
            const completed = Boolean(progress[lesson.id]?.completed);
            const active = lesson.id === activeLesson.id;
            return (
              <button
                key={lesson.id}
                type="button"
                onClick={() => handleSelectLesson(lesson.id)}
                className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 ${
                  active ? 'bg-[#E32636]/12' : 'hover:bg-white/[0.03]'
                }`}
              >
                {completed ? (
                  <CheckCircle2 className="h-4 w-4 text-[#E32636] shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-4 w-4 text-[#969696] shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="text-[11px] text-[#969696]">
                    {lesson.levelTitle} · {lesson.durationMinutes} min
                  </div>
                  <div className={`text-sm font-medium mt-0.5 ${active ? 'text-[#F5F5F5]' : 'text-[#D4D4D4]'}`}>
                    {lesson.title}
                  </div>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Lesson Content Reader */}
        <article className="lg:col-span-8 rounded-xl border border-white/10 bg-[#171717]/90 p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
            <div className="space-y-1.5">
              <div className="text-xs text-[#969696]">
                {activeLesson.levelTitle} · {activeLesson.durationMinutes} min · {activeLesson.topics.join(' / ')}
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#F5F5F5]">
                {activeLesson.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => onSaveProgress(activeLesson.id, !isDone)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                isDone
                  ? 'bg-[#101010] border border-[#E32636]/50 text-[#F5F5F5]'
                  : 'bg-[#E32636] text-[#F5F5F5] hover:bg-[#8F101D]'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{isDone ? 'Completed' : 'Mark Complete'}</span>
            </button>
          </div>

          {/* Learning Objectives */}
          <div className="space-y-2">
            <h3 className="font-display text-sm font-semibold text-[#F5F5F5] flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#E32636]" />
              <span>Learning Objectives</span>
            </h3>
            <ul className="space-y-1.5 text-sm text-[#D4D4D4] list-disc pl-5">
              {activeLesson.objectives.map((obj, idx) => (
                <li key={idx}>{obj}</li>
              ))}
            </ul>
          </div>

          {/* Verified Docs vs Engineering Knowledge */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-[#E32636]/30 bg-[#101010] p-4 space-y-2">
              <div className="text-xs font-semibold text-[#E32636]">
                Verified Gemini API Documentation
              </div>
              <ul className="space-y-1.5 text-xs text-[#E5E5E5] leading-relaxed">
                {activeLesson.verifiedDocumentation.map((fact, idx) => (
                  <li key={idx}>{fact}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#101010] p-4 space-y-2">
              <div className="text-xs font-semibold text-[#B8B8B8]">
                General LLM Engineering Knowledge
              </div>
              <p className="text-xs text-[#D4D4D4] leading-relaxed">{activeLesson.engineeringKnowledge}</p>
            </div>
          </div>

          {/* Technical Pipeline Diagram */}
          <div className="space-y-2.5">
            <h3 className="font-display text-sm font-semibold text-[#F5F5F5]">Technical Architecture Flow</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {activeLesson.diagramSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="relative rounded-lg border border-white/10 bg-[#101010] p-3 flex flex-col justify-between"
                >
                  <div className="font-mono text-[11px] text-[#E32636]">0{idx + 1}</div>
                  <div className="text-xs font-semibold text-[#F5F5F5] mt-1">{step.label}</div>
                  <div className="text-[11px] text-[#969696] mt-0.5">{step.sublabel}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Runnable Python Code Example + Open in Studio */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-sm font-semibold text-[#F5F5F5] flex items-center gap-2">
                <Code2 className="h-4 w-4 text-[#E32636]" />
                <span>Python Code Example</span>
              </h3>
              <button
                type="button"
                onClick={() =>
                  onOpenInStudio(`${activeLesson.id.toLowerCase()}_lab.py`, 'python', activeLesson.pythonCode)
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#101010] px-3 py-1.5 text-xs font-medium text-[#F5F5F5] hover:border-[#E32636] transition-colors whitespace-nowrap shrink-0"
              >
                <Play className="h-3.5 w-3.5 text-[#E32636]" />
                <span>Open & Run in Coding Studio</span>
              </button>
            </div>
            <CodeBlock code={activeLesson.pythonCode} language="python" title={`${activeLesson.id}.py`} />
            <div className="rounded-lg border border-white/10 bg-[#0B0B0B] p-3">
              <div className="text-[11px] font-mono text-[#969696] mb-1">Expected Output</div>
              <pre className="font-mono text-xs text-[#B8B8B8] whitespace-pre-wrap">{activeLesson.expectedOutput}</pre>
            </div>
          </div>

          {/* Exercise & Common Mistakes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-white/10 bg-[#101010] p-4 space-y-2">
              <h4 className="text-xs font-semibold text-[#F5F5F5]">Step-by-Step Exercise</h4>
              <ol className="list-decimal pl-4 space-y-1.5 text-xs text-[#D4D4D4]">
                {activeLesson.exerciseSteps.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ol>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#101010] p-4 space-y-2">
              <h4 className="text-xs font-semibold text-[#F5F5F5]">Common Engineering Mistakes</h4>
              <ul className="list-disc pl-4 space-y-1.5 text-xs text-[#D4D4D4]">
                {activeLesson.commonMistakes.map((m, idx) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Knowledge Check Quiz */}
          <div className="rounded-lg border border-white/10 bg-[#101010] p-4 space-y-3">
            <div className="text-xs font-semibold text-[#E32636]">Knowledge Check</div>
            <div className="text-sm font-medium text-[#F5F5F5]">{activeLesson.quiz.question}</div>
            <div className="space-y-2">
              {activeLesson.quiz.options.map((opt, idx) => {
                const chosen = selectedOption === idx;
                const isCorrect = idx === activeLesson.quiz.correctIndex;
                let borderStyle = 'border-white/10 bg-[#171717] text-[#D4D4D4]';
                if (quizSubmitted && isCorrect) {
                  borderStyle = 'border-emerald-500/60 bg-emerald-500/10 text-[#F5F5F5]';
                } else if (quizSubmitted && chosen && !isCorrect) {
                  borderStyle = 'border-[#E32636] bg-[#E32636]/10 text-[#F5F5F5]';
                } else if (chosen) {
                  borderStyle = 'border-[#E32636]/70 bg-[#E32636]/10 text-[#F5F5F5]';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedOption(idx);
                      setQuizSubmitted(false);
                    }}
                    className={`w-full text-left rounded-lg border px-3.5 py-2.5 text-xs transition-colors ${borderStyle}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                disabled={selectedOption === null}
                onClick={handleQuizSubmit}
                className="rounded-lg bg-[#E32636] px-4 py-2 text-xs font-semibold text-[#F5F5F5] hover:bg-[#8F101D] disabled:opacity-40 transition-colors"
              >
                Verify Answer
              </button>
              {quizSubmitted && (
                <div className="text-xs text-[#B8B8B8] flex-1">
                  {selectedOption === activeLesson.quiz.correctIndex ? '● Correct: ' : '✖ Review: '}
                  {activeLesson.quiz.explanation}
                </div>
              )}
            </div>
          </div>

          {/* Mini Project */}
          <div className="rounded-lg border border-white/10 bg-[#0D0D0D] p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-[#B8B8B8]">Mini Project Challenge</div>
              <p className="text-xs text-[#969696] mt-1">{activeLesson.miniProject}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-[#E32636] shrink-0" />
          </div>
        </article>
      </div>
    </div>
  );
};
