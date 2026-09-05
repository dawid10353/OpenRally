import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useSettingsStore,
  SETTINGS_STORAGE_KEY,
  loadSettingsFromStorage,
  saveSettingsToStorage,
} from '../settingsStore';
import { DEFAULT_TOUCH_SETTINGS } from '@/types/settings';

describe('Touch Settings Store & Persistence', () => {
  const storageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => {
        store[key] = String(val);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);

    // Reset store state to defaults
    useSettingsStore.setState({
      ...DEFAULT_TOUCH_SETTINGS,
    });
  });

  it('initializes with expected default touch settings', () => {
    const state = useSettingsStore.getState();
    expect(state.touchControlMode).toBe('auto');
    expect(state.touchSteeringScheme).toBe('joystick');
    expect(state.touchOpacity).toBe(0.7);
    expect(state.touchButtonSize).toBe('medium');
    expect(state.touchHaptics).toBe(true);
  });

  it('updates touchControlMode and persists to localStorage', () => {
    const { setTouchControlMode } = useSettingsStore.getState();

    setTouchControlMode('always');
    expect(useSettingsStore.getState().touchControlMode).toBe('always');

    const stored = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
    expect(stored.touchControlMode).toBe('always');

    setTouchControlMode('off');
    expect(useSettingsStore.getState().touchControlMode).toBe('off');

    const storedOff = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
    expect(storedOff.touchControlMode).toBe('off');

    setTouchControlMode('auto');
    expect(useSettingsStore.getState().touchControlMode).toBe('auto');
  });

  it('updates touchSteeringScheme and persists to localStorage', () => {
    const { setTouchSteeringScheme } = useSettingsStore.getState();

    setTouchSteeringScheme('buttons');
    expect(useSettingsStore.getState().touchSteeringScheme).toBe('buttons');

    const stored = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
    expect(stored.touchSteeringScheme).toBe('buttons');

    setTouchSteeringScheme('joystick');
    expect(useSettingsStore.getState().touchSteeringScheme).toBe('joystick');
  });

  it('updates touchOpacity, clamps between 0.2 and 1.0, and persists', () => {
    const { setTouchOpacity } = useSettingsStore.getState();

    setTouchOpacity(0.85);
    expect(useSettingsStore.getState().touchOpacity).toBe(0.85);

    let stored = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
    expect(stored.touchOpacity).toBe(0.85);

    // Test under-clamping
    setTouchOpacity(0.05);
    expect(useSettingsStore.getState().touchOpacity).toBe(0.2);

    // Test over-clamping
    setTouchOpacity(1.5);
    expect(useSettingsStore.getState().touchOpacity).toBe(1.0);

    // Test NaN / non-finite fallback
    setTouchOpacity(NaN);
    expect(useSettingsStore.getState().touchOpacity).toBe(0.7);
  });

  it('updates touchButtonSize and persists to localStorage', () => {
    const { setTouchButtonSize } = useSettingsStore.getState();

    setTouchButtonSize('small');
    expect(useSettingsStore.getState().touchButtonSize).toBe('small');

    let stored = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
    expect(stored.touchButtonSize).toBe('small');

    setTouchButtonSize('large');
    expect(useSettingsStore.getState().touchButtonSize).toBe('large');

    stored = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
    expect(stored.touchButtonSize).toBe('large');
  });

  it('updates touchHaptics toggle and persists to localStorage', () => {
    const { setTouchHaptics } = useSettingsStore.getState();

    setTouchHaptics(false);
    expect(useSettingsStore.getState().touchHaptics).toBe(false);

    let stored = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
    expect(stored.touchHaptics).toBe(false);

    setTouchHaptics(true);
    expect(useSettingsStore.getState().touchHaptics).toBe(true);

    stored = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
    expect(stored.touchHaptics).toBe(true);
  });

  it('rehydrates valid settings from localStorage via loadSettingsFromStorage', () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        touchControlMode: 'always',
        touchSteeringScheme: 'buttons',
        touchOpacity: 0.9,
        touchButtonSize: 'large',
        touchHaptics: false,
      })
    );

    const loaded = loadSettingsFromStorage();
    expect(loaded.touchControlMode).toBe('always');
    expect(loaded.touchSteeringScheme).toBe('buttons');
    expect(loaded.touchOpacity).toBe(0.9);
    expect(loaded.touchButtonSize).toBe('large');
    expect(loaded.touchHaptics).toBe(false);
  });

  it('safely handles corrupted JSON and invalid types in localStorage', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{ invalid: json ]');
    expect(loadSettingsFromStorage()).toEqual({});

    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        touchControlMode: 'invalid_mode',
        touchSteeringScheme: 'invalid_scheme',
        touchOpacity: 'not_a_number',
        touchButtonSize: 12345,
        touchHaptics: 'not_a_boolean',
      })
    );

    const fallback = loadSettingsFromStorage();
    expect(fallback.touchControlMode).toBeUndefined();
    expect(fallback.touchSteeringScheme).toBeUndefined();
    expect(fallback.touchOpacity).toBeUndefined();
    expect(fallback.touchButtonSize).toBeUndefined();
    expect(fallback.touchHaptics).toBeUndefined();
  });

  it('saveSettingsToStorage merges partial settings without wiping existing entries', () => {
    saveSettingsToStorage({ touchControlMode: 'always', touchOpacity: 0.5 });
    saveSettingsToStorage({ touchButtonSize: 'small' });

    const stored = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
    expect(stored.touchControlMode).toBe('always');
    expect(stored.touchOpacity).toBe(0.5);
    expect(stored.touchButtonSize).toBe('small');
  });
});
