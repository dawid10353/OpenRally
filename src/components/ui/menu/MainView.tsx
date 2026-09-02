import { menuStyles, getFocusStyle } from './menuStyles';
import type { MenuView } from './types';

interface MainViewProps {
  isPause: boolean;
  focusedIndex: number;
  textColor: string;
  onPointerMoveItem: (index: number, e: React.PointerEvent) => void;
  onSelectView: (view: MenuView) => void;
  onResume: () => void;
  onReset: () => void;
  onReturnToMainMenu: () => void;
  onOpenGarage: () => void;
}

export function MainView({
  isPause,
  focusedIndex,
  textColor,
  onPointerMoveItem,
  onSelectView,
  onResume,
  onReset,
  onReturnToMainMenu,
  onOpenGarage,
}: MainViewProps) {
  return (
    <div style={menuStyles.buttonGroup}>
      {isPause ? (
        <>
          <button
            style={{
              ...menuStyles.button,
              ...(focusedIndex === 0 ? menuStyles.primaryButton : menuStyles.secondaryButton),
              color: focusedIndex === 0 ? '#FFFFFF' : textColor,
              ...getFocusStyle(focusedIndex === 0),
            }}
            onPointerMove={(e) => onPointerMoveItem(0, e)}
            onClick={onResume}
          >
            <div style={styles.buttonContent}>
              <span style={styles.indexTag}>01 //</span>
              <div style={styles.textCol}>
                <span style={styles.buttonLabel}>RESUME STAGE</span>
                <span style={styles.buttonSubLabel}>Continue driving (ESC)</span>
              </div>
            </div>
            <span style={{ ...styles.chevron, opacity: focusedIndex === 0 ? 1 : 0.4 }}>►</span>
          </button>

          <button
            style={{
              ...menuStyles.button,
              ...menuStyles.secondaryButton,
              color: textColor,
              ...getFocusStyle(focusedIndex === 1),
            }}
            onPointerMove={(e) => onPointerMoveItem(1, e)}
            onClick={onReset}
          >
            <div style={styles.buttonContent}>
              <span style={styles.indexTag}>02 //</span>
              <div style={styles.textCol}>
                <span style={styles.buttonLabel}>RESTART STAGE</span>
                <span style={styles.buttonSubLabel}>Reset car to stage spawn point</span>
              </div>
            </div>
            <span style={{ ...styles.chevron, opacity: focusedIndex === 1 ? 1 : 0.4 }}>►</span>
          </button>

          <button
            style={{
              ...menuStyles.button,
              ...menuStyles.secondaryButton,
              color: textColor,
              ...getFocusStyle(focusedIndex === 2),
            }}
            onPointerMove={(e) => onPointerMoveItem(2, e)}
            onClick={() => onSelectView('options')}
          >
            <div style={styles.buttonContent}>
              <span style={styles.indexTag}>03 //</span>
              <div style={styles.textCol}>
                <span style={styles.buttonLabel}>SETTINGS</span>
                <span style={styles.buttonSubLabel}>Graphics, audio & simulation</span>
              </div>
            </div>
            <span style={{ ...styles.chevron, opacity: focusedIndex === 2 ? 1 : 0.4 }}>►</span>
          </button>

          <button
            style={{
              ...menuStyles.button,
              ...menuStyles.secondaryButton,
              color: textColor,
              ...getFocusStyle(focusedIndex === 3),
            }}
            onPointerMove={(e) => onPointerMoveItem(3, e)}
            onClick={() => onSelectView('controls')}
          >
            <div style={styles.buttonContent}>
              <span style={styles.indexTag}>04 //</span>
              <div style={styles.textCol}>
                <span style={styles.buttonLabel}>CONTROLS</span>
                <span style={styles.buttonSubLabel}>Gamepad & keyboard mapping</span>
              </div>
            </div>
            <span style={{ ...styles.chevron, opacity: focusedIndex === 3 ? 1 : 0.4 }}>►</span>
          </button>

          <button
            style={{
              ...menuStyles.button,
              ...menuStyles.secondaryButton,
              color: '#F87171',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              ...getFocusStyle(focusedIndex === 4),
            }}
            onPointerMove={(e) => onPointerMoveItem(4, e)}
            onClick={onReturnToMainMenu}
          >
            <div style={styles.buttonContent}>
              <span style={{ ...styles.indexTag, color: '#EF4444' }}>05 //</span>
              <div style={styles.textCol}>
                <span style={{ ...styles.buttonLabel, color: '#F87171' }}>RETURN TO MAIN MENU</span>
                <span style={styles.buttonSubLabel}>Abandon current stage</span>
              </div>
            </div>
            <span style={{ ...styles.chevron, color: '#EF4444', opacity: focusedIndex === 4 ? 1 : 0.4 }}>✕</span>
          </button>
        </>
      ) : (
        <>
          <button
            style={{
              ...menuStyles.button,
              ...(focusedIndex === 0 ? menuStyles.primaryButton : menuStyles.secondaryButton),
              color: focusedIndex === 0 ? '#FFFFFF' : textColor,
              ...getFocusStyle(focusedIndex === 0),
            }}
            onPointerMove={(e) => onPointerMoveItem(0, e)}
            onClick={() => onSelectView('start_mode')}
          >
            <div style={styles.buttonContent}>
              <span style={styles.indexTag}>01 //</span>
              <div style={styles.textCol}>
                <span style={focusedIndex === 0 ? styles.buttonLabelPrimary : styles.buttonLabel}>START RALLY</span>
                <span style={focusedIndex === 0 ? styles.buttonSubLabelPrimary : styles.buttonSubLabel}>Free Roam & Time Attack</span>
              </div>
            </div>
            <span style={{ ...styles.chevron, opacity: focusedIndex === 0 ? 1 : 0.3 }}>►</span>
          </button>

          <button
            style={{
              ...menuStyles.button,
              ...menuStyles.secondaryButton,
              color: textColor,
              ...getFocusStyle(focusedIndex === 1),
            }}
            onPointerMove={(e) => onPointerMoveItem(1, e)}
            onClick={onOpenGarage}
          >
            <div style={styles.buttonContent}>
              <span style={styles.indexTag}>02 //</span>
              <div style={styles.textCol}>
                <span style={styles.buttonLabel}>GARAGE</span>
                <span style={styles.buttonSubLabel}>Inspect & select vehicles</span>
              </div>
            </div>
            <span style={{ ...styles.chevron, opacity: focusedIndex === 1 ? 1 : 0.3 }}>►</span>
          </button>

          <button
            style={{
              ...menuStyles.button,
              ...menuStyles.secondaryButton,
              color: textColor,
              ...getFocusStyle(focusedIndex === 2),
            }}
            onPointerMove={(e) => onPointerMoveItem(2, e)}
            onClick={() => onSelectView('tracks')}
          >
            <div style={styles.buttonContent}>
              <span style={styles.indexTag}>03 //</span>
              <div style={styles.textCol}>
                <span style={styles.buttonLabel}>TRACKS & STAGES</span>
                <span style={styles.buttonSubLabel}>Circuits & stage lap records</span>
              </div>
            </div>
            <span style={{ ...styles.chevron, opacity: focusedIndex === 2 ? 1 : 0.3 }}>►</span>
          </button>

          <button
            style={{
              ...menuStyles.button,
              ...menuStyles.secondaryButton,
              color: textColor,
              ...getFocusStyle(focusedIndex === 3),
            }}
            onPointerMove={(e) => onPointerMoveItem(3, e)}
            onClick={() => onSelectView('options')}
          >
            <div style={styles.buttonContent}>
              <span style={styles.indexTag}>04 //</span>
              <div style={styles.textCol}>
                <span style={styles.buttonLabel}>OPTIONS</span>
                <span style={styles.buttonSubLabel}>Graphics, audio & simulation</span>
              </div>
            </div>
            <span style={{ ...styles.chevron, opacity: focusedIndex === 3 ? 1 : 0.3 }}>►</span>
          </button>

          <button
            style={{
              ...menuStyles.button,
              ...menuStyles.secondaryButton,
              color: textColor,
              ...getFocusStyle(focusedIndex === 4),
            }}
            onPointerMove={(e) => onPointerMoveItem(4, e)}
            onClick={() => onSelectView('controls')}
          >
            <div style={styles.buttonContent}>
              <span style={styles.indexTag}>05 //</span>
              <div style={styles.textCol}>
                <span style={styles.buttonLabel}>CONTROLS</span>
                <span style={styles.buttonSubLabel}>DualSense, Xbox & keyboard mappings</span>
              </div>
            </div>
            <span style={{ ...styles.chevron, opacity: focusedIndex === 4 ? 1 : 0.3 }}>►</span>
          </button>

          <button
            style={{
              ...menuStyles.button,
              ...menuStyles.secondaryButton,
              color: textColor,
              ...getFocusStyle(focusedIndex === 5),
            }}
            onPointerMove={(e) => onPointerMoveItem(5, e)}
            onClick={() => onSelectView('credits')}
          >
            <div style={styles.buttonContent}>
              <span style={styles.indexTag}>06 //</span>
              <div style={styles.textCol}>
                <span style={styles.buttonLabel}>CREDITS</span>
                <span style={styles.buttonSubLabel}>Game creator & open-source source</span>
              </div>
            </div>
            <span style={{ ...styles.chevron, opacity: focusedIndex === 5 ? 1 : 0.3 }}>►</span>
          </button>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  indexTag: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#E31837',
    letterSpacing: '1px',
    fontFamily: 'monospace',
  },
  textCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    textAlign: 'left',
  },
  buttonLabel: {
    fontSize: '15px',
    fontWeight: 700,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    color: '#F1F5F9',
  },
  buttonLabelPrimary: {
    fontSize: '16px',
    fontWeight: 800,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    color: '#FFFFFF',
  },
  buttonSubLabel: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#94A3B8',
    letterSpacing: '0.2px',
  },
  buttonSubLabelPrimary: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: '0.2px',
  },
  chevron: {
    fontSize: '12px',
    fontWeight: 800,
    color: '#FFFFFF',
    transition: 'opacity 0.15s ease',
  },
};

