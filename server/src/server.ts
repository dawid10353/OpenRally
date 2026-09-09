import { createServer } from 'http';
import { WebSocketServer, type WebSocket } from 'ws';
import { RoomManager } from './rooms/RoomManager.js';
import { parseClientMessage } from './packetValidator.js';
import type { ClientMessage } from './types.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

const roomManager = new RoomManager();

// Minimal HTTP server for health checks & WebSocket upgrade
const httpServer = createServer((req, res) => {
  if (req.url === '/health' || req.url === '/api/health') {
    const rooms = roomManager.getRoomsList();
    const totalPlayers = rooms.reduce((acc, r) => acc + r.playerCount, 0);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        uptime: process.uptime(),
        roomsCount: rooms.length,
        players: totalPlayers,
      })
    );
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OpenRally Multiplayer Dedicated Game Server\n');
});

const wss = new WebSocketServer({
  server: httpServer,
});

wss.on('connection', (ws: WebSocket, req) => {
  const ip = req.socket.remoteAddress || 'unknown';
  console.log(`[Server] New WebSocket connection established from ${ip}`);

  // Automatically subscribe newly connected clients to lobby updates
  roomManager.subscribeLobby(ws);

  ws.on('message', (data: Buffer | string) => {
    try {
      const text = typeof data === 'string' ? data : data.toString('utf-8');
      const raw = JSON.parse(text);
      const msg: ClientMessage | null = parseClientMessage(raw);
      if (!msg) return;

      switch (msg.type) {
        case 'request_rooms': {
          roomManager.subscribeLobby(ws);
          break;
        }

        case 'create_room': {
          roomManager.createRoom(ws, msg.name, msg.nickname, msg.vehicleId, msg.levelId);
          break;
        }

        case 'join_room': {
          roomManager.joinRoom(ws, msg.roomId, msg.nickname, msg.vehicleId);
          break;
        }

        case 'delete_room': {
          const playerId = roomManager.getPlayerId(ws);
          if (playerId) {
            roomManager.deleteRoom(msg.roomId, playerId);
          }
          break;
        }

        case 'leave_room': {
          const playerId = roomManager.getPlayerId(ws);
          if (playerId) {
            roomManager.leavePlayer(playerId, 'user_left_room');
          }
          break;
        }

        case 'join_lobby': {
          // Backward compatibility for legacy join_lobby
          roomManager.joinRoom(ws, 'gymkhana_freeroam', msg.nickname, msg.vehicleId);
          break;
        }

        case 'leave_lobby': {
          const playerId = roomManager.getPlayerId(ws);
          if (playerId) {
            roomManager.leavePlayer(playerId, 'user_left_lobby');
          }
          break;
        }

        case 'telemetry': {
          roomManager.handleTelemetry(ws, msg.payload);
          break;
        }

        case 'ping': {
          roomManager.handlePing(ws, msg.clientTime);
          break;
        }
      }
    } catch (err) {
      console.warn('[Server] Error handling packet:', err);
    }
  });

  ws.on('close', (code) => {
    roomManager.handleDisconnect(ws, `code_${code}`);
  });

  ws.on('error', (err) => {
    console.warn(`[Server] Client error from ${ip}:`, err);
    roomManager.handleDisconnect(ws, 'error');
  });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`[OpenRally] Multiplayer Relay Server running on http://${HOST}:${PORT}`);
  console.log(`[OpenRally] WebSocket endpoint active at ws://${HOST}:${PORT}/ws`);
});

function handleShutdown(): void {
  console.log('[OpenRally] Shutting down server...');
  roomManager.destroy();
  wss.close(() => {
    httpServer.close(() => {
      console.log('[OpenRally] Server closed gracefully.');
      process.exit(0);
    });
  });
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
