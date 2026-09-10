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
  'tag',
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

function isValidVehicleId(raw: unknown): boolean {
  return typeof raw === 'string' && VALID_VEHICLE_IDS.has(raw);
}

function isValidNumber(val: unknown, min: number, max: number): boolean {
  return typeof val === 'number' && Number.isFinite(val) && val >= min && val <= max;
}

function isValidTuple3(val: unknown, min: number, max: number): boolean {
  if (!Array.isArray(val) || val.length !== 3) return false;
  return val.every((n) => isValidNumber(n, min, max));
}

function isValidTuple4(val: unknown, min: number, max: number): boolean {
  if (!Array.isArray(val) || val.length !== 4) return false;
  return val.every((n) => isValidNumber(n, min, max));
}

export function validateTelemetryPayload(raw: unknown): VehicleTelemetryPayload | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const p = raw as Record<string, unknown>;

  if (!isValidNumber(p.time, 0, 1e15)) return null;
  if (!isValidTuple3(p.pos, -50000, 50000)) return null;
  if (!isValidTuple4(p.rot, -2, 2)) return null;
  if (!isValidTuple3(p.linVel, -500, 500)) return null;
  if (!isValidTuple3(p.angVel, -100, 100)) return null;
  if (!isValidNumber(p.steer, -2, 2)) return null;
  if (!isValidTuple4(p.wheelRots, -1e6, 1e6)) return null;
  if (!isValidNumber(p.rpm, 0, 20000)) return null;
  if (!isValidNumber(p.gear, -2, 10)) return null;
  if (typeof p.isDrifting !== 'boolean') return null;
  if (typeof p.surface !== 'string' || !VALID_SURFACES.has(p.surface as SurfaceType)) {
    return null;
  }

  const score = typeof p.score === 'number' && Number.isFinite(p.score) && p.score >= 0 ? p.score : undefined;

  const seq = typeof p.seq === 'number' && Number.isFinite(p.seq) ? p.seq : 0;

  return {
    seq,
    time: p.time as number,
    pos: p.pos as [number, number, number],
    rot: p.rot as [number, number, number, number],
    linVel: p.linVel as [number, number, number],
    angVel: p.angVel as [number, number, number],
    steer: p.steer as number,
    wheelRots: p.wheelRots as [number, number, number, number],
    rpm: p.rpm as number,
    gear: p.gear as number,
    isDrifting: p.isDrifting as boolean,
    surface: p.surface as SurfaceType,
    score,
  };
}

export function parseClientMessage(raw: unknown): ClientMessage | null {
  if (typeof raw !== 'object' || raw === null) return null;
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

    // Enforce map compatibility: gymkhana_blitz on gymkhana, timeattack on circuit/rally, tag on all maps
    if (levelId === 'level5_gymkhana') {
      if (gameMode !== 'freeroam' && gameMode !== 'gymkhana_blitz' && gameMode !== 'tag') {
        gameMode = 'freeroam';
      }
    } else {
      if (gameMode !== 'freeroam' && gameMode !== 'timeattack' && gameMode !== 'tag') {
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

  if (type === 'client_ready') {
    return { type: 'client_ready' };
  }

  if (type === 'tag_touch') {
    if (typeof msg.targetPlayerId !== 'string' || msg.targetPlayerId.length === 0) return null;
    return { type: 'tag_touch', targetPlayerId: msg.targetPlayerId as string };
  }

  return null;
}
