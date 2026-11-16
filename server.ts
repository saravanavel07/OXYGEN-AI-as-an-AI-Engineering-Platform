import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import type {
  CodingFileRecord,
  GeminiModelId,
  ImageAspectRatioOption,
  ImageSizeOption,
  ThinkingLevelOption,
} from './src/types/oxygen.ts';
import {
  addMessage,
  createConversation,
  deleteCodingFile,
  deleteConversation,
  getConversationMessages,
  getDashboardTelemetry,
  getDatasetWithRows,
  getMasterclassProgress,
  listActivityLogs,
  listAgentWorkflows,
  listBenchmarkRuns,
  listCodingFiles,
  listConversations,
  listDatasets,
  logActivity,
  resetNonEssentialData,
  saveBenchmarkRun,
  saveDataset,
  saveMasterclassProgress,
  updateConversationMeta,
  upsertCodingFile,
} from './server/db.ts';
import {
  classifyGeminiError,
  generateChatTurnStream,
  generateHighQualityImage,
  generateText,
  isGeminiConfigured,
  MODEL_SPECS,
  Type,
} from './server/gemini.ts';
import { runIsolatedPython, runIsolatedSql } from './server/sandbox.ts';
import {
  cleanDatasetRows,
  parseTabularBuffer,
  profileDataset,
  SAMPLE_ENGINEERING_CSV,
  type CleanOperation,
} from './server/dataLab.ts';
import { approveAndResumeWorkflow, startAgentWorkflow } from './server/agents.ts';

const TOTAL_CURRICULUM_LESSONS = 21;
const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '8mb' }));

  // Simple in-memory rate limiter for AI endpoints (60 req/min per IP)
  const rateBuckets = new Map<string, { count: number; resetAt: number }>();
  app.use('/api', (req, res, next) => {
    if (req.method === 'GET') return next();
    const key = req.ip ?? 'local';
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > 90) {
      return res.status(429).json({ error: 'Rate limit exceeded. Wait a moment before issuing more requests.' });
    }
    return next();
  });

  // Health & Models
  app.get('/api/health', (_req, res) => {
    const mapsKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    res.json({
      ok: true,
      geminiConfigured: isGeminiConfigured(),
      mapsConfigured: Boolean(mapsKey && mapsKey !== 'MY_GOOGLE_MAPS_API_KEY'),
      models: MODEL_SPECS,
      timestamp: new Date().toISOString(),
    });
  });

  // Google Maps Platform Client Key Configuration (Public browser key only; never exposes GEMINI_API_KEY)
  app.get('/api/maps/config', (_req, res) => {
    const raw = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    const valid = Boolean(raw && raw.trim() && raw !== 'MY_GOOGLE_MAPS_API_KEY');
    res.json({
      configured: valid,
      apiKey: valid ? raw.trim() : '',
    });
  });

  // Dashboard Telemetry
  app.get('/api/dashboard', (_req, res) => {
    res.json(getDashboardTelemetry(isGeminiConfigured(), TOTAL_CURRICULUM_LESSONS));
  });

  app.get('/api/logs', (_req, res) => {
    res.json({ logs: listActivityLogs(40) });
  });

  // Conversations & Playground
  app.get('/api/playground/conversations', (_req, res) => {
    res.json({ conversations: listConversations() });
  });

  app.post('/api/playground/conversations', (req, res) => {
    const { title, model, systemInstruction } = req.body as {
      title?: string;
      model?: GeminiModelId;
      systemInstruction?: string;
    };
    const conv = createConversation({
      id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: (title || 'New Hydrogen Session').slice(0, 80),
      model: model || 'gemini-4-hydrogen',
      systemInstruction: systemInstruction || '',
    });
    res.json({ conversation: conv });
  });

  app.get('/api/playground/conversations/:id/messages', (req, res) => {
    res.json({ messages: getConversationMessages(req.params.id) });
  });

  app.delete('/api/playground/conversations/:id', (req, res) => {
    deleteConversation(req.params.id);
    res.json({ ok: true });
  });

  // Streaming multi-turn chat via SSE
  app.post('/api/playground/stream', async (req, res) => {
    const { conversationId, message, model, systemInstruction, thinkingLevel } = req.body as {
      conversationId: string;
      message: string;
      model?: GeminiModelId;
      systemInstruction?: string;
      thinkingLevel?: ThinkingLevelOption;
    };

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const activeModel: GeminiModelId = model || 'gemini-4-hydrogen';
    const convId = conversationId || `conv-${Date.now()}`;
    const existingList = listConversations();
    if (!existingList.some((c) => c.id === convId)) {
      createConversation({
        id: convId,
        title: message.slice(0, 48),
        model: activeModel,
        systemInstruction: systemInstruction || '',
      });
    } else {
      updateConversationMeta(convId, undefined, activeModel, systemInstruction);
    }

    const historyMsgs = getConversationMessages(convId);
    if (historyMsgs.length === 0) {
      updateConversationMeta(convId, message.slice(0, 48));
    }

    addMessage({
      id: `msg-${Date.now()}-u`,
      conversationId: convId,
      role: 'user',
      content: message,
      model: activeModel,
      createdAt: new Date().toISOString(),
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const result = await generateChatTurnStream({
        model: activeModel,
        history: historyMsgs
          .filter((m) => !m.imageDataUrl)
          .map((m) => ({ role: m.role, text: m.content })),
        userMessage: message,
        systemInstruction,
        thinkingLevel,
        onChunk: (chunkText) => {
          res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
        },
      });

      const assistantMsg = {
        id: `msg-${Date.now()}-m`,
        conversationId: convId,
        role: 'model' as const,
        content: result.fullText,
        model: activeModel,
        thinkingLevel,
        latencyMs: result.latencyMs,
        promptTokens: result.promptTokens,
        outputTokens: result.outputTokens,
        createdAt: new Date().toISOString(),
      };
      addMessage(assistantMsg);

      logActivity({
        category: 'playground',
        action: `Generated response (${activeModel})`,
        detail: `${result.outputTokens} output tokens`,
        status: 'nominal',
        latencyMs: result.latencyMs,
      });

      res.write(`data: ${JSON.stringify({ type: 'done', message: assistantMsg })}\n\n`);
      res.end();
    } catch (err) {
      const classified = classifyGeminiError(err);
      logActivity({
        category: 'playground',
        action: `Model error (${activeModel})`,
        detail: classified.message.slice(0, 120),
        status: 'error',
      });
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          error: classified.message,
          requiresPaidKey: classified.requiresPaidKey,
        })}\n\n`
      );
      res.end();
    }
  });

  // High-quality image generation (1K, 2K, 4K) via gemini-3-pro-image-preview
  app.post('/api/playground/image', async (req, res) => {
    const { conversationId, prompt, imageSize, aspectRatio } = req.body as {
      conversationId?: string;
      prompt: string;
      imageSize?: ImageSizeOption;
      aspectRatio?: ImageAspectRatioOption;
    };
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Image prompt cannot be empty.' });
    }

    try {
      const result = await generateHighQualityImage({
        prompt: prompt.trim(),
        imageSize: imageSize || '1K',
        aspectRatio: aspectRatio || '1:1',
      });

      if (conversationId) {
        addMessage({
          id: `msg-${Date.now()}-u`,
          conversationId,
          role: 'user',
          content: `[Image Request · ${imageSize || '1K'} · ${aspectRatio || '1:1'}] ${prompt}`,
          model: result.modelUsed,
          createdAt: new Date().toISOString(),
        });
        addMessage({
          id: `msg-${Date.now()}-m`,
          conversationId,
          role: 'model',
          content: result.caption || `Generated ${imageSize || '1K'} visual asset using ${result.modelUsed}.`,
          model: result.modelUsed,
          latencyMs: result.latencyMs,
          imageDataUrl: result.imageDataUrl,
          imageSize: imageSize || '1K',
          createdAt: new Date().toISOString(),
        });
      }

      logActivity({
        category: 'playground',
        action: `Generated ${imageSize || '1K'} image`,
        detail: `${result.modelUsed} · ${aspectRatio || '1:1'}`,
        status: 'nominal',
        latencyMs: result.latencyMs,
      });

      res.json(result);
    } catch (err) {
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({
        error: classified.message,
        requiresPaidKey: classified.requiresPaidKey,
      });
    }
  });

  // Low-latency fast assistant using gemini-3.1-flash-lite
  app.post('/api/fast-assist', async (req, res) => {
    const { prompt, context } = req.body as { prompt: string; context?: string };
    if (!prompt?.trim()) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }
    try {
      const result = await generateText({
        model: 'gemini-3.1-flash-lite',
        thinkingLevel: 'MINIMAL',
        systemInstruction:
          'You are OXYGEN Quick Assist powered by Gemini 3.1 Flash-Lite. Give ultra-concise, direct technical answers.',
        prompt: context ? `Context:\n${context.slice(0, 3000)}\n\nQuestion: ${prompt}` : prompt,
      });
      res.json({
        model: 'gemini-3.1-flash-lite',
        ...result,
      });
    } catch (err) {
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({ error: classified.message });
    }
  });

  // Masterclass Progress
  app.get('/api/masterclass/progress', (_req, res) => {
    res.json({ progress: getMasterclassProgress() });
  });

  app.post('/api/masterclass/progress', (req, res) => {
    const { lessonId, completed, quizScore } = req.body as {
      lessonId: string;
      completed: boolean;
      quizScore?: number;
    };
    if (!lessonId) return res.status(400).json({ error: 'lessonId required.' });
    saveMasterclassProgress(lessonId, Boolean(completed), quizScore);
    logActivity({
      category: 'masterclass',
      action: completed ? `Completed lesson ${lessonId}` : `Updated lesson ${lessonId}`,
      detail: quizScore !== undefined ? `Quiz score: ${quizScore}%` : 'Progress saved',
      status: 'nominal',
    });
    res.json({ progress: getMasterclassProgress() });
  });

  // Coding Studio Files & AI Assist & Sandbox Execution
  app.get('/api/coding/files', (_req, res) => {
    res.json({ files: listCodingFiles() });
  });

  app.post('/api/coding/files', (req, res) => {
    const file = req.body as CodingFileRecord;
    if (!file.id || !file.name) {
      return res.status(400).json({ error: 'File id and name are required.' });
    }
    const saved = upsertCodingFile(file);
    res.json({ file: saved });
  });

  app.delete('/api/coding/files/:id', (req, res) => {
    deleteCodingFile(req.params.id);
    res.json({ ok: true });
  });

  app.post('/api/coding/assist', async (req, res) => {
    const { action, language, code, instruction, model } = req.body as {
      action: string;
      language: string;
      code: string;
      instruction?: string;
      model?: GeminiModelId;
    };
    const chosenModel: GeminiModelId = model || 'gemini-4-hydrogen';

    try {
      const prompt = `Action: ${action}
Language: ${language}
User Notes: ${instruction || 'Apply senior software engineering standards.'}

Source Code:
\`\`\`${language}
${code}
\`\`\`

Provide:
1. Direct technical analysis / explanation.
2. Complete updated code inside a single \`\`\`${language} code block (if code generation, debugging, refactoring, or test generation was requested).`;

      const result = await generateText({
        model: chosenModel,
        thinkingLevel: chosenModel === 'gemini-4-hydrogen' ? 'MEDIUM' : undefined,
        systemInstruction:
          'You are OXYGEN AI Coding Studio Assistant. Write clean, production-grade code with explicit types, error handling, and zero placeholders.',
        prompt,
      });

      logActivity({
        category: 'coding',
        action: `AI ${action} (${language})`,
        detail: `${chosenModel} · ${result.outputTokens} tokens`,
        status: 'nominal',
        latencyMs: result.latencyMs,
      });

      res.json({
        model: chosenModel,
        ...result,
      });
    } catch (err) {
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({
        error: classified.message,
        requiresPaidKey: classified.requiresPaidKey,
      });
    }
  });

  app.post('/api/coding/execute', async (req, res) => {
    const { language, code } = req.body as { language: string; code: string };
    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'No code supplied for execution.' });
    }
    if (language === 'python') {
      const result = await runIsolatedPython(code, 5000);
      logActivity({
        category: 'coding',
        action: 'Sandbox Python run',
        detail: result.success ? `Exited 0 in ${result.durationMs}ms` : `Exit ${result.exitCode}`,
        status: result.success ? 'nominal' : 'warning',
        latencyMs: result.durationMs,
      });
      return res.json(result);
    }
    if (language === 'sql') {
      const result = runIsolatedSql(code);
      logActivity({
        category: 'coding',
        action: 'Sandbox SQLite query',
        detail: result.success ? `${result.sqlRows?.length ?? 0} rows` : 'SQL error',
        status: result.success ? 'nominal' : 'warning',
        latencyMs: result.durationMs,
      });
      return res.json(result);
    }
    return res.status(400).json({
      error: `Direct runtime execution is isolated to Python 3 and SQLite SQL. Use AI Code Review or export for ${language}.`,
    });
  });

  // Multi-Agent Control Center
  app.get('/api/agents/workflows', (_req, res) => {
    res.json({ workflows: listAgentWorkflows(20) });
  });

  app.post('/api/agents/run', async (req, res) => {
    const { goal, model, requireHumanApproval } = req.body as {
      goal: string;
      model?: GeminiModelId;
      requireHumanApproval?: boolean;
    };
    if (!goal?.trim()) {
      return res.status(400).json({ error: 'Agent workflow goal is required.' });
    }
    try {
      const wf = await startAgentWorkflow({
        goal: goal.trim(),
        model: model || 'gemini-4-hydrogen',
        requireHumanApproval: requireHumanApproval ?? true,
      });
      res.json({ workflow: wf });
    } catch (err) {
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({
        error: classified.message,
        requiresPaidKey: classified.requiresPaidKey,
      });
    }
  });

  app.post('/api/agents/:id/approve', async (req, res) => {
    const { approved } = req.body as { approved: boolean };
    try {
      const wf = await approveAndResumeWorkflow(req.params.id, Boolean(approved));
      res.json({ workflow: wf });
    } catch (err) {
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({
        error: classified.message,
        requiresPaidKey: classified.requiresPaidKey,
      });
    }
  });

  // Data Intelligence Lab
  app.get('/api/data/datasets', (_req, res) => {
    res.json({ datasets: listDatasets() });
  });

  app.post('/api/data/upload', (req, res) => {
    const { fileName, base64Content, useSample } = req.body as {
      fileName?: string;
      base64Content?: string;
      useSample?: boolean;
    };
    try {
      const name = useSample ? 'hydrogen_telemetry_sample.csv' : fileName || 'dataset.csv';
      const buffer = useSample
        ? Buffer.from(SAMPLE_ENGINEERING_CSV, 'utf8')
        : Buffer.from(base64Content || '', 'base64');

      if (buffer.byteLength > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'File exceeds 5MB upload limit.' });
      }
      const rows = parseTabularBuffer(name, buffer);
      if (rows.length === 0) {
        return res.status(400).json({ error: 'Uploaded file contains zero rows.' });
      }
      const id = `ds-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const profile = profileDataset(id, name, rows);
      saveDataset(id, name, rows, profile);

      logActivity({
        category: 'data',
        action: `Profiled ${name}`,
        detail: `${profile.rowCount} rows · ${profile.columnCount} columns`,
        status: 'nominal',
      });

      res.json({ profile });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post('/api/data/:id/clean', (req, res) => {
    const { operations } = req.body as { operations: CleanOperation[] };
    const ds = getDatasetWithRows(req.params.id);
    if (!ds) return res.status(404).json({ error: 'Dataset not found.' });

    const cleanedRows = cleanDatasetRows(
      ds.rows as Record<string, string | number | boolean | null>[],
      ds.profile,
      operations || ['drop_duplicates', 'impute_missing', 'trim_whitespace']
    );
    const updatedProfile = profileDataset(ds.profile.id, ds.profile.name, cleanedRows);
    saveDataset(ds.profile.id, ds.profile.name, cleanedRows, updatedProfile);

    logActivity({
      category: 'data',
      action: `Cleaned ${ds.profile.name}`,
      detail: `${updatedProfile.rowCount} rows · ${updatedProfile.totalMissingCells} missing cells remaining`,
      status: 'nominal',
    });

    res.json({ profile: updatedProfile });
  });

  app.get('/api/data/:id/export', (req, res) => {
    const ds = getDatasetWithRows(req.params.id);
    if (!ds) return res.status(404).json({ error: 'Dataset not found.' });
    res.json(ds);
  });

  app.post('/api/data/:id/ask', async (req, res) => {
    const { question } = req.body as { question: string };
    const ds = getDatasetWithRows(req.params.id);
    if (!ds) return res.status(404).json({ error: 'Dataset not found.' });
    if (!question?.trim()) return res.status(400).json({ error: 'Question required.' });

    try {
      const compactSummary = {
        name: ds.profile.name,
        rowCount: ds.profile.rowCount,
        columnCount: ds.profile.columnCount,
        duplicateRowCount: ds.profile.duplicateRowCount,
        totalMissingCells: ds.profile.totalMissingCells,
        columns: ds.profile.columns.map((c) => ({
          name: c.name,
          type: c.type,
          missing: c.missingCount,
          unique: c.uniqueCount,
          min: c.min,
          max: c.max,
          mean: c.mean,
          median: c.median,
          stdDev: c.stdDev,
        })),
        correlations: ds.profile.correlations,
        sampleRows: ds.profile.sampleRows.slice(0, 8),
      };

      const result = await generateText({
        model: 'gemini-4-hydrogen',
        systemInstruction:
          'You are OXYGEN Data Intelligence Analyst. Answer strictly based on the provided dataset profile and sample rows. Do not fabricate numbers.',
        prompt: `Dataset Profile:\n${JSON.stringify(compactSummary, null, 2)}\n\nQuestion: ${question}`,
      });
      res.json(result);
    } catch (err) {
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({ error: classified.message });
    }
  });

  // API Laboratory Live Tester
  app.post('/api/apilab/execute', async (req, res) => {
    const { mode, model, prompt, systemInstruction, thinkingLevel } = req.body as {
      mode: 'text' | 'structured_json' | 'function_call';
      model?: GeminiModelId;
      prompt: string;
      systemInstruction?: string;
      thinkingLevel?: ThinkingLevelOption;
    };

    const chosenModel: GeminiModelId = model || 'gemini-4-hydrogen';
    try {
      if (mode === 'structured_json') {
        const result = await generateText({
          model: chosenModel,
          thinkingLevel,
          systemInstruction,
          prompt,
          jsonSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              keyFindings: { type: Type.ARRAY, items: { type: Type.STRING } },
              confidenceNote: { type: Type.STRING },
            },
            required: ['summary', 'keyFindings', 'confidenceNote'],
          },
        });
        return res.json({ mode, model: chosenModel, ...result });
      }

      const result = await generateText({
        model: chosenModel,
        thinkingLevel,
        systemInstruction,
        prompt,
      });
      res.json({ mode, model: chosenModel, ...result });
    } catch (err) {
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({
        error: classified.message,
        requiresPaidKey: classified.requiresPaidKey,
      });
    }
  });

  // Benchmark Center (Real live execution harness)
  app.get('/api/benchmarks', (_req, res) => {
    res.json({ runs: listBenchmarkRuns() });
  });

  app.post('/api/benchmarks/run', async (req, res) => {
    const { model, thinkingLevel } = req.body as {
      model?: GeminiModelId;
      thinkingLevel?: ThinkingLevelOption;
    };
    const chosenModel: GeminiModelId = model || 'gemini-4-hydrogen';
    const chosenThinking: ThinkingLevelOption = thinkingLevel || 'LOW';

    const cases = [
      {
        id: 'bench-json-schema',
        name: 'Strict JSON Schema Extraction',
        category: 'Structured Output',
        type: 'json' as const,
        prompt: 'Extract model name "Gemini 4 Hydrogen" and 3 core capabilities into JSON.',
      },
      {
        id: 'bench-py-algo',
        name: 'Python Median & Variance Implementation',
        category: 'Code Correctness',
        type: 'python' as const,
        prompt:
          'Write a Python function `calc_median(nums)` that returns the median of a non-empty list of numbers, and include `assert calc_median([10, 2, 6]) == 6` and `assert calc_median([1, 2, 3, 4]) == 2.5` in __main__. Wrap in ```python block.',
      },
      {
        id: 'bench-concise-qa',
        name: 'Transformer Context Window Explanation',
        category: 'Technical Accuracy',
        type: 'text' as const,
        prompt: 'Explain in 3 concise sentences what a token and context window are in an LLM.',
      },
    ];

    try {
      const details: Array<{
        caseId: string;
        caseName: string;
        category: string;
        passed: boolean;
        latencyMs: number;
        tokens: number;
        notes: string;
      }> = [];

      let jsonCount = 0;
      let jsonPassed = 0;
      let codeCount = 0;
      let codePassed = 0;

      for (const c of cases) {
        if (c.type === 'json') {
          jsonCount++;
          const r = await generateText({
            model: chosenModel,
            thinkingLevel: chosenThinking,
            prompt: c.prompt,
            jsonSchema: {
              type: Type.OBJECT,
              properties: {
                modelName: { type: Type.STRING },
                capabilities: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['modelName', 'capabilities'],
            },
          });
          let valid = false;
          try {
            const parsed = JSON.parse(r.text);
            valid = Boolean(parsed.modelName && Array.isArray(parsed.capabilities));
          } catch {
            valid = false;
          }
          if (valid) jsonPassed++;
          details.push({
            caseId: c.id,
            caseName: c.name,
            category: c.category,
            passed: valid,
            latencyMs: r.latencyMs,
            tokens: r.promptTokens + r.outputTokens,
            notes: valid ? 'Valid JSON matching schema' : 'JSON schema validation failed',
          });
        } else if (c.type === 'python') {
          codeCount++;
          const r = await generateText({
            model: chosenModel,
            thinkingLevel: chosenThinking,
            prompt: c.prompt,
          });
          const match = r.text.match(/```python\s*([\s\S]*?)```/i);
          const pyCode = match?.[1] ?? '';
          const sandboxRes = pyCode ? await runIsolatedPython(pyCode, 4000) : null;
          const ok = Boolean(sandboxRes?.success);
          if (ok) codePassed++;
          details.push({
            caseId: c.id,
            caseName: c.name,
            category: c.category,
            passed: ok,
            latencyMs: r.latencyMs,
            tokens: r.promptTokens + r.outputTokens,
            notes: ok ? `Sandbox assertions passed (${sandboxRes?.durationMs}ms)` : sandboxRes?.stderr || 'No code block',
          });
        } else {
          const r = await generateText({
            model: chosenModel,
            thinkingLevel: chosenThinking,
            prompt: c.prompt,
          });
          const ok = r.text.trim().length > 40;
          details.push({
            caseId: c.id,
            caseName: c.name,
            category: c.category,
            passed: ok,
            latencyMs: r.latencyMs,
            tokens: r.promptTokens + r.outputTokens,
            notes: ok ? `${r.text.length} chars returned` : 'Empty or too short',
          });
        }
      }

      const passedCases = details.filter((d) => d.passed).length;
      const avgLatencyMs = Math.round(details.reduce((a, d) => a + d.latencyMs, 0) / details.length);
      const totalTokens = details.reduce((a, d) => a + d.tokens, 0);

      const run = {
        id: `bench-${Date.now()}`,
        suiteName: 'Hydrogen Core Verification Suite',
        model: chosenModel,
        thinkingLevel: chosenThinking,
        totalCases: details.length,
        passedCases,
        avgLatencyMs,
        totalTokens,
        jsonValidityRate: jsonCount > 0 ? Math.round((jsonPassed / jsonCount) * 100) : 100,
        codePassRate: codeCount > 0 ? Math.round((codePassed / codeCount) * 100) : 100,
        details,
        createdAt: new Date().toISOString(),
      };

      saveBenchmarkRun(run);
      logActivity({
        category: 'benchmark',
        action: `Benchmark ${chosenModel} (${chosenThinking})`,
        detail: `${passedCases}/${details.length} passed · avg ${avgLatencyMs}ms`,
        status: passedCases === details.length ? 'nominal' : 'warning',
        latencyMs: avgLatencyMs,
      });

      res.json({ run });
    } catch (err) {
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({
        error: classified.message,
        requiresPaidKey: classified.requiresPaidKey,
      });
    }
  });

  // Settings / Reset
  app.post('/api/settings/reset', (_req, res) => {
    resetNonEssentialData();
    logActivity({
      category: 'system',
      action: 'Workspace telemetry reset',
      detail: 'Cleared conversation, workflow, and benchmark history',
      status: 'nominal',
    });
    res.json({ ok: true });
  });

  // Vite middleware in dev, static serving in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OXYGEN AI server listening on http://localhost:${PORT}`);
  });
}

startServer();
