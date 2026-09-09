export type SurfaceType = 'tarmac' | 'gravel' | 'mud' | 'sand' | 'grass' | 'snow';

export interface VehicleTelemetryPayload {
  seq: number;
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

export interface RemotePlayerSummary {
  id: string;
  nickname: string;
  vehicleId: string;
  slotIndex: number;
  ping: number;
}

export interface RoomSummary {
  id: string;
  name: string;
  hostId: string;
  hostNickname: string;
  levelId: string;
  playerCount: number;
  maxPlayers: number;
  createdAt: number;
  isPersistent?: boolean;
}

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
