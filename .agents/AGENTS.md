# 3D Car Simulator — Internal Documentation for AI

## Project Status
- **Stage**: 3/3 (Expansion) — physics engine, terrain, multi-vehicle registry, multi-track registry, dynamic surface registry, runtime validators, and effects are active.
- **Done**: Foundations, vehicle physics (Rapier), cameras, tire tracks, dust particles, engine sound, configurations (`src/config`), Vehicle & Level & Surface Registries, TypeScript strict typing (zero `any`), automated unit tests (Vitest), architecture documentation (`/docs/`).
- **Environment**: The project is run in WSL (Linux) using Google Antigravity. Use only standard Linux commands (e.g., `npm install`, `npm run dev`, `npx`). Do not use Windows workarounds anymore (such as `cmd.exe /c`), because the terminal operates in a Linux environment.
  - **Game Testing**: The development server (`npm run dev`) runs in WSL, and the browser displays the game on Windows. The port is automatically mapped to `http://localhost:5173/`.

---

## Architecture & Guides Reference (Read First!)
Detailed developer guides for AI agents are available in the `/docs/` folder:
- **[Architecture & Data Flow](file:///home/dawid/OpenRally/docs/ARCHITECTURE.md)**: Coordinates (+Y Up, +Z Forward, +X Right), execution loops, registry pattern, and subsystem overview.
- **[Extension Guides (Cookbook)](file:///home/dawid/OpenRally/docs/EXTENSION_GUIDES.md)**: Step-by-step instructions for adding new vehicles (GLB), maps/tracks, surfaces, and UI telemetry.
- **[Debugging & Testing Guide](file:///home/dawid/OpenRally/docs/DEBUGGING_AND_TESTING.md)**: Verification workflow, physics wireframe debugging, and common pitfalls.

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
| Language | TypeScript (strict mode, zero `any`) |
| Bundler | Vite |
| UI Framework | React 18+ |
| 3D Graphics | React Three Fiber (R3F) + @react-three/drei |
| Physics | @react-three/rapier (Rapier3D, WASM) |
| Game State | Zustand |
| Post-processing | @react-three/postprocessing |
| Testing | Vitest |
| Model Format | GLB/GLTF |
| Linting | Oxlint (NOT ESLint!) + optional Prettier |

---

## Mandatory Verification Command

Before completing any task, **always run the complete automated check**:
```bash
npm run check
```
This runs:
1. `tsc --noEmit` (Strict TypeScript compiler check)
2. `oxlint` (Linter with 0 errors and 0 warnings)
3. `vitest run` (Automated unit tests for math, physics, terrain, registries, and stores)

---

## Directory Structure

```
src/
├── components/
│   ├── canvas/          # 3D Scene (Canvas, lights, post-processing)
│   ├── vehicle/         # Car: visual model, effects (dust, tracks)
│   ├── terrain/         # Terrain generator, heightmap, textures, grass
│   ├── environment/     # Ocean, sky, checkpoints
│   └── ui/              # HUD, menu, garage, track selector (React overlay)
├── hooks/
│   ├── useVehiclePhysics.ts   # Vehicle physics logic (raycast vehicle)
│   ├── useInput.ts            # Keyboard / gamepad handling
│   ├── useChaseCamera.ts      # Chase camera
│   ├── useBumperCamera.ts     # Bumper camera
│   └── useEngineSound.ts      # Engine sound handling
├── store/
│   ├── gameStore.ts           # Game state (speed, selected vehicle/level, telemetry)
│   ├── settingsStore.ts       # Settings (graphics quality, controls, volume)
│   └── racingStore.ts         # Checkpoints, lap times, records
├── config/                    # Global registries, vehicle presets, levels, balances
│   ├── vehicleRegistry.ts     # Vehicle presets & specs registry
│   ├── levelRegistry.ts       # Level presets, spawns, environments
│   ├── surfaceRegistry.ts     # Friction curves, dust particles, audio configs
│   └── levels/                # Level dataset files (Desert Canyon, Island, etc.)
├── utils/
│   ├── builders/              # AI builders & archetypes (vehicles, levels, surfaces)
│   ├── diagnostics/           # Project-wide integrity diagnostics & assertions
│   ├── events/                # Strongly-typed game event bus & React hooks
│   ├── trackGenerator.ts      # Procedural spline & racetrack generator
│   ├── terrainCompiler.ts     # Procedural terrain compiler & track spline
│   ├── math.ts                # Helper functions (lerp, clamp, smoothDamp)
│   ├── physics/               # Powertrain, drivetrain, tires, assists, suspension
│   └── validation/            # Runtime validators for configs, levels, and surfaces
├── types/                     # TypeScript interfaces (zero any)
├── App.tsx
└── main.tsx
public/
└── models/
    ├── vehicles/              # Car GLB models (from AI)
    └── props/                 # Trees, rocks, buildings (from AI)
docs/
├── ARCHITECTURE.md            # System architecture, registries, coordinates
├── EXTENSION_GUIDES.md        # Recipes for adding cars, maps, and features
└── DEBUGGING_AND_TESTING.md   # Testing commands and troubleshooting
```

---

## Coding Conventions

1. **One hook = one file** in `src/hooks/`
2. **One component = one file** in the appropriate subfolder of `src/components/`
3. **Configurations** separated into files in `src/config/` (registries, presets, physics balance)
4. **Global types** in `src/types/` (e.g., `vehicle.ts`, `level.ts`, `surface.ts`, `game.ts`)
5. **Zustand stores** in `src/store/` — each store in a separate file
6. **Use Builders & Generators for new content**: Use `createVehiclePreset()`, `createLevelPreset()`, and `generateProceduralCircuit()` instead of assembling raw config objects.
7. **Use Event Bus for cross-system reactions**: Use `onGameEvent()` / `useGameEventListener()` to avoid tightly coupling subsystems.
8. **Naming**: PascalCase for components, camelCase for hooks and utils
9. **JSDoc comments** for every exported function/type
10. **No `any`** — always type explicitly (use `IRapierVehicleController`, `SurfaceType`, `VehiclePreset`, `LevelPreset`, etc.)
11. **Write unit tests** in `__tests__/` alongside modified math, physics, terrain, registries, builders, or store files.

---

## Roadmap

### Stage 1 — Foundation (COMPLETED)
Terrain, physics, camera, controls, HUD, lighting

### Stage 2 — Polishing (COMPLETED)
Particle effects, sound, different surfaces, objects on the map, post-processing, automated unit tests, strict typing

### Stage 3 — Expansion ⬅️ NOW (Main focus)
AI models (GLB), replacing blocky models with real 3D vehicle and environment models, multi-vehicle registry, multi-map tracks

### Stage 4+ — Future
Multiplayer, map editor, weather, asset generation automation

---

## ⚠️ Common Mistakes to Avoid (AI Rules)
1. **Error in `tsconfig.app.json`**: NEVER add the `"ignoreDeprecations": "6.0"` option in TypeScript configuration files (e.g., `tsconfig.app.json`). The project defaults to not needing this flag at all. Adding it always breaks the configuration and throws an error due to the specifics of the current compiler version.
2. **Never commit code breaking `npm run check`**: All tests and linter must be clean before finishing tasks.
