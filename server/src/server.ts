import { createServer } from 'http';
import { WebSocketServer, type WebSocket } from 'ws';
import { GymkhanaRoom } from './rooms/GymkhanaRoom.js';
import { parseClientMessage } from './packetValidator.js';
import type { ClientMessage } from './types.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

const gymkhanaRoom = new GymkhanaRoom();

// Minimal HTTP server for health checks & WebSocket upgrade
const httpServer = createServer((req, res) => {
  if (req.url === '/health' || req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        uptime: process.uptime(),
        players: gymkhanaRoom.getPlayerCount(),
      })
    );
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OpenRally Multiplayer Dedicated Game Server\n');
});

const wss = new WebSocketServer({
  server: httpServer,
  // Accept any path beginning with /ws or root
});

wss.on('connection', (ws: WebSocket, req) => {
  const ip = req.socket.remoteAddress || 'unknown';
  console.log(`[Server] New WebSocket connection established from ${ip}`);

  let activePlayerId: string | null = null;

  ws.on('message', (data: Buffer | string) => {
    try {
      const text = typeof data === 'string' ? data : data.toString('utf-8');
      const raw = JSON.parse(text);
      const msg: ClientMessage | null = parseClientMessage(raw);
      if (!msg) return;

      switch (msg.type) {
        case 'join_lobby': {
          const session = gymkhanaRoom.join(ws, msg.nickname, msg.vehicleId);
          if (session) {
            activePlayerId = session.id;
          }
          break;
        }

        case 'leave_lobby': {
          if (activePlayerId) {
            gymkhanaRoom.leave(activePlayerId, 'user_requested');
            activePlayerId = null;
          }
          break;
        }

        case 'telemetry': {
          if (activePlayerId) {
            gymkhanaRoom.handleTelemetry(activePlayerId, msg.payload);
          }
          break;
        }

        case 'ping': {
          if (activePlayerId) {
            gymkhanaRoom.handlePing(activePlayerId, msg.clientTime);
          }
          break;
        }
      }
    } catch (err) {
      console.warn('[Server] Error handling packet:', err);
    }
  });

  ws.on('close', (code, reason) => {
    if (activePlayerId) {
      gymkhanaRoom.leave(activePlayerId, `ws_close_${code}`);
      activePlayerId = null;
    }
  });

  ws.on('error', (err) => {
    console.warn(`[Server] Client error from ${ip}:`, err);
    if (activePlayerId) {
      gymkhanaRoom.leave(activePlayerId, 'ws_error');
      activePlayerId = null;
    }
  });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`[OpenRally] Multiplayer Relay Server running on http://${HOST}:${PORT}`);
  console.log(`[OpenRally] WebSocket endpoint active at ws://${HOST}:${PORT}/ws`);
});

function handleShutdown(): void {
  console.log('[OpenRally] Shutting down server...');
  gymkhanaRoom.destroy();
  wss.close(() => {
    httpServer.close(() => {
      console.log('[OpenRally] Server closed gracefully.');
      process.exit(0);
    });
  });
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
