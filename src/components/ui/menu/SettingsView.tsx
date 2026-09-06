import { useState, useEffect } from 'react';
import type {
  GraphicsQuality,
  TargetFps,
  DrawDistance,
  AntiAliasingMode,
  TouchControlMode,
  TouchSteeringScheme,
  TouchButtonSize,
} from '@/types';
import { useSettingsStore } from '@/store/settingsStore';
import { isMobileOrAndroid } from '@/utils/device';
import { menuStyles, getFocusStyle } from './menuStyles';
import type { ControlsTab, MenuView, ResetConfirmState } from './types';
import { ControlsView } from './ControlsView';

interface SettingsViewProps {
  graphicsQuality: GraphicsQuality;
  targetFps: TargetFps;
  drawDistance: DrawDistance;
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
  gamepadConnected?: boolean;
  gamepadName?: string;
  gamepadType?: 'xbox' | 'dualsense' | 'generic' | null;
  controlsTab?: ControlsTab;
  onSetControlsTab?: (tab: ControlsTab) => void;
  onPointerMoveItem: (index: number, e: React.PointerEvent) => void;
  onSetGraphicsQuality: (quality: GraphicsQuality) => void;
  onSetTargetFps: (fps: TargetFps) => void;
  onSetDrawDistance: (distance: DrawDistance) => void;
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

export type SettingsCategory = 'graphics' | 'audio' | 'controls' | 'touch' | 'gameplay';

export function SettingsView({
  graphicsQuality,
  targetFps,
  drawDistance,
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
  gamepadConnected = false,
  gamepadName = '',
  gamepadType = null,
  controlsTab = 'dualsense',
  onSetControlsTab,
  onPointerMoveItem,
  onSetGraphicsQuality,
  onSetTargetFps,
  onSetDrawDistance,
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
  const {
    touchControlMode,
    setTouchControlMode,
    touchSteeringScheme,
    setTouchSteeringScheme,
    touchOpacity,
    setTouchOpacity,
    touchButtonSize,
    setTouchButtonSize,
    touchHaptics,
    setTouchHaptics,
  } = useSettingsStore();

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('graphics');

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

  // Auto-switch tabs when navigating via keyboard or gamepad
  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex <= 4) {
      setActiveCategory('graphics');
    } else if (
      focusedIndex === sensIdx ||
      focusedIndex === vibIdx ||
      (vibrationEnabled && focusedIndex === vibIntIdx) ||
      focusedIndex === resetIdx
    ) {
      setActiveCategory('gameplay');
    } else if (focusedIndex >= mmIdx && focusedIndex <= sfxIdx) {
      setActiveCategory('audio');
    }
  }, [focusedIndex, vibrationEnabled, sensIdx, vibIdx, vibIntIdx, mmIdx, sfxIdx, resetIdx]);

  return (
    <div
      className="settings-subview menu-scalable-container"
      style={{ ...menuStyles.subView, color: textColor, width: '100%', minWidth: '540px', maxWidth: '880px' }}
    >
      <h2 style={menuStyles.subViewTitle}>Options & Settings</h2>

      {/* 5 Categorized Horizontal Tabs */}
      <div style={{ display: 'flex', gap: '6px', width: '100%', marginBottom: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          style={{
            ...menuStyles.tabButton,
            minHeight: '44px',
            fontSize: '12px',
            fontWeight: 700,
            ...(activeCategory === 'graphics' ? menuStyles.activeTabButton : {}),
          }}
          onClick={() => setActiveCategory('graphics')}
        >
          Graphics
        </button>
        <button
          type="button"
          style={{
            ...menuStyles.tabButton,
            minHeight: '44px',
            fontSize: '12px',
            fontWeight: 700,
            ...(activeCategory === 'audio' ? menuStyles.activeTabButton : {}),
          }}
          onClick={() => setActiveCategory('audio')}
        >
          Audio
        </button>
        <button
          type="button"
          style={{
            ...menuStyles.tabButton,
            minHeight: '44px',
            fontSize: '12px',
            fontWeight: 700,
            ...(activeCategory === 'controls' ? menuStyles.activeTabButton : {}),
          }}
          onClick={() => setActiveCategory('controls')}
        >
          Controls
        </button>
        <button
          type="button"
          style={{
            ...menuStyles.tabButton,
            minHeight: '44px',
            fontSize: '12px',
            fontWeight: 700,
            ...(activeCategory === 'touch' ? menuStyles.activeTabButton : {}),
          }}
          onClick={() => setActiveCategory('touch')}
        >
          Touch Controls
        </button>
        <button
          type="button"
          style={{
            ...menuStyles.tabButton,
            minHeight: '44px',
            fontSize: '12px',
            fontWeight: 700,
            ...(activeCategory === 'gameplay' ? menuStyles.activeTabButton : {}),
          }}
          onClick={() => setActiveCategory('gameplay')}
        >
          Gameplay
        </button>
      </div>

      {/* Active Tab Content Container */}
      <div className="settings-options-grid" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
        {/* TAB: CONTROLS */}
        {activeCategory === 'controls' && (
          <ControlsView
            hideTitleAndBack={true}
            gamepadConnected={gamepadConnected}
            gamepadName={gamepadName}
            gamepadType={gamepadType}
            controlsTab={controlsTab}
            focusedIndex={0}
            textColor={textColor}
            onPointerMoveItem={() => {}}
            onSetControlsTab={onSetControlsTab ?? (() => {})}
            onSelectView={onSelectView}
          />
        )}
        {/* TAB 1: GRAPHICS */}
        {activeCategory === 'graphics' && (
          <>
            <div 
              style={{ ...menuStyles.optionRow, minHeight: '44px', ...getFocusStyle(focusedIndex === gqIdx) }}
              onPointerMove={(e) => onPointerMoveItem(gqIdx, e)}
            >
              <span>Graphics Quality</span>
              <select 
                value={graphicsQuality} 
                onChange={(e) => onSetGraphicsQuality(e.target.value as GraphicsQuality)}
                style={menuStyles.select}
              >
                <option value="low">Low (Optimized Mobile)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="high">High (Desktop)</option>
                <option value="very_high">Very High (Ultra)</option>
              </select>
            </div>

            <div style={{ ...menuStyles.optionRow, minHeight: '44px' }}>
              <span>Target Frame Rate</span>
              <select 
                value={targetFps} 
                onChange={(e) => onSetTargetFps(parseInt(e.target.value, 10) as TargetFps)}
                style={menuStyles.select}
              >
                <option value={30}>30 FPS (Battery Saver)</option>
                <option value={60}>60 FPS (Balanced)</option>
                <option value={120}>120 FPS (Ultra Fluid / 120Hz)</option>
              </select>
            </div>

            <div style={{ ...menuStyles.optionRow, minHeight: '44px' }}>
              <span>Draw Distance</span>
              <select 
                value={drawDistance} 
                onChange={(e) => onSetDrawDistance(e.target.value as DrawDistance)}
                style={menuStyles.select}
              >
                <option value="short">Short (650m - Best FPS)</option>
                <option value="medium">Medium (1200m - Balanced)</option>
                <option value="far">Far (2200m - High Detail)</option>
                <option value="ultra">Ultra (3800m - Maximum)</option>
              </select>
            </div>

            <div 
              style={{ ...menuStyles.optionRow, minHeight: '44px', ...getFocusStyle(focusedIndex === aaIdx) }}
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
              style={{ ...menuStyles.optionRow, minHeight: '44px', ...getFocusStyle(focusedIndex === resIdx) }}
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
              style={{ ...menuStyles.optionRow, minHeight: '44px', ...getFocusStyle(focusedIndex === shIdx) }}
              onPointerMove={(e) => onPointerMoveItem(shIdx, e)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>Real-time Shadows</span>
                {isMobileOrAndroid() && (
                  <span style={{ fontSize: '11px', color: '#94A3B8', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}>
                    PC Only (Contact AO Active)
                  </span>
                )}
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '48px', minHeight: '44px', cursor: isMobileOrAndroid() ? 'not-allowed' : 'pointer', opacity: isMobileOrAndroid() ? 0.5 : 1 }}>
                <input 
                  type="checkbox" 
                  checked={!isMobileOrAndroid() && shadowsEnabled} 
                  disabled={isMobileOrAndroid()}
                  onChange={onToggleShadows}
                  style={menuStyles.checkbox}
                />
              </label>
            </div>

            <div 
              style={{ ...menuStyles.optionRow, minHeight: '44px', ...getFocusStyle(focusedIndex === ppIdx) }}
              onPointerMove={(e) => onPointerMoveItem(ppIdx, e)}
            >
              <span>Post Processing</span>
              <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '48px', minHeight: '44px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={postProcessingEnabled} 
                  onChange={onTogglePostProcessing}
                  style={menuStyles.checkbox}
                />
              </label>
            </div>
          </>
        )}

        {/* TAB 2: AUDIO */}
        {activeCategory === 'audio' && (
          <>
            <div 
              style={{ ...menuStyles.optionRow, minHeight: '44px', ...getFocusStyle(focusedIndex === mmIdx) }}
              onPointerMove={(e) => onPointerMoveItem(mmIdx, e)}
            >
              <span>Menu Music ({Math.round(menuMusicVolume * 100)}%)</span>
              <div style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={menuMusicVolume}
                  onChange={(e) => onSetMenuMusicVolume(parseFloat(e.target.value))}
                  style={{ cursor: 'pointer', minHeight: '32px' }}
                />
              </div>
            </div>

            <div 
              style={{ ...menuStyles.optionRow, minHeight: '44px', ...getFocusStyle(focusedIndex === gmIdx) }}
              onPointerMove={(e) => onPointerMoveItem(gmIdx, e)}
            >
              <span>Game Music ({Math.round(gameMusicVolume * 100)}%)</span>
              <div style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={gameMusicVolume}
                  onChange={(e) => onSetGameMusicVolume(parseFloat(e.target.value))}
                  style={{ cursor: 'pointer', minHeight: '32px' }}
                />
              </div>
            </div>

            <div 
              style={{ ...menuStyles.optionRow, minHeight: '44px', ...getFocusStyle(focusedIndex === sfxIdx) }}
              onPointerMove={(e) => onPointerMoveItem(sfxIdx, e)}
            >
              <span>SFX Volume ({Math.round(sfxVolume * 100)}%)</span>
              <div style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={sfxVolume}
                  onChange={(e) => onSetSfxVolume(parseFloat(e.target.value))}
                  style={{ cursor: 'pointer', minHeight: '32px' }}
                />
              </div>
            </div>
          </>
        )}

        {/* TAB 3: TOUCH CONTROLS */}
        {activeCategory === 'touch' && (
          <>
            <div style={{ ...menuStyles.optionRow, minHeight: '44px' }}>
              <span>Touch Overlay Mode</span>
              <select
                value={touchControlMode}
                onChange={(e) => setTouchControlMode(e.target.value as TouchControlMode)}
                style={menuStyles.select}
              >
                <option value="auto">Auto-Detect (Mobile)</option>
                <option value="always">Always Visible</option>
                <option value="off">Off (Hide Overlay)</option>
              </select>
            </div>

            <div style={{ ...menuStyles.optionRow, minHeight: '44px' }}>
              <span>Steering Scheme</span>
              <select
                value={touchSteeringScheme}
                onChange={(e) => setTouchSteeringScheme(e.target.value as TouchSteeringScheme)}
                style={menuStyles.select}
              >
                <option value="joystick">Floating Analog Joystick</option>
                <option value="buttons">Digital Buttons (L / R)</option>
              </select>
            </div>

            <div style={{ ...menuStyles.optionRow, minHeight: '44px' }}>
              <span>Button Size</span>
              <select
                value={touchButtonSize}
                onChange={(e) => setTouchButtonSize(e.target.value as TouchButtonSize)}
                style={menuStyles.select}
              >
                <option value="small">Compact (85%)</option>
                <option value="medium">Standard (100%)</option>
                <option value="large">Large (115%)</option>
              </select>
            </div>

            <div style={{ ...menuStyles.optionRow, minHeight: '44px' }}>
              <span>Controls Opacity ({Math.round(touchOpacity * 100)}%)</span>
              <div style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={touchOpacity}
                  onChange={(e) => setTouchOpacity(parseFloat(e.target.value))}
                  style={{ cursor: 'pointer', minHeight: '32px' }}
                />
              </div>
            </div>

            <div style={{ ...menuStyles.optionRow, minHeight: '44px' }}>
              <span>Haptic Feedback</span>
              <button
                type="button"
                onClick={() => setTouchHaptics(!touchHaptics)}
                style={{
                  background: touchHaptics ? '#10b981' : '#475569',
                  border: 'none',
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '13px',
                  minWidth: '56px',
                  minHeight: '44px',
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {touchHaptics ? 'ON' : 'OFF'}
              </button>
            </div>
          </>
        )}

        {/* TAB 4: GAMEPLAY */}
        {activeCategory === 'gameplay' && (
          <>
            <div 
              style={{ ...menuStyles.optionRow, minHeight: '44px', ...getFocusStyle(focusedIndex === sensIdx) }}
              onPointerMove={(e) => onPointerMoveItem(sensIdx, e)}
            >
              <span>Steering Sensitivity ({sensitivity.toFixed(1)}x)</span>
              <div style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.0" 
                  step="0.1"
                  value={sensitivity}
                  onChange={(e) => onSetSensitivity(parseFloat(e.target.value))}
                  style={{ cursor: 'pointer', minHeight: '32px' }}
                />
              </div>
            </div>

            <div 
              style={{ ...menuStyles.optionRow, minHeight: '44px', ...getFocusStyle(focusedIndex === vibIdx) }}
              onPointerMove={(e) => onPointerMoveItem(vibIdx, e)}
            >
              <span>Controller Vibration (Rumble)</span>
              <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '48px', minHeight: '44px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={vibrationEnabled} 
                  onChange={onToggleVibration}
                  style={menuStyles.checkbox}
                />
              </label>
            </div>

            {vibrationEnabled && (
              <div 
                style={{ ...menuStyles.optionRow, minHeight: '44px', ...getFocusStyle(focusedIndex === vibIntIdx) }}
                onPointerMove={(e) => onPointerMoveItem(vibIntIdx, e)}
              >
                <span>Vibration Intensity ({Math.round(vibrationIntensity * 100)}%)</span>
                <div style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="1.0" 
                    step="0.05"
                    value={vibrationIntensity}
                    onChange={(e) => onSetVibrationIntensity(parseFloat(e.target.value))}
                    style={{ cursor: 'pointer', minHeight: '32px' }}
                  />
                </div>
              </div>
            )}

            <div 
              className="settings-option-span-2"
              style={{ 
                ...menuStyles.optionRow, 
                minHeight: '44px',
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
                  padding: '10px 18px',
                  minHeight: '44px',
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
                  touchAction: 'manipulation',
                }}
                onClick={onResetRecords}
              >
                {resetConfirmState === 'confirming' && 'CONFIRM RESET'}
                {resetConfirmState === 'done' && 'CLEARED'}
                {resetConfirmState === 'idle' && 'CLEAR ALL'}
              </button>
            </div>
          </>
        )}
      </div>

      <button 
        style={{ 
          ...menuStyles.button, 
          ...menuStyles.secondaryButton,
          color: textColor,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          marginTop: '12px', 
          width: '100%',
          minHeight: '44px',
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
