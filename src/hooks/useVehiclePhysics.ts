import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import { Vector3, Quaternion, Euler, Object3D } from 'three';
import type { VehicleConfig } from '@/types/vehicle';
import { useInputUpdater } from '@/hooks/useInput';
import { useGameStore } from '@/store/gameStore';
import {
  DEFAULT_VEHICLE_CONFIG,
  MS_TO_KMH,
  BRAKE_SPEED_THRESHOLD,
  REVERSE_FORCE_MULTIPLIER,
  FRICTION_FRONT_NORMAL,
  FRICTION_REAR_NORMAL,
  FRICTION_FRONT_SAND,
  FRICTION_REAR_SAND,
  FRICTION_HANDBRAKE,
  SAND_ELEVATION_THRESHOLD,
  FALL_RESET_Y,
  RESET_SPAWN_Y,
  MAX_DELTA,
  GEAR_RATIOS,
  SHIFT_UP_SPEEDS,
  SHIFT_DOWN_SPEEDS,
} from '@/config/vehicle';

// ─── Reusable Three.js objects (avoids per-frame GC pressure) ────────
const _forward = new Vector3();
const _velocity = new Vector3();
const _quat = new Quaternion();
const _euler = new Euler();


/**
 * Vehicle physics hook using Rapier's DynamicRayCastVehicleController.
 * Handles engine force, steering, braking, and handbrake.
 *
 * @param chassisRef - Ref to the chassis RigidBody
 * @param wheelRefs - Array of refs to visual wheel Object3Ds
 * @param config - Vehicle configuration (defaults to DEFAULT_VEHICLE_CONFIG)
 */
export function useVehiclePhysics(
  chassisRef: React.RefObject<RapierRigidBody | null>,
  wheelRefs: React.RefObject<(Object3D | null)[]>,
  config: VehicleConfig = DEFAULT_VEHICLE_CONFIG,
): void {
  const { world, rapier } = useRapier();
  const vehicleControllerRef = useRef<InstanceType<
    typeof rapier.DynamicRayCastVehicleController
  > | null>(null);
  const getInput = useInputUpdater();

  const setSpeed = useGameStore((s) => s.setSpeed);
  const setRpm = useGameStore((s) => s.setRpm);
  const setGear = useGameStore((s) => s.setGear);
  const setHeading = useGameStore((s) => s.setHeading);

  // Initialize the vehicle controller
  useEffect(() => {
    const body = chassisRef.current;
    if (!body) return;

    const controller = world.createVehicleController(body);

    // Add wheels
    config.wheels.forEach((wheel) => {
      controller.addWheel(
        // connection point (chassis-local)
        { x: wheel.position[0], y: wheel.position[1], z: wheel.position[2] },
        // suspension direction (downward)
        { x: 0, y: -1, z: 0 },
        // axle direction (lateral)
        { x: -1, y: 0, z: 0 },
        // suspension rest length
        wheel.suspensionRestLength,
        // wheel radius
        wheel.radius,
      );
    });

    // Configure suspension for each wheel
    for (let i = 0; i < config.wheels.length; i++) {
      const wheel = config.wheels[i];
      controller.setWheelSuspensionStiffness(i, wheel.suspensionStiffness);
      controller.setWheelMaxSuspensionTravel(i, wheel.suspensionTravel);
      controller.setWheelSuspensionCompression(i, wheel.suspensionDamping * 0.8);
      controller.setWheelSuspensionRelaxation(i, wheel.suspensionDamping);
      // Friction slip
      controller.setWheelFrictionSlip(i, wheel.steerable ? FRICTION_FRONT_NORMAL : FRICTION_REAR_NORMAL);
    }

    vehicleControllerRef.current = controller;

    return () => {
      world.removeVehicleController(controller);
      vehicleControllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Frame update: apply forces, read state
  useFrame((_, delta) => {
    const controller = vehicleControllerRef.current;
    const body = chassisRef.current;
    if (!controller || !body) return;

    const dt = Math.min(delta, MAX_DELTA);
    const input = getInput(dt);

    // Calculate current speed (m/s → km/h)
    const linvel = body.linvel();
    const pos = body.translation();

    _forward.set(0, 0, 1);
    const bodyQuat = body.rotation();
    _quat.set(bodyQuat.x, bodyQuat.y, bodyQuat.z, bodyQuat.w);
    _forward.applyQuaternion(_quat);

    _velocity.set(linvel.x, linvel.y, linvel.z);
    const forwardSpeed = _velocity.dot(_forward); // m/s along forward axis
    const speedKmh = Math.abs(forwardSpeed) * MS_TO_KMH;

    // Automatic Gearbox Logic
    const state = useGameStore.getState();
    let currentGear = state.gear;

    if (input.brake > 0 && forwardSpeed < BRAKE_SPEED_THRESHOLD) {
      currentGear = -1; // Reverse
    } else if (speedKmh < 1 && input.throttle === 0 && input.brake === 0) {
      currentGear = 1; // Idle in 1st gear
    } else {
      if (currentGear < 1) currentGear = 1; // Ensure forward gear

      // Shift up
      if (currentGear < 5 && speedKmh > SHIFT_UP_SPEEDS[currentGear]) {
        currentGear++;
      } 
      // Shift down
      else if (currentGear > 1 && speedKmh < SHIFT_DOWN_SPEEDS[currentGear]) {
        currentGear--;
      }
    }

    if (currentGear !== state.gear) {
      setGear(currentGear);
    }

    const gearRatio = currentGear > 0 ? GEAR_RATIOS[currentGear] : 1;

    // Apply engine force to powered wheels
    for (let i = 0; i < config.wheels.length; i++) {
      const wheel = config.wheels[i];

      if (wheel.powered) {
        let engineForce = 0;
        if (input.throttle > 0) {
          engineForce = config.maxEngineForce * input.throttle * gearRatio;
        } else if (input.brake > 0 && forwardSpeed > BRAKE_SPEED_THRESHOLD) {
          // Braking when moving forward
          engineForce = 0;
        } else if (input.brake > 0) {
          // Reverse
          engineForce = -config.maxEngineForce * input.brake * REVERSE_FORCE_MULTIPLIER;
        }
        controller.setWheelEngineForce(i, engineForce);
      } else {
        controller.setWheelEngineForce(i, 0);
      }

      // Braking
      let brakeForce = 0;
      if (input.brake > 0 && forwardSpeed > BRAKE_SPEED_THRESHOLD) {
        // Przesunięcie balansu hamulców (Brake Bias) na tył zapobiega podnoszeniu się tyłu pojazdu.
        // Ograniczamy hamowanie przednich kół, aby samochód nie nurkował i nie "przewracał się" przez przód.
        const brakeMultiplier = wheel.steerable ? 0.3 : 1.7;
        brakeForce = config.maxBrakeForce * input.brake * brakeMultiplier;
      }

      // Base friction — terrain surface detection
      let baseSlip = wheel.steerable ? FRICTION_FRONT_NORMAL : FRICTION_REAR_NORMAL;
      if (pos.y < SAND_ELEVATION_THRESHOLD) {
        baseSlip = wheel.steerable ? FRICTION_FRONT_SAND : FRICTION_REAR_SAND;
      }

      // Handbrake — rear wheels only
      if (input.handbrake && !wheel.steerable) {
        brakeForce = config.handbrakeForce;
        // Reduce rear friction for drift
        controller.setWheelFrictionSlip(i, FRICTION_HANDBRAKE);
      } else {
        controller.setWheelFrictionSlip(i, baseSlip);
      }
      controller.setWheelBrake(i, brakeForce);

      // Steering
      if (wheel.steerable) {
        const steerAngle = input.steering * config.maxSteeringAngle;
        controller.setWheelSteering(i, steerAngle);
      }
    }

    // Update the vehicle controller
    controller.updateVehicle(dt);

    // Apply aerodynamic downforce to keep the car grounded
    const downforce = Math.abs(forwardSpeed) * config.downforceFactor * dt;
    body.applyImpulse({ x: 0, y: -downforce, z: 0 }, true);

    // Apply water drag if partially submerged
    const WATER_SURFACE_CHASSIS_Y = -7.15; // Chassis Y when wheels just touch water
    if (pos.y < WATER_SURFACE_CHASSIS_Y) {
      const depth = Math.max(0, WATER_SURFACE_CHASSIS_Y - pos.y);
      // Increased drag based on depth
      const dragFactor = depth * 80 * dt;
      body.applyImpulse({ 
        x: -_velocity.x * dragFactor, 
        y: 0, 
        z: -_velocity.z * dragFactor 
      }, true);
    }

    // Sync visual wheels with physics
    const wheels = wheelRefs.current;
    if (wheels) {
      for (let i = 0; i < config.wheels.length; i++) {
        const wheelObj = wheels[i];
        if (!wheelObj) continue;

        const connection = controller.wheelChassisConnectionPointCs(i);
        const suspension = controller.wheelSuspensionLength(i);
        const steer = controller.wheelSteering(i);
        const wheelConfig = config.wheels[i];

        if (connection != null && suspension != null) {
          // Position: connection point - suspension compression
          wheelObj.position.set(
            connection.x,
            connection.y - suspension,
            connection.z,
          );

          // Steering rotation (Y axis)
          if (steer != null) {
            wheelObj.rotation.y = steer;
          }

          // Spin rotation (X axis) based on speed
          const spinSpeed = (forwardSpeed / wheelConfig.radius) * dt;
          wheelObj.children[0]?.rotateX(spinSpeed);
        }
      }
    }

    // Update game store
    setSpeed(Math.round(speedKmh));

    // Calculate RPM
    let targetRpm = 1000;
    if (currentGear === -1) {
      // Bardziej realistyczne obroty dla biegu wstecznego (max ~5000 RPM)
      targetRpm = 1000 + (Math.min(speedKmh, 40) / 40) * 4000;
      
      // Podbicie obrotów przy ruszaniu na wstecznym
      if (input.brake > 0 && speedKmh < 10) {
        targetRpm += input.brake * 1500 * (1 - speedKmh / 10);
      }
    } else if (currentGear > 0) {
      const minSpeed = currentGear === 1 ? 0 : SHIFT_UP_SPEEDS[currentGear - 1];
      const maxSpeed = SHIFT_UP_SPEEDS[currentGear] === 999 ? 240 : SHIFT_UP_SPEEDS[currentGear];
      const speedInRange = Math.max(0, speedKmh - minSpeed);
      const range = Math.max(1, maxSpeed - minSpeed);
      targetRpm = 1000 + (speedInRange / range) * 7000;
      
      // Rev blip when starting or holding throttle at low speeds
      if (input.throttle > 0 && speedKmh < 10) {
        targetRpm += input.throttle * 1500 * (1 - speedKmh / 10);
      }
    }
    
    // Add small random fluctuation to RPM for realism
    targetRpm += (Math.random() - 0.5) * 50;
    
    // Clamp RPM
    targetRpm = Math.min(8000, Math.max(800, targetRpm));
    setRpm(Math.round(targetRpm));

    // Heading from quaternion
    _euler.setFromQuaternion(_quat, 'YXZ');
    setHeading(_euler.y);

    // Reset vehicle if it falls below the terrain (into the ocean) or if user presses R
    const resetState = useGameStore.getState();
    if (pos.y < FALL_RESET_Y || input.reset || resetState.pendingReset) {
      body.setTranslation({ x: 0, y: RESET_SPAWN_Y, z: 0 }, true);
      body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);

      if (resetState.pendingReset) {
        resetState.triggerReset(false);
      }
    }
  });
}
