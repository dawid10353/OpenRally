export interface CheckpointData {
  id: number;
  position: [number, number, number];
  rotationY: number;
  width: number;
  isStart: boolean;
  isFinish: boolean;
}

export type RaceStatus = 'idle' | 'racing' | 'completed';

export interface RacingStore {
  raceStatus: RaceStatus;
  currentCheckpoint: number;
  totalCheckpoints: number;
  currentLapTime: number;
  bestLapTime: number | null;
  /** Best lap times indexed by level/track ID */
  bestLapTimes: Record<string, number>;
  lastLapTime: number | null;
  splitDelta: number | null; // delta to best lap in seconds (negative is faster)
  lapCount: number;
  showStageComplete: boolean;

  // Actions
  startRace: () => void;
  updateTimer: (dt: number) => void;
  passCheckpoint: (index: number) => void;
  resetRace: () => void;
  getBestLapForLevel: (levelId: string) => number | null;
  syncBestLapForLevel: (levelId: string) => void;
}
