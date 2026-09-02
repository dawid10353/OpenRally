import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import type { VehiclePreset } from '@/types/vehicle';
import type { LevelPreset } from '@/types/level';
import { formatLapTime } from './menuStyles';
import { CarModelDisplay } from './CarModelDisplay';

export const STAGE_BANNERS: Record<string, string> = {
  level1_island: '/images/stages/island_circuit.jpg',
  level2_desert: '/images/stages/desert_canyon.jpg',
  level3_sweden: '/images/stages/sweden_snow.jpg',
  level4_britain: '/images/stages/highland_castle.jpg',
};

interface HeroShowcaseProps {
  vehicle: VehiclePreset;
  level: LevelPreset;
  bestLapTime: number | null;
  gamepadConnected: boolean;
  gamepadName: string;
  gamepadType: 'xbox' | 'dualsense' | 'generic';
  onOpenGarage: () => void;
  onOpenTracks: () => void;
}

export function HeroShowcase({
  vehicle,
  level,
  bestLapTime,
  gamepadConnected,
  gamepadName,
  gamepadType,
  onOpenGarage,
  onOpenTracks,
}: HeroShowcaseProps) {
  const stageBanner = STAGE_BANNERS[level.id] || STAGE_BANNERS.level1_island;

  return (
    <div style={styles.container}>
      {/* Active Vehicle Card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardSectionTag}>01 // ACTIVE MACHINE</span>
          <button style={styles.cardActionLink} onClick={onOpenGarage}>
            GARAGE ➜
          </button>
        </div>

        {/* Interactive 3D Turntable */}
        <div style={styles.carCanvasContainer}>
          <Canvas shadows dpr={[1, 2]} camera={{ position: [3.8, 1.8, -5.2], fov: 42 }}>
            <color attach="background" args={['#0c121e']} />
            <ambientLight intensity={0.9} />
            <directionalLight position={[8, 10, 8]} intensity={2.2} castShadow />
            <directionalLight position={[-8, 6, -8]} intensity={0.7} color="#3B82F6" />
            <group position={[0, 0.1, 0]}>
              <CarModelDisplay preset={vehicle} />
            </group>
            <OrbitControls
              enablePan={false}
              enableZoom={true}
              minDistance={2.6}
              maxDistance={8.0}
              minPolarAngle={Math.PI / 12}
              maxPolarAngle={Math.PI / 2 - 0.05}
              enableDamping={true}
              dampingFactor={0.08}
              target={[0, 0.35, 0]}
            />
            <Environment preset="city" />
          </Canvas>
          <div style={styles.turntableHint}>DRAG TO ROTATE • SCROLL TO ZOOM</div>
        </div>

        <div style={styles.vehicleTitleRow}>
          <h2 style={styles.vehicleName}>{vehicle.name}</h2>
          <span style={styles.driveBadge}>{vehicle.stats.driveType}</span>
        </div>

        <p style={styles.vehicleDesc}>{vehicle.description}</p>

        {/* Telemetry Stat Grid */}
        <div style={styles.telemetryGrid}>
          <div style={styles.telemetryItem}>
            <span style={styles.statLabel}>TOP SPEED</span>
            <span style={styles.statNumber}>
              {vehicle.config.engine.maxSpeed} <span style={styles.statUnit}>km/h</span>
            </span>
            <div style={styles.meterTrack}>
              <div
                style={{
                  ...styles.meterFill,
                  width: `${Math.min((vehicle.config.engine.maxSpeed / 240) * 100, 100)}%`,
                  background: 'linear-gradient(90deg, #3B82F6, #60A5FA)',
                }}
              />
            </div>
          </div>

          <div style={styles.telemetryItem}>
            <span style={styles.statLabel}>ACCELERATION</span>
            <span style={styles.statNumber}>
              {vehicle.stats.acceleration.toFixed(1)} <span style={styles.statUnit}>/ 10</span>
            </span>
            <div style={styles.meterTrack}>
              <div
                style={{
                  ...styles.meterFill,
                  width: `${(vehicle.stats.acceleration / 10) * 100}%`,
                  background: 'linear-gradient(90deg, #EF4444, #F87171)',
                }}
              />
            </div>
          </div>

          <div style={styles.telemetryItem}>
            <span style={styles.statLabel}>HANDLING</span>
            <span style={styles.statNumber}>
              {vehicle.stats.handling.toFixed(1)} <span style={styles.statUnit}>/ 10</span>
            </span>
            <div style={styles.meterTrack}>
              <div
                style={{
                  ...styles.meterFill,
                  width: `${(vehicle.stats.handling / 10) * 100}%`,
                  background: 'linear-gradient(90deg, #10B981, #34D399)',
                }}
              />
            </div>
          </div>

          <div style={styles.telemetryItem}>
            <span style={styles.statLabel}>OFFROAD AGILITY</span>
            <span style={styles.statNumber}>
              {vehicle.stats.offroad.toFixed(1)} <span style={styles.statUnit}>/ 10</span>
            </span>
            <div style={styles.meterTrack}>
              <div
                style={{
                  ...styles.meterFill,
                  width: `${(vehicle.stats.offroad / 10) * 100}%`,
                  background: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Active Stage Card with Photographic Banner */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardSectionTag}>02 // SELECTED STAGE</span>
          <button style={styles.cardActionLink} onClick={onOpenTracks}>
            SELECT STAGE ➜
          </button>
        </div>

        {/* Stage Photographic Hero Preview */}
        <div
          style={{
            ...styles.stageBannerContainer,
            backgroundImage: `linear-gradient(180deg, rgba(13, 19, 32, 0.2) 0%, rgba(8, 12, 20, 0.92) 80%), url(${stageBanner})`,
          }}
        >
          <div style={styles.stageBannerHeader}>
            <span
              style={{
                ...styles.difficultyBadge,
                background:
                  level.difficulty === 'easy'
                    ? 'rgba(16, 185, 129, 0.3)'
                    : level.difficulty === 'medium'
                    ? 'rgba(245, 158, 11, 0.3)'
                    : 'rgba(239, 68, 68, 0.3)',
                borderColor:
                  level.difficulty === 'easy'
                    ? '#10B981'
                    : level.difficulty === 'medium'
                    ? '#F59E0B'
                    : '#EF4444',
                color:
                  level.difficulty === 'easy'
                    ? '#34D399'
                    : level.difficulty === 'medium'
                    ? '#FBBF24'
                    : '#F87171',
              }}
            >
              {level.difficulty.toUpperCase()}
            </span>
          </div>

          <div style={styles.stageBannerFooter}>
            <div>
              <h3 style={styles.stageName}>{level.name}</h3>
              <span style={styles.stageSurfaceText}>Surface: {level.surfaceDescription}</span>
            </div>
            <div style={styles.stageRecordCol}>
              <span style={styles.recordLabel}>STAGE RECORD</span>
              <span style={styles.recordValue}>
                {bestLapTime && bestLapTime > 0 ? formatLapTime(bestLapTime) : '--:--.--'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hardware Status Strip */}
      <div style={styles.statusStrip}>
        <div style={styles.statusLeft}>
          <span
            style={{
              ...styles.statusDot,
              backgroundColor: gamepadConnected
                ? gamepadType === 'dualsense'
                  ? '#0070D1'
                  : '#107C10'
                : '#38BDF8',
              boxShadow: gamepadConnected
                ? gamepadType === 'dualsense'
                  ? '0 0 8px #0070D1'
                  : '0 0 8px #107C10'
                : '0 0 8px #38BDF8',
            }}
          />
          <span style={styles.statusText}>
            {gamepadConnected
              ? `CONTROLLER: ${gamepadName || (gamepadType === 'dualsense' ? 'Sony DualSense' : 'Xbox Controller')}`
              : 'INPUT: KEYBOARD / MOUSE'}
          </span>
        </div>
        <span style={styles.telemetryTag}>SIMULATION 60 HZ</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%',
    boxSizing: 'border-box',
  },
  card: {
    background: 'linear-gradient(135deg, rgba(16, 23, 38, 0.85) 0%, rgba(10, 14, 24, 0.92) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    padding: '18px 20px',
    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    paddingBottom: '8px',
  },
  cardSectionTag: {
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '1.5px',
    color: '#E31837',
    textTransform: 'uppercase',
  },
  cardActionLink: {
    background: 'transparent',
    border: 'none',
    color: '#94A3B8',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '1px',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '4px',
    transition: 'color 0.15s ease',
  },
  carCanvasContainer: {
    position: 'relative',
    width: '100%',
    height: '170px',
    borderRadius: '10px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    cursor: 'grab',
  },
  turntableHint: {
    position: 'absolute',
    bottom: '6px',
    right: '8px',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '1px',
    color: 'rgba(255, 255, 255, 0.4)',
    pointerEvents: 'none',
  },
  vehicleTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleName: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 800,
    letterSpacing: '0.5px',
    color: '#F8FAFC',
  },
  driveBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    background: 'linear-gradient(90deg, #991B1B, #E31837)',
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '1px',
  },
  vehicleDesc: {
    margin: 0,
    fontSize: '12px',
    color: '#94A3B8',
    lineHeight: 1.4,
  },
  telemetryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px 16px',
    marginTop: '2px',
  },
  telemetryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  statLabel: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '1px',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  statNumber: {
    fontSize: '14px',
    fontWeight: 800,
    color: '#F1F5F9',
  },
  statUnit: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#94A3B8',
  },
  meterTrack: {
    width: '100%',
    height: '4px',
    borderRadius: '2px',
    background: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  stageBannerContainer: {
    width: '100%',
    minHeight: '130px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
  },
  stageBannerHeader: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  stageBannerFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: '10px',
  },
  stageName: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 800,
    letterSpacing: '0.5px',
    color: '#FFFFFF',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
  },
  stageSurfaceText: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#CBD5E1',
    textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)',
  },
  stageRecordCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '2px',
  },
  recordLabel: {
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '1px',
    color: '#94A3B8',
    textTransform: 'uppercase',
    textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)',
  },
  recordValue: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#38BDF8',
    letterSpacing: '0.5px',
    fontVariantNumeric: 'tabular-nums',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
  },
  difficultyBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '1px',
    backdropFilter: 'blur(6px)',
  },
  statusStrip: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '10px',
    padding: '10px 16px',
  },
  statusLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  statusText: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.5px',
    color: '#CBD5E1',
    textTransform: 'uppercase',
  },
  telemetryTag: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '1px',
    color: '#64748B',
  },
};
