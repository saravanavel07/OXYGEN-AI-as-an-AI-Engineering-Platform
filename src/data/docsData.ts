export interface DocArticle {
  id: string;
  category:
    | 'Installation'
    | 'API Configuration'
    | 'Architecture'
    | 'Modules'
    | 'Security'
    | 'Troubleshooting'
    | 'FAQ'
    | 'Release Notes'
    | 'Roadmap';
  title: string;
  summary: string;
  body: string;
}

export const DOCUMENTATION_ARTICLES: DocArticle[] = [
  {
    id: 'doc-install',
    category: 'Installation',
    title: 'Installation & Local Development Setup',
    summary: 'Prerequisites, dependency installation, and running OXYGEN AI on port 3000.',
    body: `### Prerequisites
- **Node.js 22+** (provides built-in \`node:sqlite\` persistence with zero native compilation)
- **Python 3.10+** (used by the isolated Coding Studio & Testing Agent sandbox)
- **GEMINI_API_KEY** configured in environment secrets

### Quick Start
\`\`\`bash
npm install
npm run dev
\`\`\`
The Express + Vite full-stack server listens on \`http://localhost:3000\`. For production builds:
\`\`\`bash
npm run build
npm start
\`\`\``,
  },
  {
    id: 'doc-api-config',
    category: 'API Configuration',
    title: 'Gemini Models & API Configuration',
    summary: 'Verified model identifiers, thinkingLevel configuration, and server-side key handling.',
    body: `### Verified Model Routing in OXYGEN AI
| Model ID | Primary Role | Thinking Levels | Key Tier |
| --- | --- | --- | --- |
| \`gemini-4-hydrogen\` | Balanced core, coding, agents | \`LOW\`, \`MEDIUM\`, \`HIGH\`, \`XHIGH\` | Standard / Paid |
| \`gemini-3.1-flash-lite\` | Ultra-low-latency fast assist | \`MINIMAL\`, \`LOW\` | Standard / Paid |
| \`gemini-4-argon\` | Complex STEM & coding | \`LOW\`, \`MEDIUM\`, \`HIGH\` | Paid Key |
| \`gemini-4-carbon\` | Deep root-cause & security | \`LOW\`, \`MEDIUM\`, \`HIGH\` | Paid Key |
| \`gemini-3-pro-image-preview\` | 1K, 2K, 4K Image Generation | N/A | Paid Key |

### Security Rule
\`GEMINI_API_KEY\` is accessed exclusively inside \`server/gemini.ts\` and is never exposed to client bundles.`,
  },
  {
    id: 'doc-architecture',
    category: 'Architecture',
    title: 'System Technical Architecture',
    summary: 'Full-stack Express + React + SQLite + Python Sandbox layout.',
    body: `### Layered Architecture
1. **Frontend Workspace (React 19 + Tailwind CSS v4)**: 11 cohesive engineering workspaces layered over the Canvas Particle Engine.
2. **Backend API Gateway (\`server.ts\`)**: Express server validating payloads, enforcing per-IP rate limits, streaming SSE chunks, and serving Vite/static assets.
3. **Gemini Adapter (\`server/gemini.ts\`)**: Centralized \`@google/genai\` client with \`User-Agent: aistudio-build\`, error classification, and thinking-level mapping.
4. **Isolated Sandbox (\`server/sandbox.ts\`)**: Ephemeral temp-dir \`python3 -I\` execution with 5-second timeout, memory caps, and AST import guards, plus in-memory SQLite SQL testing.
5. **SQLite Store (\`server/db.ts\`)**: Persistent WAL-mode SQLite database (\`oxygen_ai.db\`) storing conversations, progress, files, agent checkpoints, datasets, benchmarks, and audit logs.`,
  },
  {
    id: 'doc-modules',
    category: 'Modules',
    title: 'Platform Module Reference',
    summary: 'Overview of all 11 workspaces inside OXYGEN AI.',
    body: `- **Command Center**: Real telemetry KPIs, central neural-orbit visualization, recent conversations, and audit feed.
- **Hydrogen Masterclass**: 7-level, 21-lesson interactive curriculum with quizzes and completion persistence.
- **Model Playground**: Streaming multi-turn chat, system prompts, and 1K/2K/4K Image Generation studio.
- **AI Coding Studio**: Multi-language editor, AI assist (Debug/Refactor/Test/Review), and Python/SQL sandbox execution.
- **Agent Control Center**: 6-node multi-agent orchestrator with tool traces and human approval checkpoints.
- **Data Intelligence Lab**: CSV/Excel profiling, correlation heatmap, data cleaning, and NL Q&A.
- **API Laboratory**: Live request tester + Python/TypeScript/cURL snippet explorer.
- **Benchmark Center**: Reproducible suite measuring latency, tokens, JSON validity, and sandbox pass rates.
- **Project Workshop**: 10 hands-on engineering blueprints transferable directly to Coding Studio.`,
  },
  {
    id: 'doc-security',
    category: 'Security',
    title: 'Security Guidance & Sandbox Isolation',
    summary: 'How OXYGEN AI protects credentials, uploaded datasets, and code execution.',
    body: `### Key Controls
- **Zero Client Secrets**: No API keys in React code or browser storage.
- **Upload Validation**: Data Intelligence Lab restricts files to \`.csv\`, \`.tsv\`, \`.xlsx\`, \`.xls\` under 5 MB.
- **Sandbox Containment**: \`runIsolatedPython\` rejects imports of \`os\`, \`subprocess\`, \`socket\`, \`urllib\`, \`requests\`, \`http\`, \`ctypes\`, and dynamic \`eval\`/\`exec\` before spawning \`python3 -I\` in an ephemeral directory with \`RLIMIT_CPU\` and \`RLIMIT_AS\` caps.
- **Rate Limiting**: Mutating \`/api/*\` endpoints enforce sliding-window throttling.`,
  },
  {
    id: 'doc-troubleshooting',
    category: 'Troubleshooting',
    title: 'Troubleshooting & Error Diagnostics',
    summary: 'Resolving 400, 403, 404, 429, and sandbox errors.',
    body: `- **403 Permission Denied / API Key Invalid**: Verify \`GEMINI_API_KEY\` in **Settings > Secrets**.
- **429 Resource Exhausted on Carbon/Argon/Pro Image**: These models require a billing-enabled API key in **Settings > Secrets**, or switch to \`gemini-4-hydrogen\` / \`gemini-3.1-flash-lite\`.
- **400 Invalid Argument on Thinking Level**: Ensure \`MINIMAL\` is only used with \`gemini-3.1-flash-lite\`, and \`XHIGH\` is only used with \`gemini-4-hydrogen\`.
- **Sandbox Security Guard Blocked**: Remove restricted network/system imports (\`os\`, \`subprocess\`, \`requests\`) when testing algorithms in the isolated Python sandbox.`,
  },
  {
    id: 'doc-faq',
    category: 'FAQ',
    title: 'Frequently Asked Questions',
    summary: 'Common questions on model availability, data privacy, and benchmarks.',
    body: `**Q: Are the benchmark metrics real or hardcoded?**
All metrics shown in Command Center and Benchmark Center are measured directly from real executions stored in \`oxygen_ai.db\`. When fresh, empty states appear until you run tasks.

**Q: Can I export my playground chats and datasets?**
Yes. Playground supports JSON/Markdown export, Coding Studio exports source files, and Data Lab exports cleaned JSON/CSV.`,
  },
  {
    id: 'doc-release',
    category: 'Release Notes',
    title: 'Release Notes — v1.0.0',
    summary: 'Initial production release of OXYGEN AI.',
    body: `- Complete 11-workspace Obsidian/Crimson/Silver engineering interface.
- Full-stack Express + SQLite persistence + \`@google/genai\` v3.3+ integration.
- Multi-turn streaming chat, 1K/2K/4K image synthesis, low-latency Flash-Lite quick assist.
- Isolated Python 3 & SQLite sandbox + 6-node multi-agent orchestrator with HITL approval.`,
  },
  {
    id: 'doc-roadmap',
    category: 'Roadmap',
    title: 'Engineering Development Roadmap',
    summary: 'Planned extensions for distributed execution and team collaboration.',
    body: `- **Phase Next A**: PostgreSQL + pgvector adapter for multi-tenant document RAG indexing.
- **Phase Next B**: Live Audio / Voice engineering pair-programming via \`gemini-3.8-live\`.
- **Phase Next C**: Containerized Docker-in-Docker sandbox runner for Java and PySpark workloads.`,
  },
];
