import type { LevelPreset } from '@/types/level';
import { menuStyles, getFocusStyle, formatLapTime } from './menuStyles';
import type { MenuView } from './types';
import { STAGE_BANNERS } from './HeroShowcase';

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
    <div style={{ ...menuStyles.subView, color: textColor, width: '100%', minWidth: '540px', maxWidth: '780px' }}>
      <h2 style={menuStyles.subViewTitle}>Tracks & Stages</h2>
      <p style={{ ...menuStyles.subtitle, color: subtitleColor, margin: '0 0 16px 0' }}>
        Select a rally course and view stage lap records.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
        {availableLevels.map((lvl, index) => {
          const isSelected = selectedLevelId === lvl.id;
          const bestTime = bestLapTimes[lvl.id] ?? null;
          const bannerUrl = (STAGE_BANNERS as Record<string, string>)[lvl.id] || '/images/stages/island_circuit.jpg';

          return (
            <div
              key={lvl.id}
              style={{
                ...menuStyles.trackCard,
                display: 'grid',
                gridTemplateColumns: '140px 1fr',
                gap: '16px',
                alignItems: 'center',
                borderColor: isSelected ? '#E31837' : 'rgba(255, 255, 255, 0.08)',
                background: isSelected
                  ? 'linear-gradient(90deg, rgba(227, 24, 55, 0.18) 0%, rgba(27, 54, 93, 0.12) 100%)'
                  : 'rgba(255, 255, 255, 0.03)',
                padding: '12px 16px',
                ...getFocusStyle(focusedIndex === index),
              }}
              onPointerMove={(e) => onPointerMoveItem(index, e)}
              onClick={() => onSelectTrack(lvl.id)}
            >
              {/* Photographic Stage Thumbnail */}
              <div style={{ width: '140px', height: '85px', borderRadius: '8px', overflow: 'hidden', position: 'relative', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                <img
                  src={bannerUrl}
                  alt={lvl.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.7) 100%)' }} />
              </div>

              {/* Stage Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '17px', color: '#F1F5F9' }}>{lvl.name}</span>
                  <span style={{
                    ...menuStyles.difficultyBadge,
                    background: lvl.difficulty === 'easy' ? '#059669' : lvl.difficulty === 'medium' ? '#D97706' : '#DC2626',
                  }}>
                    {lvl.difficulty.toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2px 0' }}>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                    Surface: <strong style={{ color: '#E2E8F0' }}>{lvl.surfaceDescription}</strong>
                  </span>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: bestTime ? '#38BDF8' : '#64748B',
                    letterSpacing: '0.5px',
                  }}>
                    RECORD: {bestTime ? formatLapTime(bestTime) : '--:--.--'}
                  </span>
                </div>

                <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0, lineHeight: 1.35 }}>
                  {lvl.description}
                </p>

                {isSelected && (
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#E31837', marginTop: '2px', letterSpacing: '1px' }}>
                    ✓ ACTIVE STAGE
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button 
        style={{ 
          ...menuStyles.button, 
          ...menuStyles.secondaryButton,
          color: textColor,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          marginTop: '20px', 
          width: '100%',
          justifyContent: 'center',
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
