# OpenRally — Extension Guides (AI Cookbook)

This guide provides step-by-step instructions and code snippets for common expansion tasks in OpenRally.

---

## 1. Adding a New 3D Vehicle Preset (Fast with Builder)

### Step 1: Place the GLB Asset
Place your GLB model files in `/public/models/vehicles/`:
- Chassis model: `/public/models/vehicles/my_car.glb`
- Wheel model (optional): `/public/models/vehicles/my_wheel.glb`

### Step 2: Create with `createVehiclePreset()` in `src/config/vehicleRegistry.ts`
Use the typed builder to create a new car in under 10 lines from any archetype (`rally`, `supercar`, `offroad`, `drift`, `buggy`):
```ts
import { createVehiclePreset } from '@/utils/builders';

export const VEHICLE_MY_CAR = createVehiclePreset({
  id: 'my_supercar',
  name: 'Phantom GT',
  description: 'Ultra-lightweight twin-turbo GT racer with aggressive downforce.',
  archetype: 'supercar',
  modelPath: '/models/vehicles/my_car.glb',
  stats: {
    topSpeed: 9.8,
    acceleration: 9.5,
  },
  // Optional physics overrides:
  config: {
    engine: { maxForce: 560, maxSpeed: 310 },
  },
});

// Add to registry:
export const VEHICLE_REGISTRY: Record<string, VehiclePreset> = {
  // ...
  my_supercar: VEHICLE_MY_CAR,
};
```
*(The vehicle will automatically appear in the Garage UI and be selectable by players!)*

---

## 2. Adding a New Level / Track Map (Fast with Generator & Builder)

### Step 1: Generate Track Spline & Preset
Create a new level definition in `src/config/levels/mountainPass.ts` or directly in `src/config/levelRegistry.ts`:
```ts
import { createLevelPreset } from '@/utils/builders';
import { generateProceduralCircuit } from '@/utils/trackGenerator';

export const LEVEL_PRESET_MOUNTAIN = createLevelPreset({
  id: 'level_mountain',
  name: 'Mountain Pass',
  description: 'Elevated alpine track with sharp switchbacks and scenic cliff edges.',
  difficulty: 'hard',
  archetype: 'alpine', // 'island' | 'desert' | 'alpine' | 'tundra' | 'canyon'
  trackPoints: generateProceduralCircuit({
    radius: 220,
    pointsCount: 14,
    irregularity: 0.35,
    seed: 999,
  }),
  trackWidth: 22,
  targetHeight: 5.0,
});
```

### Step 2: Register in `src/config/levelRegistry.ts`
```ts
export const LEVEL_REGISTRY: Record<string, LevelPreset> = {
  level1_island: LEVEL_PRESET_ISLAND,
  level2_desert: LEVEL_PRESET_DESERT,
  level_mountain: LEVEL_PRESET_MOUNTAIN,
};
```

---

## 3. Adding a New Surface Type (e.g. Ice / Snow)

### Step 1: Add the Surface Identifier
In `src/types/vehicle.ts`:
```ts
export type SurfaceType = 'tarmac' | 'mud' | 'grass' | 'sand' | 'snow' | 'gravel' | 'ice';
```

### Step 2: Register in `src/config/surfaceRegistry.ts` using `createSurfaceDefinition()`
```ts
import { createSurfaceDefinition } from '@/utils/builders';

export const SURFACE_REGISTRY: Record<SurfaceType, SurfaceDefinition> = {
  // ...
  ice: createSurfaceDefinition({
    id: 'ice',
    name: 'Glacial Ice',
    frontGrip: { baseGrip: 0.8, slideGrip: 0.5 },
    rearGrip: { baseGrip: 0.8, slideGrip: 0.5 },
    particles: { color: '#ffffff', scale: 0.9 },
    audio: { soundType: 'gravel', basePitch: 1.3 },
    skidMarkOpacity: 0.2,
  }),
};
```

---

## 4. Listening to Gameplay Events (Event Bus)

To build new features (e.g., sound effects, camera shakes, ghost replay, achievements):
```ts
import { onGameEvent, useGameEventListener } from '@/utils/events';

// In React components:
useGameEventListener('lap_completed', ({ lap, lapTime, isBest }) => {
  console.log(`Finished lap ${lap} in ${lapTime}s! Best: ${isBest}`);
});

// Or pure TS / external modules:
const unsub = onGameEvent('gear_shifted', ({ fromGear, toGear }) => {
  // Play gear shift audio or trigger gauge needle twitch
});
```

---

## 5. Working with Gamepad & Controller Haptics

OpenRally includes standard W3C Gamepad API support tuned specifically for Xbox / XInput controllers:
```ts
import { sampleGamepad } from '@/utils/input/gamepad';
import { playGamepadRumble, rumbleImpact, rumbleSlip, rumbleSurface } from '@/utils/input/gamepadHaptics';

// Reading gamepad input:
const sample = sampleGamepad(sensitivity);
// sample.steering: -1.0 (Right) to +1.0 (Left)
// sample.throttle: 0.0 to 1.0 (RT trigger)
// sample.brake: 0.0 to 1.0 (LT trigger)

// Triggering haptic vibration:
rumbleImpact(0.8); // Sudden collision impact
rumbleSlip(0.5);   // Tire drift / skid vibration
rumbleSurface(0.4); // Rough off-road terrain vibration
```

---

## 6. Validating Changes & Integrity
Before submitting changes, run automated verification:
```bash
npm run check
```
This executes compiler checks, oxlint linter, full-project diagnostics (`diagnostics.test.ts`), and vitest unit tests across all registries, generators, and physics formulas.


