import type { SurfaceType } from './vehicle';

/**
 * State of the network client connection.
 */
export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'in_lobby'
  | 'in_game'
  | 'reconnecting'
  | 'error';

/**
 * 3D transform telemetry: position [x, y, z] and quaternion [x, y, z, w].
 */
export interface TransformTelemetry {
  /** World space position [x, y, z] */
  pos: [number, number, number];
  /** World space rotation quaternion [x, y, z, w] */
  rot: [number, number, number, number];
}

/**
 * Linear and angular velocities for dead-reckoning extrapolation.
 */
export interface VelocityTelemetry {
  /** Linear velocity in world space [vx, vy, vz] */
  linVel: [number, number, number];
  /** Angular velocity [wx, wy, wz] */
  angVel: [number, number, number];
}

/**
 * Visual wheel angles for remote rendering:
 * steer angle in radians and wheel rotation around spin axis for 4 wheels [FL, FR, RL, RR].
 */
export interface WheelTelemetry {
  /** Steering angle of front wheels in radians */
  steer: number;
  /** Cumulative roll rotations for each wheel [FL, FR, RL, RR] in radians */
  wheelRots: [number, number, number, number];
}

/**
 * Complete snapshot of a vehicle's telemetry transmitted over the network.
 */
export interface VehicleTelemetryPayload {
  /** Client-side sequence number for ordering */
  seq: number;
  /** Client timestamp in milliseconds when telemetry was captured */
  time: number;
  /** Position [x, y, z] */
  pos: [number, number, number];
  /** Quaternion [x, y, z, w] */
  rot: [number, number, number, number];
  /** Linear velocity [vx, vy, vz] */
  linVel: [number, number, number];
  /** Angular velocity [wx, wy, wz] */
  angVel: [number, number, number];
  /** Steering angle */
  steer: number;
  /** Wheel spin rotations [FL, FR, RL, RR] */
  wheelRots: [number, number, number, number];
  /** Engine speed indicator (0-1 normalized or RPM) */
  rpm: number;
  /** Transmission gear (-1, 0, 1-6) */
  gear: number;
  /** Whether the vehicle is currently in a drift */
  isDrifting: boolean;
  /** Surface currently driven upon */
  surface: SurfaceType;
}

/**
 * Public metadata for a remote player.
 */
export interface RemotePlayerSummary {
  /** Unique session ID */
  id: string;
  /** Player display nickname */
  nickname: string;
  /** Selected vehicle preset ID (from VehicleRegistry) */
  vehicleId: string;
  /** Assigned spawn slot index */
  slotIndex: number;
  /** Round-trip time latency in milliseconds */
  ping: number;
}

/**
 * Public summary of an active multiplayer room.
 */
export interface RoomSummary {
  /** Unique room identifier */
  id: string;
  /** User-friendly room name */
  name: string;
  /** Session ID of the room creator / host */
  hostId: string;
  /** Nickname of the host */
  hostNickname: string;
  /** Map/Track ID */
  levelId: string;
  /** Current number of active players */
  playerCount: number;
  /** Maximum capacity of the room (e.g. 12) */
  maxPlayers: number;
  /** Timestamp when the room was created */
  createdAt: number;
  /** Whether this is a permanent official room that cannot be deleted */
  isPersistent?: boolean;
}

/**
 * Snapshot of a single remote entity received from server.
 */
export interface EntitySnapshot {
  time: number;
  pos: [number, number, number];
  rot: [number, number, number, number];
  linVel: [number, number, number];
  angVel: [number, number, number];
  steer: number;
  wheelRots: [number, number, number, number];
  rpm: number;
  gear: number;
  isDrifting: boolean;
  surface: SurfaceType;
}

/**
 * Discriminated union of all messages sent from Client to Server.
 */
export type ClientMessage =
  | {
      type: 'request_rooms';
    }
  | {
      type: 'create_room';
      name: string;
      nickname: string;
      vehicleId: string;
      levelId: string;
    }
  | {
      type: 'join_room';
      roomId: string;
      nickname: string;
      vehicleId: string;
    }
  | {
      type: 'delete_room';
      roomId: string;
    }
  | {
      type: 'leave_room';
      roomId: string;
    }
  | {
      // Legacy backward-compatibility join
      type: 'join_lobby';
      nickname: string;
      vehicleId: string;
      levelId: string;
    }
  | {
      type: 'leave_lobby';
    }
  | {
      type: 'telemetry';
      payload: VehicleTelemetryPayload;
    }
  | {
      type: 'ping';
      clientTime: number;
    };

/**
 * Discriminated union of all messages sent from Server to Client.
 */
export type ServerMessage =
  | {
      type: 'rooms_list';
      rooms: RoomSummary[];
    }
  | {
      type: 'room_created';
      room: RoomSummary;
    }
  | {
      type: 'room_joined';
      selfId: string;
      room: RoomSummary;
      players: RemotePlayerSummary[];
    }
  | {
      type: 'room_deleted';
      roomId: string;
      reason: string;
    }
  | {
      // Legacy compatibility
      type: 'lobby_joined';
      selfId: string;
      room: string;
      players: RemotePlayerSummary[];
    }
  | {
      type: 'player_joined';
      player: RemotePlayerSummary;
    }
  | {
      type: 'player_left';
      playerId: string;
      reason: string;
    }
  | {
      type: 'world_snapshot';
      serverTime: number;
      entities: Record<string, EntitySnapshot>;
    }
  | {
      type: 'pong';
      clientTime: number;
      serverTime: number;
    }
  | {
      type: 'error';
      code: string;
      message: string;
    };
