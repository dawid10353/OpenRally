import type { ClientMessage, ServerMessage, VehicleTelemetryPayload } from '@/types/network';
import type { SurfaceType } from '@/types/vehicle';

const VALID_SURFACES: ReadonlySet<SurfaceType> = new Set([
  'tarmac',
  'gravel',
  'mud',
  'sand',
  'grass',
  'snow',
]);

const VALID_VEHICLE_IDS: ReadonlySet<string> = new Set([
  'rally_hatchback',
  'rally_wrc',
]);

/**
 * Validates and sanitizes a player's nickname.
 * Returns trimmed string if valid, null otherwise.
 */
export function sanitizeNickname(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length < 2 || trimmed.length > 16) return null;
  // Allow alphanumeric, underscores, hyphens, and single spaces between words
  const validPattern = /^[a-zA-Z0-9_\- ]+$/;
  if (!validPattern.test(trimmed)) return null;
  return trimmed;
}

/**
 * Validates a vehicle ID against the registered vehicle roster.
 */
export function isValidVehicleId(vehicleId: unknown): boolean {
  return typeof vehicleId === 'string' && VALID_VEHICLE_IDS.has(vehicleId);
}

/**
 * Validates a finite floating point number within an inclusive range.
 */
export function isValidNumber(val: unknown, min: number, max: number): val is number {
  return typeof val === 'number' && Number.isFinite(val) && !Number.isNaN(val) && val >= min && val <= max;
}

/**
 * Validates a 3D coordinate vector [x, y, z].
 */
export function isValidVector3(val: unknown, maxCoord: number = 2000): val is [number, number, number] {
  if (!Array.isArray(val) || val.length !== 3) return false;
  return (
    isValidNumber(val[0], -maxCoord, maxCoord) &&
    isValidNumber(val[1], -maxCoord, maxCoord) &&
    isValidNumber(val[2], -maxCoord, maxCoord)
  );
}

/**
 * Validates a 4D quaternion [x, y, z, w].
 * Ensures components are finite and unit length norm is within plausible numerical limits.
 */
export function isValidQuaternion(val: unknown): val is [number, number, number, number] {
  if (!Array.isArray(val) || val.length !== 4) return false;
  const [x, y, z, w] = val;
  if (
    !isValidNumber(x, -1.05, 1.05) ||
    !isValidNumber(y, -1.05, 1.05) ||
    !isValidNumber(z, -1.05, 1.05) ||
    !isValidNumber(w, -1.05, 1.05)
  ) {
    return false;
  }
  const normSq = x * x + y * y + z * z + w * w;
  return normSq >= 0.5 && normSq <= 1.5;
}

/**
 * Validates an incoming vehicle telemetry payload.
 * Prevents NaN, out-of-bounds coords, or maliciously crafted packets.
 */
export function validateTelemetryPayload(raw: unknown): VehicleTelemetryPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;

  if (!isValidNumber(p.seq, 0, 1e9)) return null;
  if (!isValidNumber(p.time, 0, 1e15)) return null;
  if (!isValidVector3(p.pos, 1000)) return null;
  if (!isValidQuaternion(p.rot)) return null;
  if (!isValidVector3(p.linVel, 200)) return null;
  if (!isValidVector3(p.angVel, 100)) return null;
  if (!isValidNumber(p.steer, -1.5, 1.5)) return null;

  if (!Array.isArray(p.wheelRots) || p.wheelRots.length !== 4) return null;
  for (let i = 0; i < 4; i++) {
    if (!isValidNumber(p.wheelRots[i], -1e7, 1e7)) return null;
  }

  if (!isValidNumber(p.rpm, 0, 15000)) return null;
  if (!isValidNumber(p.gear, -1, 8)) return null;
  if (typeof p.isDrifting !== 'boolean') return null;

  const surface = typeof p.surface === 'string' && VALID_SURFACES.has(p.surface as SurfaceType)
    ? (p.surface as SurfaceType)
    : 'tarmac';

  return {
    seq: p.seq as number,
    time: p.time as number,
    pos: p.pos as [number, number, number],
    rot: p.rot as [number, number, number, number],
    linVel: p.linVel as [number, number, number],
    angVel: p.angVel as [number, number, number],
    steer: p.steer as number,
    wheelRots: p.wheelRots as [number, number, number, number],
    rpm: p.rpm as number,
    gear: p.gear as number,
    isDrifting: p.isDrifting,
    surface,
  };
}

/**
 * Validates a client-originated network message.
 */
export function parseClientMessage(raw: unknown): ClientMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const msg = raw as Record<string, unknown>;
  const type = msg.type;

  if (type === 'join_lobby') {
    const nick = sanitizeNickname(msg.nickname);
    if (!nick) return null;
    const vehicleId = isValidVehicleId(msg.vehicleId) ? (msg.vehicleId as string) : 'rally_hatchback';
    const levelId = typeof msg.levelId === 'string' && msg.levelId.length > 0 ? msg.levelId : 'level5_gymkhana';
    return {
      type: 'join_lobby',
      nickname: nick,
      vehicleId,
      levelId,
    };
  }

  if (type === 'leave_lobby') {
    return { type: 'leave_lobby' };
  }

  if (type === 'telemetry') {
    const payload = validateTelemetryPayload(msg.payload);
    if (!payload) return null;
    return { type: 'telemetry', payload };
  }

  if (type === 'ping') {
    if (!isValidNumber(msg.clientTime, 0, 1e15)) return null;
    return { type: 'ping', clientTime: msg.clientTime as number };
  }

  return null;
}

/**
 * Validates a server-originated network message received by client.
 */
export function parseServerMessage(raw: unknown): ServerMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const msg = raw as Record<string, unknown>;
  const type = msg.type;

  if (type === 'lobby_joined') {
    if (typeof msg.selfId !== 'string' || typeof msg.room !== 'string' || !Array.isArray(msg.players)) {
      return null;
    }
    return msg as unknown as ServerMessage;
  }

  if (type === 'player_joined') {
    if (!msg.player || typeof msg.player !== 'object') return null;
    return msg as unknown as ServerMessage;
  }

  if (type === 'player_left') {
    if (typeof msg.playerId !== 'string') return null;
    return {
      type: 'player_left',
      playerId: msg.playerId as string,
      reason: typeof msg.reason === 'string' ? msg.reason : 'disconnected',
    };
  }

  if (type === 'world_snapshot') {
    if (!isValidNumber(msg.serverTime, 0, 1e15) || !msg.entities || typeof msg.entities !== 'object') {
      return null;
    }
    return msg as unknown as ServerMessage;
  }

  if (type === 'pong') {
    if (!isValidNumber(msg.clientTime, 0, 1e15) || !isValidNumber(msg.serverTime, 0, 1e15)) {
      return null;
    }
    return {
      type: 'pong',
      clientTime: msg.clientTime as number,
      serverTime: msg.serverTime as number,
    };
  }

  if (type === 'error') {
    return {
      type: 'error',
      code: typeof msg.code === 'string' ? msg.code : 'UNKNOWN',
      message: typeof msg.message === 'string' ? msg.message : 'An error occurred',
    };
  }

  return null;
}
