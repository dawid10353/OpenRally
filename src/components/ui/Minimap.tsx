import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useRacingStore } from '@/store/racingStore';
import { getLevelPreset } from '@/config/levelRegistry';
import { CatmullRomCurve3, Vector3 } from 'three';

const CANVAS_SIZE = 180;
const MARGIN = 14;
const INNER_SIZE = CANVAS_SIZE - MARGIN * 2;

/**
 * Ultra-high-performance 2D Minimap Canvas overlay.
 * Uses an offscreen pre-rendered layer for static radar circles and the track spline,
 * blitting it in a single drawImage call before drawing dynamic player/checkpoint blips.
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
    const mapWidth = levelData.terrainBase.width;
    const mapDepth = levelData.terrainBase.depth;

    // Coordinate conversion function
    const toCanvasCoords = (wx: number, wz: number): [number, number] => {
      const cx = MARGIN + ((wx + mapWidth / 2) / mapWidth) * INNER_SIZE;
      const cy = MARGIN + ((wz + mapDepth / 2) / mapDepth) * INNER_SIZE;
      return [cx, cy];
    };

    // ─── 1. Pre-render static background and track spline onto offscreen canvas ───
    const offscreen = document.createElement('canvas');
    offscreen.width = CANVAS_SIZE;
    offscreen.height = CANVAS_SIZE;
    const offCtx = offscreen.getContext('2d');

    const trackPoints = levelData.track.points.map((p) => new Vector3(p.x, 0, p.z));

    if (offCtx) {
      // Circular clip mask
      offCtx.beginPath();
      offCtx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 2, 0, Math.PI * 2);
      offCtx.clip();

      // Dark background
      offCtx.fillStyle = 'rgba(8, 12, 22, 0.85)';
      offCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Radar rings
      offCtx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      offCtx.lineWidth = 1;
      offCtx.beginPath();
      offCtx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE * 0.25, 0, Math.PI * 2);
      offCtx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE * 0.45, 0, Math.PI * 2);
      offCtx.stroke();

      // Spline generation
      const spline = new CatmullRomCurve3(trackPoints, true, 'catmullrom', 0.5);
      const sampledPoints = spline.getSpacedPoints(150);

      // Outer track line
      offCtx.beginPath();
      offCtx.lineWidth = 5;
      offCtx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      offCtx.lineCap = 'round';
      offCtx.lineJoin = 'round';

      for (let i = 0; i < sampledPoints.length; i++) {
        const [px, py] = toCanvasCoords(sampledPoints[i].x, sampledPoints[i].z);
        if (i === 0) offCtx.moveTo(px, py);
        else offCtx.lineTo(px, py);
      }
      offCtx.closePath();
      offCtx.stroke();

      // Inner track glow line
      offCtx.beginPath();
      offCtx.lineWidth = 2;
      offCtx.strokeStyle = '#00d4ff88';
      for (let i = 0; i < sampledPoints.length; i++) {
        const [px, py] = toCanvasCoords(sampledPoints[i].x, sampledPoints[i].z);
        if (i === 0) offCtx.moveTo(px, py);
        else offCtx.lineTo(px, py);
      }
      offCtx.closePath();
      offCtx.stroke();
    }

    // ─── 2. Animation loop for dynamic blips ───
    let animationFrameId: number;

    const renderMinimap = () => {
      // Fast single blit from pre-rendered static layer
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.drawImage(offscreen, 0, 0);

      // Draw Checkpoints (Time Attack mode only)
      if (useGameStore.getState().gameMode === 'timeattack') {
        const currentCp = useRacingStore.getState().currentCheckpoint;
        for (let i = 0; i < trackPoints.length; i++) {
          const [cx, cy] = toCanvasCoords(trackPoints[i].x, trackPoints[i].z);
          const isTarget = i === currentCp;
          const isStart = i === 0;

          ctx.beginPath();
          ctx.arc(cx, cy, isTarget ? 4.5 : isStart ? 3.5 : 2.5, 0, Math.PI * 2);
          ctx.fillStyle = isTarget ? '#00ff88' : isStart ? '#ffb700' : 'rgba(255, 255, 255, 0.4)';
          ctx.fill();

          if (isTarget) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      }

      // Draw Player Blip & Heading
      const gameStore = useGameStore.getState();
      const [carX, , carZ] = gameStore.position;
      const heading = gameStore.heading;
      const [playerCx, playerCy] = toCanvasCoords(carX, carZ);

      ctx.save();
      ctx.translate(playerCx, playerCy);
      ctx.rotate(-heading); // Three.js Y heading to 2D canvas rotation

      // Arrow triangle pointing in direction of movement (+Y on canvas when heading=0)
      ctx.beginPath();
      ctx.moveTo(0, 7);
      ctx.lineTo(4, -5);
      ctx.lineTo(0, -3);
      ctx.lineTo(-4, -5);
      ctx.closePath();

      ctx.fillStyle = '#ff2a5f';
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
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        style={styles.canvas}
      />
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
    boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(255,255,255,0.15)',
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: 20,
  },
  canvas: {
    width: '100%',
    height: '100%',
    display: 'block',
  },
};
