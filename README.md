# OXYGEN AI

**Intelligence in Motion. Engineering Without Limits.**

OXYGEN AI is a full-stack autonomous AI engineering and learning platform centered on Google Gemini Hydrogen (`gemini-4-hydrogen`), featuring an interactive Canvas particle engine, a 7-level Hydrogen Masterclass, streaming multi-turn Playground with 1K/2K/4K Pro Image generation, an isolated Python & SQL Coding Studio, a 6-node Multi-Agent Orchestrator with human approval checkpoints, Data Intelligence Lab, API Laboratory, Benchmark Center, and 10 hands-on Engineering Projects.

## Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, Highlight.js, Marked, Canvas 2D Particle Engine.
- **Backend (`server.ts`)**: Express server on port `3000` with Vite middleware in dev and static `dist` serving in production.
- **AI SDK (`server/gemini.ts`)**: Server-side `@google/genai` integration supporting `gemini-4-hydrogen`, `gemini-3.1-flash-lite`, `gemini-4-argon`, `gemini-4-carbon`, and `gemini-3-pro-image-preview`.
- **Persistence (`server/db.ts`)**: SQLite database via Node 22 built-in `node:sqlite`.
- **Execution Sandbox (`server/sandbox.ts`)**: Isolated `python3 -I` subprocess with AST safety checks, CPU/memory caps, and 5s timeout, plus SQLite `:memory:` SQL execution.

## Setup

```bash
npm install
cp .env.example .env
# Set GEMINI_API_KEY in .env or environment secrets
npm run dev
```

## Verification & Build

```bash
npm run lint
npm run build
node --test tests/oxygen.test.mjs
```
