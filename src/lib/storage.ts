import type { RoundResult, StatsState } from "./types";

const PREFIX = "ballpark.";
const STATS_KEY = `${PREFIX}stats`;
const CLIENT_KEY = `${PREFIX}clientId`;
const INTRO_KEY = `${PREFIX}seenIntro`;
const resultKey = (puzzleId: number) => `${PREFIX}result.${puzzleId}`;

/** localStorage read that never throws (private mode, blocked storage, etc.). */
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — game still works, just won't persist */
  }
}

export const emptyStats: StatsState = {
  gamesPlayed: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastDailyIndex: null,
  scores: [],
};

export function loadStats(): StatsState {
  return { ...emptyStats, ...read<StatsState>(STATS_KEY, emptyStats) };
}

export function saveStats(stats: StatsState): void {
  write(STATS_KEY, stats);
}

/** Persist a completed round (daily or archive) so the archive can mark it. */
export function saveResult(result: RoundResult): void {
  write(resultKey(result.puzzleId), result);
}

export function loadResult(puzzleId: number): RoundResult | null {
  return read<RoundResult | null>(resultKey(puzzleId), null);
}

/** A stable anonymous id used only to dedupe score submissions. */
export function getClientId(): string {
  let id = read<string>(CLIENT_KEY, "");
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `anon-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
    write(CLIENT_KEY, id);
  }
  return id;
}

export function hasSeenIntro(): boolean {
  return read<boolean>(INTRO_KEY, false);
}

export function markIntroSeen(): void {
  write(INTRO_KEY, true);
}
