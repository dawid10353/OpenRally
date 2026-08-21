# OpenRally — Debugging & Testing Guide

This guide details the validation workflow, automated test suites, and in-game debugging tools.

---

## 1. Automated Verification Pipeline

Always run the full test & lint pipeline before concluding any task:

```bash
npm run check
```

This single command executes in sequence:
1. **`tsc --noEmit`**: Strict TypeScript type checking across all project files.
2. **`oxlint`**: Oxlint linter for code health and React Hook dependency verification.
3. **`vitest run`**: Fast unit test execution across math, physics, terrain, and stores.

### Running Individual Checks

- Run unit tests:
  ```bash
  npm test
  ```
- Run tests in watch mode during development:
  ```bash
  npm run test:watch
  ```
- Run linter only:
  ```bash
  npm run lint
  ```
- Run typecheck only:
  ```bash
  npm run typecheck
  ```

---

## 2. In-Game Physics Debugging

To visualize Rapier collision shapes, raycasts, and chassis bounds:
1. Press `Escape` to open the Menu.
2. In **Options**, enable **Physics Debug Wireframes**.
3. Or toggle directly via Zustand:
   ```ts
   useSettingsStore.getState().toggleDebugPhysics();
   ```

---

## 3. Common Pitfalls & Solutions

### A. Physics Exploding After Tab Switch
- **Cause**: Browser throttles `requestAnimationFrame` when tab is inactive, producing huge `delta` values (e.g. 5.0 seconds).
- **Fix**: Delta time is strictly clamped to `MAX_DELTA = 0.05s` in `useVehiclePhysics.ts`. Never remove this clamp.

### B. Raycast Vehicle Falling Through Ground
- **Cause**: Wheel connection points positioned too low inside or below the chassis collider.
- **Fix**: Connection points `position[1]` must be relative to chassis center and rest length must allow rays to hit terrain outside collider volume.

### C. TypeScript Config Deprecation Flag
- **Warning**: NEVER add `"ignoreDeprecations": "6.0"` to `tsconfig.*.json`. Doing so breaks compiler configuration in the current toolchain.

### D. GC Pressure in Animation Loops
- **Best Practice**: Always reuse module-level `Vector3`, `Quaternion`, and `Euler` scratch objects (e.g., `_forward`, `_right`, `_quat`) inside `useFrame` callbacks to avoid per-frame garbage collection pauses.
