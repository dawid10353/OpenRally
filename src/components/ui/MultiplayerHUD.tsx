import { useState, useEffect } from 'react';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { useGameStore } from '@/store/gameStore';
import { networkClient } from '@/network/networkClient';
import { isTextEditingActive } from '@/utils/input/textInput';

export function MultiplayerHUD() {
  const [expanded, setExpanded] = useState(false);
  const status = useMultiplayerStore((s) => s.status);
  const ping = useMultiplayerStore((s) => s.ping);
  const remotePlayers = useMultiplayerStore((s) => s.remotePlayers);
  const nickname = useMultiplayerStore((s) => s.nickname);
  const selfId = useMultiplayerStore((s) => s.selfId);
  const currentRoom = useMultiplayerStore((s) => s.currentRoom);
  const isHost = useMultiplayerStore((s) => s.isHost);
  const gameState = useGameStore((s) => s.gameState);
  const setGameState = useGameStore((s) => s.setGameState);

  // Toggle expanded roster with Tab key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTextEditingActive(e)) return;
      if (e.code === 'Tab') {
        e.preventDefault();
        setExpanded((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (status === 'disconnected' || gameState !== 'playing') {
    return null;
  }

  const allPlayers = Object.values(remotePlayers);
  const totalCount = allPlayers.length;

  const getPingColor = (p: number) => {
    if (p < 60) return '#34D399';
    if (p < 120) return '#FBBF24';
    return '#F87171';
  };

  const handleLeaveSession = () => {
    if (currentRoom) {
      networkClient.leaveRoom(currentRoom.id);
    }
    setGameState('menu');
  };

  const handleDeleteSession = () => {
    if (currentRoom && isHost) {
      networkClient.deleteRoom(currentRoom.id);
      setGameState('menu');
    }
  };

  const roomDisplayName = currentRoom ? currentRoom.name.toUpperCase() : 'GYMKHANA ARENA';

  return (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
        fontFamily: 'Inter, system-ui, sans-serif',
        userSelect: 'none',
      }}
    >
      {/* Top Status Bar */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '8px',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#F8FAFC',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: status === 'in_game' || status === 'in_lobby' ? '#38BDF8' : '#F59E0B',
            boxShadow: `0 0 8px ${status === 'in_game' || status === 'in_lobby' ? '#38BDF8' : '#F59E0B'}`,
          }}
        />
        <span>{roomDisplayName}</span>
        {isHost && (
          <span
            style={{
              padding: '1px 5px',
              borderRadius: '4px',
              background: '#F59E0B',
              color: '#000',
              fontSize: '9px',
              fontWeight: 900,
              letterSpacing: '0.5px',
            }}
          >
            HOST
          </span>
        )}
        <span style={{ color: '#94A3B8', fontSize: '11px' }}>
          {totalCount} {totalCount === 1 ? 'driver' : 'drivers'}
        </span>
        <span
          style={{
            fontSize: '11px',
            color: getPingColor(ping),
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'rgba(0,0,0,0.3)',
          }}
        >
          {ping} ms
        </span>
        <span style={{ fontSize: '10px', color: '#64748B' }}>
          {expanded ? '▲' : '▼ (TAB)'}
        </span>
      </div>

      {/* Expanded Driver Roster & Host Actions */}
      {expanded && (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '8px',
            padding: '10px',
            minWidth: '240px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              fontWeight: 800,
              color: '#94A3B8',
              letterSpacing: '1px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              paddingBottom: '4px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>ACTIVE DRIVERS</span>
            <span>{totalCount}/12</span>
          </div>

          {/* Self */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              fontWeight: 600,
              color: '#38BDF8',
              padding: '4px 6px',
              borderRadius: '4px',
              background: 'rgba(56, 189, 248, 0.1)',
            }}
          >
            <span>{nickname} (You)</span>
            <span style={{ fontSize: '10px', color: isHost ? '#F59E0B' : '#64748B', fontWeight: 700 }}>
              {isHost ? '★ Host' : 'Driver'}
            </span>
          </div>

          {/* Peers */}
          {allPlayers
            .filter((p) => p.id !== selfId)
            .map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  color: '#E2E8F0',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <span>{p.nickname}</span>
                <span style={{ fontSize: '10px', color: '#94A3B8' }}>{p.vehicleId}</span>
              </div>
            ))}

          {/* Room Controls */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              type="button"
              onClick={handleLeaveSession}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#CBD5E1',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Leave Room
            </button>
            {isHost && !currentRoom?.isPersistent && (
              <button
                type="button"
                onClick={handleDeleteSession}
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  color: '#F87171',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Delete Room
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
