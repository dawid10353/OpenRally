import { create } from 'zustand';
import type { RacingStore } from '@/types/racing';
import { emitGameEvent } from '@/utils/events';
import { useGameStore } from '@/store/gameStore';

const TRACK_RECORDS_KEY = 'openrally_track_records';
const LEGACY_BEST_LAP_KEY = 'openrally_best_lap';

function loadTrackRecords(): Record<string, number> {
  try {
    const raw = localStorage.getItem(TRACK_RECORDS_KEY);
    if (raw) {
      return JSON.parse(raw) as Record<string, number>;
    }
    // Fallback/migration for single legacy best lap
    const legacy = localStorage.getItem(LEGACY_BEST_LAP_KEY);
    if (legacy) {
      const parsed = parseFloat(legacy);
      if (!isNaN(parsed)) {
        return { level1: parsed };
      }
    }
    return {};
  } catch {
    return {};
  }
}

function saveTrackRecords(records: Record<string, number>): void {
  try {
    localStorage.setItem(TRACK_RECORDS_KEY, JSON.stringify(records));
  } catch {
    // ignore
  }
}

const initialRecords = loadTrackRecords();
const initialLevel = useGameStore.getState().selectedLevelId;

export const useRacingStore = create<RacingStore>((set, get) => ({
  raceStatus: 'idle',
  currentCheckpoint: 0,
  totalCheckpoints: 10,
  currentLapTime: 0,
  bestLapTimes: initialRecords,
  bestLapTime: initialRecords[initialLevel] ?? null,
  lastLapTime: null,
  splitDelta: null,
  lapCount: 0,
  showStageComplete: false,

  getBestLapForLevel: (levelId: string) => {
    return get().bestLapTimes[levelId] ?? null;
  },

  syncBestLapForLevel: (levelId: string) => {
    const records = get().bestLapTimes;
    set({ bestLapTime: records[levelId] ?? null });
  },

  startRace: () => {
    set({
      raceStatus: 'racing',
      currentCheckpoint: 1, // Heading towards checkpoint 1
      currentLapTime: 0,
      splitDelta: null,
      showStageComplete: false,
    });
  },

  updateTimer: (dt: number) => {
    const { raceStatus, currentLapTime } = get();
    if (raceStatus === 'racing') {
      set({ currentLapTime: currentLapTime + dt });
    }
  },

  passCheckpoint: (index: number) => {
    const { raceStatus, currentCheckpoint, totalCheckpoints, currentLapTime, bestLapTimes, lapCount } = get();

    // Crossing start line from idle or completed starts the race timer
    if (index === 0 && (raceStatus === 'idle' || raceStatus === 'completed')) {
      get().startRace();
      return;
    }

    if (index === currentCheckpoint) {
      emitGameEvent('checkpoint_passed', {
        checkpointIndex: index,
        totalCheckpoints,
      });

      // If we are racing and crossed checkpoint 0 (Start/Finish gantry after completing circuit), finish the lap!
      if (index === 0 && raceStatus === 'racing') {
        const finalTime = currentLapTime;
        const currentLevelId = useGameStore.getState().selectedLevelId;
        const previousBest = bestLapTimes[currentLevelId] ?? null;
        const isBest = !previousBest || finalTime < previousBest;

        let newRecords = bestLapTimes;
        let newBest = previousBest;

        if (isBest) {
          newBest = finalTime;
          newRecords = { ...bestLapTimes, [currentLevelId]: finalTime };
          saveTrackRecords(newRecords);
        }

        set({
          raceStatus: 'completed',
          currentCheckpoint: 0,
          lastLapTime: finalTime,
          bestLapTime: newBest,
          bestLapTimes: newRecords,
          lapCount: lapCount + 1,
          showStageComplete: true,
        });

        emitGameEvent('lap_completed', {
          lap: lapCount + 1,
          lapTime: finalTime,
          isBest,
        });

        // Hide stage complete banner after 4 seconds
        setTimeout(() => {
          set({ showStageComplete: false });
        }, 4000);
      } else {
        // Advance to next checkpoint along the closed loop (1 -> 2 -> ... -> N-1 -> 0)
        const nextCp = (currentCheckpoint + 1) % totalCheckpoints;
        set({ currentCheckpoint: nextCp });
      }
    }
  },

  resetRace: () => {
    set({
      raceStatus: 'idle',
      currentCheckpoint: 0,
      currentLapTime: 0,
      splitDelta: null,
      showStageComplete: false,
    });
  },
}));
