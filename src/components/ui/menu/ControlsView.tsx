import { menuStyles, getFocusStyle } from './menuStyles';
import type { ControlsTab, MenuView } from './types';

interface ControlsViewProps {
  gamepadConnected: boolean;
  gamepadName: string;
  gamepadType: 'xbox' | 'dualsense' | 'generic';
  controlsTab: ControlsTab;
  focusedIndex: number;
  textColor: string;
  onPointerMoveItem: (index: number, e: React.PointerEvent) => void;
  onSetControlsTab: (tab: ControlsTab) => void;
  onSelectView: (view: MenuView) => void;
}

export function ControlsView({
  gamepadConnected,
  gamepadName,
  gamepadType,
  controlsTab,
  focusedIndex,
  textColor,
  onPointerMoveItem,
  onSetControlsTab,
  onSelectView,
}: ControlsViewProps) {
  return (
    <div style={{ ...menuStyles.subView, color: textColor }}>
      <h2 style={menuStyles.subViewTitle}>Controls</h2>

      {/* Gamepad Status Banner */}
      <div style={{
        ...menuStyles.gamepadStatusBanner,
        background: gamepadConnected 
          ? (gamepadType === 'dualsense' ? 'rgba(0, 112, 209, 0.15)' : 'rgba(16, 185, 129, 0.15)')
          : 'rgba(255, 255, 255, 0.05)',
        border: gamepadConnected 
          ? (gamepadType === 'dualsense' ? '1px solid rgba(0, 112, 209, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)')
          : '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: gamepadConnected 
            ? (gamepadType === 'dualsense' ? '#0070d1' : '#10b981')
            : '#888888',
          boxShadow: gamepadConnected 
            ? (gamepadType === 'dualsense' ? '0 0 8px #0070d1' : '0 0 8px #10b981')
            : 'none',
        }} />
        <span style={{ fontSize: '13px', fontWeight: 600 }}>
          {gamepadConnected
            ? (gamepadType === 'dualsense'
                ? `🎮 DualSense (PS5) Connected: ${gamepadName || 'Sony DualSense'}`
                : `🎮 Xbox Controller Connected: ${gamepadName || 'XInput Controller'}`)
            : '🎮 No Active Controller — Press any button on your gamepad to connect!'}
        </span>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '6px', width: '100%', marginBottom: '8px' }}>
        <button
          style={{
            ...menuStyles.tabButton,
            flex: 1,
            padding: '8px 6px',
            fontSize: '12px',
            ...(controlsTab === 'dualsense' ? menuStyles.activeTabButton : {}),
          }}
          onClick={() => onSetControlsTab('dualsense')}
        >
          🎮 DualSense (PS5)
        </button>
        <button
          style={{
            ...menuStyles.tabButton,
            flex: 1,
            padding: '8px 6px',
            fontSize: '12px',
            ...(controlsTab === 'xbox' ? menuStyles.activeTabButton : {}),
          }}
          onClick={() => onSetControlsTab('xbox')}
        >
          🎮 Xbox
        </button>
        <button
          style={{
            ...menuStyles.tabButton,
            flex: 1,
            padding: '8px 6px',
            fontSize: '12px',
            ...(controlsTab === 'keyboard' ? menuStyles.activeTabButton : {}),
          }}
          onClick={() => onSetControlsTab('keyboard')}
        >
          ⌨️ Keyboard
        </button>
      </div>

      {controlsTab === 'dualsense' ? (
        <div style={{
          ...menuStyles.controlsHelp,
          background: 'rgba(0,0,0,0.05)',
          color: '#555555',
        }}>
          <div style={menuStyles.controlRow}>
            <strong>🕹️ Left Stick (L3)</strong>
            <span>Steering (Analog)</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong>🎥 Right Stick (R3)</strong>
            <span>Free Look Orbit Camera (360°)</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong>🏎️ R2 (Right Trigger)</strong>
            <span>Throttle / Gas (Analog)</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong>🛑 L2 (Left Trigger)</strong>
            <span>Brake / Reverse (Analog)</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong><span style={{ color: '#0070d1', fontWeight: 800 }}>✕</span> Cross / R1</strong>
            <span>Handbrake / Drift</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong><span style={{ color: '#4caf50', fontWeight: 800 }}>△</span> Triangle / L1</strong>
            <span>Change Camera Mode</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong><span style={{ color: '#e53935', fontWeight: 800 }}>◯</span> Circle / R3 Click</strong>
            <span>Look Back (Instant)</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong><span style={{ color: '#e91e63', fontWeight: 800 }}>▢</span> Square / Create</strong>
            <span>Reset Position</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong>⏸️ Options</strong>
            <span>Pause / Unpause</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong>📊 Create (Share) / L3</strong>
            <span>Toggle Telemetry</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong>🧭 D-Pad</strong>
            <span>Directional Controls</span>
          </div>
        </div>
      ) : controlsTab === 'xbox' ? (
        <div style={{
          ...menuStyles.controlsHelp,
          background: 'rgba(0,0,0,0.05)',
          color: '#555555',
        }}>
          <div style={menuStyles.controlRow}>
            <strong>🕹️ Left Stick (Analog)</strong>
            <span>Steering</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong>🎥 Right Stick (Analog)</strong>
            <span>Free Look Orbit Camera (360°)</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong>🏎️ RT (Right Trigger)</strong>
            <span>Throttle / Gas (Analog)</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong>🛑 LT (Left Trigger)</strong>
            <span>Brake / Reverse (Analog)</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong><span style={{ color: '#107c10', fontWeight: 800 }}>A</span> / RB</strong>
            <span>Handbrake / Drift</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong><span style={{ color: '#ffb900', fontWeight: 800 }}>Y</span> / LB</strong>
            <span>Change Camera Mode</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong><span style={{ color: '#d83b01', fontWeight: 800 }}>B</span> / RS Click</strong>
            <span>Look Back (Instant)</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong><span style={{ color: '#0078d7', fontWeight: 800 }}>X</span> / View</strong>
            <span>Reset Position</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong>⏸️ Menu (Start)</strong>
            <span>Pause / Unpause</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong>📊 View / LS Click</strong>
            <span>Toggle Telemetry</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong>🧭 D-Pad</strong>
            <span>Directional Controls</span>
          </div>
        </div>
      ) : (
        <div style={{
          ...menuStyles.controlsHelp,
          background: 'rgba(0,0,0,0.05)',
          color: '#555555',
        }}>
          <div style={menuStyles.controlRow}>
            <strong>WASD / Arrows</strong>
            <span>Steering & Gas / Brake</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong>Space</strong>
            <span>Handbrake</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong>C</strong>
            <span>Change Camera</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong>B</strong>
            <span>Look Back (Hold)</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong>T</strong>
            <span>Toggle Telemetry</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong>R</strong>
            <span>Reset Position</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong>ESC</strong>
            <span>Pause / Menu</span>
          </div>
        </div>
      )}

      <button 
        style={{ 
          ...menuStyles.button, 
          marginTop: '20px', 
          width: '100%',
          ...getFocusStyle(focusedIndex === 0),
        }} 
        onPointerMove={(e) => onPointerMoveItem(0, e)}
        onClick={() => onSelectView('main')}
      >
        Back
      </button>
    </div>
  );
}
