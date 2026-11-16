import type { CodingLanguage } from '../types/oxygen.ts';

export interface EngineeringProject {
  id: string;
  number: string;
  title: string;
  difficulty: 'Intermediate' | 'Advanced';
  recommendedModel: string;
  objectives: string[];
  prerequisites: string[];
  architecture: string[];
  language: CodingLanguage;
  fileName: string;
  sourceCode: string;
  executionSteps: string[];
  testCases: string;
  expectedResults: string;
}

export const WORKSHOP_PROJECTS: EngineeringProject[] = [
  {
    id: 'proj-01',
    number: '01',
    title: 'Python AI Assistant',
    difficulty: 'Intermediate',
    recommendedModel: 'gemini-4-hydrogen',
    objectives: [
      'Build a stateful CLI/service assistant in Python using the official google-genai SDK.',
      'Persist conversation turns locally in SQLite with latency measurement.',
    ],
    prerequisites: ['Python 3.10+', 'google-genai SDK', 'GEMINI_API_KEY'],
    architecture: ['Prompt Input', 'SQLite Context Store', 'Hydrogen Client', 'Streaming Output'],
    language: 'python',
    fileName: 'python_ai_assistant.py',
    sourceCode: `"""Project 01: Stateful Python AI Assistant with local SQLite memory."""
import sqlite3
import time
from typing import List, Tuple

class AssistantMemory:
    def __init__(self, db_path: str = ":memory:"):
        self.conn = sqlite3.connect(db_path)
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS turns (id INTEGER PRIMARY KEY, role TEXT, content TEXT, ms REAL)"
        )

    def add_turn(self, role: str, content: str, latency_ms: float = 0.0):
        self.conn.execute("INSERT INTO turns (role, content, ms) VALUES (?, ?, ?)", (role, content, latency_ms))
        self.conn.commit()

    def history(self, limit: int = 10) -> List[Tuple[str, str]]:
        cur = self.conn.execute("SELECT role, content FROM turns ORDER BY id DESC LIMIT ?", (limit,))
        return list(reversed(cur.fetchall()))

if __name__ == "__main__":
    mem = AssistantMemory()
    t0 = time.perf_counter()
    mem.add_turn("user", "Explain Python dataclasses.")
    mem.add_turn("model", "Dataclasses auto-generate __init__ and __repr__.", (time.perf_counter() - t0) * 1000)
    assert len(mem.history()) == 2
    print("Assistant history verified:", mem.history())
`,
    executionSteps: [
      'Open in AI Coding Studio or copy to local Python environment.',
      'Run inside the isolated Python sandbox to verify SQLite memory assertions.',
      'To connect live Gemini locally, install `google-genai` and invoke `client.chats.create`.',
    ],
    testCases: 'assert len(mem.history()) == 2 and mem.history()[0][0] == "user"',
    expectedResults: 'Prints verified 2-turn assistant history stored in SQLite.',
  },
  {
    id: 'proj-02',
    number: '02',
    title: 'SQL Query Generator',
    difficulty: 'Intermediate',
    recommendedModel: 'gemini-4-hydrogen',
    objectives: [
      'Translate natural-language analytics questions into read-only SQL queries.',
      'Enforce SELECT-only guardrails before executing against SQLite.',
    ],
    prerequisites: ['SQLite 3', 'Python AST/regex guard', 'Schema metadata'],
    architecture: ['NL Question', 'Schema Context', 'SQL Guardrail', 'Read-Only Execution'],
    language: 'sql',
    fileName: 'sql_query_generator.sql',
    sourceCode: `-- Project 02: Read-only Analytics Query against OXYGEN Telemetry Warehouse
WITH model_stats AS (
  SELECT
    model_name,
    COUNT(*) AS runs,
    ROUND(AVG(latency_ms), 2) AS mean_latency_ms,
    ROUND(AVG(output_tokens * 1000.0 / latency_ms), 1) AS est_tokens_per_sec
  FROM inference_logs
  WHERE status = 'nominal'
  GROUP BY model_name
)
SELECT *
FROM model_stats
ORDER BY est_tokens_per_sec DESC;
`,
    executionSteps: [
      'Click "Open in Coding Studio" to load this SQL workspace file.',
      'Click Run in Sandbox to execute against the isolated SQLite `:memory:` warehouse.',
    ],
    testCases: 'Verify output columns include model_name, runs, mean_latency_ms, est_tokens_per_sec.',
    expectedResults: 'Returns ranked throughput table ordered by tokens/sec.',
  },
  {
    id: 'proj-03',
    number: '03',
    title: 'Autonomous Research Agent',
    difficulty: 'Advanced',
    recommendedModel: 'gemini-4-hydrogen (XHIGH)',
    objectives: [
      'Synthesize structured research briefs from provided technical excerpts.',
      'Track citations and confidence boundaries explicitly.',
    ],
    prerequisites: ['Structured JSON schema', 'Citation verifier'],
    architecture: ['Query Decomposer', 'Evidence Extractor', 'Citation Scorer', 'Brief Compiler'],
    language: 'python',
    fileName: 'research_agent.py',
    sourceCode: `"""Project 03: Evidence-Grounded Research Synthesizer."""
from dataclasses import dataclass
from typing import List

@dataclass
class SourceExcerpt:
    doc_id: str
    text: str

def synthesize_grounded_notes(query_terms: List[str], docs: List[SourceExcerpt]) -> List[dict]:
    findings = []
    for doc in docs:
        hits = [term for term in query_terms if term.lower() in doc.text.lower()]
        if hits:
            findings.append({"doc_id": doc.doc_id, "matched_terms": hits, "excerpt": doc.text[:120]})
    return findings

if __name__ == "__main__":
    corpus = [
        SourceExcerpt("spec-01", "Gemini 4 Hydrogen supports LOW, MEDIUM, HIGH, and XHIGH thinking levels."),
        SourceExcerpt("spec-02", "API keys must remain strictly server-side in environment variables."),
    ]
    res = synthesize_grounded_notes(["Hydrogen", "XHIGH"], corpus)
    assert len(res) == 1 and res[0]["doc_id"] == "spec-01"
    print("Grounded findings:", res)
`,
    executionSteps: [
      'Run in AI Coding Studio Python sandbox.',
      'Pair with Agent Control Center for full Gemini-backed research orchestration.',
    ],
    testCases: 'assert len(res) == 1 and "XHIGH" in res[0]["matched_terms"]',
    expectedResults: 'Returns strictly matched source excerpts with zero fabricated citations.',
  },
  {
    id: 'proj-04',
    number: '04',
    title: 'Multi-Agent Data Analyst',
    difficulty: 'Advanced',
    recommendedModel: 'gemini-4-argon',
    objectives: [
      'Compute descriptive statistics and detect IQR outliers programmatically.',
      'Hand off verified metrics to a documentation agent.',
    ],
    prerequisites: ['Statistics stdlib / Pandas', 'IQR outlier math'],
    architecture: ['Profiler', 'Outlier Detector', 'Correlation Check', 'Report Writer'],
    language: 'python',
    fileName: 'multi_agent_analyst.py',
    sourceCode: `"""Project 04: Automated IQR Outlier & Telemetry Profiler."""
import statistics
from typing import List, Dict

def profile_numeric_series(values: List[float]) -> Dict[str, float]:
    s = sorted(values)
    n = len(s)
    q1 = s[n // 4]
    q3 = s[(3 * n) // 4]
    iqr = q3 - q1
    low, high = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    outliers = [v for v in s if v < low or v > high]
    return {
        "count": n,
        "mean": round(statistics.mean(s), 2),
        "median": round(statistics.median(s), 2),
        "iqr": round(iqr, 2),
        "outlier_count": len(outliers),
    }

if __name__ == "__main__":
    latencies = [280.0, 295.0, 310.0, 305.0, 290.0, 315.0, 298.0, 1420.0]
    report = profile_numeric_series(latencies)
    assert report["outlier_count"] == 1
    print("Data Analyst Profile:", report)
`,
    executionSteps: [
      'Load into Coding Studio and execute inside the Python sandbox.',
      'Upload a full CSV in Data Intelligence Lab for interactive correlation & chart profiling.',
    ],
    testCases: 'assert report["outlier_count"] == 1',
    expectedResults: 'Flags 1420.0ms spike as an IQR statistical outlier.',
  },
  {
    id: 'proj-05',
    number: '05',
    title: 'AI Debugging Assistant',
    difficulty: 'Intermediate',
    recommendedModel: 'gemini-4-carbon',
    objectives: [
      'Parse Python tracebacks and isolate root-cause off-by-one or type errors.',
      'Generate regression unit tests verifying the fix.',
    ],
    prerequisites: ['Python AST / traceback', 'Unit test assertions'],
    architecture: ['Traceback Parser', 'Carbon Root-Cause', 'Patch Diff', 'Sandbox Re-Test'],
    language: 'python',
    fileName: 'ai_debugging_assistant.py',
    sourceCode: `"""Project 05: Traceback Analyzer & Regression Guard."""
import traceback

def safe_divide_series(numerators, denominators):
    if len(numerators) != len(denominators):
        raise ValueError("Series lengths must match.")
    out = []
    for a, b in zip(numerators, denominators):
        if b == 0:
            out.append(None)
        else:
            out.append(round(a / b, 4))
    return out

if __name__ == "__main__":
    try:
        res = safe_divide_series([10, 20, 30], [2, 0, 5])
        assert res == [5.0, None, 6.0]
        print("Fixed division output:", res)
    except Exception:
        traceback.print_exc()
`,
    executionSteps: [
      'Open in Coding Studio and click "Debug" or "Code Review" using `gemini-4-carbon`.',
      'Run in Sandbox to verify ZeroDivisionError safety.',
    ],
    testCases: 'assert safe_divide_series([10, 20], [2, 0]) == [5.0, None]',
    expectedResults: 'Safely returns [5.0, None, 6.0] without raising ZeroDivisionError.',
  },
  {
    id: 'proj-06',
    number: '06',
    title: 'Document Intelligence System',
    difficulty: 'Intermediate',
    recommendedModel: 'gemini-4-hydrogen',
    objectives: [
      'Chunk technical markdown documents cleanly with overlap.',
      'Rank chunks by keyword & TF density for grounded Q&A.',
    ],
    prerequisites: ['Text chunking', 'Ranking logic'],
    architecture: ['Document Loader', 'Overlap Chunker', 'Relevance Ranker', 'Grounded Answer'],
    language: 'python',
    fileName: 'document_intelligence.py',
    sourceCode: `"""Project 06: Overlapping Document Chunker & Retrieval Scorer."""
def chunk_text(text: str, size: int = 120, overlap: int = 30) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = min(len(text), start + size)
        chunks.append(text[start:end])
        if end == len(text):
            break
        start += size - overlap
    return chunks

if __name__ == "__main__":
    doc = "OXYGEN AI integrates Google Gemini Hydrogen for structured extraction, multi-agent orchestration, and data intelligence."
    parts = chunk_text(doc, size=60, overlap=15)
    assert len(parts) >= 2
    print(f"Created {len(parts)} chunks:", parts)
`,
    executionSteps: [
      'Run in Coding Studio Python sandbox.',
      'Adjust `size` and `overlap` to balance context recall vs prompt tokens.',
    ],
    testCases: 'assert len(parts) >= 2',
    expectedResults: 'Produces overlapping chunks preserving boundary context.',
  },
  {
    id: 'proj-07',
    number: '07',
    title: 'PySpark Pipeline Assistant',
    difficulty: 'Advanced',
    recommendedModel: 'gemini-4-argon',
    objectives: [
      'Design idempotent PySpark ETL transformations with schema enforcement.',
      'Optimize partition writes and null handling.',
    ],
    prerequisites: ['PySpark SQL API', 'Parquet partitioning'],
    architecture: ['CSV/Parquet Ingest', 'Schema Cast', 'Deduplication', 'Partitioned Sink'],
    language: 'pyspark',
    fileName: 'pyspark_pipeline_assistant.py',
    sourceCode: `"""Project 07: Production PySpark Telemetry Aggregation Pipeline."""
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, IntegerType

TELEMETRY_SCHEMA = StructType([
    StructField("run_id", StringType(), False),
    StructField("model", StringType(), False),
    StructField("latency_ms", DoubleType(), True),
    StructField("output_tokens", IntegerType(), True),
])

def run_etl(spark: SparkSession, source_uri: str, target_uri: str):
    df = spark.read.schema(TELEMETRY_SCHEMA).csv(source_uri, header=True)
    agg = (
        df.dropDuplicates(["run_id"])
          .filter(F.col("latency_ms").isNotNull() & (F.col("latency_ms") > 0))
          .groupBy("model")
          .agg(
              F.count("*").alias("total_runs"),
              F.round(F.avg("latency_ms"), 2).alias("avg_latency_ms"),
              F.sum("output_tokens").alias("total_tokens"),
          )
    )
    agg.write.mode("overwrite").parquet(target_uri)
    return agg
`,
    executionSteps: [
      'Open in Coding Studio (PySpark mode).',
      'Use AI Refactor or Code Review to add window functions or watermark streaming.',
    ],
    testCases: 'Verify explicit StructType schema and dropDuplicates(["run_id"]).',
    expectedResults: 'Clean PySpark aggregation module ready for Spark clusters.',
  },
  {
    id: 'proj-08',
    number: '08',
    title: 'AI Report Generator',
    difficulty: 'Intermediate',
    recommendedModel: 'gemini-4-hydrogen',
    objectives: [
      'Compile structured JSON telemetry into clean Markdown executive reports.',
      'Ensure every number in the report traces directly to verified metrics.',
    ],
    prerequisites: ['JSON metrics input', 'Markdown formatting'],
    architecture: ['Metric Aggregator', 'Template Guard', 'Hydrogen Narrative', 'Markdown Export'],
    language: 'python',
    fileName: 'ai_report_generator.py',
    sourceCode: `"""Project 08: Deterministic Metric-to-Markdown Report Builder."""
def render_markdown_report(title: str, metrics: dict) -> str:
    lines = [f"# {title}", "", "| Metric | Measured Value |", "| --- | --- |"]
    for k, v in metrics.items():
        lines.append(f"| {k} | {v} |")
    return "\\n".join(lines)

if __name__ == "__main__":
    md = render_markdown_report("Hydrogen Benchmark Summary", {"Pass Rate": "100%", "Avg Latency ms": 342})
    assert "| Pass Rate | 100% |" in md
    print(md)
`,
    executionSteps: [
      'Execute in Coding Studio Python sandbox.',
      'Customize table formatting and ask AI Coding Assistant to add anomaly callouts.',
    ],
    testCases: 'assert "| Pass Rate | 100% |" in md',
    expectedResults: 'Outputs clean Markdown summary table matching exact metrics.',
  },
  {
    id: 'proj-09',
    number: '09',
    title: 'API Automation Assistant',
    difficulty: 'Intermediate',
    recommendedModel: 'gemini-3.1-flash-lite',
    objectives: [
      'Construct validated REST/JSON payloads and inspect retry policies.',
      'Diagnose 4xx vs 5xx status codes cleanly.',
    ],
    prerequisites: ['HTTP status semantics', 'Retry backoff'],
    architecture: ['Request Builder', 'Status Classifier', 'Backoff Policy', 'Response Inspector'],
    language: 'javascript',
    fileName: 'api_automation_assistant.js',
    sourceCode: `/**
 * Project 09: Gemini API Retry & Status Classifier (Node.js / JS)
 */
export function classifyHttpStatus(status) {
  if (status >= 200 && status < 300) return { retryable: false, state: 'nominal' };
  if (status === 429 || status >= 500) return { retryable: true, state: 'transient_backoff' };
  return { retryable: false, state: 'client_configuration_error' };
}

export function nextBackoffMs(attempt, baseMs = 400) {
  return Math.min(8000, baseMs * Math.pow(2, attempt));
}
`,
    executionSteps: [
      'Open in Coding Studio (JavaScript mode).',
      'Use AI Test Generation to produce Vitest/Jest unit tests for edge status codes.',
    ],
    testCases: 'classifyHttpStatus(429).retryable === true && classifyHttpStatus(400).retryable === false',
    expectedResults: 'Generates complete retry classifier and unit test suite.',
  },
  {
    id: 'proj-10',
    number: '10',
    title: 'Intelligent Data Exploration Platform',
    difficulty: 'Advanced',
    recommendedModel: 'gemini-4-hydrogen',
    objectives: [
      'Combine automated dataset profiling with natural-language Q&A.',
      'Compute Pearson correlations across numeric metrics.',
    ],
    prerequisites: ['CSV/XLSX ingestion', 'Pearson math', 'Gemini Hydrogen'],
    architecture: ['File Validator', 'Statistical Profiler', 'Correlation Engine', 'NL Q&A'],
    language: 'python',
    fileName: 'data_exploration_engine.py',
    sourceCode: `"""Project 10: Pure-Python Pearson Correlation Matrix Engine."""
import math

def pearson(xs, ys):
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    den = math.sqrt(sum((x - mx) ** 2 for x in xs) * sum((y - my) ** 2 for y in ys))
    return round(num / den, 3) if den else 0.0

if __name__ == "__main__":
    tokens = [100, 250, 400, 650, 900]
    latency = [120, 210, 340, 510, 740]
    r = pearson(tokens, latency)
    assert r > 0.98
    print("Pearson correlation (tokens vs latency):", r)
`,
    executionSteps: [
      'Run in Coding Studio Python sandbox.',
      'Try the full interactive version in Data Intelligence Lab.',
    ],
    testCases: 'assert pearson([100, 250, 400], [120, 210, 340]) > 0.98',
    expectedResults: 'Computes strong positive correlation r > 0.99.',
  },
];
