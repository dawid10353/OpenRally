import { useState, useEffect } from 'react';
import { menuStyles, getFocusStyle } from './menuStyles';
import type { MenuView } from './types';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { useGameStore } from '@/store/gameStore';
import { networkClient } from '@/network/networkClient';
import { getAvailableVehicles, getVehiclePreset } from '@/config/vehicleRegistry';
import { unlockSharedAudioContext } from '@/utils/audio/audioContext';
import type { RoomSummary } from '@/types/network';

interface MultiplayerViewProps {
  focusedIndex: number;
  textColor: string;
  onPointerMoveItem: (index: number, e: React.PointerEvent) => void;
  onSelectView: (view: MenuView) => void;
}

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
  const rooms = useMultiplayerStore((s) => s.rooms);
  const selfId = useMultiplayerStore((s) => s.selfId);
  const error = useMultiplayerStore((s) => s.error);

  const selectedVehicleId = useGameStore((s) => s.selectedVehicleId);
  const setSelectedVehicleId = useGameStore((s) => s.setSelectedVehicleId);
  const setSelectedLevelId = useGameStore((s) => s.setSelectedLevelId);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const setGameState = useGameStore((s) => s.setGameState);

  const [inputNick, setInputNick] = useState(nickname);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Available roster of all 7 championship vehicles
  const vehicles = getAvailableVehicles();

  // Connect to relay server on view mount to fetch live rooms
  useEffect(() => {
    networkClient.connect();
    networkClient.requestRooms();
  }, []);

  const handleNickChange = (val: string) => {
    const clean = val.slice(0, 16);
    setInputNick(clean);
    setNickname(clean);
  };

  const getEffectiveNickname = () => {
    return inputNick.trim() || nickname || 'Apex_Driver';
  };

  const handleJoinRoom = (roomId: string) => {
    const finalNick = getEffectiveNickname();
    setNickname(finalNick);

    setSelectedLevelId('level5_gymkhana');
    setGameMode('freeroam');

    networkClient.joinRoom(roomId, finalNick, selectedVehicleId);

    unlockSharedAudioContext().catch(() => {});
    setGameState('playing');
    onSelectView('main');
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newRoomName.trim();
    if (trimmed.length < 2 || trimmed.length > 24) {
      setCreateError('Room name must be between 2 and 24 characters.');
      return;
    }

    const finalNick = getEffectiveNickname();
    setNickname(finalNick);

    setSelectedLevelId('level5_gymkhana');
    setGameMode('freeroam');

    networkClient.createRoom(trimmed, finalNick, selectedVehicleId, 'level5_gymkhana');

    unlockSharedAudioContext().catch(() => {});
    setGameState('playing');
    onSelectView('main');
  };

  const handleDeleteRoom = (room: RoomSummary) => {
    if (window.confirm(`Are you sure you want to delete room "${room.name}"?`)) {
      networkClient.deleteRoom(room.id);
    }
  };

  const currentPreset = getVehiclePreset(selectedVehicleId);

  return (
    <div
      className="multiplayer-subview menu-scalable-container"
      style={{
        ...menuStyles.subView,
        color: textColor,
        width: '100%',
        minWidth: '560px',
        maxWidth: '960px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h2 style={{ ...menuStyles.subViewTitle, margin: 0 }}>Multiplayer Lobby & Rooms</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              background: status === 'disconnected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
              border: `1px solid ${status === 'disconnected' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`,
              color: status === 'disconnected' ? '#F87171' : '#38BDF8',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '1px',
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
            {status === 'disconnected' ? 'OFFLINE' : `ONLINE (${ping} MS)`}
          </span>
          <button
            type="button"
            onClick={() => networkClient.requestRooms()}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: '#94A3B8',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="Refresh rooms list"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <p style={{ ...menuStyles.subtitle, color: '#94A3B8', margin: '0 0 16px 0', fontSize: '13px' }}>
        Create custom rooms or join active lobbies. Drive any vehicle from the championship fleet with zero input lag.
      </p>

      {/* Driver Profile Bar */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '10px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        <div style={{ flex: '0 0 auto', fontSize: '11px', fontWeight: 800, color: '#38BDF8', letterSpacing: '1px' }}>
          DRIVER CALLSIGN:
        </div>
        <div style={{ flex: 1, maxWidth: '280px' }}>
          <input
            type="text"
            maxLength={16}
            value={inputNick}
            onChange={(e) => handleNickChange(e.target.value)}
            placeholder="Enter callsig..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '6px',
              padding: '8px 12px',
              color: '#F8FAFC',
              fontSize: '13px',
              fontWeight: 600,
              outline: 'none',
            }}
          />
        </div>
        <div style={{ flex: 1, fontSize: '11px', color: '#94A3B8' }}>
          Selected: <strong style={{ color: '#38BDF8' }}>{currentPreset.name}</strong> ({currentPreset.stats.driveType}, {currentPreset.config.engine.maxSpeed} km/h)
        </div>
      </div>

      {/* Grid: All 7 Vehicles Selector & Room Browser */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: '16px', width: '100%', marginBottom: '16px' }}>
        {/* Left Column: All 7 Vehicles Selector */}
        <div
          style={{
            ...menuStyles.modeCard,
            borderColor: 'rgba(56, 189, 248, 0.3)',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.05) 0%, rgba(15, 23, 42, 0.7) 100%)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#38BDF8', letterSpacing: '1px' }}>
              CHAMPIONSHIP ROSTER (7 CARS)
            </span>
            <span style={{ fontSize: '10px', color: '#64748B' }}>SELECT VEHICLE</span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              maxHeight: '260px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {vehicles.map((v) => {
              const isSelected = selectedVehicleId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVehicleId(v.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(56, 189, 248, 0.22)' : 'rgba(0, 0, 0, 0.3)',
                    border: isSelected ? '1px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? '#38BDF8' : '#F8FAFC' }}>
                      {v.name}
                    </div>
                    <div style={{ fontSize: '10px', color: isSelected ? '#BAE6FD' : '#64748B' }}>
                      {v.category.toUpperCase()} • {v.config.chassisMass} kg
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: isSelected ? '#0284C7' : 'rgba(255, 255, 255, 0.08)',
                        color: isSelected ? '#FFFFFF' : '#94A3B8',
                      }}
                    >
                      {v.stats.driveType}
                    </span>
                    <span style={{ fontSize: '10px', color: '#94A3B8' }}>{v.config.engine.maxSpeed} km/h</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Room Browser & Creator */}
        <div
          style={{
            ...menuStyles.modeCard,
            borderColor: 'rgba(56, 189, 248, 0.3)',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.05) 0%, rgba(15, 23, 42, 0.7) 100%)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#38BDF8', letterSpacing: '1px' }}>
              ACTIVE ROOMS ({rooms.length})
            </span>
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(!showCreateModal);
                setNewRoomName(`${getEffectiveNickname()}'s Club`);
                setCreateError(null);
              }}
              style={{
                background: showCreateModal ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                border: `1px solid ${showCreateModal ? '#F87171' : '#38BDF8'}`,
                borderRadius: '6px',
                color: '#FFFFFF',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {showCreateModal ? '✖ Cancel' : '➕ Create Room'}
            </button>
          </div>

          {/* Inline Create Room Form */}
          {showCreateModal && (
            <form
              onSubmit={handleCreateRoom}
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: '8px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#38BDF8' }}>
                New Custom Room Configuration:
              </div>
              <input
                type="text"
                maxLength={24}
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Enter room name (e.g. Tandem Practice)..."
                autoFocus
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  color: '#F8FAFC',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              {createError && (
                <div style={{ color: '#F87171', fontSize: '10px', fontWeight: 600 }}>{createError}</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    border: '1px solid #34D399',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  🚀 Create & Join as Host
                </button>
              </div>
            </form>
          )}

          {/* Rooms List */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              maxHeight: showCreateModal ? '150px' : '260px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {rooms.length === 0 ? (
              <div
                style={{
                  fontSize: '11px',
                  color: '#64748B',
                  textAlign: 'center',
                  padding: '24px 8px',
                  fontStyle: 'italic',
                }}
              >
                No active rooms found. Connecting to relay server...
              </div>
            ) : (
              rooms.map((r) => {
                const isUserHost = selfId && r.hostId === selfId;
                return (
                  <div
                    key={r.id}
                    style={{
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: r.isPersistent ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#F8FAFC' }}>
                          {r.name}
                        </span>
                        {r.isPersistent ? (
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'rgba(56, 189, 248, 0.2)',
                              color: '#38BDF8',
                              border: '1px solid rgba(56, 189, 248, 0.4)',
                            }}
                          >
                            OFFICIAL
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'rgba(168, 85, 247, 0.2)',
                              color: '#C084FC',
                              border: '1px solid rgba(168, 85, 247, 0.4)',
                            }}
                          >
                            CUSTOM
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>
                        Host: <strong style={{ color: '#CBD5E1' }}>{r.hostNickname}</strong> • Drivers: {r.playerCount}/{r.maxPlayers}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {/* Delete button only if user is host and room is not official */}
                      {isUserHost && !r.isPersistent && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRoom(r)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.5)',
                            borderRadius: '6px',
                            color: '#F87171',
                            padding: '6px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                          title="Delete this room"
                        >
                          🗑️
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleJoinRoom(r.id)}
                        style={{
                          background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                          border: '1px solid #38BDF8',
                          borderRadius: '6px',
                          color: '#FFFFFF',
                          padding: '6px 14px',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          letterSpacing: '0.5px',
                        }}
                      >
                        JOIN
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: '12px',
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

      {/* Quick Play Action: Join Official Free Roam */}
      <button
        type="button"
        style={{
          ...menuStyles.button,
          background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
          color: '#FFFFFF',
          borderColor: '#38BDF8',
          boxShadow: '0 0 16px rgba(56, 189, 248, 0.35)',
          width: '100%',
          minHeight: '44px',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '13px',
          letterSpacing: '0.5px',
          ...getFocusStyle(focusedIndex === 0),
        }}
        onPointerMove={(e) => onPointerMoveItem(0, e)}
        onClick={() => handleJoinRoom('gymkhana_freeroam')}
      >
        🏎️ QUICK PLAY: ENTER APEX ARENA (OFFICIAL)
      </button>

      {/* Back to Main Menu Button */}
      <button
        type="button"
        style={{
          ...menuStyles.button,
          ...menuStyles.secondaryButton,
          color: textColor,
          borderColor: 'rgba(255, 255, 255, 0.12)',
          marginTop: '8px',
          width: '100%',
          minHeight: '38px',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: '12px',
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
