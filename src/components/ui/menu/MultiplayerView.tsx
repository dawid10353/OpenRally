import { useState, useEffect } from 'react';
import { menuStyles, getFocusStyle } from './menuStyles';
import type { MenuView } from './types';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { useGameStore } from '@/store/gameStore';
import { networkClient } from '@/network/networkClient';
import { getVehiclePreset } from '@/config/vehicleRegistry';
import { unlockSharedAudioContext } from '@/utils/audio/audioContext';

interface MultiplayerViewProps {
  focusedIndex: number;
  textColor: string;
  onPointerMoveItem: (index: number, e: React.PointerEvent) => void;
  onSelectView: (view: MenuView) => void;
}

const AVAILABLE_VEHICLES = ['rally_hatchback', 'rally_wrc'] as const;

export function MultiplayerView({
  focusedIndex,
  textColor,
  onPointerMoveItem,
  onSelectView,
}: MultiplayerViewProps) {
  const nickname = useMultiplayerStore((s) => s.nickname);
  const setNickname = useMultiplayerStore((s) => s.setNickname);
  const status = useMultiplayerStore((s) => s.status);
  const ping = useMultiplayerStore((s) => s.ping);
  const remotePlayers = useMultiplayerStore((s) => s.remotePlayers);
  const selfId = useMultiplayerStore((s) => s.selfId);
  const error = useMultiplayerStore((s) => s.error);

  const selectedVehicleId = useGameStore((s) => s.selectedVehicleId);
  const setSelectedVehicleId = useGameStore((s) => s.setSelectedVehicleId);
  const setSelectedLevelId = useGameStore((s) => s.setSelectedLevelId);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const setGameState = useGameStore((s) => s.setGameState);

  const [inputNick, setInputNick] = useState(nickname);

  // Connect to server on lobby view open to fetch active driver count
  useEffect(() => {
    networkClient.connect();
  }, []);

  const handleNickChange = (val: string) => {
    const clean = val.slice(0, 16);
    setInputNick(clean);
    setNickname(clean);
  };

  const handleJoinArena = () => {
    const finalNick = inputNick.trim() || nickname || 'Apex_Driver';
    setNickname(finalNick);

    // Set level to Gymkhana and mode to Free Roam
    setSelectedLevelId('level5_gymkhana');
    setGameMode('freeroam');

    // Notify relay server
    networkClient.joinLobby(finalNick, selectedVehicleId, 'level5_gymkhana');

    // Transition to gameplay
    unlockSharedAudioContext().catch(() => {});
    setGameState('playing');
    onSelectView('main');
  };

  const playersList = Object.values(remotePlayers);
  const currentPreset = getVehiclePreset(selectedVehicleId);

  return (
    <div
      className="multiplayer-subview menu-scalable-container"
      style={{
        ...menuStyles.subView,
        color: textColor,
        width: '100%',
        minWidth: '540px',
        maxWidth: '880px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h2 style={{ ...menuStyles.subViewTitle, margin: 0 }}>Multiplayer Arena</h2>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#38BDF8',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '1px',
          }}
        >
          ONLINE // GYMKHANA FREE ROAM
        </span>
      </div>

      <p style={{ ...menuStyles.subtitle, color: '#94A3B8', margin: '0 0 16px 0', fontSize: '13px' }}>
        Join real-time free roam sessions on the Apex Gymkhana Arena with other drivers. Drift together, practice donuts, and test setups with zero input lag.
      </p>

      {/* Grid: Player Profile & Room Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', width: '100%' }}>
        {/* Card 1: Driver Configuration */}
        <div
          style={{
            ...menuStyles.modeCard,
            borderColor: 'rgba(56, 189, 248, 0.3)',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(15, 23, 42, 0.7) 100%)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#38BDF8', letterSpacing: '1px' }}>
            DRIVER PROFILE
          </div>

          {/* Nickname Input */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
              Nickname:
            </label>
            <input
              type="text"
              maxLength={16}
              value={inputNick}
              onChange={(e) => handleNickChange(e.target.value)}
              placeholder="Enter driver callsign..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#F8FAFC',
                fontSize: '14px',
                fontWeight: 600,
                outline: 'none',
              }}
            />
          </div>

          {/* Vehicle Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
              Selected Vehicle:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {AVAILABLE_VEHICLES.map((vId) => {
                const isSelected = selectedVehicleId === vId;
                const preset = getVehiclePreset(vId);
                return (
                  <button
                    key={vId}
                    type="button"
                    onClick={() => setSelectedVehicleId(vId)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(0, 0, 0, 0.3)',
                      border: isSelected ? '1px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: isSelected ? '#38BDF8' : '#94A3B8',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ fontSize: '11px', color: '#64748B' }}>
            Spec: {currentPreset.stats.driveType} • {currentPreset.config.chassisMass} kg • Top: {currentPreset.config.engine.maxSpeed} km/h
          </div>
        </div>

        {/* Card 2: Arena Room Status & Drivers */}
        <div
          style={{
            ...menuStyles.modeCard,
            borderColor: 'rgba(56, 189, 248, 0.3)',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.05) 0%, rgba(15, 23, 42, 0.7) 100%)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#38BDF8', letterSpacing: '1px' }}>
              ARENA STATUS
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: status === 'disconnected' ? '#F87171' : '#34D399',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: status === 'disconnected' ? '#F87171' : '#34D399',
                }}
              />
              {status === 'disconnected' ? 'Offline' : `Connected (${ping} ms)`}
            </span>
          </div>

          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>Apex Gymkhana Arena</div>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>Map: level5_gymkhana • Mode: Free Roam</div>
          </div>

          {/* Drivers List */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#CBD5E1', marginBottom: '6px' }}>
              Drivers in Arena ({playersList.length}/12):
            </div>
            <div
              style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                padding: '8px',
                maxHeight: '110px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              {playersList.length === 0 ? (
                <div style={{ fontSize: '11px', color: '#64748B', fontStyle: 'italic', textAlign: 'center', padding: '12px' }}>
                  Arena empty. Be the first driver to enter!
                </div>
              ) : (
                playersList.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: p.id === selfId ? '#38BDF8' : '#E2E8F0',
                      padding: '2px 4px',
                    }}
                  >
                    <span>{p.nickname} {p.id === selfId && '(You)'}</span>
                    <span style={{ color: '#64748B' }}>{p.vehicleId}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px 12px',
            borderRadius: '6px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#F87171',
            fontSize: '12px',
          }}
        >
          {error}
        </div>
      )}

      {/* Primary Action: Join Arena */}
      <button
        type="button"
        style={{
          ...menuStyles.button,
          background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
          color: '#FFFFFF',
          borderColor: '#38BDF8',
          boxShadow: '0 0 16px rgba(56, 189, 248, 0.35)',
          marginTop: '16px',
          width: '100%',
          minHeight: '48px',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '14px',
          letterSpacing: '0.5px',
          ...getFocusStyle(focusedIndex === 0),
        }}
        onPointerMove={(e) => onPointerMoveItem(0, e)}
        onClick={handleJoinArena}
      >
        🏎️ ENTER GYMKHANA FREE ROAM
      </button>

      {/* Back Button */}
      <button
        type="button"
        style={{
          ...menuStyles.button,
          ...menuStyles.secondaryButton,
          color: textColor,
          borderColor: 'rgba(255, 255, 255, 0.12)',
          marginTop: '8px',
          width: '100%',
          minHeight: '40px',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: '13px',
          ...getFocusStyle(focusedIndex === 1),
        }}
        onPointerMove={(e) => onPointerMoveItem(1, e)}
        onClick={() => onSelectView('main')}
      >
        Back to Main Menu
      </button>
    </div>
  );
}
