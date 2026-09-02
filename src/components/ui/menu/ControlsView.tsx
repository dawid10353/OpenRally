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
                ? `DualSense (PS5) Connected: ${gamepadName || 'Sony DualSense'}`
                : `Xbox Controller Connected: ${gamepadName || 'XInput Controller'}`)
            : 'No Active Controller — Press any button on your gamepad to connect'}
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
            fontWeight: 700,
            ...(controlsTab === 'dualsense' ? menuStyles.activeTabButton : {}),
          }}
          onClick={() => onSetControlsTab('dualsense')}
        >
          DualSense (PS5)
        </button>
        <button
          style={{
            ...menuStyles.tabButton,
            flex: 1,
            padding: '8px 6px',
            fontSize: '12px',
            fontWeight: 700,
            ...(controlsTab === 'xbox' ? menuStyles.activeTabButton : {}),
          }}
          onClick={() => onSetControlsTab('xbox')}
        >
          Xbox Controller
        </button>
        <button
          style={{
            ...menuStyles.tabButton,
            flex: 1,
            padding: '8px 6px',
            fontSize: '12px',
            fontWeight: 700,
            ...(controlsTab === 'keyboard' ? menuStyles.activeTabButton : {}),
          }}
          onClick={() => onSetControlsTab('keyboard')}
        >
          Keyboard
        </button>
      </div>

      {controlsTab === 'dualsense' ? (
        <div style={{
          ...menuStyles.controlsHelp,
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          color: '#CBD5E1',
        }}>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.badge}>L-STICK</span> Steering (Analog)
            </strong>
            <span style={{ color: '#94A3B8' }}>Left / Right</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.badge}>R-STICK</span> Free Look Orbit
            </strong>
            <span style={{ color: '#94A3B8' }}>360° Camera</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.badgeTrigger}>R2</span> Throttle / Gas
            </strong>
            <span style={{ color: '#94A3B8' }}>Progressive Analog</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.badgeTrigger}>L2</span> Brake / Reverse
            </strong>
            <span style={{ color: '#94A3B8' }}>Progressive Analog</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.psCross}>✕</span> Cross / R1
            </strong>
            <span style={{ color: '#94A3B8' }}>Handbrake / Drift</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.psTriangle}>▲</span> Triangle / L1
            </strong>
            <span style={{ color: '#94A3B8' }}>Cycle Camera</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.psCircle}>●</span> Circle / R3
            </strong>
            <span style={{ color: '#94A3B8' }}>Look Back (Instant)</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.psSquare}>■</span> Square / Create
            </strong>
            <span style={{ color: '#94A3B8' }}>Reset Vehicle</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.badge}>OPTIONS</span> Pause
            </strong>
            <span style={{ color: '#94A3B8' }}>Toggle Menu</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.badge}>SHARE / L3</span> Telemetry
            </strong>
            <span style={{ color: '#94A3B8' }}>Toggle Inspector</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.badge}>D-PAD</span> Navigation
            </strong>
            <span style={{ color: '#94A3B8' }}>Menu Controls</span>
          </div>
        </div>
      ) : controlsTab === 'xbox' ? (
        <div style={{
          ...menuStyles.controlsHelp,
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          color: '#CBD5E1',
        }}>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.badge}>LS</span> Steering
            </strong>
            <span style={{ color: '#94A3B8' }}>Analog Left / Right</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.badge}>RS</span> Free Look Orbit
            </strong>
            <span style={{ color: '#94A3B8' }}>360° Camera</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.badgeTrigger}>RT</span> Throttle / Gas
            </strong>
            <span style={{ color: '#94A3B8' }}>Progressive Analog</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.badgeTrigger}>LT</span> Brake / Reverse
            </strong>
            <span style={{ color: '#94A3B8' }}>Progressive Analog</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.xboxA}>A</span> / RB
            </strong>
            <span style={{ color: '#94A3B8' }}>Handbrake / Drift</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.xboxY}>Y</span> / LB
            </strong>
            <span style={{ color: '#94A3B8' }}>Cycle Camera</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.xboxB}>B</span> / RS Click
            </strong>
            <span style={{ color: '#94A3B8' }}>Look Back (Instant)</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.xboxX}>X</span> / View
            </strong>
            <span style={{ color: '#94A3B8' }}>Reset Vehicle</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.badge}>MENU</span> Pause
            </strong>
            <span style={{ color: '#94A3B8' }}>Toggle Menu</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.badge}>VIEW / LS</span> Telemetry
            </strong>
            <span style={{ color: '#94A3B8' }}>Toggle Inspector</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.badge}>D-PAD</span> Navigation
            </strong>
            <span style={{ color: '#94A3B8' }}>Menu Controls</span>
          </div>
        </div>
      ) : (
        <div style={{
          ...menuStyles.controlsHelp,
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          color: '#CBD5E1',
        }}>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <kbd style={styles.kbd}>W</kbd>
              <kbd style={styles.kbd}>A</kbd>
              <kbd style={styles.kbd}>S</kbd>
              <kbd style={styles.kbd}>D</kbd>
              <span style={{ color: '#64748B', margin: '0 4px' }}>or</span>
              <kbd style={styles.kbd}>ARROWS</kbd>
            </strong>
            <span style={{ color: '#94A3B8' }}>Steer, Throttle & Brake</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <kbd style={styles.kbd}>SPACE</kbd>
            </strong>
            <span style={{ color: '#94A3B8' }}>Handbrake / Drift</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <kbd style={styles.kbd}>C</kbd>
            </strong>
            <span style={{ color: '#94A3B8' }}>Cycle Camera Mode</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <kbd style={styles.kbd}>B</kbd>
            </strong>
            <span style={{ color: '#94A3B8' }}>Look Back (Hold)</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <kbd style={styles.kbd}>T</kbd>
            </strong>
            <span style={{ color: '#94A3B8' }}>Toggle Telemetry</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <kbd style={styles.kbd}>R</kbd>
            </strong>
            <span style={{ color: '#94A3B8' }}>Reset Vehicle Position</span>
          </div>
          <div style={menuStyles.controlRow}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <kbd style={styles.kbd}>ESC</kbd>
            </strong>
            <span style={{ color: '#94A3B8' }}>Pause / Menu</span>
          </div>
        </div>
      )}

      <button 
        style={{ 
          ...menuStyles.button, 
          ...menuStyles.secondaryButton,
          color: textColor,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          marginTop: '20px', 
          width: '100%',
          justifyContent: 'center',
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

const styles: Record<string, React.CSSProperties> = {
  badge: {
    padding: '2px 8px',
    borderRadius: '4px',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    color: '#E2E8F0',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.5px',
  },
  badgeTrigger: {
    padding: '2px 8px',
    borderRadius: '4px',
    background: 'rgba(227, 24, 55, 0.15)',
    border: '1px solid rgba(227, 24, 55, 0.4)',
    color: '#F87171',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.5px',
  },
  psCross: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#0070D1',
    color: '#FFFFFF',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 900,
  },
  psTriangle: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#10B981',
    color: '#FFFFFF',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '9px',
    fontWeight: 900,
  },
  psCircle: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#EF4444',
    color: '#FFFFFF',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '9px',
    fontWeight: 900,
  },
  psSquare: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#EC4899',
    color: '#FFFFFF',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '9px',
    fontWeight: 900,
  },
  xboxA: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#107C10',
    color: '#FFFFFF',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 900,
  },
  xboxB: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#D83B01',
    color: '#FFFFFF',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 900,
  },
  xboxX: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#0078D7',
    color: '#FFFFFF',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 900,
  },
  xboxY: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#FFB900',
    color: '#000000',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 900,
  },
  kbd: {
    display: 'inline-block',
    padding: '3px 8px',
    fontSize: '11px',
    fontWeight: 800,
    lineHeight: '1',
    color: '#E2E8F0',
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '4px',
    boxShadow: '0 2px 0 #0F172A',
    fontFamily: 'monospace',
  },
};
