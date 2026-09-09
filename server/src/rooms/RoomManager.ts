import type { WebSocket } from 'ws';
import { GameRoom, type PlayerSession } from './GameRoom.js';
import type {
  GameMode,
  RoomSummary,
  ServerMessage,
  VehicleTelemetryPayload,
} from '../types.js';

export class RoomManager {
  private readonly rooms: Map<string, GameRoom> = new Map();
  private readonly playerToRoom: Map<string, string> = new Map();
  private readonly wsToPlayer: Map<WebSocket, string> = new Map();
  private readonly lobbySubscribers: Set<WebSocket> = new Set();

  constructor() {
    this.createDefaultRoom();
  }

  private createDefaultRoom(): void {
    const defaultRoom = new GameRoom({
      id: 'gymkhana_freeroam',
      name: 'Apex Arena (Official)',
      hostId: 'system',
      hostNickname: 'Official Server',
      levelId: 'level5_gymkhana',
      gameMode: 'freeroam',
      isPersistent: true,
      maxPlayers: 12,
    });

    this.rooms.set(defaultRoom.id, defaultRoom);
  }

  public getRoomsList(): RoomSummary[] {
    const summaries: RoomSummary[] = [];
    for (const room of this.rooms.values()) {
      summaries.push(room.getSummary());
    }
    return summaries;
  }

  public subscribeLobby(ws: WebSocket): void {
    this.lobbySubscribers.add(ws);
    this.sendToWs(ws, {
      type: 'rooms_list',
      rooms: this.getRoomsList(),
    });
  }

  public unsubscribeLobby(ws: WebSocket): void {
    this.lobbySubscribers.delete(ws);
  }

  public broadcastRoomsList(): void {
    const msg: ServerMessage = {
      type: 'rooms_list',
      rooms: this.getRoomsList(),
    };
    const serialized = JSON.stringify(msg);

    for (const ws of this.lobbySubscribers) {
      if (ws.readyState === 1 /* OPEN */) {
        ws.send(serialized);
      } else {
        this.lobbySubscribers.delete(ws);
      }
    }
  }

  /**
   * Creates a custom user room and automatically adds the creator as the host.
   */
  public createRoom(
    ws: WebSocket,
    name: string,
    nickname: string,
    vehicleId: string,
    levelId: string = 'level1_island',
    gameMode: GameMode = 'freeroam'
  ): GameRoom | null {
    // Check if player is already in a room and leave it
    const existingPlayerId = this.wsToPlayer.get(ws);
    if (existingPlayerId) {
      this.leavePlayer(existingPlayerId, 'joining_new_room');
    }

    const roomId = `room_${Math.random().toString(36).substring(2, 9)}`;
    const hostPlayerId = `p_${Math.random().toString(36).substring(2, 9)}`;

    const room = new GameRoom({
      id: roomId,
      name,
      hostId: hostPlayerId,
      hostNickname: nickname,
      levelId,
      gameMode,
      isPersistent: false,
      maxPlayers: 12,
    });

    room.setOnPlayerLeftCallback((rId, pId, wasHost) => {
      this.handlePlayerLeftRoom(rId, pId, wasHost);
    });

    this.rooms.set(roomId, room);

    // Host joins the newly created room
    const session = room.join(ws, nickname, vehicleId, hostPlayerId);
    if (!session) {
      room.destroy('Failed to join newly created room');
      this.rooms.delete(roomId);
      return null;
    }

    this.playerToRoom.set(hostPlayerId, roomId);
    this.wsToPlayer.set(ws, hostPlayerId);

    // Send room_created to the host
    this.sendToWs(ws, {
      type: 'room_created',
      room: room.getSummary(),
    });

    // Notify all lobby watchers
    this.broadcastRoomsList();

    console.log(`[RoomManager] Room "${name}" (${roomId}) created by host ${nickname} (${hostPlayerId})`);
    return room;
  }

  /**
   * Joins an existing room.
   */
  public joinRoom(
    ws: WebSocket,
    roomId: string,
    nickname: string,
    vehicleId: string
  ): PlayerSession | null {
    const targetRoomId = roomId === 'default' ? 'gymkhana_freeroam' : roomId;
    const room = this.rooms.get(targetRoomId);

    if (!room) {
      this.sendToWs(ws, {
        type: 'error',
        code: 'ROOM_NOT_FOUND',
        message: `Requested room "${roomId}" does not exist or has closed.`,
      });
      return null;
    }

    // Leave any current room
    const existingPlayerId = this.wsToPlayer.get(ws);
    if (existingPlayerId) {
      this.leavePlayer(existingPlayerId, 'switching_rooms');
    }

    const session = room.join(ws, nickname, vehicleId);
    if (!session) {
      return null;
    }

    this.playerToRoom.set(session.id, room.id);
    this.wsToPlayer.set(ws, session.id);

    // Broadcast updated room list to lobby watchers
    this.broadcastRoomsList();

    console.log(`[RoomManager] Driver ${nickname} (${session.id}) joined room "${room.name}" (${room.id})`);
    return session;
  }

  /**
   * Deletes a room if requested by its host.
   */
  public deleteRoom(roomId: string, requestingPlayerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    if (room.isPersistent) {
      console.warn(`[RoomManager] Player ${requestingPlayerId} attempted to delete persistent room ${roomId}`);
      return false;
    }

    if (room.hostId !== requestingPlayerId) {
      console.warn(`[RoomManager] Player ${requestingPlayerId} unauthorized to delete room ${roomId} (Host is ${room.hostId})`);
      return false;
    }

    // Clear mapping for all players in this room
    for (const pId of room.players.keys()) {
      this.playerToRoom.delete(pId);
    }

    room.destroy('Host deleted the room');
    this.rooms.delete(roomId);

    // Notify all lobby watchers of room removal
    this.broadcastRoomsList();

    console.log(`[RoomManager] Room "${room.name}" (${roomId}) deleted by host (${requestingPlayerId})`);
    return true;
  }

  /**
   * Handles player leaving their room.
   */
  public leavePlayer(playerId: string, reason: string = 'client_left'): void {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return;

    this.playerToRoom.delete(playerId);
    const room = this.rooms.get(roomId);
    if (room) {
      room.leave(playerId, reason);
    }
  }

  private handlePlayerLeftRoom(roomId: string, playerId: string, isHost: boolean): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // If room is non-persistent and empty, delete it
    if (!room.isPersistent && room.getPlayerCount() === 0) {
      console.log(`[RoomManager] Custom room "${room.name}" (${roomId}) is now empty. Auto-reaping.`);
      room.destroy('Room became empty');
      this.rooms.delete(roomId);
    } else if (!room.isPersistent && isHost) {
      // If host left, delete room or transfer host? Let's delete room as per room ownership model
      console.log(`[RoomManager] Host left custom room "${room.name}" (${roomId}). Closing room.`);
      for (const pId of room.players.keys()) {
        this.playerToRoom.delete(pId);
      }
      room.destroy('Host left the session');
      this.rooms.delete(roomId);
    }

    this.broadcastRoomsList();
  }

  public handleTelemetry(ws: WebSocket, payload: VehicleTelemetryPayload): void {
    const playerId = this.wsToPlayer.get(ws);
    if (!playerId) return;

    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.handleTelemetry(playerId, payload);
    }
  }

  public handlePing(ws: WebSocket, clientTime: number): void {
    const playerId = this.wsToPlayer.get(ws);
    if (!playerId) return;

    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.handlePing(playerId, clientTime);
    }
  }

  public handleDisconnect(ws: WebSocket, reason: string = 'disconnect'): void {
    this.unsubscribeLobby(ws);

    const playerId = this.wsToPlayer.get(ws);
    if (playerId) {
      this.wsToPlayer.delete(ws);
      this.leavePlayer(playerId, reason);
    }
  }

  public getPlayerId(ws: WebSocket): string | undefined {
    return this.wsToPlayer.get(ws);
  }

  public getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  public destroy(): void {
    for (const room of this.rooms.values()) {
      room.destroy('Server shutdown');
    }
    this.rooms.clear();
    this.playerToRoom.clear();
    this.wsToPlayer.clear();
    this.lobbySubscribers.clear();
  }

  private sendToWs(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === 1 /* OPEN */) {
      ws.send(JSON.stringify(msg));
    }
  }
}
