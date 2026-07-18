# 3D Car Simulator — Internal Documentation for AI

## Project Status
- **Stage**: 2/3 (Polishing / Expansion) — physics engine, terrain, and effects are largely implemented.
- **Done**: Foundations, vehicle physics (Rapier), cameras, tire tracks, dust particles, engine sound, configurations (`src/config`), TypeScript bug fixes.
- **Environment**: The project is run in WSL (Linux) using Google Antigravity. Use only standard Linux commands (e.g., `npm install`, `npm run dev`, `npx`). Do not use Windows workarounds anymore (such as `cmd.exe /c`), because the terminal operates in a Linux environment.
  - **Game Testing**: The development server (`npm run dev`) runs in WSL, and the browser_agent displays the game in a browser on Windows. The port is automatically mapped to `http://localhost:5173/`.
---

## Game Vision
3D browser game:
- Driving a car over **uneven, open terrain** (hills, valleys, elevations)
- **Arcade-sim** physics (low entry barrier, but drifting and suspension work provide satisfaction)
- Multi-year project, developed **exclusively by AI**

---

## Technology Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict mode) |
| Bundler | Vite |
| UI Framework | React 18+ |
| 3D Graphics | React Three Fiber (R3F) + @react-three/drei |
| Physics | @react-three/rapier (Rapier3D, WASM) |
| Game State | Zustand |
| Post-processing | @react-three/postprocessing |
| Model Format | GLB/GLTF |
| Linting | Oxlint (NOT ESLint!) + optional Prettier |

### Dependencies to install (npm install):
```
@react-three/fiber three @react-three/drei @react-three/rapier @react-three/postprocessing zustand
```

---

## Directory Structure

```
src/
├── components/
│   ├── canvas/          # 3D Scene (Canvas, lights, post-processing)
│   ├── vehicle/         # Car: visual model, effects (dust, tracks)
│   ├── terrain/         # Terrain generator, heightmap, textures
│   ├── environment/     # Sky, weather, decorative objects
│   └── ui/              # HUD, menu, speedometer (React overlay)
├── hooks/
│   ├── useVehiclePhysics.ts   # Vehicle physics logic (raycast vehicle)
│   ├── useInput.ts            # Keyboard / gamepad handling
│   ├── useChaseCamera.ts      # Chase camera
│   ├── useBumperCamera.ts     # Bumper camera
│   └── useEngineSound.ts      # Engine sound handling
├── store/
│   ├── gameStore.ts           # Game state (speed, position, mode)
│   └── settingsStore.ts       # Settings (graphics, controls)
├── config/                    # Global configuration files (variables, constants, balances)
├── utils/
│   ├── terrainGenerator.ts    # Perlin noise, heightmap
│   └── math.ts                # Helper functions (lerp, clamp)
├── types/                     # TypeScript interfaces
├── App.tsx
└── main.tsx
public/
└── models/
    ├── vehicles/              # Car GLB models (from AI)
    └── props/                 # Trees, rocks, buildings (from AI)
```

---

## Coding Conventions

1. **One hook = one file** in `src/hooks/`
2. **One component = one file** in the appropriate subfolder of `src/components/`
3. **Configurations** separated into files in `src/config/` (e.g., physics balance, vehicle)
4. **Global types** in `src/types/` (e.g., `vehicle.ts`, `terrain.ts`, `game.ts`)
5. **Zustand stores** in `src/store/` — each store in a separate file
6. **Naming**: PascalCase for components, camelCase for hooks and utils
7. **JSDoc comments** for every exported function/type
8. **No `any`** — always type explicitly

---

## Implemented Game Features (Stage 1 and part of 2)

### Terrain (Heightmap)
- Perlin noise for heightmap generation
- Rapier HeightfieldCollider (physical collision with the terrain)

### Car Physics
- Rapier Raycast Vehicle — suspension
- Optimized brake and drift balance, tire tracks

### Camera
- Chase camera (lerp), Free camera, Bumper camera

### HUD & Visuals
- Dynamic skybox, real-time shadows, post-processing effects (Bloom, Vignette)
- Particle effects (DustParticles), engine sound (EngineSound)

---

## Generating 3D Objects via AI

Tools for 3D model generation:
- **Meshy AI** (meshy.ai) — text-to-3D, image-to-3D, auto-rigging, PBR, GLB export
- **Tripo AI** (tripo3d.ai) — clean topology, hard-surface, GLB export
- **Rodin AI** (hyper3d.ai) — photorealism, hero assets, GLB export

Pipeline: Prompt → API → .glb → /public/models/ → useGLTF() → game

Target poly-count:
- Vehicles: 5,000–15,000 triangles
- Environment objects: 500–3,000 triangles

Initially: car from simple Three.js shapes (box/cylinder), replacing with GLB = 1 line of code.

---

## Roadmap

### Stage 1 — Foundation (COMPLETED)
Terrain, physics, camera, controls, HUD, lighting

### Stage 2 — Polishing (IN PROGRESS)
Particle effects, sound, different surfaces, objects on the map, post-processing

### Stage 3 — Expansion ⬅️ NOW (Main focus)
AI models (GLB), replacing blocky models with real 3D vehicle and environment models, optimization tweaks, refactoring

### Stage 4+ — Future
Multiplayer, map editor, weather, asset generation automation

---

## ⚠️ Common Mistakes to Avoid (AI Rules)
1. **Error in `tsconfig.app.json`**: NEVER add the `"ignoreDeprecations": "6.0"` option in TypeScript configuration files (e.g., `tsconfig.app.json`). The project defaults to not needing this flag at all. Adding it always breaks the configuration and throws an error due to the specifics of the current compiler version.
