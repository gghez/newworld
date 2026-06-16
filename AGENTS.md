# AGENTS.md - AI Agent Instructions

This document is a reference guide for AI agents working on this project.

## 0. Meta Rules
- **Language & Style**: This file must be written in English and kept concise.
- **Git Worktree Sync**: When starting work in a git worktree, ensure it is fully up-to-date with origin/main (fetch origin and rebase your active branch on origin/main before making any edits).

## 1. Project Overview
A **2D space and demographic simulation game** to observe emergent social behaviors (fluid movement, genetic crossover, resource consumption, knowledge/dialect transmission).
- **Core Stack**: Vite + React (TypeScript) + Zustand
- **Graphics**: HTML5 Canvas (physics) & Chart.js (statistics)
- **Persistence**: LocalStorage (auto-saves config)
- **Styling**: Modern Vanilla CSS (no Tailwind CSS unless requested)

## 2. Common Commands
- Install: `npm install`
- Dev server: `npm run dev` (runs on `http://localhost:5173`)
- Lint: `npm run lint`
- Build: `npm run build`
- Test: `npm run test`

## 3. Code Architecture
Keep math/physics simulation decoupled from React.
```text
/src
  ├── core/                 # Pure physics and behavioral logic (TypeScript)
  │   ├── types.ts          # Strong typing
  │   ├── Agent.ts          # FSM, movement, needs, genetics
  │   └── SimulationEngine.ts # Collisions, updates, communication
  ├── store/                # Zustand store bridging core to React
  ├── components/           # React components (setup, canvas, stats)
  ├── App.tsx
  └── main.tsx
```

### Directives:
1. **Decoupled Logic**: Never write physical/steering forces or genetic crossover logic directly in React components. Use `core/` and Zustand.
2. **TypeScript**: Use strong typing. Use separate type imports (`import type { ... }`) per `verbatimModuleSyntax`.
3. **Docs Sync**: Keep **[docs/game_description.md](docs/game_description.md)** updated with any rule or gameplay mechanic changes.
4. **No Absolute Paths**: Never use absolute paths (e.g. `C:/Users/...` or `file:///C:...`). Use relative paths only.

## 4. UI & Styling
- **Vanilla CSS**: Native CSS only. Define variables in `:root` (`src/index.css`) for dark/light themes.
- **Aesthetics**: Use smooth hover effects, micro-animations (e.g., sleeping, mating), and responsive Flexbox/Grid layouts.

## 5. Debugging & Tools
- **State Exposure**: In dev mode, Zustand and the engine are exposed on `window`:
  - `window.simulationStore = useSimulationStore`
  - `window.getEngine = () => engineInstance`
- **Inspect**:
  - Active agents: `window.simulationStore.getState().agents`
  - Physics state: `window.getEngine().agents`
  - Manual step: `window.simulationStore.getState().step(0.1)`
- **Visual Validation**: Take browser screenshots of `http://localhost:5173` to verify design changes.

## 6. Helper Tools
- **Web Guidance**: Run `npx.cmd -y modern-web-guidance@latest` to search for modern web best practices.
