<div align="center">

# OXYGEN AI

### Intelligence in Motion. Engineering Without Limits.

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=20232A)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com/)

<br />

<a href="https://readme-typing-svg.demolab.com?font=Inter&weight=600&size=20&duration=2800&pause=900&color=E34252&center=true&vCenter=true&width=760&lines=Build+with+AI+%E2%80%94+create+without+limits;Explore+models%2C+agents%2C+and+workflows;Engineering+intelligence+in+motion" target="_blank">
  <img src="https://readme-typing-svg.demolab.com?font=Inter&weight=600&size=20&duration=2800&pause=900&color=E34252&center=true&vCenter=true&width=760&lines=Build+with+AI+%E2%80%94+create+without+limits;Explore+models%2C+agents%2C+and+workflows;Engineering+intelligence+in+motion" alt="Animated text about AI engineering, models, agents, and workflows" />
</a>

<br />

<img src="assets/readme-particles.svg" alt="Animated crimson particles moving through a glowing network" width="100%" />

<br />

**A full-stack autonomous AI engineering and learning platform powered by Google Gemini.**

</div>

---

OXYGEN AI is a full-stack autonomous AI engineering and learning platform built around Google Gemini Hydrogen (`gemini-4-hydrogen`). It unifies AI-assisted development, guided learning, production-ready tooling, and a live, motion-driven interface into a single intelligent workspace.

At the center of the experience is a real-time particle canvas and motion-led interface system. Cursor interaction, ambient wave pulses, dynamic particle connections, and animated transitions create a responsive, modern operating environment while preserving clarity and usability.

## Live motion and particle experience

OXYGEN AI includes a live animated particle background that continuously renders on a canvas layer across the interface. The live particle illustration above brings that visual identity into the README, too. The motion system:

- Animates floating particles with subtle motion and interconnection lines.
- Creates crimson energy waves that pulse through the canvas.
- Reacts to mouse movement for a responsive, fluid feel.
- Supports configurable particle density and accessibility-aware reduced-motion behavior.
- Uses Motion-powered transitions between views for smooth navigation.

## Platform capabilities

- AI coding and orchestration workflows for engineering tasks.
- Model experimentation and runtime orchestration with Gemini-based models.
- Guided learning and structured hydrogen masterclass content.
- Agent and workflow control surfaces for operational management.
- Data intelligence and analytics tooling.
- Geospatial exploration and API experimentation.
- Benchmarking, project workspaces, and documentation tools.

## Languages, frameworks, and technologies

**Languages**
- TypeScript — primary application and server language.
- JavaScript — runtime and supporting scripts.
- Python — isolated execution sandbox.
- HTML and CSS — application structure and styling.
- SQL — database and analytical query workflows.

**Frameworks and libraries**
- React 19 for the user interface.
- Express 4 for the backend API and server.
- Vite for development and production builds.
- Tailwind CSS v4 for styling.
- Motion for interface transitions and animation.
- Google GenAI SDK (`@google/genai`) for Gemini integration.
- Highlight.js and Marked for code highlighting and Markdown rendering.
- `@vis.gl/react-google-maps` for Google Maps integration.

**Runtime, storage, and visualization**
- Node.js 22+ with built-in `node:sqlite` for SQLite persistence.
- Canvas 2D for the live particle engine.
- Docker Compose for containerized deployment.

## Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, Highlight.js, Marked, and a live Canvas 2D particle engine.
- **Backend (`server.ts`)**: Express server on port `3000`, with Vite middleware in development and static `dist` serving in production.
- **AI SDK (`server/gemini.ts`)**: Server-side `@google/genai` integration supporting `gemini-4-hydrogen`, `gemini-3.1-flash-lite`, `gemini-4-argon`, `gemini-4-carbon`, and `gemini-3-pro-image-preview`.
- **Persistence (`server/db.ts`)**: SQLite through Node 22 built-in `node:sqlite`.
- **Execution Sandbox (`server/sandbox.ts`)**: Isolated `python3 -I` subprocess with AST safety checks, CPU and memory caps, and a 5-second timeout, plus in-memory SQLite SQL execution.

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
