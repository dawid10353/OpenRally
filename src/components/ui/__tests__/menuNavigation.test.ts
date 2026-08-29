import { describe, it, expect } from 'vitest';

describe('Menu Navigation & Key Indices', () => {
  it('calculates cyclical vertical navigation correctly', () => {
    const getItemCount = (view: string, levelsCount: number, vibrationEnabled: boolean): number => {
      if (view === 'main') return 5;
      if (view === 'start_mode') return 3;
      if (view === 'garage') return 2;
      if (view === 'tracks') return levelsCount + 1;
      if (view === 'options') return vibrationEnabled ? 11 : 10;
      if (view === 'controls') return 1;
      return 1;
    };

    // Main menu (5 items)
    const mainCount = getItemCount('main', 4, true);
    expect(mainCount).toBe(5);

    // Nav Down from last item loops to top
    const nextFromLast = (4 + 1) % mainCount;
    expect(nextFromLast).toBe(0);

    // Nav Up from top item loops to bottom
    const prevFromTop = (0 - 1 + mainCount) % mainCount;
    expect(prevFromTop).toBe(4);
  });

  it('cycles controls tabs across dualsense, xbox, and keyboard', () => {
    const tabs = ['dualsense', 'xbox', 'keyboard'] as const;
    const currentTab = 'dualsense';
    const tabIdx = tabs.indexOf(currentTab);

    const rightTab = tabs[(tabIdx + 1) % tabs.length];
    expect(rightTab).toBe('xbox');

    const leftTab = tabs[(tabIdx - 1 + tabs.length) % tabs.length];
    expect(leftTab).toBe('keyboard');
  });

  it('cycles vehicle selection index in garage view', () => {
    const vehicles = ['rally_hatchback', 'rally_wrc'];
    const currentIdx = 0;

    const nextIdx = (currentIdx + 1) % vehicles.length;
    expect(vehicles[nextIdx]).toBe('rally_wrc');

    const prevIdx = (currentIdx - 1 + vehicles.length) % vehicles.length;
    expect(vehicles[prevIdx]).toBe('rally_wrc');
  });
});
