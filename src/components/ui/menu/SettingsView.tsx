import type { GraphicsQuality, AntiAliasingMode } from '@/types';
import { menuStyles, getFocusStyle } from './menuStyles';
import type { MenuView, ResetConfirmState } from './types';

interface SettingsViewProps {
  graphicsQuality: GraphicsQuality;
  antiAliasing: AntiAliasingMode;
  resolutionScale: number;
  shadowsEnabled: boolean;
  postProcessingEnabled: boolean;
  sensitivity: number;
  vibrationEnabled: boolean;
  vibrationIntensity: number;
  menuMusicVolume: number;
  gameMusicVolume: number;
  sfxVolume: number;
  resetConfirmState: ResetConfirmState;
  focusedIndex: number;
  textColor: string;
  onPointerMoveItem: (index: number, e: React.PointerEvent) => void;
  onSetGraphicsQuality: (quality: GraphicsQuality) => void;
  onSetAntiAliasing: (mode: AntiAliasingMode) => void;
  onSetResolutionScale: (scale: number) => void;
  onToggleShadows: () => void;
  onTogglePostProcessing: () => void;
  onSetSensitivity: (val: number) => void;
  onToggleVibration: () => void;
  onSetVibrationIntensity: (val: number) => void;
  onSetMenuMusicVolume: (val: number) => void;
  onSetGameMusicVolume: (val: number) => void;
  onSetSfxVolume: (val: number) => void;
  onResetRecords: () => void;
  onSelectView: (view: MenuView) => void;
}

export function SettingsView({
  graphicsQuality,
  antiAliasing,
  resolutionScale,
  shadowsEnabled,
  postProcessingEnabled,
  sensitivity,
  vibrationEnabled,
  vibrationIntensity,
  menuMusicVolume,
  gameMusicVolume,
  sfxVolume,
  resetConfirmState,
  focusedIndex,
  textColor,
  onPointerMoveItem,
  onSetGraphicsQuality,
  onSetAntiAliasing,
  onSetResolutionScale,
  onToggleShadows,
  onTogglePostProcessing,
  onSetSensitivity,
  onToggleVibration,
  onSetVibrationIntensity,
  onSetMenuMusicVolume,
  onSetGameMusicVolume,
  onSetSfxVolume,
  onResetRecords,
  onSelectView,
}: SettingsViewProps) {
  let optIdx = 0;
  const gqIdx = optIdx++;
  const aaIdx = optIdx++;
  const resIdx = optIdx++;
  const shIdx = optIdx++;
  const ppIdx = optIdx++;
  const sensIdx = optIdx++;
  const vibIdx = optIdx++;
  const vibIntIdx = vibrationEnabled ? optIdx++ : -1;
  const mmIdx = optIdx++;
  const gmIdx = optIdx++;
  const sfxIdx = optIdx++;
  const resetIdx = optIdx++;
  const backIdx = optIdx++;

  return (
    <div style={{ ...menuStyles.subView, color: textColor }}>
      <h2 style={menuStyles.subViewTitle}>Options</h2>
      
      <div 
        style={{ ...menuStyles.optionRow, ...getFocusStyle(focusedIndex === gqIdx) }}
        onPointerMove={(e) => onPointerMoveItem(gqIdx, e)}
      >
        <span>Graphics Quality</span>
        <select 
          value={graphicsQuality} 
          onChange={(e) => onSetGraphicsQuality(e.target.value as GraphicsQuality)}
          style={menuStyles.select}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="very_high">Very High</option>
        </select>
      </div>

      <div 
        style={{ ...menuStyles.optionRow, ...getFocusStyle(focusedIndex === aaIdx) }}
        onPointerMove={(e) => onPointerMoveItem(aaIdx, e)}
      >
        <span>Anti-Aliasing</span>
        <select 
          value={antiAliasing} 
          onChange={(e) => onSetAntiAliasing(e.target.value as AntiAliasingMode)}
          style={menuStyles.select}
        >
          <option value="smaa">SMAA (Sharp & Fast)</option>
          <option value="msaa">MSAA 4x (Hardware)</option>
          <option value="off">Off (Fastest)</option>
        </select>
      </div>

      <div 
        style={{ ...menuStyles.optionRow, ...getFocusStyle(focusedIndex === resIdx) }}
        onPointerMove={(e) => onPointerMoveItem(resIdx, e)}
      >
        <span>Render Resolution</span>
        <select 
          value={resolutionScale} 
          onChange={(e) => onSetResolutionScale(parseFloat(e.target.value))}
          style={menuStyles.select}
        >
          <option value="0.5">50% (Performance)</option>
          <option value="0.75">75% (Balanced)</option>
          <option value="1">100% (Native)</option>
          <option value="1.25">125% (Ultra Sharp)</option>
          <option value="1.5">150% (Super-Sampling)</option>
        </select>
      </div>

      <div 
        style={{ ...menuStyles.optionRow, ...getFocusStyle(focusedIndex === shIdx) }}
        onPointerMove={(e) => onPointerMoveItem(shIdx, e)}
      >
        <span>Real-time Shadows</span>
        <input 
          type="checkbox" 
          checked={shadowsEnabled} 
          onChange={onToggleShadows}
          style={menuStyles.checkbox}
        />
      </div>

      <div 
        style={{ ...menuStyles.optionRow, ...getFocusStyle(focusedIndex === ppIdx) }}
        onPointerMove={(e) => onPointerMoveItem(ppIdx, e)}
      >
        <span>Post Processing</span>
        <input 
          type="checkbox" 
          checked={postProcessingEnabled} 
          onChange={onTogglePostProcessing}
          style={menuStyles.checkbox}
        />
      </div>

      <div 
        style={{ ...menuStyles.optionRow, ...getFocusStyle(focusedIndex === sensIdx) }}
        onPointerMove={(e) => onPointerMoveItem(sensIdx, e)}
      >
        <span>Steering Sensitivity ({sensitivity.toFixed(1)}x)</span>
        <input 
          type="range" 
          min="0.5" 
          max="2.0" 
          step="0.1"
          value={sensitivity}
          onChange={(e) => onSetSensitivity(parseFloat(e.target.value))}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <div 
        style={{ ...menuStyles.optionRow, ...getFocusStyle(focusedIndex === vibIdx) }}
        onPointerMove={(e) => onPointerMoveItem(vibIdx, e)}
      >
        <span>Controller Vibration (Rumble)</span>
        <input 
          type="checkbox" 
          checked={vibrationEnabled} 
          onChange={onToggleVibration}
          style={menuStyles.checkbox}
        />
      </div>

      {vibrationEnabled && (
        <div 
          style={{ ...menuStyles.optionRow, ...getFocusStyle(focusedIndex === vibIntIdx) }}
          onPointerMove={(e) => onPointerMoveItem(vibIntIdx, e)}
        >
          <span>Vibration Intensity ({Math.round(vibrationIntensity * 100)}%)</span>
          <input 
            type="range" 
            min="0.1" 
            max="1.0" 
            step="0.05"
            value={vibrationIntensity}
            onChange={(e) => onSetVibrationIntensity(parseFloat(e.target.value))}
            style={{ cursor: 'pointer' }}
          />
        </div>
      )}

      <div 
        style={{ ...menuStyles.optionRow, ...getFocusStyle(focusedIndex === mmIdx) }}
        onPointerMove={(e) => onPointerMoveItem(mmIdx, e)}
      >
        <span>Menu Music</span>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05"
          value={menuMusicVolume}
          onChange={(e) => onSetMenuMusicVolume(parseFloat(e.target.value))}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <div 
        style={{ ...menuStyles.optionRow, ...getFocusStyle(focusedIndex === gmIdx) }}
        onPointerMove={(e) => onPointerMoveItem(gmIdx, e)}
      >
        <span>Game Music</span>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05"
          value={gameMusicVolume}
          onChange={(e) => onSetGameMusicVolume(parseFloat(e.target.value))}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <div 
        style={{ ...menuStyles.optionRow, ...getFocusStyle(focusedIndex === sfxIdx) }}
        onPointerMove={(e) => onPointerMoveItem(sfxIdx, e)}
      >
        <span>SFX Volume</span>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.05"
          value={sfxVolume}
          onChange={(e) => onSetSfxVolume(parseFloat(e.target.value))}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <div 
        style={{ 
          ...menuStyles.optionRow, 
          justifyContent: 'space-between',
          border: resetConfirmState === 'confirming' 
            ? '1px solid #E31837' 
            : resetConfirmState === 'done' 
              ? '1px solid #10b981' 
              : '1px solid transparent',
          background: resetConfirmState === 'confirming' 
            ? 'rgba(227, 24, 55, 0.08)' 
            : resetConfirmState === 'done' 
              ? 'rgba(16, 185, 129, 0.08)' 
              : 'rgba(0,0,0,0.1)',
          ...getFocusStyle(focusedIndex === resetIdx),
        }}
        onPointerMove={(e) => onPointerMoveItem(resetIdx, e)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
          <span style={{ fontWeight: 700, color: '#F1F5F9' }}>Clear Stage Lap Records</span>
          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>
            Reset all saved personal best times across circuits
          </span>
        </div>
        <button
          type="button"
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            border: resetConfirmState === 'confirming' ? '1px solid #E31837' : '1px solid rgba(227, 24, 55, 0.4)',
            background: resetConfirmState === 'confirming'
              ? '#E31837'
              : resetConfirmState === 'done'
                ? '#10b981'
                : 'rgba(227, 24, 55, 0.15)',
            color: resetConfirmState === 'confirming' || resetConfirmState === 'done' ? '#ffffff' : '#F87171',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.5px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          onClick={onResetRecords}
        >
          {resetConfirmState === 'confirming' && 'CONFIRM RESET'}
          {resetConfirmState === 'done' && 'CLEARED'}
          {resetConfirmState === 'idle' && 'CLEAR ALL'}
        </button>
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
          ...getFocusStyle(focusedIndex === backIdx),
        }} 
        onPointerMove={(e) => onPointerMoveItem(backIdx, e)}
        onClick={() => onSelectView('main')}
      >
        Back
      </button>
    </div>
  );
}
