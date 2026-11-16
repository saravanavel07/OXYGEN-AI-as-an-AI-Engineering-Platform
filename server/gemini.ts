import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  GeminiModelId,
  ImageAspectRatioOption,
  ImageSizeOption,
  ModelSpec,
  ThinkingLevelOption,
} from '../src/types/oxygen.ts';

export const MODEL_SPECS: ModelSpec[] = [
  {
    id: 'gemini-4-hydrogen',
    label: 'Gemini 4 Hydrogen',
    tier: 'Hydrogen',
    role: 'Primary balanced flagship for general engineering, coding, tool calling, and agentic workflows',
    supportsThinking: ['LOW', 'MEDIUM', 'HIGH', 'XHIGH'],
    defaultThinking: 'HIGH',
    requiresPaidKey: false,
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash-Lite',
    tier: 'Flash Lite',
    role: 'Ultra-low-latency model for instant inline completions, classification, and rapid responses',
    supportsThinking: ['MINIMAL', 'LOW'],
    defaultThinking: 'MINIMAL',
    requiresPaidKey: false,
  },
];

export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim() && key !== 'MY_GEMINI_API_KEY');
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured in the server environment. Configure it in Settings > Secrets to enable live Gemini calls.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function mapThinkingLevel(model: GeminiModelId, level?: ThinkingLevelOption): ThinkingLevel | undefined {
  if (!level || model === 'gemini-3-pro-image-preview') return undefined;
  const spec = MODEL_SPECS.find((m) => m.id === model);
  const valid = spec?.supportsThinking ?? ['LOW', 'MEDIUM', 'HIGH'];
  const chosen = valid.includes(level) ? level : spec?.defaultThinking ?? 'MEDIUM';

  if (chosen === 'MINIMAL') return ThinkingLevel.MINIMAL;
  if (chosen === 'LOW') return ThinkingLevel.LOW;
  if (chosen === 'MEDIUM') return ThinkingLevel.MEDIUM;
  if (chosen === 'HIGH') return ThinkingLevel.HIGH;
  if (chosen === 'XHIGH') return ThinkingLevel.XHIGH;
  return undefined;
}

export function classifyGeminiError(err: unknown): {
  message: string;
  status: number;
  requiresPaidKey: boolean;
} {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('403')) {
    return {
      message:
        'Authentication failed (403/API Key Invalid). Verify your GEMINI_API_KEY in Settings > Secrets, or select a billing-enabled API key for paid models.',
      status: 403,
      requiresPaidKey: true,
    };
  }
  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return {
      message:
        'Quota limit reached (429 RESOURCE_EXHAUSTED). Paid models (Carbon, Argon, Pro Image) require a billing-enabled key in Settings > Secrets, or switch to Gemini 4 Hydrogen / 3.1 Flash-Lite.',
      status: 429,
      requiresPaidKey: true,
    };
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return {
      message: `Model endpoint returned 404 Not Found: ${raw}`,
      status: 404,
      requiresPaidKey: false,
    };
  }
  return {
    message: raw,
    status: 500,
    requiresPaidKey: false,
  };
}

export async function generateText(params: {
  model: GeminiModelId;
  prompt: string;
  systemInstruction?: string;
  thinkingLevel?: ThinkingLevelOption;
  jsonSchema?: Record<string, unknown>;
}): Promise<{
  text: string;
  latencyMs: number;
  promptTokens: number;
  outputTokens: number;
}> {
  const ai = getGeminiClient();
  const started = Date.now();
  const thinking = mapThinkingLevel(params.model, params.thinkingLevel);

  const config: Record<string, unknown> = {};
  if (params.systemInstruction) {
    config.systemInstruction = params.systemInstruction;
  }
  if (thinking) {
    config.thinkingConfig = { thinkingLevel: thinking };
  }
  if (params.jsonSchema) {
    config.responseMimeType = 'application/json';
    config.responseSchema = params.jsonSchema;
  }

  const response = await ai.models.generateContent({
    model: params.model,
    contents: params.prompt,
    config,
  });

  const latencyMs = Date.now() - started;
  return {
    text: response.text ?? '',
    latencyMs,
    promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

export async function generateChatTurnStream(params: {
  model: GeminiModelId;
  history: Array<{ role: 'user' | 'model'; text: string }>;
  userMessage: string;
  systemInstruction?: string;
  thinkingLevel?: ThinkingLevelOption;
  onChunk: (text: string) => void;
}): Promise<{
  fullText: string;
  latencyMs: number;
  promptTokens: number;
  outputTokens: number;
}> {
  const ai = getGeminiClient();
  const started = Date.now();
  const thinking = mapThinkingLevel(params.model, params.thinkingLevel);

  const config: Record<string, unknown> = {};
  if (params.systemInstruction) {
    config.systemInstruction = params.systemInstruction;
  }
  if (thinking) {
    config.thinkingConfig = { thinkingLevel: thinking };
  }

  const chat = ai.chats.create({
    model: params.model,
    history: params.history.map((h) => ({
      role: h.role,
      parts: [{ text: h.text }],
    })),
    config,
  });

  const stream = await chat.sendMessageStream({ message: params.userMessage });
  let fullText = '';
  let promptTokens = 0;
  let outputTokens = 0;

  for await (const chunk of stream) {
    if (chunk.text) {
      fullText += chunk.text;
      params.onChunk(chunk.text);
    }
    if (chunk.usageMetadata) {
      promptTokens = chunk.usageMetadata.promptTokenCount ?? promptTokens;
      outputTokens = chunk.usageMetadata.candidatesTokenCount ?? outputTokens;
    }
  }

  return {
    fullText,
    latencyMs: Date.now() - started,
    promptTokens,
    outputTokens,
  };
}

export async function generateHighQualityImage(params: {
  prompt: string;
  imageSize: ImageSizeOption;
  aspectRatio: ImageAspectRatioOption;
}): Promise<{
  imageDataUrl: string;
  caption: string;
  latencyMs: number;
  modelUsed: string;
}> {
  const ai = getGeminiClient();
  const started = Date.now();

  const tryModels = ['gemini-3-pro-image-preview', 'gemini-3-pro-image', 'gemini-nano-banana-2.1'];
  let lastErr: unknown = null;

  for (const candidateModel of tryModels) {
    try {
      const response = await ai.models.generateContent({
        model: candidateModel,
        contents: {
          parts: [{ text: params.prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: params.aspectRatio,
            imageSize: params.imageSize,
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      let imageDataUrl = '';
      let caption = '';

      for (const part of parts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageDataUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          caption += part.text;
        }
      }

      if (!imageDataUrl) {
        throw new Error(`Model ${candidateModel} returned no image data.`);
      }

      return {
        imageDataUrl,
        caption,
        latencyMs: Date.now() - started,
        modelUsed: candidateModel,
      };
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      // Only fall through to next model alias if 404 Not Found
      if (!msg.toLowerCase().includes('404') && !msg.toLowerCase().includes('not_found')) {
        throw err;
      }
    }
  }

  throw lastErr ?? new Error('Image generation failed across configured models.');
}

export { Type };
