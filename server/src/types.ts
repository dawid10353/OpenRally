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
