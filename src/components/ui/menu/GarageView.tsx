import { useRef, useEffect } from 'react';
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
  const glRef = useRef<any>(null);

  useEffect(() => {
    const controls = controlsRef.current;
    return () => {
      if (controls) {
        controls.dispose();
      }
      if (glRef.current) {
        try {
          glRef.current.getExtension('WEBGL_lose_context')?.loseContext();
          glRef.current.dispose();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

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
    <div
      className="garage-subview menu-scalable-container"
      style={{ ...menuStyles.subView, color: textColor, width: '100%', minWidth: '540px', maxWidth: '880px' }}
    >
      <h2 style={menuStyles.subViewTitle}>Garage</h2>

      {/* Side-by-Side Split: Left Turntable, Right Specs & Actions */}
      <div className="garage-split-layout" style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '12px' }}>
        {/* Left: 3D Preview Canvas with 360° Orbit & Zoom */}
        <div
          className="garage-canvas-box"
          style={{
            width: '100%',
            height: '240px',
            position: 'relative',
            background: 'radial-gradient(ellipse at center, #18233C 0%, #0B101D 100%)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
            cursor: 'grab',
          }}
        >
          <Canvas
            shadows
            dpr={[1, 2]}
            camera={{ position: [3.8, 2.0, -5.4], fov: 42 }}
            onCreated={({ gl }) => {
              glRef.current = gl;
              const canvas = gl.domElement;
              canvas.addEventListener(
              'webglcontextlost',
              (e) => {
                e.preventDefault();
                console.warn('[GarageView] webglcontextlost handled via preventDefault()');
              },
              false,
            );
            canvas.addEventListener(
              'webglcontextrestored',
              () => {
                console.info('[GarageView] webglcontextrestored: resetting renderer state');
                gl.resetState();
              },
              false,
            );
            }}
          >
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

          {/* Interactive Zoom & Reset Controls (44x44px Touch Targets) */}
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            display: 'flex',
            gap: '8px',
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

        {/* Right: Vehicle Selection Tabs, Specs and Action Buttons */}
        <div className="garage-details-box" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Vehicle Selection Tabs */}
          <div style={{ ...menuStyles.tabContainer, marginBottom: '6px' }}>
            {availableVehicles.map((veh) => (
              <button
                key={veh.id}
                style={{
                  ...menuStyles.tabButton,
                  minHeight: '44px',
                  ...(previewVehicleId === veh.id ? menuStyles.activeTabButton : {}),
                }}
                onClick={() => onSelectPreviewVehicle(veh.id)}
              >
                {veh.name}
              </button>
            ))}
          </div>

          {/* Vehicle Header & Drive Badge */}
          <div style={{ ...menuStyles.garageHeader, marginBottom: '4px' }}>
            <span style={menuStyles.garageVehicleName}>{previewPreset.name}</span>
            <span style={menuStyles.driveBadge}>{previewPreset.stats.driveType}</span>
          </div>
          <p className="garage-desc-compact" style={{ ...menuStyles.subtitle, color: subtitleColor, margin: '0 0 8px 0', fontSize: '12px', lineHeight: 1.3 }}>
            {previewPreset.description}
          </p>

          <div style={{ ...menuStyles.statsContainer, gap: '6px' }}>
            <StatBar label="Top Speed" value={previewPreset.stats.topSpeed} />
            <StatBar label="Acceleration" value={previewPreset.stats.acceleration} />
            <StatBar label="Handling" value={previewPreset.stats.handling} />
            <StatBar label="Offroad" value={previewPreset.stats.offroad} />
          </div>

          <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>
            <button
              style={{
                ...menuStyles.button,
                minHeight: '44px',
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
                minHeight: '44px',
                color: textColor, 
                borderColor: 'rgba(255, 255, 255, 0.1)', 
                width: '100px',
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
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  zoomButton: {
    width: '44px',
    height: '44px',
    minWidth: '44px',
    minHeight: '44px',
    borderRadius: '8px',
    background: 'rgba(15, 23, 42, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#F1F5F9',
    fontSize: '18px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backdropFilter: 'blur(6px)',
    transition: 'background 0.15s ease, border-color 0.15s ease, transform 0.1s ease',
    touchAction: 'manipulation',
    boxSizing: 'border-box',
  },
};
