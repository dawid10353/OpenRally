import { useState, useEffect } from 'react';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { useGameStore } from '@/store/gameStore';

export function MultiplayerHUD() {
  const [expanded, setExpanded] = useState(false);
  const status = useMultiplayerStore((s) => s.status);
  const ping = useMultiplayerStore((s) => s.ping);
  const remotePlayers = useMultiplayerStore((s) => s.remotePlayers);
  const nickname = useMultiplayerStore((s) => s.nickname);
  const selfId = useMultiplayerStore((s) => s.selfId);
  const gameState = useGameStore((s) => s.gameState);

  // Toggle expanded roster with Tab key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
        <span>GYMKHANA ARENA</span>
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

      {/* Expanded Driver Roster */}
      {expanded && (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '8px',
            padding: '10px',
            minWidth: '220px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
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
              marginBottom: '2px',
            }}
          >
            ACTIVE DRIVERS IN ARENA
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
            <span style={{ fontSize: '10px', color: '#64748B' }}>Host</span>
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
        </div>
      )}
    </div>
  );
}
