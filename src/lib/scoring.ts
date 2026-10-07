import { clamp } from "./format";
import type { Fact, Guess, QuestionResult, RoundResult, Scale } from "./types";

export const MAX_PER_QUESTION = 200;
export const QUESTIONS_PER_ROUND = 5;
export const MAX_TOTAL = MAX_PER_QUESTION * QUESTIONS_PER_ROUND; // 1000
/** A round is a "win" when at least this many brackets contain the answer. */
export const WIN_THRESHOLD = 3;

export type Tier = "miss" | "wide" | "solid" | "pinpoint";

/**
 * Fraction of the slider domain a bracket covers, measured in the domain's
 * own scale so that "tightness" means the same thing on log and linear axes.
 */
export function coverageOf(
  low: number,
  high: number,
  min: number,
  max: number,
  scale: Scale,
): number {
  const lo = Math.min(low, high);
  const hi = Math.max(low, high);
  let cov: number;
  if (scale === "log") {
    cov = (Math.log(hi) - Math.log(lo)) / (Math.log(max) - Math.log(min));
  } else {
    cov = (hi - lo) / (max - min);
  }
  return clamp(cov, 0, 1);
}

/**
 * Score one bracket.
 *
 * The payoff is the heart of the game: you only score if the true value is
 * inside your bracket, and the tighter the bracket the more you earn. A bracket
 * spanning the whole domain is worth ~0 even when it contains the answer, so
 * hedging wide is never a free win — you have to commit to be rewarded.
 */
export function scoreQuestion(guess: Guess, fact: Fact): QuestionResult {
  const low = Math.min(guess.low, guess.high);
  const high = Math.max(guess.low, guess.high);
  const inside = fact.value >= low && fact.value <= high;
  const coverage = coverageOf(low, high, fact.min, fact.max, fact.scale);
  const points = inside ? Math.round(MAX_PER_QUESTION * (1 - coverage)) : 0;
  return { factId: fact.id, low, high, value: fact.value, inside, coverage, points };
}

/** Bucket a question's points into a tier for emoji/share/visuals. */
export function tierOf(points: number): Tier {
  if (points <= 0) return "miss";
  if (points >= 160) return "pinpoint";
  if (points >= 80) return "solid";
  return "wide";
}

export function isWin(hits: number): boolean {
  return hits >= WIN_THRESHOLD;
}

/** Score a full round from per-question brackets. */
export function scoreRound(
  guesses: Guess[],
  facts: Fact[],
  meta: { puzzleId: number; dateISO: string; isArchive: boolean },
): RoundResult {
  const results = facts.map((fact, i) => scoreQuestion(guesses[i], fact));
  const total = results.reduce((sum, r) => sum + r.points, 0);
  const hits = results.filter((r) => r.inside).length;
  return {
    puzzleId: meta.puzzleId,
    dateISO: meta.dateISO,
    total,
    hits,
    results,
    isArchive: meta.isArchive,
    completedAt: Date.now(),
  };
}
