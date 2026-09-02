import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { VehiclePreset } from '@/types';
import { menuStyles, getFocusStyle } from './menuStyles';
import { CarModelDisplay, StatBar } from './CarModelDisplay';
import type { MenuView } from './types';

interface GarageViewProps {
  availableVehicles: VehiclePreset[];
  previewVehicleId: string;
  selectedVehicleId: string;
  previewPreset: VehiclePreset;
  focusedIndex: number;
  textColor: string;
  subtitleColor: string;
  onPointerMoveItem: (index: number, e: React.PointerEvent) => void;
  onSelectPreviewVehicle: (id: string) => void;
  onEquipVehicle: (id: string) => void;
  onSelectView: (view: MenuView) => void;
}

export function GarageView({
  availableVehicles,
  previewVehicleId,
  selectedVehicleId,
  previewPreset,
  focusedIndex,
  textColor,
  subtitleColor,
  onPointerMoveItem,
  onSelectPreviewVehicle,
  onEquipVehicle,
  onSelectView,
}: GarageViewProps) {
  const isEquipped = selectedVehicleId === previewVehicleId;
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!controlsRef.current) return;
    controlsRef.current.dollyIn(1.25);
    controlsRef.current.update();
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!controlsRef.current) return;
    controlsRef.current.dollyOut(1.25);
    controlsRef.current.update();
  };

  const handleResetCamera = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!controlsRef.current) return;
    controlsRef.current.reset();
  };

  return (
    <div style={{ ...menuStyles.subView, color: textColor, width: '100%', minWidth: '540px', maxWidth: '820px' }}>
      <h2 style={menuStyles.subViewTitle}>Garage</h2>

      {/* Vehicle Selection Tabs */}
      <div style={menuStyles.tabContainer}>
        {availableVehicles.map((veh) => (
          <button
            key={veh.id}
            style={{
              ...menuStyles.tabButton,
              ...(previewVehicleId === veh.id ? menuStyles.activeTabButton : {}),
            }}
            onClick={() => onSelectPreviewVehicle(veh.id)}
          >
            {veh.name}
          </button>
        ))}
      </div>

      {/* 3D Preview Canvas with 360° Orbit & Zoom */}
      <div style={{
        width: '100%',
        height: '300px',
        position: 'relative',
        background: 'radial-gradient(ellipse at center, #18233C 0%, #0B101D 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        cursor: 'grab',
      }}>
        <Canvas shadows dpr={[1, 2]} camera={{ position: [3.8, 2.0, -5.4], fov: 42 }}>
          <color attach="background" args={['#0B101D']} />
          <ambientLight intensity={0.9} />
          <directionalLight position={[10, 10, 10]} intensity={2.2} castShadow />
          <directionalLight position={[-8, 6, -8]} intensity={0.7} color="#3B82F6" />
          <group position={[0, 0.15, 0]}>
            <CarModelDisplay preset={previewPreset} />
          </group>
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom={true}
            minDistance={2.4}
            maxDistance={8.5}
            minPolarAngle={Math.PI / 12}
            maxPolarAngle={Math.PI / 2 - 0.05}
            enableDamping={true}
            dampingFactor={0.08}
            target={[0, 0.4, 0]}
          />
          <Environment preset="city" />
        </Canvas>

        {/* Interactive Zoom & Reset Controls */}
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          display: 'flex',
          gap: '6px',
          zIndex: 10,
        }}>
          <button
            type="button"
            title="Zoom In"
            style={styles.zoomButton}
            onClick={handleZoomIn}
          >
            +
          </button>
          <button
            type="button"
            title="Zoom Out"
            style={styles.zoomButton}
            onClick={handleZoomOut}
          >
            −
          </button>
          <button
            type="button"
            title="Reset Camera View"
            style={styles.zoomButton}
            onClick={handleResetCamera}
          >
            ↺
          </button>
        </div>

        {/* Interaction Hint */}
        <span style={{
          position: 'absolute',
          bottom: '8px',
          right: '12px',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '1px',
          color: 'rgba(255, 255, 255, 0.5)',
          pointerEvents: 'none',
          textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)',
        }}>
          DRAG TO ROTATE • SCROLL TO ZOOM
        </span>
      </div>

      {/* Specs and Description */}
      <div style={menuStyles.garageDetails}>
        <div style={menuStyles.garageHeader}>
          <span style={menuStyles.garageVehicleName}>{previewPreset.name}</span>
          <span style={menuStyles.driveBadge}>{previewPreset.stats.driveType}</span>
        </div>
        <p style={{ ...menuStyles.subtitle, color: subtitleColor, margin: '4px 0 12px 0', fontSize: '13px' }}>
          {previewPreset.description}
        </p>

        <div style={menuStyles.statsContainer}>
          <StatBar label="Top Speed" value={previewPreset.stats.topSpeed} />
          <StatBar label="Acceleration" value={previewPreset.stats.acceleration} />
          <StatBar label="Handling" value={previewPreset.stats.handling} />
          <StatBar label="Offroad" value={previewPreset.stats.offroad} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '12px' }}>
        <button
          style={{
            ...menuStyles.button,
            flex: 1,
            background: isEquipped ? 'linear-gradient(90deg, #059669, #10B981)' : 'linear-gradient(90deg, #991B1B, #E31837)',
            justifyContent: 'center',
            fontWeight: 700,
            color: '#FFFFFF',
            ...getFocusStyle(focusedIndex === 0),
          }}
          onPointerMove={(e) => onPointerMoveItem(0, e)}
          onClick={() => onEquipVehicle(previewVehicleId)}
        >
          {isEquipped ? '✓ EQUIPPED' : 'EQUIP VEHICLE'}
        </button>
        <button
          style={{ 
            ...menuStyles.button, 
            ...menuStyles.secondaryButton, 
            color: textColor, 
            borderColor: 'rgba(255, 255, 255, 0.1)', 
            width: '110px',
            justifyContent: 'center',
            ...getFocusStyle(focusedIndex === 1),
          }} 
          onPointerMove={(e) => onPointerMoveItem(1, e)}
          onClick={() => onSelectView('main')}
        >
          Back
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  zoomButton: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    background: 'rgba(15, 23, 42, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#F1F5F9',
    fontSize: '14px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backdropFilter: 'blur(6px)',
    transition: 'background 0.15s ease, border-color 0.15s ease, transform 0.1s ease',
  },
};
