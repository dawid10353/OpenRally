# Project: OpenRally Android Port

## Architecture
OpenRally is a client-side React + Three.js + Rapier physics rally game.
The Android port maintains a single unified cross-platform codebase (Web, Steam, Android) using:
1. **Core Web Application**: Vite + React 18 + Three.js / React Three Fiber + Rapier physics (WASM).
2. **Native Container**: Capacitor 8 (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`) wrapping the built web assets in an optimized Android WebView via `WebViewAssetLoader` over `https://localhost`.
3. **Input Subsystem**: Multi-source input pipeline in `useInput.ts` (`useInputUpdater`) that transparently samples and merges keyboard, gamepad, and touch inputs into a normalized `InputState` (+1.0 Left, -1.0 Right steering).
4. **Mobile Ergonomics**: On-screen touch overlay (`TouchControlsOverlay.tsx`) with floating analog steering joystick, throttle/brake pedals, drift/handbrake, pause/reset/camera buttons, auto-visibility, and responsive HUD repositioning.
5. **Display & Viewport**: `viewport-fit=cover`, CSS safe-area insets (`env(safe-area-inset-*)`), Android sticky immersive mode, and dynamic DPR capping (1.5 - 1.75 on mobile) to sustain 60 FPS on high-density displays like Google Pixel 10 Pro.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Viewport & Safe-Area Adaptation | `viewport-fit=cover`, safe-area insets in CSS/HUD, `touch-action: none`, orientation lock | M1 | ORIGINAL_REQUEST §R3 |
| F2 | High-DPI Mobile Scaling | Mobile DPR clamp (1.5 - 1.75) and `<AdaptiveDpr />` integration to maintain 60 FPS on Pixel 10 Pro | M1 | ORIGINAL_REQUEST §R3 |
| F3 | Touch Input Subsystem | Non-re-rendering touch sampler (`touch.ts`), pointer events, multi-touch, input blending in `useInputUpdater` | M2 | ORIGINAL_REQUEST §R2 |
| F4 | On-Screen Touch Controls Overlay | Floating analog joystick, pedals (throttle, brake/reverse, handbrake), pause/reset buttons, gauge collision repositioning | M3 | ORIGINAL_REQUEST §R2 |
| F5 | Touch Settings & Auto-Visibility | Touch configuration in `settingsStore.ts`, `SettingsView.tsx`, `ControlsView.tsx`, auto-hide on keyboard/gamepad | M3 | ORIGINAL_REQUEST §R2 |
| F6 | WSL Android Toolchain Setup | OpenJDK 21, Android SDK cmdline-tools, SDK platform 35, build-tools 35.0.0 in WSL Ubuntu | M4 | ORIGINAL_REQUEST §R1 |
| F7 | Capacitor Android Packaging | Capacitor 8 integration, `AndroidManifest.xml` sensorLandscape & shortEdges, immersive mode, asset exclusions | M4 | ORIGINAL_REQUEST §R1, R4 |
| F8 | Standalone APK Build & Validation | Compile `app-debug.apk` to designated output folder, APK structural validation, `npm run check` 100% pass | M4 | ORIGINAL_REQUEST §R1, R4 |
| F9 | E2E Opaque-Box Test Suite | Comprehensive 4-tier test suite verifying touch inputs, viewport adaptation, settings, build, and cross-platform checks | E2E Track | ORIGINAL_REQUEST §Acceptance Criteria |
| F10| Adversarial Coverage Hardening | Tier 5 white-box stress testing, edge cases, and adversarial coverage validation | M5 | PROJECT Pattern §Phase 2 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Mobile Viewport, DPI & Safe-Area Adaptation | F1, F2: `index.html`, `index.css`, `GameCanvas.tsx`, `device.ts`, safe-area CSS | none | **DONE** (Gate PASSED: 410/410 tests pass, Clean Audit, 2x Reviewer APPROVE, 2x Challenger APPROVE) |
| M2 | Touch Input Subsystem & Vehicle Pipeline | F3: `src/utils/input/touch.ts`, `src/hooks/useInput.ts`, touch unit tests | M1 | **DONE** (Gate PASSED: 527/527 tests pass, Clean Audit, 2x Reviewer APPROVE, 2x Challenger APPROVE) |
| M3 | Touch Controls Overlay & Settings UI | F4, F5: `TouchControlsOverlay.tsx`, `AnalogGauges.tsx`, `settingsStore.ts`, `SettingsView.tsx`, `ControlsView.tsx`, `App.tsx` | M2 | **DONE** (Gate PASSED: Clean Audit, 657/657 tests pass) |
| M4 | Android Toolchain, Capacitor Packaging & APK Build | F6, F7, F8: OpenJDK 21, Android SDK 35/36, Capacitor 8, Gradle build, APK output & inspection | M1, M2, M3 | **DONE** (Build SUCCESSFUL, APK generated, APK-1 to APK-7 validated) |
| M5 | Final Milestone: E2E Test Pass & Hardening | F10: 100% E2E test pass (Tiers 1-4) + Adversarial hardening (Tier 5) | M4, TEST_READY.md | **DONE** (657/657 tests pass, 0 errors, full check pass) |
| E2E | E2E Testing Track | F9: Test harness, Tier 1-4 test suites, APK validation runner, `TEST_READY.md` | Independent (Parallel) | **DONE** (102/102 tests pass, TEST_READY.md & TEST_INFRA.md published) |

## Interface Contracts

### Touch Input Subsystem (`src/utils/input/touch.ts`) ↔ Input Hook (`src/hooks/useInput.ts`)
```ts
export interface TouchInputState {
  steering: number;     // [-1.0, 1.0] where +1.0 is Left, -1.0 is Right (OpenRally standard)
  throttle: number;     // [0.0, 1.0]
  brake: number;        // [0.0, 1.0]
  handbrake: boolean;   // true if pressed
  reset: boolean;       // pulse true on trigger
  cameraToggle: boolean;// pulse true on trigger
  pause: boolean;       // pulse true on trigger
}

export function getTouchInputState(): TouchInputState;
export function setTouchInput(partial: Partial<TouchInputState>): void;
export function resetTouchInputState(): void;
export function isTouchDevice(): boolean;
export function getLastInputType(): 'touch' | 'keyboard' | 'gamepad';
```

### Settings Store (`src/store/settingsStore.ts`) ↔ Touch Overlay (`TouchControlsOverlay.tsx`)
```ts
export interface TouchSettings {
  touchControlMode: 'auto' | 'always' | 'off'; // auto detects touch interaction
  touchSteeringScheme: 'joystick' | 'buttons';
  touchOpacity: number;       // 0.2 to 1.0 (default 0.7)
  touchButtonSize: 'small' | 'medium' | 'large'; // scaling factor
  touchHaptics: boolean;      // trigger navigator.vibrate if supported
}
```

### Android Packaging Output Contract
- Build script: `npm run build:android` or `./build-apk.sh`
- Artifact output path: `android/app/build/outputs/apk/debug/app-debug.apk` and `dist/openrally.apk`
- APK characteristics: Valid ZIP, AndroidManifest with `package="com.openrally.game"`, minSdk 24, targetSdk 35, valid classes.dex, compiled web assets under `assets/public/`.

## Code Layout
- `src/utils/device.ts`: Device detection (mobile vs desktop, touch capabilities, DPR calculation).
- `src/utils/input/touch.ts`: Touch input state management, touch coordinate math, and input mode detection.
- `src/components/ui/TouchControlsOverlay.tsx`: Touch control buttons, virtual joystick, on-screen pause/reset.
- `src/hooks/useInput.ts`: Input merger polling keyboard, gamepad, and touch.
- `src/store/settingsStore.ts`: Global settings store updated with touch settings.
- `src/components/ui/menu/SettingsView.tsx`: Settings UI updated with touch controls options.
- `src/components/ui/menu/ControlsView.tsx`: Controls UI updated with touch controls documentation and scheme selector.
- `src/components/ui/gauges/AnalogGauges.tsx`: Repositioning logic when touch overlay is visible.
- `src/components/canvas/GameCanvas.tsx`: DPR capping for mobile/touch screens.
- `index.html` & `src/index.css`: Viewport meta and safe-area insets.
- `capacitor.config.ts`: Capacitor configuration.
- `android/`: Native Android Gradle project.
- `tests/`: Automated unit and E2E test suites.
