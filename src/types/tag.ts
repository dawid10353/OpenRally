import type { TagLeaderboardEntry } from './network';

export type TagMatchPhase = 'waiting' | 'countdown' | 'active' | 'intermission';

/**
 * Zustand store state & action interface for Rally Tag multiplayer mode.
 */
export interface TagStore {
  phase: TagMatchPhase;
  countdownRemaining: number;
  roundRemaining: number;
  intermissionRemaining: number;
  taggerId: string | null;
  taggerNickname: string | null;
  isTagger: boolean;
  isFrozen: boolean;
  freezeRemaining: number;
  immunityRemaining: number;
  assignedSpawnIndex: number;
  timeClean: number;
  tagsMade: number;
  leaderboard: TagLeaderboardEntry[];
  showResultsModal: boolean;

  // Actions
  setCountdown: (seconds: number, assignedSpawnIndex: number) => void;
  startMatch: (duration: number, taggerId: string, assignedSpawnIndex: number) => void;
  setTagPassed: (oldTaggerId: string, newTaggerId: string, freezeDurationMs: number) => void;
  endMatch: (intermissionRemaining: number, leaderboard: TagLeaderboardEntry[]) => void;
  tickSecond: () => void;
  tickDelta: (dt: number) => void;
  dismissResultsModal: () => void;
  reset: () => void;
}
