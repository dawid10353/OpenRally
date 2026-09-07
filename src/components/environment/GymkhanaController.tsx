import { useGymkhanaLogic } from '@/hooks/useGymkhanaLogic';

/**
 * Headless 3D scene component that runs the Gymkhana Blitz physics scoring loop.
 */
export function GymkhanaController(): null {
  useGymkhanaLogic();
  return null;
}
