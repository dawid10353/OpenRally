import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

export function TelemetryHUD() {
  const telemetryEnabled = useGameStore((state) => state.telemetryEnabled);
  const tireGrips = useGameStore((state) => state.tireGrips);
  const speed = useGameStore((state) => state.speed);
  const lateralSpeed = useGameStore((state) => state.lateralSpeed);
  const slipAngle = useGameStore((state) => state.slipAngle);

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

  if (!telemetryEnabled) return null;

  return (
    <div style={{
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
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '14px' }}>Telemetry [T]</h3>
      <div>Speed: {speed} km/h</div>
      <div>Lat Speed: {lateralSpeed.toFixed(2)} m/s</div>
      <div>Slip Angle: {(slipAngle * (180 / Math.PI)).toFixed(1)}°</div>
      <div style={{ marginTop: 10 }}>
        <strong style={{ color: '#fff' }}>Tire Grips (Friction):</strong>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginTop: 5 }}>
          <div>FL: {tireGrips[0]?.toFixed(2) || '0.00'}</div>
          <div>FR: {tireGrips[1]?.toFixed(2) || '0.00'}</div>
          <div>RL: {tireGrips[2]?.toFixed(2) || '0.00'}</div>
          <div>RR: {tireGrips[3]?.toFixed(2) || '0.00'}</div>
        </div>
      </div>
    </div>
  );
}
