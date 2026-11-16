import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  MessageSquarePlus,
  Send,
  Trash2,
} from 'lucide-react';
import type {
  ChatMessageRecord,
  ConversationRecord,
  GeminiModelId,
  ModelSpec,
  ThinkingLevelOption,
} from '../types/oxygen.ts';
import { MarkdownRenderer } from '../components/MarkdownRenderer.tsx';
import { ProcessingWaveform } from '../components/ParticleEngine.tsx';

interface PlaygroundViewProps {
  models: ModelSpec[];
  initialConversationId?: string | null;
  onTelemetryRefresh: () => void;
}

const SYSTEM_PRESETS = [
  {
    label: 'Hydrogen Engineering Mentor',
    value:
      'You are OXYGEN AI, a senior Google Gemini Hydrogen engineering mentor. Give crisp, accurate explanations, runnable Python/TypeScript code, and explicitly avoid fabricating capabilities.',
  },
  {
    label: 'Strict Python Architect',
    value:
      'You are a Principal Python Engineer. Write modular, type-annotated Python 3.10+ code with comprehensive edge-case handling and unit tests.',
  },
  {
    label: 'Security & Audit Reviewer',
    value:
      'You are an Application Security Engineer. Identify injection vectors, secret exposure risks, and reliability issues concisely.',
  },
];

export const PlaygroundView: React.FC<PlaygroundViewProps> = ({
  models,
  initialConversationId,
  onTelemetryRefresh,
}) => {
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);

  const [selectedModel, setSelectedModel] = useState<GeminiModelId>('gemini-4-hydrogen');
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevelOption>('HIGH');
  const [systemInstruction, setSystemInstruction] = useState(SYSTEM_PRESETS[0].value);
  const [promptInput, setPromptInput] = useState('');

  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const chatModels = models.filter((m) => !m.isImageModel);
  const currentSpec = models.find((m) => m.id === selectedModel);

  const loadConversations = async () => {
    const res = await fetch('/api/playground/conversations');
    const data = (await res.json()) as { conversations: ConversationRecord[] };
    setConversations(data.conversations ?? []);
    return data.conversations ?? [];
  };

  const loadMessages = async (convId: string) => {
    const res = await fetch(`/api/playground/conversations/${convId}/messages`);
    const data = (await res.json()) as { messages: ChatMessageRecord[] };
    setMessages(data.messages ?? []);
  };

  useEffect(() => {
    loadConversations().then((list) => {
      if (initialConversationId && list.some((c) => c.id === initialConversationId)) {
        setActiveConvId(initialConversationId);
        loadMessages(initialConversationId);
      } else if (list.length > 0 && !activeConvId) {
        setActiveConvId(list[0].id);
        loadMessages(list[0].id);
      }
    });
  }, [initialConversationId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleModelChange = (nextModel: GeminiModelId) => {
    setSelectedModel(nextModel);
    const spec = models.find((m) => m.id === nextModel);
    if (spec && spec.supportsThinking.length > 0) {
      setThinkingLevel(spec.defaultThinking);
    }
  };

  const handleNewConversation = async () => {
    setErrorMsg(null);
    const res = await fetch('/api/playground/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Hydrogen Session',
        model: selectedModel,
        systemInstruction,
      }),
    });
    const data = (await res.json()) as { conversation: ConversationRecord };
    setActiveConvId(data.conversation.id);
    setMessages([]);
    await loadConversations();
  };

  const handleDeleteConversation = async (id: string) => {
    await fetch(`/api/playground/conversations/${id}`, { method: 'DELETE' });
    const list = await loadConversations();
    if (activeConvId === id) {
      if (list.length > 0) {
        setActiveConvId(list[0].id);
        await loadMessages(list[0].id);
      } else {
        setActiveConvId('');
        setMessages([]);
      }
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isStreaming) return;

    setErrorMsg(null);
    let convId = activeConvId;
    if (!convId) {
      const created = await fetch('/api/playground/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: promptInput.slice(0, 48),
          model: selectedModel,
          systemInstruction,
        }),
      }).then((r) => r.json());
      convId = created.conversation.id;
      setActiveConvId(convId);
    }

    const userText = promptInput.trim();
    setPromptInput('');

    const optimisticUser: ChatMessageRecord = {
      id: `tmp-u-${Date.now()}`,
      conversationId: convId,
      role: 'user',
      content: userText,
      model: selectedModel,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setIsStreaming(true);
    setStreamingText('');

    try {
      const response = await fetch('/api/playground/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          message: userText,
          model: selectedModel,
          systemInstruction,
          thinkingLevel,
        }),
      });

      if (!response.body) {
        throw new Error('Streaming response body unavailable.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const chunkLine of lines) {
          if (!chunkLine.startsWith('data: ')) continue;
          const payload = JSON.parse(chunkLine.slice(6)) as {
            type: 'chunk' | 'done' | 'error';
            text?: string;
            message?: ChatMessageRecord;
            error?: string;
          };
          if (payload.type === 'chunk' && payload.text) {
            setStreamingText((prev) => prev + payload.text);
          } else if (payload.type === 'error') {
            setErrorMsg(payload.error || 'Model request failed.');
          } else if (payload.type === 'done' && payload.message) {
            setStreamingText('');
            await loadMessages(convId);
            await loadConversations();
            onTelemetryRefresh();
          }
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsStreaming(false);
      setStreamingText('');
    }
  };

  const handleExportMarkdown = () => {
    const md = messages
      .map((m) => `### ${m.role === 'user' ? 'User' : `Model (${m.model})`}\n\n${m.content}\n`)
      .join('\n---\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oxygen-session-${activeConvId || 'export'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyText = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-4">
      {/* Header & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#101010]/90 p-4">
        <div>
          <h1 className="font-display text-lg font-semibold text-[#F5F5F5]">
            Hydrogen Multi-Turn Model Playground
          </h1>
          <p className="text-xs text-[#969696]">
            Stream live responses with configurable Thinking Levels and persistent SQLite conversation history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ProcessingWaveform active={isStreaming} />
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleExportMarkdown}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#171717] px-3 py-1.5 text-xs text-[#B8B8B8] hover:text-[#F5F5F5] whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Markdown</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleNewConversation}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#171717] border border-white/15 px-3 py-1.5 text-xs font-medium text-[#F5F5F5] hover:border-[#E32636] whitespace-nowrap shrink-0"
          >
            <MessageSquarePlus className="h-3.5 w-3.5 text-[#E32636]" />
            <span>New Session</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-[#E32636]/50 bg-[#E32636]/10 px-4 py-3 text-xs text-[#F5F5F5]">
          <span className="font-semibold text-[#E32636]">Runtime Notice: </span>
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Rail: History & Model Config */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#171717]/90 p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#B8B8B8]">Model Tier</label>
              <select
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value as GeminiModelId)}
                className="w-full rounded-lg border border-white/15 bg-[#0C0C0C] px-3 py-2 text-xs text-[#F5F5F5] focus:border-[#E32636] focus:outline-none"
              >
                {chatModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.id})
                  </option>
                ))}
              </select>
              {currentSpec && (
                <p className="text-[11px] text-[#969696] leading-relaxed">{currentSpec.role}</p>
              )}
            </div>

            {currentSpec && currentSpec.supportsThinking.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#B8B8B8]">Thinking Level</label>
                <div className="flex flex-wrap gap-1.5">
                  {currentSpec.supportsThinking.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setThinkingLevel(lvl)}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                        thinkingLevel === lvl
                          ? 'bg-[#E32636] text-[#F5F5F5]'
                          : 'bg-[#0C0C0C] text-[#969696] border border-white/10 hover:text-[#F5F5F5]'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#B8B8B8]">System Instruction</label>
                <select
                  onChange={(e) => {
                    const preset = SYSTEM_PRESETS.find((p) => p.label === e.target.value);
                    if (preset) setSystemInstruction(preset.value);
                  }}
                  className="rounded border border-white/10 bg-[#0C0C0C] px-2 py-0.5 text-[11px] text-[#B8B8B8]"
                  defaultValue={SYSTEM_PRESETS[0].label}
                >
                  {SYSTEM_PRESETS.map((p) => (
                    <option key={p.label} value={p.label}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                rows={4}
                value={systemInstruction}
                onChange={(e) => setSystemInstruction(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0C0C0C] p-2.5 text-xs text-[#E5E5E5] focus:border-[#E32636] focus:outline-none"
              />
            </div>
          </div>

          {/* Conversation History */}
          <div className="rounded-xl border border-white/10 bg-[#171717]/90 p-4 space-y-2.5">
            <div className="text-xs font-semibold text-[#B8B8B8]">Conversation History</div>
            {conversations.length === 0 ? (
              <p className="text-xs text-[#969696]">No saved threads yet.</p>
            ) : (
              <div className="space-y-1 max-h-[260px] overflow-y-auto pr-1">
                {conversations.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors ${
                      c.id === activeConvId ? 'bg-[#E32636]/15 text-[#F5F5F5]' : 'text-[#B8B8B8] hover:bg-white/[0.03]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveConvId(c.id);
                        loadMessages(c.id);
                      }}
                      className="flex-1 text-left truncate"
                    >
                      <div className="truncate font-medium">{c.title}</div>
                      <div className="text-[11px] text-[#969696] font-mono">
                        {c.model} · {c.messageCount ?? 0} msgs
                      </div>
                    </button>
                    <button
                      type="button"
                      aria-label="Delete conversation"
                      onClick={() => handleDeleteConversation(c.id)}
                      className="p-1 text-[#969696] hover:text-[#E32636]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Right Main Chat Thread */}
        <section className="lg:col-span-8 flex flex-col rounded-xl border border-white/10 bg-[#171717]/90 h-[690px]">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 && !streamingText && (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-3">
                <div className="font-display text-lg font-semibold text-[#F5F5F5]">
                  Hydrogen Multi-Turn Workspace
                </div>
                <p className="text-xs text-[#969696] leading-relaxed">
                  Select `gemini-4-hydrogen` for flagship engineering synthesis or `gemini-3.1-flash-lite` for ultra-low-latency replies, and send a prompt below.
                </p>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl p-4 border ${
                  m.role === 'user'
                    ? 'border-white/10 bg-[#101010] ml-6 sm:ml-12'
                    : 'border-white/10 bg-[#0B0B0B] mr-4 sm:mr-8'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2 text-[11px] text-[#969696]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#F5F5F5]">
                      {m.role === 'user' ? 'Engineer' : m.model}
                    </span>
                    {m.thinkingLevel && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{m.thinkingLevel}</span>
                      </>
                    )}
                    {m.latencyMs !== undefined && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{m.latencyMs}ms</span>
                      </>
                    )}
                    {(m.promptTokens || m.outputTokens) ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {m.promptTokens ?? 0} in / {m.outputTokens ?? 0} out tok
                        </span>
                      </>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText(m.id, m.content)}
                    className="inline-flex items-center gap-1 text-[#969696] hover:text-[#F5F5F5]"
                  >
                    {copiedId === m.id ? <Check className="h-3 w-3 text-[#E32636]" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <MarkdownRenderer content={m.content} />
              </div>
            ))}

            {streamingText && (
              <div className="rounded-xl p-4 border border-[#E32636]/40 bg-[#0B0B0B] mr-4 sm:mr-8">
                <div className="flex items-center gap-2 mb-2 text-[11px] text-[#E32636] font-mono">
                  <span>Streaming {selectedModel}...</span>
                </div>
                <MarkdownRenderer content={streamingText} />
              </div>
            )}

            <div ref={threadEndRef} />
          </div>

          <form onSubmit={handleSendChat} className="border-t border-white/10 p-4 flex gap-3 bg-[#101010] rounded-b-xl">
            <textarea
              rows={2}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChat(e);
                }
              }}
              placeholder={`Message ${selectedModel} (Enter to send, Shift+Enter for newline)...`}
              className="flex-1 resize-none rounded-lg border border-white/15 bg-[#080808] px-3.5 py-2.5 text-sm text-[#F5F5F5] placeholder-[#737373] focus:border-[#E32636] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isStreaming || !promptInput.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#E32636] px-5 py-2.5 text-sm font-semibold text-[#F5F5F5] hover:bg-[#8F101D] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
            >
              <Send className="h-4 w-4" />
              <span>{isStreaming ? 'Streaming' : 'Send'}</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
