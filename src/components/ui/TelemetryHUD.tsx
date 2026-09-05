import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useRacingStore } from '@/store/racingStore';
import { getLevelPreset } from '@/config/levelRegistry';

/**
 * High-performance Telemetry HUD & In-Game Debug Inspector overlay.
 * Displays vehicle telemetry, exact world coordinates, active level info,
 * current target checkpoint, and a live nearest-props spatial inspector.
 * Uses transient subscriptions for zero React re-render overhead.
 */
export function TelemetryHUD() {
  const telemetryEnabled = useGameStore((state) => state.telemetryEnabled);

  // Telemetry DOM Refs
  const posRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef<HTMLDivElement>(null);
  const latSpeedRef = useRef<HTMLDivElement>(null);
  const slipAngleRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const flGripRef = useRef<HTMLDivElement>(null);
  const frGripRef = useRef<HTMLDivElement>(null);
  const rlGripRef = useRef<HTMLDivElement>(null);
  const rrGripRef = useRef<HTMLDivElement>(null);
  const nearbyPropsRef = useRef<HTMLDivElement>(null);

  // Toggle with 'T' key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 't') {
        useGameStore.getState().setTelemetryEnabled(!useGameStore.getState().telemetryEnabled);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update DOM directly when telemetry is active
  useEffect(() => {
    if (!telemetryEnabled) return;

    let lastPropsCheckTime = 0;

    const updateTelemetry = (state: ReturnType<typeof useGameStore.getState>) => {
      const [px, py, pz] = state.position;

      if (posRef.current) {
        posRef.current.innerText = `Pos: X: ${px.toFixed(1)} | Y: ${py.toFixed(1)} | Z: ${pz.toFixed(1)}`;
      }
      if (speedRef.current) {
        speedRef.current.innerText = `Speed: ${state.speed} km/h`;
      }
      if (latSpeedRef.current) {
        latSpeedRef.current.innerText = `Lat Speed: ${state.lateralSpeed.toFixed(2)} m/s`;
      }
      if (slipAngleRef.current) {
        slipAngleRef.current.innerText = `Slip Angle: ${(state.slipAngle * (180 / Math.PI)).toFixed(1)}°`;
      }
      if (engineRef.current) {
        const gearText = state.gear === -1 ? 'R' : state.gear === 0 ? 'N' : `${state.gear}`;
        engineRef.current.innerText = `Gear: ${gearText} | RPM: ${Math.round(state.rpm)} | Heading: ${(state.heading * (180 / Math.PI)).toFixed(1)}°`;
      }
      if (surfaceRef.current) {
        surfaceRef.current.innerText = `Surface: ${state.surface.toUpperCase()}`;
      }

      // Checkpoint & stage info
      const racing = useRacingStore.getState();
      const levelPreset = getLevelPreset(state.selectedLevelId);
      if (stageRef.current) {
        stageRef.current.innerText = `Stage: ${levelPreset.name} | Target CP: #${racing.currentCheckpoint} / ${racing.totalCheckpoints || 0}`;
      }

      // Friction grips
      if (flGripRef.current) flGripRef.current.innerText = `FL: ${state.tireGrips[0]?.toFixed(2) || '0.00'}`;
      if (frGripRef.current) frGripRef.current.innerText = `FR: ${state.tireGrips[1]?.toFixed(2) || '0.00'}`;
      if (rlGripRef.current) rlGripRef.current.innerText = `RL: ${state.tireGrips[2]?.toFixed(2) || '0.00'}`;
      if (rrGripRef.current) rrGripRef.current.innerText = `RR: ${state.tireGrips[3]?.toFixed(2) || '0.00'}`;

      // Throttle spatial props search to ~5Hz to save CPU
      const now = performance.now();
      if (now - lastPropsCheckTime > 200 && nearbyPropsRef.current) {
        lastPropsCheckTime = now;
        const allProps = levelPreset.data.props;
        const nearby: { id: string; type: string; pos: [number, number, number]; dist: number }[] = [];

        for (let i = 0; i < allProps.length; i++) {
          const p = allProps[i];
          const dx = p.position[0] - px;
          const dz = p.position[2] - pz;
          const dSq = dx * dx + dz * dz;
          if (dSq < 45 * 45) {
            nearby.push({
              id: p.id,
              type: p.type,
              pos: p.position,
              dist: Math.sqrt(dSq),
            });
          }
        }

        nearby.sort((a, b) => a.dist - b.dist);
        const top = nearby.slice(0, 4);

        if (top.length === 0) {
          nearbyPropsRef.current.innerHTML = '<span style="color: #666;">(No objects within 45m)</span>';
        } else {
          nearbyPropsRef.current.innerHTML = top
            .map(
              (item) =>
                `<div style="margin-bottom: 2px;">• <strong style="color:#00e5ff;">[${item.id}]</strong> ${item.type} <span style="color:#ffb74d;">@(${item.pos[0].toFixed(0)}, ${item.pos[2].toFixed(0)})</span> <span style="color:#a5d6a7;">[${item.dist.toFixed(1)}m]</span></div>`,
            )
            .join('');
        }
      }
    };

    updateTelemetry(useGameStore.getState());
    const unsub = useGameStore.subscribe(updateTelemetry);

    return () => unsub();
  }, [telemetryEnabled]);

  if (!telemetryEnabled) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(10px + var(--sat))',
        left: 'calc(10px + var(--sal))',
        backgroundColor: 'rgba(10, 14, 23, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(0, 229, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
        color: '#00e5ff',
        padding: '12px 14px',
        fontFamily: 'monospace',
        fontSize: '11px',
        lineHeight: '1.45',
        borderRadius: '8px',
        pointerEvents: 'none',
        zIndex: 9999,
        minWidth: '280px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 4 }}>
        <h3 style={{ margin: 0, color: '#fff', fontSize: '12px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Telemetry & Debug [T]
        </h3>
        <span style={{ color: '#ffb74d', fontSize: '10px' }}>DEV INSPECTOR</span>
      </div>

      {/* Stage & Checkpoint */}
      <div ref={stageRef} style={{ color: '#fff', fontWeight: 'bold', marginBottom: 4 }}>
        Stage: ... | Target CP: #0
      </div>

      {/* Coordinates */}
      <div ref={posRef} style={{ color: '#00e5ff', fontWeight: 'bold' }}>
        Pos: X: 0.0 | Y: 0.0 | Z: 0.0
      </div>

      {/* Vehicle Dynamics */}
      <div ref={engineRef} style={{ color: '#ccc' }}>Gear: 1 | RPM: 1000 | Heading: 0.0°</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px', marginTop: 2 }}>
        <div ref={speedRef}>Speed: 0 km/h</div>
        <div ref={latSpeedRef}>Lat: 0.00 m/s</div>
        <div ref={slipAngleRef}>Slip: 0.0°</div>
        <div ref={surfaceRef} style={{ color: '#ffb74d' }}>Surface: GRAVEL</div>
      </div>

      {/* Tire Grip Friction */}
      <div style={{ marginTop: 6, paddingTop: 4, borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
        <div style={{ color: '#aaa', fontSize: '10px' }}>Tire Friction Grips:</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px 8px', color: '#81c784' }}>
          <div ref={flGripRef}>FL: 0.00</div>
          <div ref={frGripRef}>FR: 0.00</div>
          <div ref={rlGripRef}>RL: 0.00</div>
          <div ref={rrGripRef}>RR: 0.00</div>
        </div>
      </div>

      {/* Spatial Props Inspector */}
      <div style={{ marginTop: 6, paddingTop: 4, borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
        <div style={{ color: '#ffb74d', fontWeight: 'bold', fontSize: '10px', marginBottom: 2 }}>
          Nearby Objects Inspector (Radius 45m):
        </div>
        <div ref={nearbyPropsRef} style={{ fontSize: '10px', color: '#eee' }}>
          (Scanning objects...)
        </div>
      </div>
    </div>
  );
}
