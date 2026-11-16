# OXYGEN AI

**Intelligence in Motion. Engineering Without Limits.**

OXYGEN AI is a full-stack autonomous AI engineering and learning platform built around Google Gemini Hydrogen (`gemini-4-hydrogen`). It unifies AI-assisted development, guided learning, production-ready tooling, and a live, motion-driven interface into a single intelligent workspace.

At the center of the experience is a real-time particle canvas and motion-led interface system that brings the platform to life. Cursor interaction, ambient wave pulses, dynamic particle connections, and animated transitions create a professional, modern operating environment without sacrificing clarity or usability.

## Live motion and particle experience

OXYGEN AI includes a live animated particle background that continuously renders on a canvas layer across the interface. The engine:

- animates floating particles with subtle motion and interconnection lines
- creates crimson energy waves that pulse through the canvas
- reacts to mouse movement for a responsive, fluid feel
- supports configurable particle density and accessibility-aware reduced-motion behavior
- visually reinforces the platform's AI-driven, dynamic runtime identity

The interface also uses Motion-powered transitions between views to provide smooth, polished navigation and a strong product feel.

## Platform capabilities

- AI coding and orchestration workflows for engineering tasks
- model experimentation and runtime orchestration with Gemini-based models
- guided learning and structured hydrogen masterclass content
- agent and workflow control surfaces for operational management
- data intelligence and analytics tooling
- geospatial exploration and API experimentation
- benchmarking, project workspaces, and documentation tools

## Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, Highlight.js, Marked, and a live Canvas 2D particle engine
- **Backend (`server.ts`)**: Express server on port `3000`, with Vite middleware in development and static `dist` serving in production
- **AI SDK (`server/gemini.ts`)**: Server-side `@google/genai` integration supporting `gemini-4-hydrogen`, `gemini-3.1-flash-lite`, `gemini-4-argon`, `gemini-4-carbon`, and `gemini-3-pro-image-preview`
- **Persistence (`server/db.ts`)**: SQLite through Node 22 built-in `node:sqlite`
- **Execution Sandbox (`server/sandbox.ts`)**: Isolated `python3 -I` subprocess with AST safety checks, CPU and memory caps, and a 5-second timeout, plus in-memory SQLite SQL execution

## Requirements

- Node.js 22+
- npm
- Python 3 for the sandboxed execution environment
- A valid Google Gemini API key (`GEMINI_API_KEY`)

## Getting started

```bash
npm install
cp .env.example .env
```

Set your API key in `.env` or environment secrets, then run:

```bash
npm run dev
```

## Verification and build

```bash
npm run lint
npm run build
node --test tests/oxygen.test.mjs
```

## Production run

```bash
npm start
```

## Motion and accessibility

The live motion system is designed to enhance the experience while preserving usability and accessibility. Particle density is user-configurable, and motion is automatically reduced when the system or app prefers reduced-motion settings. The animated background remains decorative and does not interfere with workflow or accessibility.

OXYGEN AI is engineered to feel vivid, responsive, and intelligent—bringing real-time motion and AI tooling together in a unified engineering platform.
