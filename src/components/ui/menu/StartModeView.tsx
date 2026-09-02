import type { LevelPreset } from '@/types/level';
import { menuStyles, getFocusStyle, formatLapTime } from './menuStyles';
import type { MenuView } from './types';

interface StartModeViewProps {
  currentLevelPreset: LevelPreset;
  gameMode: 'freeroam' | 'timeattack';
  selectedLevelBest: number | null;
  focusedIndex: number;
  textColor: string;
  onPointerMoveItem: (index: number, e: React.PointerEvent) => void;
  onLaunchMode: (mode: 'freeroam' | 'timeattack') => void;
  onSelectView: (view: MenuView) => void;
}

export function StartModeView({
  currentLevelPreset,
  gameMode,
  selectedLevelBest,
  focusedIndex,
  textColor,
  onPointerMoveItem,
  onLaunchMode,
  onSelectView,
}: StartModeViewProps) {
  return (
    <div style={{ ...menuStyles.subView, color: textColor, width: '100%', minWidth: '560px' }}>
      <h2 style={{ ...menuStyles.subViewTitle, marginBottom: '6px' }}>Select Game Mode</h2>
      
      {/* Selected Track Pill */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '8px 16px',
        borderRadius: '20px',
        marginBottom: '16px',
        fontSize: '13px',
        color: '#CBD5E1',
      }}>
        <span>ACTIVE STAGE: <strong style={{ color: '#FFFFFF' }}>{currentLevelPreset.name}</strong></span>
        <button 
          style={{ border: 'none', background: 'transparent', color: '#E31837', fontWeight: 700, cursor: 'pointer', fontSize: '12px', padding: 0 }}
          onClick={() => onSelectView('tracks')}
        >
          (CHANGE STAGE)
        </button>
      </div>

      {/* Mode Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
        {/* 1. Free Roam Card */}
        <div 
          style={{
            ...menuStyles.modeCard,
            borderColor: gameMode === 'freeroam' ? '#10B981' : 'rgba(255, 255, 255, 0.1)',
            background: gameMode === 'freeroam' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
            cursor: 'pointer',
            ...getFocusStyle(focusedIndex === 0),
          }}
          onPointerMove={(e) => onPointerMoveItem(0, e)}
          onClick={() => onLaunchMode('freeroam')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ ...menuStyles.modeBadge, background: '#059669', letterSpacing: '1px' }}>FREE ROAM</span>
          </div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700, color: '#F8FAFC' }}>
            Free Roam
          </h3>
          <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.4, margin: '0 0 16px 0', flex: 1 }}>
            Drive freely across open hills and valleys. No checkpoint gates, no timer pressure — pure driving enjoyment.
          </p>
          <button
            style={{
              ...menuStyles.button,
              background: 'linear-gradient(90deg, #059669, #10B981)',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              color: '#FFFFFF',
              justifyContent: 'center',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onLaunchMode('freeroam');
            }}
          >
            Launch Free Roam
          </button>
        </div>

        {/* 2. Time Attack Card */}
        <div 
          style={{
            ...menuStyles.modeCard,
            borderColor: gameMode === 'timeattack' ? '#E31837' : 'rgba(255, 255, 255, 0.1)',
            background: gameMode === 'timeattack' ? 'rgba(227, 24, 55, 0.08)' : 'rgba(255, 255, 255, 0.02)',
            cursor: 'pointer',
            ...getFocusStyle(focusedIndex === 1),
          }}
          onPointerMove={(e) => onPointerMoveItem(1, e)}
          onClick={() => onLaunchMode('timeattack')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ ...menuStyles.modeBadge, background: '#E31837', letterSpacing: '1px' }}>TIME ATTACK</span>
          </div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700, color: '#F8FAFC' }}>
            Time Attack
          </h3>
          <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.4, margin: '0 0 10px 0' }}>
            Pass through all checkpoint gates and set the fastest lap record on the circuit.
          </p>
          
          {/* Record Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 12px',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            marginBottom: '16px',
            fontSize: '12px',
            fontWeight: 700,
            color: selectedLevelBest ? '#38BDF8' : '#64748B',
          }}>
            <span>BEST LAP:</span>
            <span>{selectedLevelBest ? formatLapTime(selectedLevelBest) : '--:--.--'}</span>
          </div>

          <button
            style={{
              ...menuStyles.button,
              background: 'linear-gradient(90deg, #991B1B, #E31837)',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(227, 24, 55, 0.3)',
              color: '#FFFFFF',
              justifyContent: 'center',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onLaunchMode('timeattack');
            }}
          >
            Start Time Attack
          </button>
        </div>
      </div>

      <button 
        style={{ 
          ...menuStyles.button, 
          ...menuStyles.secondaryButton, 
          color: textColor, 
          borderColor: 'rgba(255, 255, 255, 0.1)', 
          width: '100%', 
          marginTop: '16px',
          justifyContent: 'center',
          ...getFocusStyle(focusedIndex === 2),
        }} 
        onPointerMove={(e) => onPointerMoveItem(2, e)}
        onClick={() => onSelectView('main')}
      >
        Back
      </button>
    </div>
  );
}
