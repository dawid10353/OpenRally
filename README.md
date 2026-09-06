<div align="center">
  <img src="public/openrally_logo_dark.png" alt="OpenRally Logo" width="520" />

  <h1>OpenRally</h1>

  <p><strong>Next-generation open-source 3D arcade-sim rally experience running directly in modern web browsers and natively on Android at 60+ FPS.</strong></p>

  <p>
    <a href="https://github.com/dawid10353/OpenRally/releases"><img src="https://img.shields.io/badge/Release-v1.0.0-blue?logo=github&logoColor=white" alt="Release v1.0.0" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Strict_Zero_Any-3178C6?logo=typescript&logoColor=white" alt="TypeScript Strict" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19" /></a>
    <a href="https://threejs.org/"><img src="https://img.shields.io/badge/Three.js-R3F-black?logo=three.js" alt="Three.js & R3F" /></a>
    <a href="https://rapier.rs/"><img src="https://img.shields.io/badge/Physics-Rapier3D_WASM-E95420" alt="Rapier3D WASM" /></a>
    <a href="https://capacitorjs.com/"><img src="https://img.shields.io/badge/Platform-Web_%7C_Android_APK-3880FF?logo=android&logoColor=white" alt="Web & Android" /></a>
    <a href="https://vitest.dev/"><img src="https://img.shields.io/badge/Tests-1020_Passing-22c55e?logo=vitest&logoColor=white" alt="Vitest Tests" /></a>
    <a href="https://oxc.rs/"><img src="https://img.shields.io/badge/Linter-Oxlint_Clean-10b981" alt="Oxlint" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License" /></a>
  </p>

  <p>
    <a href="#-gameplay-video--showcase">Gameplay Video</a> •
    <a href="#-overview">Overview</a> •
    <a href="#-key-features">Key Features</a> •
    <a href="#-controls">Controls</a> •
    <a href="#-vehicles--stages">Vehicles & Stages</a> •
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-android-build--apk-export">Android APK</a> •
    <a href="#-tech-stack--architecture">Architecture</a> •
    <a href="#-testing--verification">Verification</a> •
    <a href="#-roadmap">Roadmap</a>
  </p>

  <br />

  <p align="center">
    <img src="public/screenshots/gameplay_showcase.gif" alt="OpenRally Dynamic Rally Drift & Jump Action" width="100%" style="border-radius: 12px; box-shadow: 0 12px 36px rgba(0,0,0,0.6);" />
  </p>

  <p align="center">
    <img src="public/screenshots/gantry_finish.png" alt="OpenRally Modular Checkpoint Gate & Rally Timing" width="49%" style="border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);" />
    <img src="public/screenshots/drift_action.png" alt="OpenRally Vortex Rally1 Drift Action & Skid Marks" width="49%" style="border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);" />
  </p>

  <p align="center">
    <img src="public/screenshots/stage_desert_jump.png" alt="OpenRally Desert Canyon Big Air Jump" width="49%" style="border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);" />
    <img src="public/screenshots/stage_forest_lake.png" alt="OpenRally Coastal Lake Drift & Water Reflections" width="49%" style="border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);" />
  </p>
</div>

---

## 🎬 Gameplay Video & Showcase

Experience high-octane rally dynamics, procedural Simplex terrain heightfields, and authentic raycast suspension physics in action:

> [!TIP]
> **🎥 High-Definition In-Game Video:** Watch the official **[OpenRally 1080p 60 FPS Gameplay Trailer](public/videos/openrally_trailer.mp4)** featuring full audio synthesis, checkpoint gates, and high-speed drift maneuvers.

<div align="center">
  <table>
    <tr>
      <td width="50%" align="center">
        <strong>🏜️ Desert Canyon — Big Air & Loose Sand Drifting</strong><br /><br />
        <img src="public/screenshots/gameplay_showcase.webp" alt="OpenRally Desert Canyon Showcase" width="100%" style="border-radius: 8px;" />
      </td>
      <td width="50%" align="center">
        <strong>🌲 Island Circuit — High-Speed Coastal Lake Drift</strong><br /><br />
        <img src="public/screenshots/gameplay_forest_lake.webp" alt="OpenRally Island Circuit Lake Drift" width="100%" style="border-radius: 8px;" />
      </td>
    </tr>
  </table>
</div>

---

## 🌟 Overview

**OpenRally** is an open-source, enterprise-grade 3D rally simulation running natively in web browsers via WebGL/WebAssembly, and on mobile devices via a streamlined native **Android APK** pipeline.

The project blends authentic motorsport simulation principles with exhilarating, accessible arcade drifting. Developed exclusively with enterprise AI software engineering standards, it features independent 4-wheel raycast suspension kinetics, dynamic physics-based engine RPM calculations, Pacejka-inspired non-linear multi-surface tire friction, procedural Simplex terrain heightfields, custom GLSL Gerstner wave water, modular 3D race gantries, analog rally cockpit instrumentation, and complete touch & gamepad support.

---

## 🏎️ Key Features

### ⚙️ Authentic Rally Physics & Vehicle Dynamics
- **Raycast Suspension Kinetics:** Independent 4-wheel raycast suspension powered by **Rapier3D (WASM)** with authentic spring rates, compression/relaxation damping, anti-roll bars (ARB), wheel bottoming-out detection, and dynamic longitudinal/lateral weight transfer.
- **Physics-Based Engine & RPM Simulation:** Real-time RPM simulation driven by wheel rotation speeds, clutch slippage, throttle inertia, idle bounce, and redline limiter bounce.
- **Powertrain & Automatic Gearbox:** 5-speed automatic transmission with tuned gear ratios, torque curves, engine braking, and automatic upshift/downshift hysteresis.
- **Pacejka-Inspired Multi-Surface Friction:** Non-linear tire grip curves with per-wheel local slip angles, front/rear grip bias for natural oversteer, smooth cubic Hermite (smoothstep) friction drop-off, and responsive handbrake-initiated power slides.
- **Continuous Symmetrical AWD & Drift Power Compensation:** True 50/50 all-wheel-drive torque delivery with dynamic drift power boost that overcomes lateral scrub drag, maintaining forward propulsion through high-angle slides.
- **Arcade-Sim Driving Assists:** Responsive turn-in yaw torque, speed-sensitive steering scaling, power slide momentum preservation (65% rolling drag reduction during drifts), and drift grip multipliers.

### 📱 Cross-Platform Mobile & Android Native Support
- **Capacitor 8.5 & Native Android Project:** Integrated native Android build workflow using `./build-apk.sh` with automated Gradle compilation, asset bundling, and dual export destinations.
- **Virtual Touch Controls HUD:** On-screen ergonomic analog steering wheel, progressive throttle/brake pedals, responsive handbrake toggle, and tactile vibration feedback.
- **Landscape Safe-Area Ergonomics:** Dynamic edge padding respecting device cutouts, camera notches, and rounded display corners via CSS `env(safe-area-inset-*)`.
- **Mobile GPU Crash-Loop Resilience:** Automated `webglcontextlost` fail-safe guard preventing persistent crash loops on mobile devices (tested and verified on Google Pixel 10 & Pixel 10 Pro).
- **Hardware-Accelerated Shadow Optimization:** Clean `PCFShadowMap` pipeline eliminating Three.js deprecation flip-flop loops, shader re-compilations, and VRAM memory exhaustion.

### 🏁 Time Attack & Race Management
- **3-2-1-GO Start Sequence:** Dynamic start countdown with synthesized WebAudio countdown beeps, input locking during the countdown, and instant launch on GO.
- **Split Times & Live Deltas:** Real-time sector timing with delta indicators (green/red) comparing current pace against personal best lap records.
- **Stage Progression & Lap Tracking:** Start/finish gantries, intermediate sector checkpoints, lap time recording, and instant stage reset.

### 🧭 Classic Motorsport Instrumentation & HUD
- **Twin-Gauge Rally Cluster:** Authentic analog cockpit instruments featuring a 240 km/h speedometer, 8,000 RPM tachometer with redline zone, flashing **Shift Light LED**, and retro amber gear display.
- **Stage Roadbook Minimap:** Real-time 2D track overview with compass cardinal directions (N, S, E, W), start/finish checkpoints, vehicle orientation tracking, and elevation markers.
- **Real-Time Engineering Telemetry:** On-demand telemetry overlay (`T` key or Gamepad View/LSB) displaying chassis velocities, G-forces, slip angles, suspension travel, target checkpoints, and distances to nearby course obstacles.

### 🖥️ Broadcast-Grade UI & Showroom Architecture
- **Interactive 3D Showroom:** Modern rally menu hub featuring live 3D vehicle turntable with 360° orbit rotation, smooth zoom inspection, telemetry meters, and photographic circuit banners.
- **Photographic Circuit Selector:** High-definition stage cards featuring terrain previews, surface descriptions, and circuit records.
- **In-Stage Pause Dashboard:** Full-featured rally pause screen displaying active circuit thumbnail, machine telemetry, lap records, and gamepad controls.
- **Unified Selection Navigation:** Streamlined UI with clear, actionable `Select` and `Choose Car` triggers.

<div align="center">
  <img src="public/screenshots/main_menu.png" alt="OpenRally Main Menu Dashboard" width="100%" style="border-radius: 12px; box-shadow: 0 12px 36px rgba(0,0,0,0.6); margin-bottom: 12px;" />
</div>

<div align="center">
  <img src="public/screenshots/tracks_selection.png" alt="OpenRally Circuit Selection" width="49%" style="border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);" />
  <img src="public/screenshots/pause_menu.png" alt="OpenRally Stage Pause Menu" width="49%" style="border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);" />
</div>

### 🏔️ Procedural Terrains & Dynamic Surface Registry
- **Multi-Octave Terrain Engine:** Procedural terrain generation using continuous Simplex noise with erosion curves, realistic hills, valleys, and physics heightfield colliders.
- **Dynamic Surface Physics:** Distinct friction models with front/rear grip bias, rolling resistance, dust color signatures, and acoustics across **Tarmac, Mud, Grass, Sand, Snow, and Gravel**.

### ✨ Commercial-Grade VFX & Lighting Systems
- **Modular 3D Race Architecture:** Checkpoint gates and start/finish gantries with truss frames, sponsor banners, spotlights, digital LED timers, and carbon-fiber textures.
- **Dynamic Real-Time Shadows:** Hardware-accelerated directional shadow mapping with up to 450m synchronized frustum coverage, terrain shader cache keys, and adaptive quality scaling.
- **Procedural Gerstner Wave Water:** Custom GLSL water shaders with multi-wave displacement, foam edge blending, sun specular highlights, and Fresnel reflectance.
- **Surface-Aware Particle Systems:** High-performance typed-array particle pools generating dynamic dust plumes, gravel kickback, and water spray.
- **Zero-GC Tire Skid Ribbons:** Continuous procedural ribbon mesh geometry rendering tire skid marks with fade-out animations.
- **Cinematic Post-Processing:** Adaptive Bloom, Vignette, Tone Mapping, and speed motion feel.

### 🔊 Procedural Audio & Dual-Mode Soundtrack
- Synthesized WebAudio engine sound simulating engine load, pitch shifts, and RPM harmonics in real-time.
- Procedural countdown start tones, tire squeal, surface rumble, and water splash acoustics.
- Dynamic in-game background music for both menu navigation and rally stages.

### 🛡️ Strict Trademark & Intellectual Property Protection
- 100% original vehicle liveries, typography, stage banners, and gantry graphics with zero real-world automotive manufacturer or sponsor trademarks.

---

## 🎮 Controls

OpenRally provides seamless support for **Keyboard**, **Gamepads** (PlayStation DualSense/DualShock 4 & Xbox Controllers with progressive analog triggers and haptics), and **Mobile Touch Controls**:

| Action | Keyboard | Gamepad (Xbox / PlayStation) | Mobile Touch Screen | Description |
|---|---|---|---|---|
| **Steer Left / Right** | `A` / `D` or `←` / `→` | **Left Stick** / `D-Pad` | **Left Virtual Steering Wheel / Arrows** | Speed-sensitive steering scaling |
| **Throttle / Accelerate** | `W` or `↑` | **Right Trigger (`RT` / `R2`)** / `A` (`Cross`) | **Right Virtual Gas Pedal (`GAS`)** | Progressive acceleration |
| **Brake / Reverse** | `S` or `↓` | **Left Trigger (`LT` / `L2`)** / `B` (`Circle`) | **Right Virtual Brake Pedal (`BRAKE`)** | 4-wheel braking & reverse gear |
| **Handbrake** | `Space` | **`X` / `Square`** | **Virtual Handbrake Button (`HB`)** | Rear lockup for power slides |
| **Change Camera** | `C` | **`Y` / `Triangle`** | **Camera Button (Top-Right)** | Chase, Bumper, and Free Views |
| **Reset Vehicle** | `R` | **`Back` / `Select` / `Share`** | **Reset Button** | Respawn vehicle on track spawn |
| **Toggle Telemetry** | `T` | **`LSB` / `View`** | — | Real-time engineering telemetry HUD |
| **Pause / Menu** | `Esc` | **`Start` / `Options`** | **Pause Icon (Top-Left)** | Open garage, tracks, or settings |
| **Navigate Menus** | `W` / `S` / `Enter` | **`D-Pad` / `Left Stick` / `A`** | **Tap / Swipe** | Full navigation across all menus |

---

## 🚗 Vehicles & Stages

### Playable Vehicles & 3D Garage Showroom

<div align="center">
  <img src="public/screenshots/garage_showroom.png" alt="OpenRally 3D Interactive Garage Showroom" width="100%" style="border-radius: 12px; box-shadow: 0 12px 36px rgba(0,0,0,0.6);" />
</div>

<br />

| Vehicle | Class | Drivetrain | Top Speed | Handling | Character |
|---|---|---|---|---|---|
| **Apex Rally AWD** | Classic Group A Rally | AWD (50/50) | 240 km/h | ★★★★★ | Dedicated 3D rally legend with forgiving suspension, balanced AWD grip, and agile cornering. |
| **Vortex Rally1** | Modern Rally1 | AWD (50/50) | 265 km/h | ★★★★★ | Next-gen modern Rally1 machine with aggressive aero, explosive turbo acceleration, and razor-sharp downforce handling. |

### Available Stages & Tracks

| Stage | Environment | Surfaces | Description |
|---|---|---|---|
| **Island Circuit** | Coastal Archipelago | Mud, Grass, Tarmac | Scenic coastal curves, green hills, ocean vistas, and fast flowing elevation changes. |
| **Desert Canyon** | Arid Badlands | Sand, Gravel, Rock | Dusty canyon corridors, loose dunes, sharp switchbacks, and elevation drops. |
| **Sweden Snow Rally** | Nordic Tundra | Snow, Ice | Frozen Scandinavian roads through pine forests, icy hairpins, and snow-covered valleys. |
| **Highland Castle** | Scottish Highlands | Mud, Grass, Heather | Rolling highland moors with ancient castle ruins, stone cottages, scenic lochs, and Celtic standing stones. |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18.0.0 or higher recommended, tested on Node v24 LTS)
- **npm** (v9.0.0 or higher)
- Modern WebGL2-compatible web browser (Chrome, Edge, Firefox, Brave, Safari)

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

4. **Open the game:**
   Navigate to [`http://localhost:5173`](http://localhost:5173) in your browser.

---

## 📱 Android Build & APK Export

OpenRally includes a production-ready **Capacitor Android** packaging and export pipeline:

### Building the Android APK

To build the web assets, synchronize Capacitor, compile the APK via Gradle, and dual-export the binary:

```bash
# Run automated Android APK build
npm run build:apk
# or
./build-apk.sh
```

### Export Deliverables

Upon completion, the signed and zip-aligned APK is automatically exported to:
- **Project Dist Directory:** `dist/openrally.apk`
- **Windows Host Documents (WSL):** `C:\Users\<username>\Documents\OpenRally\OpenRally.apk`
- **Gradle Output:** `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🛠️ Tech Stack & Architecture

```
OpenRally Architecture
├── 3D Rendering:         React Three Fiber (R3F) + Three.js
├── Physics Simulation:   @react-three/rapier (Rapier3D WASM Raycast Vehicle)
├── State Management:     Zustand (gameStore, settingsStore, racingStore)
├── UI & HUD:             React 19 + SVG Instrumentation + CSS Modules
├── Post-Processing:      @react-three/postprocessing (Bloom, Vignette, ToneMapping)
├── Audio Engine:         WebAudio API (procedural synthesis & sampling)
├── Mobile Runtime:       Capacitor 8.5 (@capacitor/core & @capacitor/android)
├── Testing & QA:         Vitest (1,020 automated tests) + Oxlint + Strict TypeScript
└── Bundler & Build:      Vite 8 + Gradle Wrapper (Android APK)
```

### Key Architectural Patterns
- **Centralized Registry Pattern:** Vehicle configurations, tracks, and surface physics are managed through decoupled, strongly-typed registries (`vehicleRegistry.ts`, `levelRegistry.ts`, `surfaceRegistry.ts`).
- **Zero-GC Hot Execution Loops:** All matrix transformations, quaternion rotations, and raycast calculations reuse module-level scratch instances (`_vec3`, `_quat`, `_euler`), preventing garbage collection stutters.
- **Transient HUD DOM Subscriptions:** Speedometer, tachometer needle rotations, and shift light DOM updates subscribe directly to store state without triggering React component re-renders.
- **Fail-Fast Runtime Validation:** Schemas for presets, levels, and surfaces are validated at runtime (`src/utils/validation/`) with automated self-checks (`src/utils/diagnostics/`).
- **GPU Resource Hygiene & Graceful Degradation:** Automatic WebGL context recovery, shadow map lifecycle disposal, and error boundary containment.

### In-Depth Documentation
- 📖 **[System Architecture & Data Flow](docs/ARCHITECTURE.md)**: Coordinates (+Y Up, +Z Forward, +X Right), execution loops, and subsystem design.
- 🛠️ **[Extension Guides (Cookbook)](docs/EXTENSION_GUIDES.md)**: Step-by-step recipes for adding new 3D vehicles, stages, surfaces, and UI overlays.
- 🧪 **[Debugging & Testing Guide](docs/DEBUGGING_AND_TESTING.md)**: Physics wireframe inspection, diagnostics, and testing workflows.

---

## 🧪 Testing & Verification

OpenRally enforces strict quality gates with zero tolerance for regressions:

```bash
# Run complete verification suite (Typecheck + Oxlint + Vitest 1,020 tests)
npm run check

# Run unit and integration tests only
npm test

# Run unit tests in interactive watch mode
npm run test:watch

# Run Oxlint linter
npm run lint

# Run strict TypeScript compilation check
npm run typecheck

# Run Android APK structural verification tests
npx vitest run tests/e2e/apk_validator.test.ts
```

---

## 🗺️ Roadmap

- [x] **Stage 1 — Foundation (Completed):** Procedural heightmap terrain, Rapier raycast vehicle physics, chase/bumper cameras, HUD, lighting.
- [x] **Stage 2 — Simulation & Polish (Completed):** Particle systems, synthesized WebAudio, surface friction curves, skid ribbons, checkpoint racing system, Vitest test suite.
- [x] **Stage 3 — Expansion (Current Stage):**
  - [x] Dedicated 3D GLB vehicle models (`Apex Rally AWD`, `Vortex Rally1`) with raycast suspension & tire physics
  - [x] Authentic analog rally instrumentation (Speedometer, Tachometer, Shift Light, Gear Display)
  - [x] Stage roadbook minimap with compass directions and elevation awareness
  - [x] Multi-track stage registry (Island Circuit, Desert Canyon, Sweden Snow Rally, Highland Castle)
  - [x] Modular 3D race architecture (start/finish gantries, sector gates, race textures)
  - [x] Time Attack 3-2-1-GO countdown sequence with audio beeps & split time delta tracking
  - [x] Physics-based dynamic engine RPM simulation with inertia & limiter bounce
  - [x] Full gamepad navigation, customizable deadzones, and progressive analog control
  - [x] Vehicle physics overhaul: front/rear grip bias, per-wheel slip, smoothstep friction, AWD drift power boost, drift momentum preservation
  - [x] Cross-platform Android native packaging (Capacitor & automated APK build pipeline)
  - [x] Virtual touch controls HUD with analog steering, pedal buttons, and haptic feedback
  - [x] Mobile GPU optimization, hardware `PCFShadowMap` shadows & crash-loop protection
  - [x] 100% trademark-safe original assets & textures
  - [x] Comprehensive automated test suite exceeding **1,020 passing unit/integration tests**
  - [ ] Additional vehicle models (RWD Sports Coupe, Desert Trophy Truck)
  - [ ] Hillclimb & rallycross stages
- [ ] **Stage 4 — Future Visions:**
  - [ ] Real-time multiplayer (WebRTC / WebSockets)
  - [ ] Procedural track editor & terrain sculptor
  - [ ] Dynamic weather simulation (rain, wet asphalt reflections, fog)
  - [ ] Automated AI asset generation pipeline

---

## 📄 License

This project is open-source and licensed under the **[MIT License](LICENSE)**.

---

<div align="center">
  <sub>Developed with ❤️ by AI for motorsport and open-source gaming enthusiasts.</sub>
</div>
