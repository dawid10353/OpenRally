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
            style={{ ...menuStyles.button, ...getFocusStyle(focusedIndex === 0) }} 
            onPointerMove={(e) => onPointerMoveItem(0, e)}
            onClick={onResume}
          >
            Resume (ESC)
          </button>
          
          <button 
            style={{ 
              ...menuStyles.button, 
              ...menuStyles.secondaryButton,
              color: textColor,
              borderColor: 'rgba(0, 0, 0, 0.2)',
              ...getFocusStyle(focusedIndex === 1),
            }} 
            onPointerMove={(e) => onPointerMoveItem(1, e)}
            onClick={onReset}
          >
            Restart / Reset Vehicle
          </button>

          <button 
            style={{ 
              ...menuStyles.button, 
              ...menuStyles.secondaryButton,
              color: textColor,
              borderColor: 'rgba(0, 0, 0, 0.2)',
              ...getFocusStyle(focusedIndex === 2),
            }} 
            onPointerMove={(e) => onPointerMoveItem(2, e)}
            onClick={() => onSelectView('options')}
          >
            Options
          </button>

          <button 
            style={{ 
              ...menuStyles.button, 
              ...menuStyles.secondaryButton,
              color: textColor,
              borderColor: 'rgba(0, 0, 0, 0.2)',
              ...getFocusStyle(focusedIndex === 3),
            }} 
            onPointerMove={(e) => onPointerMoveItem(3, e)}
            onClick={() => onSelectView('controls')}
          >
            Controls
          </button>
          
          <button 
            style={{ 
              ...menuStyles.button, 
              ...menuStyles.secondaryButton,
              color: '#dc2626',
              borderColor: 'rgba(220, 38, 38, 0.3)',
              ...getFocusStyle(focusedIndex === 4),
            }} 
            onPointerMove={(e) => onPointerMoveItem(4, e)}
            onClick={onReturnToMainMenu}
          >
            Return to Main Menu
          </button>
        </>
      ) : (
        <>
          <button 
            style={{
              ...menuStyles.button,
              fontSize: '18px',
              padding: '18px 24px',
              boxShadow: '0 6px 20px rgba(227, 24, 55, 0.4)',
              letterSpacing: '1px',
              ...getFocusStyle(focusedIndex === 0),
            }} 
            onPointerMove={(e) => onPointerMoveItem(0, e)}
            onClick={() => onSelectView('start_mode')}
          >
            ▶ START GAME
          </button>

          <button 
            style={{ 
              ...menuStyles.button, 
              ...menuStyles.secondaryButton,
              color: textColor,
              borderColor: 'rgba(0, 0, 0, 0.2)',
              ...getFocusStyle(focusedIndex === 1),
            }} 
            onPointerMove={(e) => onPointerMoveItem(1, e)}
            onClick={onOpenGarage}
          >
            Garage (Vehicles)
          </button>

          <button 
            style={{ 
              ...menuStyles.button, 
              ...menuStyles.secondaryButton,
              color: textColor,
              borderColor: 'rgba(0, 0, 0, 0.2)',
              ...getFocusStyle(focusedIndex === 2),
            }} 
            onPointerMove={(e) => onPointerMoveItem(2, e)}
            onClick={() => onSelectView('tracks')}
          >
            Tracks & Stages
          </button>

          <button 
            style={{ 
              ...menuStyles.button, 
              ...menuStyles.secondaryButton,
              color: textColor,
              borderColor: 'rgba(0, 0, 0, 0.2)',
              ...getFocusStyle(focusedIndex === 3),
            }} 
            onPointerMove={(e) => onPointerMoveItem(3, e)}
            onClick={() => onSelectView('options')}
          >
            Options
          </button>

          <button 
            style={{ 
              ...menuStyles.button, 
              ...menuStyles.secondaryButton,
              color: textColor,
              borderColor: 'rgba(0, 0, 0, 0.2)',
              ...getFocusStyle(focusedIndex === 4),
            }} 
            onPointerMove={(e) => onPointerMoveItem(4, e)}
            onClick={() => onSelectView('controls')}
          >
            Controls
          </button>
        </>
      )}
    </div>
  );
}
