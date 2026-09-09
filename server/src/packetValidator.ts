import type { ClientMessage, VehicleTelemetryPayload, SurfaceType, GameMode } from './types.js';

export const VALID_LEVEL_IDS: ReadonlySet<string> = new Set([
  'level1_island',
  'level2_desert',
  'level3_sweden',
  'level4_britain',
  'level5_gymkhana',
]);

export const VALID_GAME_MODES: ReadonlySet<GameMode> = new Set([
  'freeroam',
  'timeattack',
  'gymkhana_blitz',
]);

const VALID_SURFACES: ReadonlySet<SurfaceType> = new Set([
  'tarmac',
  'gravel',
  'mud',
  'sand',
  'grass',
  'snow',
]);

const VALID_VEHICLE_IDS: ReadonlySet<string> = new Set([
  // Primary Championship Roster
  'zephyr_wr4',
  'apex_phantom_b',
  'bantam_turbo',
  'vortex_b',
  'vanguard_gt',
  'shadowfire_rs',
  'kodiak_raid',
  // Backward-compatibility aliases
  'rally_hatchback',
  'rally_wrc',
  'rally_cyclone_b',
  'cyclone_rs',
  'ignis_sprint',
  'rally_titan_b',
]);

export function sanitizeNickname(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length < 2 || trimmed.length > 16) return null;
  const validPattern = /^[\p{L}\p{N}_\- ]+$/u;
  if (!validPattern.test(trimmed)) return null;
  return trimmed;
}

export function sanitizeRoomName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length < 2 || trimmed.length > 24) return null;
  const validPattern = /^[\p{L}\p{N}_\- !?#()'".]+$/u;
  if (!validPattern.test(trimmed)) return null;
  return trimmed;
}

export function isValidVehicleId(vehicleId: unknown): boolean {
  return typeof vehicleId === 'string' && VALID_VEHICLE_IDS.has(vehicleId);
}

export function isValidNumber(val: unknown, min: number, max: number): val is number {
  return typeof val === 'number' && Number.isFinite(val) && !Number.isNaN(val) && val >= min && val <= max;
}

export function isValidVector3(val: unknown, maxCoord: number = 2000): val is [number, number, number] {
  if (!Array.isArray(val) || val.length !== 3) return false;
  return (
    isValidNumber(val[0], -maxCoord, maxCoord) &&
    isValidNumber(val[1], -maxCoord, maxCoord) &&
    isValidNumber(val[2], -maxCoord, maxCoord)
  );
}

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

export function parseClientMessage(raw: unknown): ClientMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const msg = raw as Record<string, unknown>;
  const type = msg.type;

  if (type === 'request_rooms') {
    return { type: 'request_rooms' };
  }

  if (type === 'create_room') {
    const name = sanitizeRoomName(msg.name);
    if (!name) return null;
    const nick = sanitizeNickname(msg.nickname);
    if (!nick) return null;
    const vehicleId = isValidVehicleId(msg.vehicleId) ? (msg.vehicleId as string) : 'zephyr_wr4';
    const rawLevelId = typeof msg.levelId === 'string' ? msg.levelId : 'level1_island';
    const levelId = VALID_LEVEL_IDS.has(rawLevelId) ? rawLevelId : 'level1_island';

    let gameMode: GameMode =
      typeof msg.gameMode === 'string' && VALID_GAME_MODES.has(msg.gameMode as GameMode)
        ? (msg.gameMode as GameMode)
        : 'freeroam';

    // Enforce map compatibility: gymkhana_blitz only on gymkhana, timeattack only on circuit/rally
    if (levelId === 'level5_gymkhana') {
      if (gameMode !== 'freeroam' && gameMode !== 'gymkhana_blitz') {
        gameMode = 'freeroam';
      }
    } else {
      if (gameMode !== 'freeroam' && gameMode !== 'timeattack') {
        gameMode = 'freeroam';
      }
    }

    return {
      type: 'create_room',
      name,
      nickname: nick,
      vehicleId,
      levelId,
      gameMode,
    };
  }

  if (type === 'join_room') {
    if (typeof msg.roomId !== 'string' || msg.roomId.length === 0) return null;
    const nick = sanitizeNickname(msg.nickname);
    if (!nick) return null;
    const vehicleId = isValidVehicleId(msg.vehicleId) ? (msg.vehicleId as string) : 'zephyr_wr4';
    return {
      type: 'join_room',
      roomId: msg.roomId as string,
      nickname: nick,
      vehicleId,
    };
  }

  if (type === 'delete_room') {
    if (typeof msg.roomId !== 'string' || msg.roomId.length === 0) return null;
    return { type: 'delete_room', roomId: msg.roomId as string };
  }

  if (type === 'leave_room') {
    if (typeof msg.roomId !== 'string' || msg.roomId.length === 0) return null;
    return { type: 'leave_room', roomId: msg.roomId as string };
  }

  if (type === 'join_lobby') {
    const nick = sanitizeNickname(msg.nickname);
    if (!nick) return null;
    const vehicleId = isValidVehicleId(msg.vehicleId) ? (msg.vehicleId as string) : 'zephyr_wr4';
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
