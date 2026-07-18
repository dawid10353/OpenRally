<div align="center">
  <img src="public/openrally_logo.png" alt="OpenRally Logo" width="400" />
</div>

# OpenRally

**OpenRally** is an open-source rally game project.

## Game Vision

- 3D browser-based game.
- Driving a car on **uneven, open terrain** (hills, valleys, elevations).
- **Arcade-sim** physics (low entry barrier, but drifting and suspension work provide satisfaction).
- A multi-year project, developed **exclusively by AI**.

## Roadmap

### Stage 1 — Foundation (COMPLETED)
- Terrain, physics, camera, controls, HUD, lighting

### Stage 2 — Polishing (IN PROGRESS)
- Particle effects, sound, various surfaces, map objects, post-processing

### Stage 3 — Expansion
- AI models (GLB), replacing blocky models with real 3D models of vehicles and environments, optimization tweaks, refactoring

### Stage 4+ — Future
- Multiplayer, map editor, weather, asset generation automation

## How to run

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open the address shown in the console in your browser (usually `http://localhost:5173`).

---

## Development Setup

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
