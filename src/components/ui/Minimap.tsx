import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useRacingStore } from '@/store/racingStore';
import { getLevelPreset } from '@/config/levelRegistry';
import { CatmullRomCurve3, Vector3 } from 'three';

const CANVAS_SIZE = 180;
const MARGIN = 14;
const INNER_SIZE = CANVAS_SIZE - MARGIN * 2;

/**
 * Authentic Rally Stage Minimap Canvas overlay.
 * Uses an offscreen pre-rendered layer for static rally compass markings,
 * roadbook topography, and the rally stage route spline.
 */
export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedLevelId = useGameStore((s) => s.selectedLevelId);
  const gameState = useGameStore((s) => s.gameState);

  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'paused') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const levelPreset = getLevelPreset(selectedLevelId);
    const levelData = levelPreset.data;
    const trackPoints = levelData.track.points.map((p) => new Vector3(p.x, 0, p.z));

    // Calculate dynamic bounding box of track for optimal rally gauge framing
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of trackPoints) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }
    const centerTrackX = (minX + maxX) / 2;
    const centerTrackZ = (minZ + maxZ) / 2;
    const spanX = Math.max(200, maxX - minX);
    const spanZ = Math.max(200, maxZ - minZ);
    const maxSpan = Math.max(spanX, spanZ) * 1.35;

    // Coordinate conversion function
    const toCanvasCoords = (wx: number, wz: number): [number, number] => {
      const cx = CANVAS_SIZE / 2 + ((wx - centerTrackX) / maxSpan) * INNER_SIZE;
      const cy = CANVAS_SIZE / 2 + ((wz - centerTrackZ) / maxSpan) * INNER_SIZE;
      return [cx, cy];
    };

    // ─── 1. Pre-render static background and rally stage track onto offscreen canvas ───
    const offscreen = document.createElement('canvas');
    offscreen.width = CANVAS_SIZE;
    offscreen.height = CANVAS_SIZE;
    const offCtx = offscreen.getContext('2d');

    if (offCtx) {
      // Circular clip mask for rally gauge dial
      offCtx.beginPath();
      offCtx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 2, 0, Math.PI * 2);
      offCtx.clip();

      // Textured dark rally instrument background
      const bgGrad = offCtx.createRadialGradient(
        CANVAS_SIZE / 2, CANVAS_SIZE / 2, 10,
        CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2
      );
      bgGrad.addColorStop(0, '#1a1f2c');
      bgGrad.addColorStop(1, '#0e1219');
      offCtx.fillStyle = bgGrad;
      offCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Subtle rally compass grid / crosshairs
      offCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      offCtx.lineWidth = 1;
      offCtx.setLineDash([3, 4]);

      // Crosshair lines
      offCtx.beginPath();
      offCtx.moveTo(CANVAS_SIZE / 2, 12);
      offCtx.lineTo(CANVAS_SIZE / 2, CANVAS_SIZE - 12);
      offCtx.moveTo(12, CANVAS_SIZE / 2);
      offCtx.lineTo(CANVAS_SIZE - 12, CANVAS_SIZE / 2);
      offCtx.stroke();
      offCtx.setLineDash([]);

      // Subtle range rings
      offCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      offCtx.beginPath();
      offCtx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE * 0.28, 0, Math.PI * 2);
      offCtx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE * 0.44, 0, Math.PI * 2);
      offCtx.stroke();

      // Cardinal direction letters (N, S, E, W) in classic motorsport typography
      offCtx.font = 'bold 9px "Segoe UI", sans-serif';
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'middle';
      offCtx.fillStyle = '#ff3344';
      offCtx.fillText('N', CANVAS_SIZE / 2, 16);
      offCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      offCtx.fillText('S', CANVAS_SIZE / 2, CANVAS_SIZE - 16);
      offCtx.fillText('E', CANVAS_SIZE - 15, CANVAS_SIZE / 2);
      offCtx.fillText('W', 15, CANVAS_SIZE / 2);

      // Spline generation for rally stage route
      const spline = new CatmullRomCurve3(trackPoints, true, 'catmullrom', 0.5);
      const sampledPoints = spline.getSpacedPoints(160);

      // Outer road base (dark asphalt edge)
      offCtx.beginPath();
      offCtx.lineWidth = 6;
      offCtx.strokeStyle = 'rgba(40, 50, 65, 0.9)';
      offCtx.lineCap = 'round';
      offCtx.lineJoin = 'round';

      for (let i = 0; i < sampledPoints.length; i++) {
        const [px, py] = toCanvasCoords(sampledPoints[i].x, sampledPoints[i].z);
        if (i === 0) offCtx.moveTo(px, py);
        else offCtx.lineTo(px, py);
      }
      offCtx.closePath();
      offCtx.stroke();

      // Inner rally stage track line (crisp high-contrast rally surface)
      offCtx.beginPath();
      offCtx.lineWidth = 2.5;
      offCtx.strokeStyle = '#f8fafc';
      for (let i = 0; i < sampledPoints.length; i++) {
        const [px, py] = toCanvasCoords(sampledPoints[i].x, sampledPoints[i].z);
        if (i === 0) offCtx.moveTo(px, py);
        else offCtx.lineTo(px, py);
      }
      offCtx.closePath();
      offCtx.stroke();

      // Start/Finish Gate Marker (Chequered / Golden flag tick)
      const [startPx, startPy] = toCanvasCoords(trackPoints[0].x, trackPoints[0].z);
      offCtx.fillStyle = '#eab308';
      offCtx.beginPath();
      offCtx.arc(startPx, startPy, 4.5, 0, Math.PI * 2);
      offCtx.fill();
      offCtx.strokeStyle = '#000000';
      offCtx.lineWidth = 1.2;
      offCtx.stroke();
    }

    // ─── 2. Dynamic render loop for player & checkpoints ───
    let animationFrameId: number;

    const renderMinimap = () => {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.drawImage(offscreen, 0, 0);

      // Draw Checkpoints (Time Attack mode)
      if (useGameStore.getState().gameMode === 'timeattack') {
        const currentCp = useRacingStore.getState().currentCheckpoint;
        for (let i = 0; i < trackPoints.length; i++) {
          const [cx, cy] = toCanvasCoords(trackPoints[i].x, trackPoints[i].z);
          const isTarget = i === currentCp;
          const isStart = i === 0;

          if (isTarget) {
            // Target checkpoint with pulse ring
            ctx.beginPath();
            ctx.arc(cx, cy, 6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(227, 24, 55, 0.35)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#e31837';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else if (!isStart) {
            ctx.beginPath();
            ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.fill();
          }
        }
      }

      // Draw Player Rally Car Blip & Heading
      const gameStore = useGameStore.getState();
      const [carX, , carZ] = gameStore.position;
      const heading = gameStore.heading;
      const [playerCx, playerCy] = toCanvasCoords(carX, carZ);

      ctx.save();
      ctx.translate(playerCx, playerCy);
      ctx.rotate(-heading); // Three.js Y heading to 2D canvas rotation

      // Shadow behind player arrow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.moveTo(1, 8);
      ctx.lineTo(5, -4);
      ctx.lineTo(1, -2);
      ctx.lineTo(-3, -4);
      ctx.closePath();
      ctx.fill();

      // Rally car pointer arrow (+Y on canvas when heading=0)
      ctx.beginPath();
      ctx.moveTo(0, 7);
      ctx.lineTo(4, -5);
      ctx.lineTo(0, -3);
      ctx.lineTo(-4, -5);
      ctx.closePath();

      ctx.fillStyle = '#ff2233';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.restore();

      animationFrameId = requestAnimationFrame(renderMinimap);
    };

    animationFrameId = requestAnimationFrame(renderMinimap);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [selectedLevelId, gameState]);

  return (
    <div style={styles.container}>
      {/* Rally Bezel Header Badge */}
      <div style={styles.headerBadge}>
        <span style={styles.headerText}>STAGE MAP</span>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        style={styles.canvas}
      />

      {/* 4 Rally Corner Screws */}
      <div style={{ ...styles.screw, top: '6px', left: '6px' }} />
      <div style={{ ...styles.screw, top: '6px', right: '6px' }} />
      <div style={{ ...styles.screw, bottom: '6px', left: '6px' }} />
      <div style={{ ...styles.screw, bottom: '6px', right: '6px' }} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    width: `${CANVAS_SIZE}px`,
    height: `${CANVAS_SIZE}px`,
    borderRadius: '50%',
    background: '#121620',
    border: '3px solid #374151',
    boxShadow: '0 10px 30px rgba(0,0,0,0.8), inset 0 2px 4px rgba(255,255,255,0.15), inset 0 0 12px rgba(0,0,0,0.8)',
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: 20,
  },
  headerBadge: {
    position: 'absolute',
    top: '4px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(15, 20, 30, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    padding: '1px 8px',
    zIndex: 25,
    pointerEvents: 'none',
  },
  headerText: {
    fontSize: '8px',
    fontWeight: 900,
    color: '#94a3b8',
    letterSpacing: '1.2px',
    fontFamily: "'Segoe UI', sans-serif",
  },
  canvas: {
    width: '100%',
    height: '100%',
    display: 'block',
  },
  screw: {
    position: 'absolute',
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: '#64748b',
    border: '1px solid #1e293b',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4)',
    pointerEvents: 'none',
    zIndex: 26,
  },
};

