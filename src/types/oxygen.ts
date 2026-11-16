export type NavSectionId =
  | 'command-center'
  | 'masterclass'
  | 'playground'
  | 'coding-studio'
  | 'agents'
  | 'data-lab'
  | 'geospatial'
  | 'api-lab'
  | 'benchmarks'
  | 'projects'
  | 'docs'
  | 'settings';

export type GeminiModelId =
  | 'gemini-4-hydrogen'
  | 'gemini-4-carbon'
  | 'gemini-4-argon'
  | 'gemini-3.1-flash-lite'
  | 'gemini-3-pro-image-preview';

export type ThinkingLevelOption = 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'XHIGH';

export type ImageSizeOption = '1K' | '2K' | '4K';

export type ImageAspectRatioOption = '1:1' | '16:9' | '4:3' | '3:4' | '9:16';

export interface ModelSpec {
  id: GeminiModelId;
  label: string;
  tier: 'Hydrogen' | 'Carbon' | 'Argon' | 'Flash Lite' | 'Pro Image';
  role: string;
  supportsThinking: ThinkingLevelOption[];
  defaultThinking: ThinkingLevelOption;
  requiresPaidKey: boolean;
  isImageModel?: boolean;
}

export interface ChatMessageRecord {
  id: string;
  conversationId: string;
  role: 'user' | 'model';
  content: string;
  model: string;
  thinkingLevel?: string;
  latencyMs?: number;
  promptTokens?: number;
  outputTokens?: number;
  imageDataUrl?: string;
  imageSize?: string;
  createdAt: string;
}

export interface ConversationRecord {
  id: string;
  title: string;
  model: GeminiModelId;
  systemInstruction: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export type CodingLanguage =
  | 'python'
  | 'java'
  | 'sql'
  | 'javascript'
  | 'html'
  | 'css'
  | 'pyspark';

export interface CodingFileRecord {
  id: string;
  name: string;
  language: CodingLanguage;
  content: string;
  updatedAt: string;
}

export interface SandboxExecutionResult {
  success: boolean;
  language: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  timedOut: boolean;
  blockedReason?: string;
  sqlRows?: Record<string, unknown>[];
  sqlColumns?: string[];
}

export type AgentNodeId =
  | 'orchestrator'
  | 'research'
  | 'coding'
  | 'data_analyst'
  | 'testing'
  | 'documentation';

export type AgentStepStatus =
  | 'pending'
  | 'running'
  | 'awaiting_approval'
  | 'completed'
  | 'failed'
  | 'skipped';

export interface AgentToolCall {
  id: string;
  agent: AgentNodeId;
  toolName: string;
  inputSummary: string;
  outputSummary: string;
  durationMs: number;
  timestamp: string;
}

export interface AgentStepState {
  agent: AgentNodeId;
  label: string;
  status: AgentStepStatus;
  output: string;
  latencyMs?: number;
  tokens?: number;
  error?: string;
}

export interface AgentWorkflowRecord {
  id: string;
  goal: string;
  model: GeminiModelId;
  requireHumanApproval: boolean;
  status: 'running' | 'awaiting_approval' | 'completed' | 'failed';
  currentNode: AgentNodeId;
  steps: AgentStepState[];
  toolCalls: AgentToolCall[];
  finalReport: string;
  createdAt: string;
  updatedAt: string;
}

export interface ColumnProfile {
  name: string;
  type: 'numeric' | 'categorical' | 'boolean' | 'date';
  nonNullCount: number;
  missingCount: number;
  uniqueCount: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  q25?: number;
  q75?: number;
  outlierCount?: number;
  topValues: Array<{ value: string; count: number }>;
  histogram?: Array<{ bin: string; count: number }>;
}

export interface DatasetProfile {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
  duplicateRowCount: number;
  totalMissingCells: number;
  columns: ColumnProfile[];
  correlations: {
    numericColumns: string[];
    matrix: number[][];
  };
  sampleRows: Record<string, string | number | boolean | null>[];
  createdAt: string;
}

export interface BenchmarkRunRecord {
  id: string;
  suiteName: string;
  model: GeminiModelId;
  thinkingLevel: ThinkingLevelOption;
  totalCases: number;
  passedCases: number;
  avgLatencyMs: number;
  totalTokens: number;
  jsonValidityRate: number;
  codePassRate: number;
  details: Array<{
    caseId: string;
    caseName: string;
    category: string;
    passed: boolean;
    latencyMs: number;
    tokens: number;
    notes: string;
  }>;
  createdAt: string;
}

export interface ActivityLogRecord {
  id: string;
  category: 'playground' | 'coding' | 'agent' | 'data' | 'benchmark' | 'masterclass' | 'system';
  action: string;
  detail: string;
  status: 'nominal' | 'warning' | 'error';
  latencyMs?: number;
  createdAt: string;
}

export interface DashboardTelemetry {
  geminiConfigured: boolean;
  activeModel: GeminiModelId;
  conversationCount: number;
  messageCount: number;
  totalTokensMeasured: number;
  avgLatencyMs: number;
  completedLessons: number;
  totalLessons: number;
  codingFilesCount: number;
  agentRunsCount: number;
  datasetsCount: number;
  benchmarkRunsCount: number;
  recentConversations: ConversationRecord[];
  recentActivities: ActivityLogRecord[];
  recentWorkflows: AgentWorkflowRecord[];
}
