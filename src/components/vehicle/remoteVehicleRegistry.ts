import type { Object3D } from 'three';

const remoteVehicleMeshMap = new Map<string, Object3D>();

/**
 * Registers an active 3D visual mesh group for a remote player.
 */
export function registerRemoteVehicleMesh(playerId: string, obj: Object3D): void {
  remoteVehicleMeshMap.set(playerId, obj);
}

/**
 * Unregisters the 3D visual mesh group when a remote player leaves or unmounts.
 */
export function unregisterRemoteVehicleMesh(playerId: string): void {
  remoteVehicleMeshMap.delete(playerId);
}

/**
 * Retrieves the 3D visual mesh group of a remote player for camera following.
 */
export function getRemoteVehicleMesh(playerId: string): Object3D | null {
  return remoteVehicleMeshMap.get(playerId) ?? null;
}

/**
 * Returns all currently registered remote vehicle meshes for proximity checking.
 */
export function getAllRemoteVehicleMeshes(): ReadonlyMap<string, Object3D> {
  return remoteVehicleMeshMap;
}
