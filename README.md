<div align="center">
  <img src="public/openrally_logo.png" alt="OpenRally Logo" width="440" />

  <h1>OpenRally</h1>

  <p><strong>Next-generation open-source 3D arcade-sim rally game built directly for the web browser.</strong></p>

  <p>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Strict_Zero_Any-3178C6?logo=typescript&logoColor=white" alt="TypeScript Strict" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19" /></a>
    <a href="https://threejs.org/"><img src="https://img.shields.io/badge/Three.js-R3F-black?logo=three.js" alt="Three.js & R3F" /></a>
    <a href="https://rapier.rs/"><img src="https://img.shields.io/badge/Physics-Rapier3D_WASM-E95420" alt="Rapier3D WASM" /></a>
    <a href="https://vitest.dev/"><img src="https://img.shields.io/badge/Tests-123_Passing-22c55e?logo=vitest&logoColor=white" alt="Vitest Tests" /></a>
    <a href="https://oxc.rs/"><img src="https://img.shields.io/badge/Linter-Oxlint_Clean-10b981" alt="Oxlint" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License" /></a>
  </p>

  <p>
    <a href="#-key-features">Key Features</a> •
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-controls">Controls</a> •
    <a href="#-vehicles--tracks">Vehicles & Tracks</a> •
    <a href="#-tech-stack--architecture">Architecture</a> •
    <a href="#-testing--diagnostics">Verification</a> •
    <a href="#-roadmap">Roadmap</a>
  </p>
</div>

---

## 🌟 Overview

**OpenRally** is an open-source, high-performance 3D rally game running natively in web browsers via WebGL / WebGPU.

The core philosophy of this project is to create a commercial-grade, fully featured racing experience developed **exclusively with the support of Artificial Intelligence (AI)** — from vehicle dynamics simulation and procedural terrain generation to custom shaders and architecture design.

---

## 🏎️ Key Features

### ⚙️ Realistic & Arcade-Sim Vehicle Dynamics
- **Raycast Suspension Physics:** Independent 4-wheel raycast suspension with customizable spring stiffness, damping, roll bars, and compression curves powered by **Rapier3D (WASM)**.
- **Pacejka-Inspired Tire Friction:** Nonlinear lateral/longitudinal grip models with dynamic slip angles, surface-dependent friction coefficients, and weight transfer.
- **Powertrain & Drivetrain Simulation:** Configurable AWD/RWD power distribution, engine RPM curves, automatic and manual gear ratios, and responsive handbrake drift triggers.
- **Stability & Electronic Assists:** Configurable steering speed scaling, yaw damping, traction control, and counter-steer assists.

### 🏔️ Procedural Terrains & Dynamic Surfaces
- **Multi-Octave Terrain Engine:** Procedurally generated terrain meshes using continuous Simplex noise with realistic erosion, elevation profiles, and heightfield colliders.
- **Dynamic Surface Registry:** Real-time physics modulation across **Tarmac, Mud, Grass, Sand, Snow, and Gravel** with unique friction, drag, dust colors, and audio resonance.

### ✨ Visual Effects & Environmental Systems (AAA Fidelity)
- **Zero-GC Tire Skid Ribbons:** Dynamic ribbon geometry buffer rendering progressive tire tracks with surface-aware opacity and fade-out animations.
- **Particle System:** High-performance particle emitters generating surface-reactive wheel dust plumes, gravel kickbacks, and water spray.
- **Procedural Gerstner Wave Ocean:** Custom GLSL water shader featuring multi-directional wave displacement, foam blending, and Fresnel reflectance.
- **Post-Processing Pipeline:** Cinematic Bloom, Tone Mapping, dynamic Vignette, and speed-reactive motion feel.

### 🔊 Procedural & Synthesized Audio
- Dynamic WebAudio engine sound synthesis modulating pitch, engine load, and RPM harmonics in real-time.
- Procedural tire squeal, surface roll rumbling, and water splash acoustics.

### ⏱️ Racing System & Full Telemetry
- **Start/Finish Gantry & Checkpoints:** Visual gantry with countdown start lights, checkpoint sectors, split times, lap counters, and personal best tracking.
- **Real-Time Minimap & HUD:** Dynamic track overlay, live vehicle position/orientation indicator, analog/digital speedometer, gear & RPM gauges.
- **Live Engineering Telemetry:** On-screen telemetry readout showing wheel slip, suspension compression, G-forces, and contact surface stats.

---

## 🎮 Controls

OpenRally natively supports **Keyboard**, **Gamepad** (Xbox / PlayStation controllers with analog triggers), and **Touch / On-Screen controls**:

| Action | Keyboard | Gamepad | Description |
|---|---|---|---|
| **Steer Left / Right** | `A` / `D` or `←` / `→` | **Left Stick** / `D-Pad` | Smooth steering with speed-dependent sensitivity |
| **Throttle / Accelerate** | `W` or `↑` | **Right Trigger (`RT`/`R2`)** / `A` | Progressive throttle application |
| **Brake / Reverse** | `S` or `↓` | **Left Trigger (`LT`/`L2`)** / `B` | Front/rear biased braking and reverse gear |
| **Handbrake** | `Space` | **`X` / `Square`** | Rear-wheel lockup for initiating drift |
| **Change Camera** | `C` | **`Y` / `Triangle`** | Switch between Chase, Bumper, and Orbit Views |
| **Reset Vehicle** | `R` | **`Back` / `Select`** | Teleports vehicle to the nearest checkpoint or track spawn |
| **Free / Orbit Camera** | `Tab` | — | Detaches camera for free mouse orbit exploration |
| **Toggle Telemetry** | `H` / `F1` | — | Toggles live physics & telemetry HUD |
| **Pause / Menu** | `Esc` | **`Start` / `Options`** | Opens settings, vehicle garage, and track selector |

---

## 🚗 Vehicles & Tracks

### Playable Vehicles

| Vehicle | Class | Drivetrain | Top Speed | Handling | Character |
|---|---|---|---|---|---|
| **Apex Rally AWD** | Rally Hatchback | AWD (50/50) | 240 km/h | ★★★★★ | Balanced all-rounder, forgiving suspension and supreme all-terrain grip. |
| **Veloce Sport RWD** | Sports Coupe | RWD (0/100) | 265 km/h | ★★★★☆ | High-power drift machine designed for sweeping gravel slides and tarmac speed. |
| **Baja Dune Runner** | Trophy Truck | AWD (50/50) | 210 km/h | ★★★☆☆ | Heavy-duty offroader with long-travel suspension for extreme bumps and jumps. |

### Available Tracks

| Track | Theme | Difficulty | Surfaces | Features |
|---|---|---|---|---|
| **Island Circuit** | Coastal / Archipelago | Easy / Medium | Mud, Grass, Tarmac | Scenic coastal curves, green hills, ocean vistas, and fast straights. |
| **Desert Canyon** | Arid / Badlands | Medium / Hard | Sand, Gravel, Rock | Rocky canyon passes, loose sand dunes, sharp switchbacks, and elevation drops. |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18.0.0 or higher recommended)
- **npm** (v9.0.0 or higher)

### Installation & Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dawid10353/OpenRally.git
   cd OpenRally
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to [`http://localhost:5173`](http://localhost:5173) in your browser.

---

## 🛠️ Tech Stack & Architecture

```
OpenRally Architecture
├── 3D Engine:       React Three Fiber (R3F) + Three.js
├── Physics:         @react-three/rapier (Rapier3D WASM Raycast Vehicle)
├── State Management: Zustand (gameStore, settingsStore, racingStore)
├── UI & HUD:        React 19 + Lucide Icons + Tailwind-free Vanilla CSS
├── Post-Processing: @react-three/postprocessing (Bloom, Vignette, ToneMapping)
├── Audio:           WebAudio API (procedural synthesis & sampling)
├── Testing & QA:    Vitest (123+ unit tests) + Oxlint + Strict TypeScript
└── Bundler:         Vite
```

### Architecture Highlights
- **Registry Pattern:** Entity management through centralized registries (`vehicleRegistry.ts`, `levelRegistry.ts`, `surfaceRegistry.ts`).
- **Zero-GC Hot Loop:** All matrix, quaternion, and vector operations in physics and animation frames reuse allocated module-level scratch instances (`_vec3`, `_quat`).
- **Decoupled Game Event Bus:** Strongly-typed pub/sub event system (`src/utils/events/`) for audio triggers, telemetry, and checkpoint triggers.
- **Fail-Fast Runtime Validation:** Config schemas and level definitions are validated at runtime (`src/utils/validation/`) and diagnostic self-checked (`src/utils/diagnostics/`).

For in-depth guides, see the `/docs/` directory:
- 📖 **[System Architecture & Data Flow](docs/ARCHITECTURE.md)**: Coordinates, execution loop, registries, and physics subsystem.
- 🛠️ **[Extension Guides (Cookbook)](docs/EXTENSION_GUIDES.md)**: How to add new vehicles, tracks, surfaces, and HUD elements.
- 🧪 **[Debugging & Testing Guide](docs/DEBUGGING_AND_TESTING.md)**: Physics wireframes, diagnostics, and test verification.

---

## 🧪 Testing & Diagnostics

OpenRally enforces strict quality gates. All code modifications must pass the full verification suite:

```bash
# Run complete test, lint, and typecheck suite
npm run check

# Run unit tests only
npm test

# Run tests in interactive watch mode
npm run test:watch

# Run linter
npm run lint

# Run strict TypeScript compiler verification
npm run typecheck
```

---

## 🗺️ Roadmap

- [x] **Stage 1 — Foundations:** Procedural heightmap terrain, Rapier raycast vehicle physics, chase/bumper cameras, basic HUD, directional lighting.
- [x] **Stage 2 — Polish & Simulation Systems:** Particle effects (dust/sand/water), synthesized WebAudio engine sound, dynamic surface friction registry, post-processing, tire skid ribbon geometry, checkpoint racing system & lap times, comprehensive automated unit test suite.
- [ ] **Stage 3 — Expansion (Current Focus):**
  - [x] Multi-vehicle registry & garage selector (Apex Rally, Veloce Sport, Baja Truck)
  - [x] Multi-track registry (Island Circuit, Desert Canyon)
  - [x] Start/Finish gantry with countdown start lights & split times
  - [ ] Additional high-fidelity GLB vehicle and environment asset imports
  - [ ] Extended race track circuits & hillclimb stages
- [ ] **Stage 4 — Future Visions:**
  - [ ] Real-time multiplayer racing (WebRTC / WebSockets)
  - [ ] In-game procedural track editor & terrain sculptor
  - [ ] Dynamic weather simulation (rain, wet tarmac reflections, fog)
  - [ ] AI-driven procedural asset generation pipeline

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ by AI for motorsport and open-source web gaming enthusiasts.</sub>
</div>
