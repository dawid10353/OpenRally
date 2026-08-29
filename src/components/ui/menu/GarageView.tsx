import { Canvas } from '@react-three/fiber';
import { PresentationControls, Environment } from '@react-three/drei';
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

  return (
    <div style={{ ...menuStyles.subView, color: textColor, width: '100%', minWidth: '520px' }}>
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

      {/* 3D Preview Canvas */}
      <div style={{ width: '100%', height: '240px', background: 'rgba(0,0,0,0.04)', borderRadius: '12px', overflow: 'hidden', cursor: 'grab' }}>
        <Canvas shadows dpr={[1, 2]} camera={{ position: [4, 2.5, -6], fov: 45 }}>
          <color attach="background" args={['#e8ecf0']} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 10, 10]} intensity={1.5} />
          <PresentationControls speed={1.5} global zoom={0.8} polar={[-0.1, Math.PI / 4]}>
            <group position={[0, 0.2, 0]}>
              <CarModelDisplay preset={previewPreset} />
            </group>
          </PresentationControls>
          <Environment preset="city" />
        </Canvas>
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
            background: isEquipped ? '#10b981' : 'linear-gradient(90deg, #1B365D, #E31837)',
            ...getFocusStyle(focusedIndex === 0),
          }}
          onPointerMove={(e) => onPointerMoveItem(0, e)}
          onClick={() => onEquipVehicle(previewVehicleId)}
        >
          {isEquipped ? '✓ Equipped' : 'Equip Vehicle'}
        </button>
        <button
          style={{ 
            ...menuStyles.button, 
            ...menuStyles.secondaryButton, 
            color: textColor, 
            borderColor: 'rgba(0,0,0,0.2)', 
            width: '100px',
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
