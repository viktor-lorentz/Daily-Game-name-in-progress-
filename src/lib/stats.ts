import { isWin, MAX_TOTAL } from "./scoring";
import type { RoundResult, StatsState } from "./types";

/** Number of buckets in the personal score-distribution chart. */
export const DIST_BUCKETS = 5;
const BUCKET_W = MAX_TOTAL / DIST_BUCKETS; // 200

/**
 * Fold a freshly-completed DAILY round into lifetime stats.
 *
 * Pure function: returns a new StatsState. Archive rounds must never be passed
 * here — they don't count toward streaks, win rate, or the distribution.
 * Replaying a day that's already recorded is a no-op.
 */
export function applyDailyResult(stats: StatsState, result: RoundResult): StatsState {
  if (result.isArchive) return stats;
  const index = result.puzzleId - 1;
  if (stats.lastDailyIndex === index) return stats; // already counted today

  let currentStreak: number;
  if (stats.lastDailyIndex === index - 1) {
    currentStreak = stats.currentStreak + 1; // consecutive day
  } else {
    currentStreak = 1; // first game, or a gap broke the streak
  }

  return {
    gamesPlayed: stats.gamesPlayed + 1,
    wins: stats.wins + (isWin(result.hits) ? 1 : 0),
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    lastDailyIndex: index,
    scores: [...stats.scores, result.total],
  };
}

export interface DerivedStats {
  gamesPlayed: number;
  winRate: number; // 0..100
  currentStreak: number;
  maxStreak: number;
  average: number; // 0..1000
  best: number;
  /** Histogram of personal scores; buckets[i] covers [i*200, i*200+200). */
  distribution: number[];
}

export function deriveStats(stats: StatsState): DerivedStats {
  const distribution = new Array(DIST_BUCKETS).fill(0);
  for (const s of stats.scores) {
    const i = Math.min(DIST_BUCKETS - 1, Math.floor(s / BUCKET_W));
    distribution[i]++;
  }
  const total = stats.scores.reduce((a, b) => a + b, 0);
  return {
    gamesPlayed: stats.gamesPlayed,
    winRate: stats.gamesPlayed ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0,
    currentStreak: stats.currentStreak,
    maxStreak: stats.maxStreak,
    average: stats.scores.length ? Math.round(total / stats.scores.length) : 0,
    best: stats.scores.length ? Math.max(...stats.scores) : 0,
    distribution,
  };
}

/** Human label for a distribution bucket index, e.g. "600–799". */
export function bucketLabel(i: number): string {
  const lo = i * BUCKET_W;
  const hi = i === DIST_BUCKETS - 1 ? MAX_TOTAL : lo + BUCKET_W - 1;
  return `${lo}–${hi}`;
}
