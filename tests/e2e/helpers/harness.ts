/**
 * E2E Browser & Mobile Environment Simulation Harness
 */

export interface SimulatedEnvironment {
  windowWidth: number;
  windowHeight: number;
  devicePixelRatio: number;
  orientationType: 'landscape-primary' | 'landscape-secondary' | 'portrait-primary';
  userAgent: string;
  maxTouchPoints: number;
  vibrateHistory: number[][];
}

export class MobileBrowserHarness {
  private env: SimulatedEnvironment;
  private activePointers = new Map<number, { x: number; y: number; type: string }>();

  constructor(initialOverrides: Partial<SimulatedEnvironment> = {}) {
    this.env = {
      windowWidth: 997,
      windowHeight: 448,
      devicePixelRatio: 3.0,
      orientationType: 'landscape-primary',
      userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 10 Pro) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36',
      maxTouchPoints: 5,
      vibrateHistory: [],
      ...initialOverrides,
    };
  }

  getEnvironment(): SimulatedEnvironment {
    return { ...this.env };
  }

  setWindowSize(width: number, height: number): void {
    this.env.windowWidth = width;
    this.env.windowHeight = height;
    if (width < height) {
      this.env.orientationType = 'portrait-primary';
    } else {
      this.env.orientationType = 'landscape-primary';
    }
  }

  setDevicePixelRatio(dpr: number): void {
    this.env.devicePixelRatio = dpr;
  }

  setOrientation(type: 'landscape-primary' | 'landscape-secondary' | 'portrait-primary'): void {
    this.env.orientationType = type;
    if (type.startsWith('landscape') && this.env.windowWidth < this.env.windowHeight) {
      const tmp = this.env.windowWidth;
      this.env.windowWidth = this.env.windowHeight;
      this.env.windowHeight = tmp;
    } else if (type.startsWith('portrait') && this.env.windowWidth > this.env.windowHeight) {
      const tmp = this.env.windowWidth;
      this.env.windowWidth = this.env.windowHeight;
      this.env.windowHeight = tmp;
    }
  }

  vibrate(pattern: number | number[]): boolean {
    const p = Array.isArray(pattern) ? pattern : [pattern];
    this.env.vibrateHistory.push(p);
    return true;
  }

  clearVibrationHistory(): void {
    this.env.vibrateHistory = [];
  }

  // Pointer event simulation
  pointerDown(pointerId: number, x: number, y: number, pointerType: 'touch' | 'mouse' | 'pen' = 'touch'): void {
    this.activePointers.set(pointerId, { x, y, type: pointerType });
  }

  pointerMove(pointerId: number, x: number, y: number): void {
    const existing = this.activePointers.get(pointerId);
    if (existing) {
      this.activePointers.set(pointerId, { ...existing, x, y });
    }
  }

  pointerUp(pointerId: number): void {
    this.activePointers.delete(pointerId);
  }

  pointerCancel(pointerId: number): void {
    this.activePointers.delete(pointerId);
  }

  getActivePointerCount(): number {
    return this.activePointers.size;
  }

  getPointer(pointerId: number): { x: number; y: number; type: string } | undefined {
    return this.activePointers.get(pointerId);
  }

  resetAllPointers(): void {
    this.activePointers.clear();
  }
}
