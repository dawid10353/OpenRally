/**
 * In-App Local Crash & Diagnostics Subsystem for OpenRally.
 *
 * Captures, formats, and persists crash telemetry (WebGL renderer info, device memory,
 * display specs, game state, and stack traces) into localStorage.
 * Enables zero-server diagnostics with one-click clipboard export for developer triage.
 */

import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';

export interface DeviceDiagnostics {
  userAgent: string;
  deviceMemoryGb?: number;
  hardwareConcurrency?: number;
  screenResolution: string;
  viewportSize: string;
  devicePixelRatio: number;
  orientation: string;
  gpuVendor: string;
  gpuRenderer: string;
  webglVersion: string;
}

export interface CrashLogEntry {
  id: string;
  timestamp: string;
  errorMessage: string;
  errorStack?: string;
  componentStack?: string | null;
  diagnostics: DeviceDiagnostics;
  gameStateSnapshot: {
    gameState: string;
    gameMode: string;
    selectedLevelId: string;
    selectedVehicleId: string;
    speedKmh: number;
    graphicsQuality: string;
    shadowsEnabled: boolean;
  };
}

const CRASH_LOG_STORAGE_KEY = 'openrally_crash_log';
const MAX_STORED_CRASH_LOGS = 5;

let _cachedGpuInfo: { vendor: string; renderer: string; webglVersion: string } | null = null;

/**
 * Safely extracts WebGL renderer and vendor strings without throwing.
 * Caches the result to avoid redundant canvas/context creations.
 */
export function getGpuDiagnostics(): { vendor: string; renderer: string; webglVersion: string } {
  if (_cachedGpuInfo) {
    return _cachedGpuInfo;
  }

  const fallback = {
    vendor: 'Unknown Vendor',
    renderer: 'Unknown GPU',
    webglVersion: 'Unavailable',
  };

  if (typeof document === 'undefined') {
    return fallback;
  }

  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');

    if (!gl) {
      _cachedGpuInfo = fallback;
      return fallback;
    }

    const glContext = gl as WebGLRenderingContext | WebGL2RenderingContext;
    const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && glContext instanceof WebGL2RenderingContext;
    const webglVersion = isWebGL2 ? 'WebGL 2.0' : 'WebGL 1.0';

    const debugInfo = glContext.getExtension('WEBGL_debug_renderer_info');
    let vendor = 'Generic';
    let renderer = 'Generic';

    if (debugInfo) {
      vendor = glContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || vendor;
      renderer = glContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || renderer;
    } else {
      vendor = glContext.getParameter(glContext.VENDOR) || vendor;
      renderer = glContext.getParameter(glContext.RENDERER) || renderer;
    }

    // Clean up temporary WebGL context to prevent context leaks
    glContext.getExtension('WEBGL_lose_context')?.loseContext();

    _cachedGpuInfo = {
      vendor: String(vendor),
      renderer: String(renderer),
      webglVersion,
    };
    return _cachedGpuInfo;
  } catch (err) {
    console.warn('[crashLogger] Suppressed error inspecting GPU diagnostics:', err);
    _cachedGpuInfo = fallback;
    return fallback;
  }
}

/**
 * Assembles a comprehensive snapshot of the device, screen, and WebGL environment.
 */
export function getDeviceDiagnostics(): DeviceDiagnostics {
  const gpu = getGpuDiagnostics();

  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { deviceMemory?: number }) : null;
  const win = typeof window !== 'undefined' ? window : null;

  return {
    userAgent: nav?.userAgent ?? 'Unknown',
    deviceMemoryGb: nav?.deviceMemory,
    hardwareConcurrency: nav?.hardwareConcurrency,
    screenResolution: win?.screen ? `${win.screen.width}x${win.screen.height}` : 'Unknown',
    viewportSize: win ? `${win.innerWidth}x${win.innerHeight}` : 'Unknown',
    devicePixelRatio: win?.devicePixelRatio ?? 1,
    orientation:
      win?.screen?.orientation?.type ??
      (win && win.innerHeight > win.innerWidth ? 'portrait' : 'landscape'),
    gpuVendor: gpu.vendor,
    gpuRenderer: gpu.renderer,
    webglVersion: gpu.webglVersion,
  };
}

/**
 * Captures and records a crash incident into local storage and console diagnostics.
 */
export function recordCrash(
  error: unknown,
  errorInfo?: { componentStack?: string | null | undefined } | null,
): CrashLogEntry {
  const errorMessage =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown runtime exception';
  const errorStack = error instanceof Error ? error.stack : undefined;
  const componentStack = errorInfo?.componentStack;

  const gameState = useGameStore.getState();
  const settingsState = useSettingsStore.getState();

  const entry: CrashLogEntry = {
    id: `crash_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    errorMessage,
    errorStack,
    componentStack,
    diagnostics: getDeviceDiagnostics(),
    gameStateSnapshot: {
      gameState: gameState.gameState,
      gameMode: gameState.gameMode,
      selectedLevelId: gameState.selectedLevelId,
      selectedVehicleId: gameState.selectedVehicleId,
      speedKmh: Math.round(gameState.speed),
      graphicsQuality: settingsState.graphicsQuality,
      shadowsEnabled: settingsState.shadowsEnabled,
    },
  };

  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(CRASH_LOG_STORAGE_KEY);
      const list: CrashLogEntry[] = stored ? JSON.parse(stored) : [];
      list.unshift(entry);
      if (list.length > MAX_STORED_CRASH_LOGS) {
        list.length = MAX_STORED_CRASH_LOGS;
      }
      localStorage.setItem(CRASH_LOG_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (storageErr) {
    console.warn('[crashLogger] Failed to persist crash entry to localStorage:', storageErr);
  }

  return entry;
}

/**
 * Formats a crash log entry into a clean, markdown-friendly text report for issue submission.
 */
export function formatCrashReport(entry: CrashLogEntry): string {
  const diag = entry.diagnostics;
  const game = entry.gameStateSnapshot;

  return [
    `# OpenRally Crash Diagnostics Report`,
    `**Incident ID:** ${entry.id}`,
    `**Timestamp:** ${entry.timestamp}`,
    ``,
    `## Error Information`,
    `- **Message:** ${entry.errorMessage}`,
    entry.errorStack ? `\`\`\`\n${entry.errorStack}\n\`\`\`` : '',
    entry.componentStack ? `### Component Stack:\n\`\`\`\n${entry.componentStack}\n\`\`\`` : '',
    ``,
    `## Device & Graphics Environment`,
    `- **GPU Renderer:** ${diag.gpuRenderer}`,
    `- **GPU Vendor:** ${diag.gpuVendor}`,
    `- **Graphics API:** ${diag.webglVersion}`,
    `- **Display:** ${diag.screenResolution} (Viewport: ${diag.viewportSize}, DPR: ${diag.devicePixelRatio})`,
    `- **Orientation:** ${diag.orientation}`,
    `- **Device Memory:** ${diag.deviceMemoryGb != null ? `${diag.deviceMemoryGb} GB` : 'N/A'}`,
    `- **CPU Cores:** ${diag.hardwareConcurrency ?? 'N/A'}`,
    `- **User Agent:** ${diag.userAgent}`,
    ``,
    `## Game State Telemetry`,
    `- **State / Mode:** ${game.gameState} / ${game.gameMode}`,
    `- **Level ID:** ${game.selectedLevelId}`,
    `- **Vehicle ID:** ${game.selectedVehicleId}`,
    `- **Vehicle Speed:** ${game.speedKmh} km/h`,
    `- **Graphics Quality:** ${game.graphicsQuality} (Shadows: ${game.shadowsEnabled ? 'ON' : 'OFF'})`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Copies the formatted crash report to the system clipboard.
 */
export async function copyCrashReportToClipboard(reportText: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(reportText);
      return true;
    }
  } catch {
    // Fallback below
  }

  try {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = reportText;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  } catch {
    // Ignore
  }

  return false;
}

/**
 * Initializes global uncaught error listeners for asynchronous errors outside React rendering.
 */
export function initGlobalCrashLogging(): () => void {
  if (typeof window === 'undefined') return () => {};

  const onError = (event: ErrorEvent) => {
    recordCrash(event.error || event.message);
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    recordCrash(event.reason || 'Unhandled Promise Rejection');
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
  };
}

// Auto-register in browser environment
if (typeof window !== 'undefined') {
  initGlobalCrashLogging();
}
