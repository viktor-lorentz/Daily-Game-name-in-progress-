/** The scale a question's slider (and its scoring) operates on. */
export type Scale = "log" | "linear";

/** A single estimable fact — the atomic unit of content. */
export interface Fact {
  id: string;
  category: string;
  /** The question shown to the player. */
  prompt: string;
  /** Unit label, e.g. "meters", "years old", "%". Empty string for unitless. */
  unit: string;
  /** The true answer. */
  value: number;
  /** Lower bound of the slider domain. For log scale this must be > 0. */
  min: number;
  /** Upper bound of the slider domain. */
  max: number;
  scale: Scale;
  /** A short, fun piece of context revealed after the player locks in. */
  blurb: string;
}

/** A day's puzzle: five facts, resolved and ready to play. */
export interface DailyPuzzle {
  /** 1-based puzzle number (dayIndex + 1). */
  id: number;
  /** yyyy-mm-dd in UTC, for display. */
  dateISO: string;
  questions: Fact[];
}

/** A confidence bracket the player draws for one question. */
export interface Guess {
  low: number;
  high: number;
}

/** The scored outcome of one question. */
export interface QuestionResult {
  factId: string;
  low: number;
  high: number;
  value: number;
  /** Did the bracket contain the true value? */
  inside: boolean;
  /** Fraction of the slider domain the bracket covered, 0..1. */
  coverage: number;
  /** Points earned, 0..MAX_PER_QUESTION. */
  points: number;
}

/** The scored outcome of a full round. */
export interface RoundResult {
  puzzleId: number;
  dateISO: string;
  /** Sum of question points, 0..MAX_TOTAL. */
  total: number;
  /** How many of the five brackets contained the answer. */
  hits: number;
  results: QuestionResult[];
  isArchive: boolean;
  completedAt: number;
}

/** Persisted lifetime statistics (daily games only). */
export interface StatsState {
  gamesPlayed: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  /** Puzzle index of the most recent daily game completed. */
  lastDailyIndex: number | null;
  /** Every daily total, oldest first. Powers the distribution + average. */
  scores: number[];
}

/** Today's aggregate ranking, either from the backend or the offline estimate. */
export interface Ranking {
  /** Percentage of players you scored strictly better than, 0..100. */
  percentile: number;
  /** Histogram counts; buckets[i] covers scores [i*100, i*100+100). */
  buckets: number[];
  /** Total number of players counted. */
  total: number;
  /** True when this is the built-in offline estimate rather than live data. */
  estimated: boolean;
}
