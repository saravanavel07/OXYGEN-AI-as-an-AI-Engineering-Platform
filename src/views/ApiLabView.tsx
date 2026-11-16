import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { CodeBlock } from '../components/MarkdownRenderer.tsx';
import type { GeminiModelId, ThinkingLevelOption } from '../types/oxygen.ts';

type SnippetCategory = 'text' | 'streaming' | 'structured_json' | 'function_calling';

const CODE_EXAMPLES: Record<
  SnippetCategory,
  { title: string; python: string; typescript: string; curl: string }
> = {
  text: {
    title: 'Standard Model Invocation',
    python: `from google import genai
from google.genai import types

client = genai.Client()  # Reads GEMINI_API_KEY from environment
response = client.models.generate_content(
    model="gemini-4-hydrogen",
    contents="Explain token caching for Python API pipelines.",
    config=types.GenerateContentConfig(
        system_instruction="Respond concisely for backend engineers.",
        thinking_config=types.ThinkingConfig(thinking_level="LOW"),
    ),
)
print(response.text)`,
    typescript: `import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { "User-Agent": "aistudio-build" } },
});

const response = await ai.models.generateContent({
  model: "gemini-4-hydrogen",
  contents: "Explain token caching for TypeScript API pipelines.",
  config: {
    systemInstruction: "Respond concisely for backend engineers.",
    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
  },
});
console.log(response.text);`,
    curl: `curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-4-hydrogen:generateContent" \\
  -H "x-goog-api-key: $GEMINI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contents": [{"parts": [{"text": "Explain token caching concisely."}]}]
  }'`,
  },
  streaming: {
    title: 'Server-Sent Events Streaming',
    python: `from google import genai

client = genai.Client()
for chunk in client.models.generate_content_stream(
    model="gemini-4-hydrogen",
    contents="Write a modular Python health-check service.",
):
    print(chunk.text, end="", flush=True)`,
    typescript: `const stream = await ai.models.generateContentStream({
  model: "gemini-4-hydrogen",
  contents: "Write a modular Express health-check route.",
});

for await (const chunk of stream) {
  process.stdout.write(chunk.text ?? "");
}`,
    curl: `curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-4-hydrogen:streamGenerateContent?alt=sse" \\
  -H "x-goog-api-key: $GEMINI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"contents": [{"parts": [{"text": "Stream a Python health check."}]}]}'`,
  },
  structured_json: {
    title: 'Schema-Enforced JSON Output',
    python: `from pydantic import BaseModel
from google import genai

class AuditFinding(BaseModel):
    severity: str
    summary: str

client = genai.Client()
res = client.models.generate_content(
    model="gemini-4-hydrogen",
    contents="Review: query = f'SELECT * FROM users WHERE id={uid}'",
    config={
        "response_mime_type": "application/json",
        "response_schema": AuditFinding,
    },
)
print(res.text)`,
    typescript: `import { Type } from "@google/genai";

const response = await ai.models.generateContent({
  model: "gemini-4-hydrogen",
  contents: "Review SQL string interpolation risk.",
  config: {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        severity: { type: Type.STRING },
        summary: { type: Type.STRING },
      },
      required: ["severity", "summary"],
    },
  },
});`,
    curl: `curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-4-hydrogen:generateContent" \\
  -H "x-goog-api-key: $GEMINI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contents": [{"parts": [{"text": "List 2 Python security rules."}]}],
    "generationConfig": {"responseMimeType": "application/json"}
  }'`,
  },
  function_calling: {
    title: 'Typed Function Calling',
    python: `from google import genai

def get_latency_p95(service_name: str) -> dict:
    return {"service": service_name, "p95_ms": 318.4}

client = genai.Client()
response = client.models.generate_content(
    model="gemini-4-hydrogen",
    contents="Check p95 latency for the oxygen-api service.",
    config={"tools": [get_latency_p95]},
)
print(response.text)`,
    typescript: `import { Type } from "@google/genai";

const response = await ai.models.generateContent({
  model: "gemini-4-hydrogen",
  contents: "Check p95 latency for oxygen-api.",
  config: {
    tools: [{
      functionDeclarations: [{
        name: "getLatencyP95",
        description: "Get p95 latency in ms",
        parameters: {
          type: Type.OBJECT,
          properties: { serviceName: { type: Type.STRING } },
          required: ["serviceName"],
        },
      }],
    }],
  },
});
console.log(response.functionCalls);`,
    curl: `# Declare functionDeclarations inside tools[] in the JSON body`,
  },
};

export const ApiLabView: React.FC = () => {
  const [category, setCategory] = useState<SnippetCategory>('text');
  const [sdkLang, setSdkLang] = useState<'python' | 'typescript' | 'curl'>('python');

  const [testMode, setTestMode] = useState<'text' | 'structured_json'>('text');
  const [testModel, setTestModel] = useState<GeminiModelId>('gemini-4-hydrogen');
  const [thinking, setThinking] = useState<ThinkingLevelOption>('LOW');
  const [testPrompt, setTestPrompt] = useState('List 3 critical security rules for Python API backends.');
  const [rawResult, setRawResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const activeExample = CODE_EXAMPLES[category];

  const handleExecuteTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRawResult('');
    try {
      const res = await fetch('/api/apilab/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: testMode,
          model: testModel,
          thinkingLevel: thinking,
          prompt: testPrompt,
        }),
      });
      const data = await res.json();
      setRawResult(JSON.stringify(data, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-[#101010]/90 p-5">
        <h1 className="font-display text-2xl font-bold text-[#F5F5F5]">API Laboratory</h1>
        <p className="text-xs text-[#969696] mt-1">
          Official Python `google-genai`, TypeScript `@google/genai`, and REST cURL patterns alongside a live server-proxied request inspector.
        </p>
      </div>

      {/* Category & SDK Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ['text', 'Generate'],
                ['streaming', 'Streaming'],
                ['structured_json', 'Structured JSON'],
                ['function_calling', 'Function Calling'],
              ] as Array<[SnippetCategory, string]>
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setCategory(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  category === id
                    ? 'bg-[#E32636] text-[#F5F5F5]'
                    : 'bg-[#171717] text-[#B8B8B8] border border-white/10 hover:text-[#F5F5F5]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-[#F5F5F5]">
              {activeExample.title}
            </h2>
            <div className="flex items-center gap-1 rounded-lg bg-[#171717] p-1 border border-white/10">
              {(['python', 'typescript', 'curl'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSdkLang(lang)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                    sdkLang === lang ? 'bg-[#E32636] text-[#F5F5F5]' : 'text-[#969696] hover:text-[#F5F5F5]'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <CodeBlock
            code={activeExample[sdkLang]}
            language={sdkLang === 'curl' ? 'bash' : sdkLang}
            title={`${category}.${sdkLang === 'python' ? 'py' : sdkLang === 'typescript' ? 'ts' : 'sh'}`}
          />
        </div>

        {/* Live Request & Response Inspector */}
        <div className="lg:col-span-5 rounded-xl border border-white/10 bg-[#171717]/90 p-5 space-y-4">
          <div className="text-sm font-semibold text-[#F5F5F5]">Live Server-Proxied Request Tester</div>

          <form onSubmit={handleExecuteTest} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={testMode}
                onChange={(e) => setTestMode(e.target.value as 'text' | 'structured_json')}
                className="rounded-lg border border-white/15 bg-[#080808] px-2.5 py-2 text-xs text-[#F5F5F5]"
              >
                <option value="text">Standard Text</option>
                <option value="structured_json">Structured JSON Schema</option>
              </select>

              <select
                value={testModel}
                onChange={(e) => setTestModel(e.target.value as GeminiModelId)}
                className="rounded-lg border border-white/15 bg-[#080808] px-2.5 py-2 text-xs text-[#F5F5F5]"
              >
                <option value="gemini-4-hydrogen">gemini-4-hydrogen</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#B8B8B8]">
              <span>Thinking Level:</span>
              {(['LOW', 'MEDIUM', 'HIGH'] as ThinkingLevelOption[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setThinking(lvl)}
                  className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                    thinking === lvl ? 'bg-[#E32636] text-[#F5F5F5]' : 'bg-[#080808] text-[#969696]'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-[#080808] p-3 text-xs text-[#F5F5F5] focus:border-[#E32636] focus:outline-none"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#E32636] py-2 text-xs font-semibold text-[#F5F5F5] hover:bg-[#8F101D] disabled:opacity-40"
            >
              <Play className="h-3.5 w-3.5" />
              <span>{loading ? 'Sending Request...' : 'Execute via /api/apilab/execute'}</span>
            </button>
          </form>

          <div className="space-y-1.5">
            <div className="text-xs font-mono text-[#969696]">Raw Response JSON</div>
            <pre className="rounded-lg border border-white/10 bg-[#080808] p-3 font-mono text-[11px] text-[#D4D4D4] max-h-[260px] overflow-auto">
              {rawResult || '{\n  "status": "Ready to inspect live server response"\n}'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
