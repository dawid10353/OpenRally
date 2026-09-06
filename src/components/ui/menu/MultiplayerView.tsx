import { menuStyles, getFocusStyle } from './menuStyles';
import type { MenuView } from './types';

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
  return (
    <div
      className="multiplayer-subview menu-scalable-container"
      style={{ ...menuStyles.subView, color: textColor, width: '100%', minWidth: '540px', maxWidth: '880px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h2 style={{ ...menuStyles.subViewTitle, margin: 0 }}>Multiplayer</h2>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            color: '#38BDF8',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '1px',
          }}
        >
          COMING SOON // STAGE 4+
        </span>
      </div>

      <p style={{ ...menuStyles.subtitle, color: '#94A3B8', margin: '0 0 16px 0', fontSize: '13px' }}>
        Compete against drivers worldwide or race head-to-head on the same screen. Multiplayer modes are currently in active development.
      </p>

      {/* 2-Column Mode Cards: Online vs Local */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', width: '100%' }}>
        {/* Card 1: Online Multiplayer */}
        <div
          style={{
            ...menuStyles.modeCard,
            borderColor: 'rgba(56, 189, 248, 0.3)',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '1px',
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'rgba(56, 189, 248, 0.2)',
                color: '#38BDF8',
              }}
            >
              ONLINE MODE
            </span>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>WEB-RTC / SOCKET</span>
          </div>

          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#F1F5F9' }}>
            Online Lobbies & Matchmaking
          </h3>

          <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', lineHeight: 1.4, flex: 1 }}>
            Real-time peer-to-peer circuit races, ghost leaderboards, global asynchronous time-trials, and custom private rooms.
          </p>

          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: '#CBD5E1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <li>Real-time telemetry and car position sync</li>
            <li>Global daily rally championships & ghosts</li>
            <li>Custom stage conditions and vehicle restrictions</li>
          </ul>

          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px dashed rgba(56, 189, 248, 0.4)',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 700,
              color: '#38BDF8',
              letterSpacing: '0.5px',
              marginTop: '6px',
            }}
          >
            🔒 ONLINE MULTIPLAYER (IN DEVELOPMENT)
          </div>
        </div>

        {/* Card 2: Local Multiplayer */}
        <div
          style={{
            ...menuStyles.modeCard,
            borderColor: 'rgba(245, 158, 11, 0.3)',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '1px',
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#F59E0B',
              }}
            >
              LOCAL MODE
            </span>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>SAME DEVICE / LAN</span>
          </div>

          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#F1F5F9' }}>
            Split-Screen & Local Play
          </h3>

          <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', lineHeight: 1.4, flex: 1 }}>
            Head-to-head split screen with dual gamepads or pass-and-play hotseat time attack against family and friends.
          </p>

          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: '#CBD5E1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <li>2-Player horizontal split-screen display</li>
            <li>Dual controller support (DualSense / Xbox)</li>
            <li>Local ghost comparison & hotseat challenge</li>
          </ul>

          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px dashed rgba(245, 158, 11, 0.4)',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 700,
              color: '#F59E0B',
              letterSpacing: '0.5px',
              marginTop: '6px',
            }}
          >
            🔒 LOCAL MULTIPLAYER (IN DEVELOPMENT)
          </div>
        </div>
      </div>

      {/* Info notice */}
      <div
        style={{
          marginTop: '16px',
          padding: '10px 14px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <span style={{ fontSize: '14px' }}>ℹ️</span>
        <span style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.3 }}>
          Multiplayer networking architecture is scheduled for <strong>Stage 4+</strong> of the OpenRally engine roadmap. Single-player Time Attack and Free Roam modes are fully available now.
        </span>
      </div>

      {/* Back Button */}
      <button
        type="button"
        style={{
          ...menuStyles.button,
          ...menuStyles.secondaryButton,
          color: textColor,
          borderColor: 'rgba(255, 255, 255, 0.12)',
          marginTop: '16px',
          width: '100%',
          minHeight: '44px',
          justifyContent: 'center',
          fontWeight: 700,
          ...getFocusStyle(focusedIndex === 0),
        }}
        onPointerMove={(e) => onPointerMoveItem(0, e)}
        onClick={() => onSelectView('main')}
      >
        Back to Main Menu
      </button>
    </div>
  );
}
