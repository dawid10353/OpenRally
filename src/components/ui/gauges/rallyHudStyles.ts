import type { CSSProperties } from 'react';

/**
 * Authentic motorsport carbon fiber twill weave texture.
 * Seamless procedural SVG data URI with 2x2 carbon twill weave, subtle highlights,
 * and specular depth. Crisp on all retina, 4K, and mobile OLED displays with 0 latency.
 */
export const CARBON_FIBER_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' fill='%230f141c'/%3E%3Cpath d='M0 0h8v8H0z' fill='%23171f2c'/%3E%3Cpath d='M8 8h8v8H8z' fill='%23171f2c'/%3E%3Cpath d='M0 4h8v1H0zM8 12h8v1H8z' fill='rgba(255,255,255,0.06)'/%3E%3Cpath d='M4 0h1v8H4zM12 8h1v8h-1z' fill='rgba(0,0,0,0.35)'/%3E%3Cpath d='M0 8l8-8h2L2 8zM8 16l8-8h2l-8 8z' fill='rgba(255,255,255,0.02)'/%3E%3C/svg%3E")`;

/**
 * High-visibility rally hazard warning chevrons (45-degree motorsport caution tape).
 */
export const RALLY_HAZARD_STRIPES_YELLOW = `repeating-linear-gradient(
  -45deg,
  #f59e0b,
  #f59e0b 6px,
  #1e293b 6px,
  #1e293b 12px
)`;

export const RALLY_HAZARD_STRIPES_DARK = `repeating-linear-gradient(
  -45deg,
  rgba(255, 255, 255, 0.08),
  rgba(255, 255, 255, 0.08) 5px,
  transparent 5px,
  transparent 10px
)`;

/**
 * Common authentic rally styling tokens for HUD panels.
 */
export const rallyHudTheme = {
  cardBase: {
    background: `${CARBON_FIBER_BG}, linear-gradient(180deg, #18202d 0%, #0c1017 100%)`,
    backgroundBlendMode: 'overlay',
    border: '2px solid #334155',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.15), inset 0 0 16px rgba(0, 0, 0, 0.8)',
    borderRadius: '10px',
  } as CSSProperties,

  metallicBezel: {
    border: '1.5px solid #475569',
    boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.2), 0 4px 16px rgba(0, 0, 0, 0.7)',
  } as CSSProperties,

  cornerRivet: {
    position: 'absolute' as const,
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, #94a3b8 0%, #334155 100%)',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
    pointerEvents: 'none' as const,
  },

  rallyPlateHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '2px 6px',
    background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)',
    borderBottom: '1px solid #334155',
    borderRadius: '6px 6px 0 0',
  } as CSSProperties,

  roadbookRibbon: {
    background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
    color: '#0f172a',
    fontSize: '9px',
    fontWeight: 900,
    letterSpacing: '1px',
    padding: '1px 6px',
    borderRadius: '3px',
    textTransform: 'uppercase' as const,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
  } as CSSProperties,

  digitalLedText: {
    fontFamily: "'SF Mono', 'Roboto Mono', Consolas, Monaco, monospace",
    fontWeight: 900,
    letterSpacing: '1px',
    textShadow: '0 0 12px rgba(255, 255, 255, 0.4)',
  } as CSSProperties,
};
