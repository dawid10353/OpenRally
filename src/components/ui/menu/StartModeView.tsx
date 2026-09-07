import type { LevelPreset } from '@/types/level';
import type { GameMode } from '@/types/game';
import { menuStyles, getFocusStyle, formatLapTime } from './menuStyles';
import type { MenuView } from './types';

interface StartModeViewProps {
  currentLevelPreset: LevelPreset;
  gameMode: GameMode;
  selectedLevelBest: number | null;
  selectedLevelBestGymkhana?: number | null;
  focusedIndex: number;
  textColor: string;
  onPointerMoveItem: (index: number, e: React.PointerEvent) => void;
  onLaunchMode: (mode: GameMode) => void;
  onSelectView: (view: MenuView) => void;
}

export function StartModeView({
  currentLevelPreset,
  gameMode,
  selectedLevelBest,
  selectedLevelBestGymkhana = null,
  focusedIndex,
  textColor,
  onPointerMoveItem,
  onLaunchMode,
  onSelectView,
}: StartModeViewProps) {
  const supportedModes = currentLevelPreset.supportedModes ?? ['freeroam', 'timeattack'];
  const isGymkhanaLevel = supportedModes.includes('gymkhana_blitz');
  return (
    <div className="mode-subview menu-scalable-container" style={{ ...menuStyles.subView, color: textColor, width: '100%', minWidth: '560px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <h2 style={{ ...menuStyles.subViewTitle, margin: 0 }}>Select Game Mode</h2>
        <span
          style={{
            padding: '3px 10px',
            borderRadius: '12px',
            background: 'rgba(227, 24, 55, 0.15)',
            border: '1px solid rgba(227, 24, 55, 0.4)',
            color: '#F87171',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '1px',
          }}
        >
          STEP 2 / 3
        </span>
      </div>
      
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
          style={{
            border: 'none',
            background: 'transparent',
            color: '#E31837',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '12px',
            padding: '8px 12px',
            minHeight: '44px',
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: '6px',
            touchAction: 'manipulation',
          }}
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
          <p className="mode-card-desc" style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.4, margin: '0 0 16px 0', flex: 1 }}>
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
            Select ➜
          </button>
        </div>

        {/* 2. Gymkhana Blitz Card or Time Attack Card */}
        {isGymkhanaLevel ? (
          <div 
            style={{
              ...menuStyles.modeCard,
              borderColor: gameMode === 'gymkhana_blitz' ? '#F59E0B' : 'rgba(255, 255, 255, 0.1)',
              background: gameMode === 'gymkhana_blitz' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.02)',
              cursor: 'pointer',
              ...getFocusStyle(focusedIndex === 1),
            }}
            onPointerMove={(e) => onPointerMoveItem(1, e)}
            onClick={() => onLaunchMode('gymkhana_blitz')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ ...menuStyles.modeBadge, background: '#F59E0B', letterSpacing: '1px' }}>GYMKHANA BLITZ</span>
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700, color: '#F8FAFC' }}>
              Gymkhana Blitz
            </h3>
            <p className="mode-card-desc" style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.4, margin: '0 0 10px 0' }}>
              1 minute to score maximum drift points around the arena. Chain drifts, maintain huge angles, and rack up massive multipliers!
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
              color: selectedLevelBestGymkhana ? '#FACC15' : '#64748B',
            }}>
              <span>BEST SCORE:</span>
              <span>{selectedLevelBestGymkhana ? `${selectedLevelBestGymkhana.toLocaleString('en-US')} PTS` : '--- PTS'}</span>
            </div>

            <button
              style={{
                ...menuStyles.button,
                background: 'linear-gradient(90deg, #D97706, #F59E0B)',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                color: '#FFFFFF',
                justifyContent: 'center',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onLaunchMode('gymkhana_blitz');
              }}
            >
              Select ➜
            </button>
          </div>
        ) : (
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
            <p className="mode-card-desc" style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.4, margin: '0 0 10px 0' }}>
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
              Select ➜
            </button>
          </div>
        )}
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
        onClick={() => onSelectView('tracks')}
      >
        Back to Track Selection
      </button>
    </div>
  );
}
