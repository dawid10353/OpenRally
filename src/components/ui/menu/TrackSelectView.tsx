import type { LevelPreset } from '@/types/level';
import { menuStyles, getFocusStyle, formatLapTime } from './menuStyles';
import type { MenuView } from './types';

interface TrackSelectViewProps {
  availableLevels: LevelPreset[];
  selectedLevelId: string;
  bestLapTimes: Record<string, number>;
  focusedIndex: number;
  textColor: string;
  subtitleColor: string;
  onPointerMoveItem: (index: number, e: React.PointerEvent) => void;
  onSelectTrack: (levelId: string) => void;
  onSelectView: (view: MenuView) => void;
}

export function TrackSelectView({
  availableLevels,
  selectedLevelId,
  bestLapTimes,
  focusedIndex,
  textColor,
  subtitleColor,
  onPointerMoveItem,
  onSelectTrack,
  onSelectView,
}: TrackSelectViewProps) {
  return (
    <div style={{ ...menuStyles.subView, color: textColor, width: '100%', minWidth: '500px' }}>
      <h2 style={menuStyles.subViewTitle}>Tracks & Stages</h2>
      <p style={{ ...menuStyles.subtitle, color: subtitleColor, margin: '0 0 16px 0' }}>
        Select a rally course and view stage lap records.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        {availableLevels.map((lvl, index) => {
          const isSelected = selectedLevelId === lvl.id;
          const bestTime = bestLapTimes[lvl.id] ?? null;

          return (
            <div
              key={lvl.id}
              style={{
                ...menuStyles.trackCard,
                borderColor: isSelected ? '#E31837' : 'rgba(0,0,0,0.1)',
                background: isSelected ? 'rgba(227, 24, 55, 0.05)' : 'rgba(0,0,0,0.02)',
                ...getFocusStyle(focusedIndex === index),
              }}
              onPointerMove={(e) => onPointerMoveItem(index, e)}
              onClick={() => onSelectTrack(lvl.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '16px' }}>{lvl.name}</span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{
                    ...menuStyles.difficultyBadge,
                    background: lvl.difficulty === 'easy' ? '#10b981' : lvl.difficulty === 'medium' ? '#f59e0b' : '#ef4444',
                  }}>
                    {lvl.difficulty.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Surface & Track Record Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0' }}>
                <span style={{ fontSize: '13px', color: '#666' }}>
                  Surface: {lvl.surfaceDescription}
                </span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: bestTime ? '#d97706' : '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  🏆 {bestTime ? formatLapTime(bestTime) : '--:--.--'}
                </span>
              </div>

              <p style={{ fontSize: '13px', color: '#555', margin: '2px 0 0 0' }}>
                {lvl.description}
              </p>
              {isSelected && (
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#E31837', marginTop: '6px' }}>
                  ✓ Selected Stage
                </span>
              )}
            </div>
          );
        })}
      </div>

      <button 
        style={{ 
          ...menuStyles.button, 
          marginTop: '20px', 
          width: '100%',
          ...getFocusStyle(focusedIndex === availableLevels.length),
        }} 
        onPointerMove={(e) => onPointerMoveItem(availableLevels.length, e)}
        onClick={() => onSelectView('main')}
      >
        Back
      </button>
    </div>
  );
}
