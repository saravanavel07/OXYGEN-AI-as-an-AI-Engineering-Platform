# OXYGEN AI

**Intelligence in motion. Engineering without limits.**

OXYGEN AI is a full-stack AI engineering and learning platform that brings model exploration, coding tools, agent workflows, data utilities, and guided learning together in one workspace. Built with React and TypeScript, it combines a focused dark interface with live particle visuals and purposeful motion to make the platform feel responsive without distracting from the work.

## Experience

- **Live particle canvas:** A continuously rendered Canvas 2D background with drifting particles, fine connecting lines, and subtle crimson energy waves. Particles respond to pointer movement, and clicks create expanding wave pulses.
- **Motion-aware interactions:** View changes use concise transitions powered by Motion. The particle effect supports configurable density and respects the operating system's reduced-motion preference, as well as the app's reduced-motion setting.
- **Neural orbit visualization:** A canvas-based model visualization displays orbital rings and moving particles alongside runtime status.
- **Responsive workspace:** Desktop navigation and a mobile drawer provide access to the platform's modules, including the Command Center, Hydrogen Masterclass, Model Playground, AI Coding Studio, Agent Control Center, Data Intelligence Lab, Geospatial Explorer, API Laboratory, Benchmark Center, Project Workshop, Documentation, and Settings.
- **Practical engineering tools:** The platform includes AI-powered workflows, learning progress, activity history, persistent workspace data, and isolated Python and in-memory SQL execution.

## Technology

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Motion, Highlight.js, Marked, and a Canvas 2D particle engine.
- **Server:** Express on port `3000`, with Vite middleware in development and static `dist` serving in production.
- **AI integration:** Server-side `@google/genai` integration, configured with `GEMINI_API_KEY`.
- **Persistence:** SQLite through Node.js's built-in `node:sqlite` module.
- **Execution sandbox:** Isolated `python3 -I` subprocesses with AST safety checks, CPU and memory limits, and a five-second timeout; SQL runs against an in-memory SQLite database.

## Requirements

- Node.js 22 or later
- npm
- Python 3 for the Python execution sandbox
- A Google Gemini API key for AI-powered features

## Getting started

```bash
npm install
cp .env.example .env
```

Add your `GEMINI_API_KEY` to `.env`, then start the development server:

```bash
npm run dev
```

## Verification and production build

```bash
npm run lint
npm run build
node --test tests/oxygen.test.mjs
```

To run the production server after building:

```bash
npm start
```

## Motion and accessibility

The particle canvas is decorative and hidden from assistive technology. Users can adjust particle density and enable reduced motion in Settings. The animation also checks the browser's `prefers-reduced-motion` setting. Motion is designed to support the interface—not compete with its content.
