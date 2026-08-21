import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';

/**
 * High-performance Telemetry HUD overlay.
 * Uses transient Zustand subscriptions to update DOM directly without React re-renders.
 */
export function TelemetryHUD() {
  const telemetryEnabled = useGameStore((state) => state.telemetryEnabled);

  const speedRef = useRef<HTMLDivElement>(null);
  const latSpeedRef = useRef<HTMLDivElement>(null);
  const slipAngleRef = useRef<HTMLDivElement>(null);
  const flGripRef = useRef<HTMLDivElement>(null);
  const frGripRef = useRef<HTMLDivElement>(null);
  const rlGripRef = useRef<HTMLDivElement>(null);
  const rrGripRef = useRef<HTMLDivElement>(null);

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

    const updateTelemetry = (state: ReturnType<typeof useGameStore.getState>) => {
      if (speedRef.current) speedRef.current.innerText = `Speed: ${state.speed} km/h`;
      if (latSpeedRef.current) latSpeedRef.current.innerText = `Lat Speed: ${state.lateralSpeed.toFixed(2)} m/s`;
      if (slipAngleRef.current) slipAngleRef.current.innerText = `Slip Angle: ${(state.slipAngle * (180 / Math.PI)).toFixed(1)}°`;

      if (flGripRef.current) flGripRef.current.innerText = `FL: ${state.tireGrips[0]?.toFixed(2) || '0.00'}`;
      if (frGripRef.current) frGripRef.current.innerText = `FR: ${state.tireGrips[1]?.toFixed(2) || '0.00'}`;
      if (rlGripRef.current) rlGripRef.current.innerText = `RL: ${state.tireGrips[2]?.toFixed(2) || '0.00'}`;
      if (rrGripRef.current) rrGripRef.current.innerText = `RR: ${state.tireGrips[3]?.toFixed(2) || '0.00'}`;
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
        top: 10,
        left: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: '#0f0',
        padding: '10px',
        fontFamily: 'monospace',
        fontSize: '12px',
        borderRadius: '5px',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      <h3 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '14px' }}>Telemetry [T]</h3>
      <div ref={speedRef}>Speed: 0 km/h</div>
      <div ref={latSpeedRef}>Lat Speed: 0.00 m/s</div>
      <div ref={slipAngleRef}>Slip Angle: 0.0°</div>
      <div style={{ marginTop: 10 }}>
        <strong style={{ color: '#fff' }}>Tire Grips (Friction):</strong>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginTop: 5 }}>
          <div ref={flGripRef}>FL: 0.00</div>
          <div ref={frGripRef}>FR: 0.00</div>
          <div ref={rlGripRef}>RL: 0.00</div>
          <div ref={rrGripRef}>RR: 0.00</div>
        </div>
      </div>
    </div>
  );
}
