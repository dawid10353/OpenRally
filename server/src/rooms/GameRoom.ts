import type { WebSocket } from 'ws';
import type {
  EntitySnapshot,
  GameMode,
  RemotePlayerSummary,
  RoomSummary,
  ServerMessage,
  VehicleTelemetryPayload,
} from '../types.js';

export const DEFAULT_MAX_PLAYERS = 12;
export const BROADCAST_INTERVAL_MS = 40; // 25Hz broadcast rate
export const HEARTBEAT_TIMEOUT_MS = 6000;

export interface PlayerSession {
  id: string;
  ws: WebSocket;
  nickname: string;
  vehicleId: string;
  slotIndex: number;
  lastPing: number;
  lastSeen: number;
  latestSnapshot: EntitySnapshot | null;
  score: number;
  isSpectator: boolean;
  spectateTargetId: string | null;
}

export interface GameRoomOptions {
  id: string;
  name: string;
  hostId: string;
  hostNickname: string;
  levelId?: string;
  gameMode?: GameMode;
  isPersistent?: boolean;
  maxPlayers?: number;
}

export class GameRoom {
  public readonly id: string;
  public readonly name: string;
  public readonly hostId: string;
  public readonly hostNickname: string;
  public readonly levelId: string;
  public readonly gameMode: GameMode;
  public readonly isPersistent: boolean;
  public readonly maxPlayers: number;
  public readonly createdAt: number;

  public roundPhase: 'active' | 'intermission' = 'active';
  public roundTimer: number = 60.0;

  public readonly players: Map<string, PlayerSession> = new Map();
  private readonly usedSlots: Set<number> = new Set();
  private broadcastInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private matchLoopInterval: NodeJS.Timeout | null = null;
  private onPlayerLeftCallback: ((roomId: string, playerId: string, isHost: boolean) => void) | null = null;

  constructor(options: GameRoomOptions) {
    this.id = options.id;
    this.name = options.name;
    this.hostId = options.hostId;
    this.hostNickname = options.hostNickname;
    this.levelId = options.levelId ?? 'level5_gymkhana';
    this.gameMode = options.gameMode ?? 'freeroam';
    this.isPersistent = !!options.isPersistent;
    this.maxPlayers = options.maxPlayers ?? DEFAULT_MAX_PLAYERS;
    this.createdAt = Date.now();

    this.startBroadcastLoop();
    this.startHeartbeatMonitor();
    this.startGymkhanaMatchLoop();
  }

  public setOnPlayerLeftCallback(cb: (roomId: string, playerId: string, isHost: boolean) => void): void {
    this.onPlayerLeftCallback = cb;
  }

  public getPlayerCount(): number {
    return this.players.size;
  }

  public hasPlayer(id: string): boolean {
    return this.players.has(id);
  }

  public getPlayer(id: string): PlayerSession | undefined {
    return this.players.get(id);
  }

  public isHost(playerId: string): boolean {
    return this.hostId === playerId;
  }

  public getSummary(): RoomSummary {
    return {
      id: this.id,
      name: this.name,
      hostId: this.hostId,
      hostNickname: this.hostNickname,
      levelId: this.levelId,
      gameMode: this.gameMode,
      playerCount: this.players.size,
      maxPlayers: this.maxPlayers,
      createdAt: this.createdAt,
      isPersistent: this.isPersistent,
    };
  }

  /**
   * Registers a new player into the room.
   */
  public join(ws: WebSocket, nickname: string, vehicleId: string, customPlayerId?: string): PlayerSession | null {
    if (this.players.size >= this.maxPlayers) {
      this.sendToWs(ws, {
        type: 'error',
        code: 'ROOM_FULL',
        message: `Room "${this.name}" is currently full (max ${this.maxPlayers} drivers).`,
      });
      return null;
    }

    // Allocate lowest available slot
    let slotIndex = 0;
    for (let i = 0; i < this.maxPlayers; i++) {
      if (!this.usedSlots.has(i)) {
        slotIndex = i;
        break;
      }
    }
    this.usedSlots.add(slotIndex);

    const playerId = customPlayerId || `p_${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();

    const session: PlayerSession = {
      id: playerId,
      ws,
      nickname,
      vehicleId,
      slotIndex,
      lastPing: 0,
      lastSeen: now,
      latestSnapshot: null,
      score: 0,
      isSpectator: false,
      spectateTargetId: null,
    };

    this.players.set(playerId, session);

    // Send room_joined and lobby_joined state to the newly connected driver
    const playerSummaries: RemotePlayerSummary[] = [];
    for (const p of this.players.values()) {
      playerSummaries.push({
        id: p.id,
        nickname: p.nickname,
        vehicleId: p.vehicleId,
        slotIndex: p.slotIndex,
        ping: p.lastPing,
      });
    }

    const roomSummary = this.getSummary();

    // 1. Modern room_joined
    this.sendToWs(ws, {
      type: 'room_joined',
      selfId: playerId,
      room: roomSummary,
      players: playerSummaries,
    });

    // 2. Backwards-compatible lobby_joined
    this.sendToWs(ws, {
      type: 'lobby_joined',
      selfId: playerId,
      room: this.id,
      players: playerSummaries,
    });

    // 3. Gymkhana Blitz Mid-Match Spectator Logic
    if (this.gameMode === 'gymkhana_blitz') {
      if (this.roundPhase === 'active' && this.roundTimer < 57) {
        // Round is already underway! New player waits until the current 1-minute round ends
        const activeCandidates = Array.from(this.players.values()).filter(
          (p) => !p.isSpectator && p.id !== playerId
        );

        if (activeCandidates.length > 0) {
          session.isSpectator = true;
          const randomTarget = activeCandidates[Math.floor(Math.random() * activeCandidates.length)];
          session.spectateTargetId = randomTarget.id;

          this.sendToWs(ws, {
            type: 'gymkhana_spectate',
            isSpectator: true,
            targetId: randomTarget.id,
            targetNickname: randomTarget.nickname,
            roundTimeRemaining: Math.max(1, Math.round(this.roundTimer)),
          });
          console.log(`[GameRoom:${this.id}] Late joiner ${nickname} (${playerId}) spectating ${randomTarget.nickname} (${randomTarget.id}). ${Math.round(this.roundTimer)}s remaining.`);
        }
      } else if (this.roundPhase === 'intermission') {
        // Intermission is in progress: player waits for the new round to begin
        session.isSpectator = true;
        const leaderboard = Array.from(this.players.values())
          .filter((p) => p.id !== playerId)
          .map((p) => ({
            id: p.id,
            nickname: p.nickname,
            vehicleId: p.vehicleId,
            score: p.score,
          }))
          .sort((a, b) => b.score - a.score);

        this.sendToWs(ws, {
          type: 'gymkhana_round_ended',
          intermissionRemaining: Math.max(1, Math.round(this.roundTimer)),
          leaderboard,
        });
      }
    }

    // Broadcast player_joined to existing drivers
    const newPlayerSummary: RemotePlayerSummary = {
      id: playerId,
      nickname,
      vehicleId,
      slotIndex,
      ping: 0,
    };

    this.broadcast(
      {
        type: 'player_joined',
        player: newPlayerSummary,
      },
      playerId
    );

    console.log(`[GameRoom:${this.id}] Driver ${nickname} (${playerId}) joined slot ${slotIndex}. Total: ${this.players.size}`);
    return session;
  }

  /**
   * Handles incoming vehicle telemetry from a player session.
   */
  public handleTelemetry(playerId: string, payload: VehicleTelemetryPayload): void {
    const session = this.players.get(playerId);
    if (!session) return;

    session.lastSeen = Date.now();
    if (typeof payload.score === 'number' && !session.isSpectator) {
      session.score = payload.score;
    }

    session.latestSnapshot = {
      time: payload.time,
      pos: payload.pos,
      rot: payload.rot,
      linVel: payload.linVel,
      angVel: payload.angVel,
      steer: payload.steer,
      wheelRots: payload.wheelRots,
      rpm: payload.rpm,
      gear: payload.gear,
      isDrifting: payload.isDrifting,
      surface: payload.surface,
      score: payload.score,
    };
  }

  /**
   * Responds to heartbeat ping from a player.
   */
  public handlePing(playerId: string, clientTime: number): void {
    const session = this.players.get(playerId);
    if (!session) return;

    session.lastSeen = Date.now();
    this.sendToWs(session.ws, {
      type: 'pong',
      clientTime,
      serverTime: Date.now(),
    });
  }

  /**
   * Removes a player from the room and frees their spawn slot.
   */
  public leave(playerId: string, reason: string = 'client_left'): void {
    const session = this.players.get(playerId);
    if (!session) return;

    const isHost = this.isHost(playerId);
    this.usedSlots.delete(session.slotIndex);
    this.players.delete(playerId);

    // Reassign any spectators watching this leaving driver to another active player
    if (this.gameMode === 'gymkhana_blitz' && this.roundPhase === 'active') {
      const activeCandidates = Array.from(this.players.values()).filter(
        (p) => !p.isSpectator && p.id !== playerId
      );

      for (const p of this.players.values()) {
        if (p.isSpectator && p.spectateTargetId === playerId) {
          if (activeCandidates.length > 0) {
            const nextTarget = activeCandidates[Math.floor(Math.random() * activeCandidates.length)];
            p.spectateTargetId = nextTarget.id;
            this.sendToWs(p.ws, {
              type: 'gymkhana_spectate',
              isSpectator: true,
              targetId: nextTarget.id,
              targetNickname: nextTarget.nickname,
              roundTimeRemaining: Math.max(1, Math.round(this.roundTimer)),
            });
          } else {
            p.spectateTargetId = null;
          }
        }
      }
    }

    this.broadcast({
      type: 'player_left',
      playerId,
      reason,
    });

    console.log(`[GameRoom:${this.id}] Driver ${session.nickname} (${playerId}) left (${reason}). Total: ${this.players.size}`);

    if (this.onPlayerLeftCallback) {
      this.onPlayerLeftCallback(this.id, playerId, isHost);
    }
  }

  /**
   * Cleans up room resources, intervals, and notifies remaining players.
   */
  public destroy(reason: string = 'room_closed'): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.matchLoopInterval) {
      clearInterval(this.matchLoopInterval);
      this.matchLoopInterval = null;
    }

    // Broadcast room_deleted to all currently connected players
    const deleteMsg: ServerMessage = {
      type: 'room_deleted',
      roomId: this.id,
      reason,
    };
    this.broadcast(deleteMsg);

    this.players.clear();
    this.usedSlots.clear();
    this.onPlayerLeftCallback = null;
  }

  private startGymkhanaMatchLoop(): void {
    if (this.gameMode !== 'gymkhana_blitz') return;

    this.roundPhase = 'active';
    this.roundTimer = 60.0;

    this.matchLoopInterval = setInterval(() => {
      // If room is empty, keep timer primed at 60s
      if (this.players.size === 0) {
        this.roundPhase = 'active';
        this.roundTimer = 60.0;
        return;
      }

      this.roundTimer -= 1.0;

      if (this.roundPhase === 'active') {
        if (this.roundTimer <= 0) {
          // 60-second round finished! Transition to 20-second intermission
          this.roundPhase = 'intermission';
          this.roundTimer = 20.0;

          const leaderboard = Array.from(this.players.values())
            .filter((p) => !p.isSpectator)
            .map((p) => ({
              id: p.id,
              nickname: p.nickname,
              vehicleId: p.vehicleId,
              score: p.score,
            }))
            .sort((a, b) => b.score - a.score);

          this.broadcast({
            type: 'gymkhana_round_ended',
            intermissionRemaining: 20,
            leaderboard,
          });

          console.log(
            `[GameRoom:${this.id}] Gymkhana Blitz round finished. Intermission started (20s). Leaderboard: ${leaderboard.length} drivers.`
          );
        }
      } else if (this.roundPhase === 'intermission') {
        if (this.roundTimer <= 0) {
          // 20-second intermission finished! Reset and start new Gymkhana Blitz round
          this.roundPhase = 'active';
          this.roundTimer = 60.0;

          for (const session of this.players.values()) {
            session.score = 0;
            session.isSpectator = false;
            session.spectateTargetId = null;
          }

          this.broadcast({
            type: 'gymkhana_round_start',
            duration: 60,
            countdown: 3,
          });

          console.log(
            `[GameRoom:${this.id}] Gymkhana Blitz new round started for ${this.players.size} drivers.`
          );
        }
      }
    }, 1000);
  }

  private startBroadcastLoop(): void {
    this.broadcastInterval = setInterval(() => {
      if (this.players.size === 0) return;

      const entities: Record<string, EntitySnapshot> = {};
      for (const [id, session] of this.players.entries()) {
        if (session.latestSnapshot && !session.isSpectator) {
          entities[id] = session.latestSnapshot;
        }
      }

      if (Object.keys(entities).length === 0) return;

      const snapshotMsg: ServerMessage = {
        type: 'world_snapshot',
        serverTime: Date.now(),
        entities,
      };

      const serialized = JSON.stringify(snapshotMsg);
      for (const session of this.players.values()) {
        if (session.ws.readyState === 1 /* OPEN */) {
          session.ws.send(serialized);
        }
      }
    }, BROADCAST_INTERVAL_MS);
  }

  private startHeartbeatMonitor(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const deadPlayers: string[] = [];

      for (const [id, session] of this.players.entries()) {
        if (now - session.lastSeen > HEARTBEAT_TIMEOUT_MS) {
          deadPlayers.push(id);
        }
      }

      for (const id of deadPlayers) {
        this.leave(id, 'timeout');
      }
    }, 2000);
  }

  public broadcast(msg: ServerMessage, exceptPlayerId?: string): void {
    const serialized = JSON.stringify(msg);
    for (const [id, session] of this.players.entries()) {
      if (id === exceptPlayerId) continue;
      if (session.ws.readyState === 1 /* OPEN */) {
        session.ws.send(serialized);
      }
    }
  }

  public sendToWs(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === 1 /* OPEN */) {
      ws.send(JSON.stringify(msg));
    }
  }
}
