import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import type {
  ActivityLogRecord,
  AgentWorkflowRecord,
  BenchmarkRunRecord,
  ChatMessageRecord,
  CodingFileRecord,
  ConversationRecord,
  DashboardTelemetry,
  DatasetProfile,
  GeminiModelId,
} from '../src/types/oxygen.ts';

const DB_PATH = path.resolve(process.cwd(), 'oxygen_ai.db');
const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    model TEXT NOT NULL,
    system_instruction TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    model TEXT NOT NULL,
    thinking_level TEXT,
    latency_ms INTEGER,
    prompt_tokens INTEGER,
    output_tokens INTEGER,
    image_data_url TEXT,
    image_size TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS masterclass_progress (
    lesson_id TEXT PRIMARY KEY,
    completed INTEGER NOT NULL DEFAULT 0,
    quiz_score INTEGER,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS coding_files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    language TEXT NOT NULL,
    content TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS agent_workflows (
    id TEXT PRIMARY KEY,
    goal TEXT NOT NULL,
    model TEXT NOT NULL,
    require_human_approval INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL,
    current_node TEXT NOT NULL,
    steps_json TEXT NOT NULL,
    tool_calls_json TEXT NOT NULL,
    final_report TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS datasets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rows_json TEXT NOT NULL,
    profile_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS benchmarks (
    id TEXT PRIMARY KEY,
    suite_name TEXT NOT NULL,
    model TEXT NOT NULL,
    thinking_level TEXT NOT NULL,
    total_cases INTEGER NOT NULL,
    passed_cases INTEGER NOT NULL,
    avg_latency_ms INTEGER NOT NULL,
    total_tokens INTEGER NOT NULL,
    json_validity_rate REAL NOT NULL,
    code_pass_rate REAL NOT NULL,
    details_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    action TEXT NOT NULL,
    detail TEXT NOT NULL,
    status TEXT NOT NULL,
    latency_ms INTEGER,
    created_at TEXT NOT NULL
  );
`);

// Seed default coding workspace files once if empty
const fileCountRow = db.prepare('SELECT COUNT(*) as cnt FROM coding_files').get() as { cnt: number };
if (fileCountRow.cnt === 0) {
  const now = new Date().toISOString();
  const insertFile = db.prepare(
    'INSERT INTO coding_files (id, name, language, content, updated_at) VALUES (?, ?, ?, ?, ?)'
  );
  insertFile.run(
    'file-py-hydrogen',
    'hydrogen_pipeline.py',
    'python',
    `"""OXYGEN AI — Hydrogen Data Pipeline & Statistical Analyzer."""
import math
import statistics
from typing import List, Dict

def compute_telemetry_summary(latencies_ms: List[float]) -> Dict[str, float]:
    if not latencies_ms:
        raise ValueError("Latency series cannot be empty.")
    sorted_vals = sorted(latencies_ms)
    p95_idx = min(len(sorted_vals) - 1, math.ceil(0.95 * len(sorted_vals)) - 1)
    return {
        "count": len(latencies_ms),
        "mean_ms": round(statistics.mean(latencies_ms), 2),
        "median_ms": round(statistics.median(latencies_ms), 2),
        "p95_ms": round(sorted_vals[p95_idx], 2),
        "stdev_ms": round(statistics.stdev(latencies_ms), 2) if len(latencies_ms) > 1 else 0.0,
    }

if __name__ == "__main__":
    sample_runs = [312.4, 289.1, 410.8, 295.0, 334.6, 518.2, 301.5, 276.9]
    summary = compute_telemetry_summary(sample_runs)
    print("Hydrogen Telemetry Summary:", summary)
`,
    now
  );
  insertFile.run(
    'file-sql-audit',
    'model_telemetry.sql',
    'sql',
    `-- Query telemetry runs stored in the sandbox SQLite warehouse
SELECT
  model_name,
  COUNT(*) AS total_runs,
  ROUND(AVG(latency_ms), 1) AS avg_latency_ms,
  SUM(output_tokens) AS total_output_tokens
FROM inference_logs
WHERE status = 'nominal'
GROUP BY model_name
ORDER BY avg_latency_ms ASC;
`,
    now
  );
  insertFile.run(
    'file-pyspark-etl',
    'hydrogen_spark_etl.py',
    'pyspark',
    `from pyspark.sql import SparkSession
from pyspark.sql import functions as F

def build_feature_table(input_path: str, output_path: str):
    spark = SparkSession.builder.appName("OxygenHydrogenETL").getOrCreate()
    df = spark.read.option("header", "true").option("inferSchema", "true").csv(input_path)
    cleaned = (
        df.dropDuplicates()
          .na.fill({"latency_ms": 0.0, "status": "unknown"})
          .withColumn("tokens_per_sec", F.col("output_tokens") / (F.col("latency_ms") / 1000.0))
    )
    cleaned.write.mode("overwrite").parquet(output_path)
    return cleaned
`,
    now
  );
}

export function logActivity(entry: {
  category: ActivityLogRecord['category'];
  action: string;
  detail: string;
  status: ActivityLogRecord['status'];
  latencyMs?: number;
}): ActivityLogRecord {
  const id = `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const createdAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO activity_logs (id, category, action, detail, status, latency_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, entry.category, entry.action, entry.detail, entry.status, entry.latencyMs ?? null, createdAt);

  return {
    id,
    category: entry.category,
    action: entry.action,
    detail: entry.detail,
    status: entry.status,
    latencyMs: entry.latencyMs,
    createdAt,
  };
}

export function listActivityLogs(limit = 30): ActivityLogRecord[] {
  const rows = db
    .prepare('SELECT id, category, action, detail, status, latency_ms, created_at FROM activity_logs ORDER BY created_at DESC LIMIT ?')
    .all(limit) as Array<{
    id: string;
    category: ActivityLogRecord['category'];
    action: string;
    detail: string;
    status: ActivityLogRecord['status'];
    latency_ms: number | null;
    created_at: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    action: r.action,
    detail: r.detail,
    status: r.status,
    latencyMs: r.latency_ms ?? undefined,
    createdAt: r.created_at,
  }));
}

export function createConversation(input: {
  id: string;
  title: string;
  model: GeminiModelId;
  systemInstruction: string;
}): ConversationRecord {
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO conversations (id, title, model, system_instruction, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(input.id, input.title, input.model, input.systemInstruction, now, now);
  return {
    id: input.id,
    title: input.title,
    model: input.model,
    systemInstruction: input.systemInstruction,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };
}

export function updateConversationMeta(id: string, title?: string, model?: GeminiModelId, systemInstruction?: string) {
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT id, title, model, system_instruction FROM conversations WHERE id = ?').get(id) as
    | { id: string; title: string; model: GeminiModelId; system_instruction: string }
    | undefined;
  if (!existing) return;
  db.prepare('UPDATE conversations SET title = ?, model = ?, system_instruction = ?, updated_at = ? WHERE id = ?').run(
    title ?? existing.title,
    model ?? existing.model,
    systemInstruction ?? existing.system_instruction,
    now,
    id
  );
}

export function listConversations(): ConversationRecord[] {
  const rows = db
    .prepare(
      `SELECT c.id, c.title, c.model, c.system_instruction, c.created_at, c.updated_at,
              (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
       FROM conversations c
       ORDER BY c.updated_at DESC
       LIMIT 40`
    )
    .all() as Array<{
    id: string;
    title: string;
    model: GeminiModelId;
    system_instruction: string;
    created_at: string;
    updated_at: string;
    message_count: number;
  }>;
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    model: r.model,
    systemInstruction: r.system_instruction,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    messageCount: r.message_count,
  }));
}

export function deleteConversation(id: string) {
  db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(id);
  db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
}

export function addMessage(msg: ChatMessageRecord) {
  db.prepare(
    `INSERT INTO messages (
      id, conversation_id, role, content, model, thinking_level,
      latency_ms, prompt_tokens, output_tokens, image_data_url, image_size, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    msg.id,
    msg.conversationId,
    msg.role,
    msg.content,
    msg.model,
    msg.thinkingLevel ?? null,
    msg.latencyMs ?? null,
    msg.promptTokens ?? null,
    msg.outputTokens ?? null,
    msg.imageDataUrl ?? null,
    msg.imageSize ?? null,
    msg.createdAt
  );
  db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(msg.createdAt, msg.conversationId);
}

export function getConversationMessages(conversationId: string): ChatMessageRecord[] {
  const rows = db
    .prepare(
      `SELECT id, conversation_id, role, content, model, thinking_level,
              latency_ms, prompt_tokens, output_tokens, image_data_url, image_size, created_at
       FROM messages
       WHERE conversation_id = ?
       ORDER BY created_at ASC`
    )
    .all(conversationId) as Array<{
    id: string;
    conversation_id: string;
    role: 'user' | 'model';
    content: string;
    model: string;
    thinking_level: string | null;
    latency_ms: number | null;
    prompt_tokens: number | null;
    output_tokens: number | null;
    image_data_url: string | null;
    image_size: string | null;
    created_at: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    conversationId: r.conversation_id,
    role: r.role,
    content: r.content,
    model: r.model,
    thinkingLevel: r.thinking_level ?? undefined,
    latencyMs: r.latency_ms ?? undefined,
    promptTokens: r.prompt_tokens ?? undefined,
    outputTokens: r.output_tokens ?? undefined,
    imageDataUrl: r.image_data_url ?? undefined,
    imageSize: r.image_size ?? undefined,
    createdAt: r.created_at,
  }));
}

export function getMasterclassProgress(): Record<string, { completed: boolean; quizScore?: number; updatedAt: string }> {
  const rows = db.prepare('SELECT lesson_id, completed, quiz_score, updated_at FROM masterclass_progress').all() as Array<{
    lesson_id: string;
    completed: number;
    quiz_score: number | null;
    updated_at: string;
  }>;
  const out: Record<string, { completed: boolean; quizScore?: number; updatedAt: string }> = {};
  for (const r of rows) {
    out[r.lesson_id] = {
      completed: r.completed === 1,
      quizScore: r.quiz_score ?? undefined,
      updatedAt: r.updated_at,
    };
  }
  return out;
}

export function saveMasterclassProgress(lessonId: string, completed: boolean, quizScore?: number) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO masterclass_progress (lesson_id, completed, quiz_score, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(lesson_id) DO UPDATE SET
       completed = excluded.completed,
       quiz_score = COALESCE(excluded.quiz_score, masterclass_progress.quiz_score),
       updated_at = excluded.updated_at`
  ).run(lessonId, completed ? 1 : 0, quizScore ?? null, now);
}

export function listCodingFiles(): CodingFileRecord[] {
  const rows = db.prepare('SELECT id, name, language, content, updated_at FROM coding_files ORDER BY updated_at DESC').all() as Array<{
    id: string;
    name: string;
    language: CodingFileRecord['language'];
    content: string;
    updated_at: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    language: r.language,
    content: r.content,
    updatedAt: r.updated_at,
  }));
}

export function upsertCodingFile(file: CodingFileRecord): CodingFileRecord {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO coding_files (id, name, language, content, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       language = excluded.language,
       content = excluded.content,
       updated_at = excluded.updated_at`
  ).run(file.id, file.name, file.language, file.content, now);
  return { ...file, updatedAt: now };
}

export function deleteCodingFile(id: string) {
  db.prepare('DELETE FROM coding_files WHERE id = ?').run(id);
}

export function saveAgentWorkflow(wf: AgentWorkflowRecord) {
  db.prepare(
    `INSERT INTO agent_workflows (
      id, goal, model, require_human_approval, status, current_node,
      steps_json, tool_calls_json, final_report, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      current_node = excluded.current_node,
      steps_json = excluded.steps_json,
      tool_calls_json = excluded.tool_calls_json,
      final_report = excluded.final_report,
      updated_at = excluded.updated_at`
  ).run(
    wf.id,
    wf.goal,
    wf.model,
    wf.requireHumanApproval ? 1 : 0,
    wf.status,
    wf.currentNode,
    JSON.stringify(wf.steps),
    JSON.stringify(wf.toolCalls),
    wf.finalReport,
    wf.createdAt,
    wf.updatedAt
  );
}

export function getAgentWorkflow(id: string): AgentWorkflowRecord | null {
  const r = db.prepare('SELECT * FROM agent_workflows WHERE id = ?').get(id) as
    | {
        id: string;
        goal: string;
        model: GeminiModelId;
        require_human_approval: number;
        status: AgentWorkflowRecord['status'];
        current_node: AgentWorkflowRecord['currentNode'];
        steps_json: string;
        tool_calls_json: string;
        final_report: string;
        created_at: string;
        updated_at: string;
      }
    | undefined;
  if (!r) return null;
  return {
    id: r.id,
    goal: r.goal,
    model: r.model,
    requireHumanApproval: r.require_human_approval === 1,
    status: r.status,
    currentNode: r.current_node,
    steps: JSON.parse(r.steps_json),
    toolCalls: JSON.parse(r.tool_calls_json),
    finalReport: r.final_report,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listAgentWorkflows(limit = 20): AgentWorkflowRecord[] {
  const rows = db.prepare('SELECT * FROM agent_workflows ORDER BY updated_at DESC LIMIT ?').all(limit) as Array<{
    id: string;
    goal: string;
    model: GeminiModelId;
    require_human_approval: number;
    status: AgentWorkflowRecord['status'];
    current_node: AgentWorkflowRecord['currentNode'];
    steps_json: string;
    tool_calls_json: string;
    final_report: string;
    created_at: string;
    updated_at: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    goal: r.goal,
    model: r.model,
    requireHumanApproval: r.require_human_approval === 1,
    status: r.status,
    currentNode: r.current_node,
    steps: JSON.parse(r.steps_json),
    toolCalls: JSON.parse(r.tool_calls_json),
    finalReport: r.final_report,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function saveDataset(id: string, name: string, rows: Record<string, unknown>[], profile: DatasetProfile) {
  db.prepare(
    `INSERT INTO datasets (id, name, rows_json, profile_json, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       rows_json = excluded.rows_json,
       profile_json = excluded.profile_json`
  ).run(id, name, JSON.stringify(rows), JSON.stringify(profile), profile.createdAt);
}

export function listDatasets(): DatasetProfile[] {
  const rows = db.prepare('SELECT profile_json FROM datasets ORDER BY created_at DESC LIMIT 20').all() as Array<{
    profile_json: string;
  }>;
  return rows.map((r) => JSON.parse(r.profile_json));
}

export function getDatasetWithRows(id: string): { profile: DatasetProfile; rows: Record<string, unknown>[] } | null {
  const row = db.prepare('SELECT profile_json, rows_json FROM datasets WHERE id = ?').get(id) as
    | { profile_json: string; rows_json: string }
    | undefined;
  if (!row) return null;
  return {
    profile: JSON.parse(row.profile_json),
    rows: JSON.parse(row.rows_json),
  };
}

export function saveBenchmarkRun(run: BenchmarkRunRecord) {
  db.prepare(
    `INSERT INTO benchmarks (
      id, suite_name, model, thinking_level, total_cases, passed_cases,
      avg_latency_ms, total_tokens, json_validity_rate, code_pass_rate, details_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    run.id,
    run.suiteName,
    run.model,
    run.thinkingLevel,
    run.totalCases,
    run.passedCases,
    run.avgLatencyMs,
    run.totalTokens,
    run.jsonValidityRate,
    run.codePassRate,
    JSON.stringify(run.details),
    run.createdAt
  );
}

export function listBenchmarkRuns(): BenchmarkRunRecord[] {
  const rows = db.prepare('SELECT * FROM benchmarks ORDER BY created_at DESC LIMIT 30').all() as Array<{
    id: string;
    suite_name: string;
    model: GeminiModelId;
    thinking_level: BenchmarkRunRecord['thinkingLevel'];
    total_cases: number;
    passed_cases: number;
    avg_latency_ms: number;
    total_tokens: number;
    json_validity_rate: number;
    code_pass_rate: number;
    details_json: string;
    created_at: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    suiteName: r.suite_name,
    model: r.model,
    thinkingLevel: r.thinking_level,
    totalCases: r.total_cases,
    passedCases: r.passed_cases,
    avgLatencyMs: r.avg_latency_ms,
    totalTokens: r.total_tokens,
    jsonValidityRate: r.json_validity_rate,
    codePassRate: r.code_pass_rate,
    details: JSON.parse(r.details_json),
    createdAt: r.created_at,
  }));
}

export function getDashboardTelemetry(geminiConfigured: boolean, totalLessons: number): DashboardTelemetry {
  const convCount = (db.prepare('SELECT COUNT(*) as c FROM conversations').get() as { c: number }).c;
  const msgStats = db
    .prepare(
      `SELECT COUNT(*) as cnt,
              COALESCE(SUM(COALESCE(prompt_tokens,0) + COALESCE(output_tokens,0)), 0) as tok,
              COALESCE(AVG(latency_ms), 0) as avg_lat
       FROM messages`
    )
    .get() as { cnt: number; tok: number; avg_lat: number };
  const lessonsDone = (db.prepare('SELECT COUNT(*) as c FROM masterclass_progress WHERE completed = 1').get() as { c: number }).c;
  const codingCount = (db.prepare('SELECT COUNT(*) as c FROM coding_files').get() as { c: number }).c;
  const agentCount = (db.prepare('SELECT COUNT(*) as c FROM agent_workflows').get() as { c: number }).c;
  const dsCount = (db.prepare('SELECT COUNT(*) as c FROM datasets').get() as { c: number }).c;
  const benchCount = (db.prepare('SELECT COUNT(*) as c FROM benchmarks').get() as { c: number }).c;

  return {
    geminiConfigured,
    activeModel: 'gemini-4-hydrogen',
    conversationCount: convCount,
    messageCount: msgStats.cnt,
    totalTokensMeasured: msgStats.tok,
    avgLatencyMs: Math.round(msgStats.avg_lat || 0),
    completedLessons: lessonsDone,
    totalLessons,
    codingFilesCount: codingCount,
    agentRunsCount: agentCount,
    datasetsCount: dsCount,
    benchmarkRunsCount: benchCount,
    recentConversations: listConversations().slice(0, 5),
    recentActivities: listActivityLogs(15),
    recentWorkflows: listAgentWorkflows(5),
  };
}

export function resetNonEssentialData() {
  db.exec(`
    DELETE FROM messages;
    DELETE FROM conversations;
    DELETE FROM agent_workflows;
    DELETE FROM benchmarks;
    DELETE FROM activity_logs;
  `);
}
