import factsData from "../data/facts.json";
import puzzlesData from "../data/puzzles.json";
import type { DailyPuzzle, Fact } from "./types";

const DAY_MS = 86_400_000;

const facts = factsData as Fact[];
const factById = new Map(facts.map((f) => [f.id, f]));

export const EPOCH_UTC: string = puzzlesData.epochUTC;
export const RESET_UTC: string = puzzlesData.resetUTC; // "00:00"
export const TOTAL_PUZZLES: number = puzzlesData.days.length;

const epochMs = Date.parse(`${EPOCH_UTC}T00:00:00Z`);

/** UTC midnight (ms) for a given instant. */
function utcMidnight(ms: number): number {
  return Math.floor((ms - epochMs) / DAY_MS) * DAY_MS + epochMs;
}

/** 0-based index of today's puzzle (days since the launch epoch, in UTC). */
export function todayIndex(now: number = Date.now()): number {
  return Math.floor((utcMidnight(now) - epochMs) / DAY_MS);
}

/** Highest index that is actually playable right now (today, clamped to pool). */
export function maxPlayableIndex(now: number = Date.now()): number {
  return Math.min(todayIndex(now), TOTAL_PUZZLES - 1);
}

/** Milliseconds until the next 00:00 UTC reset. */
export function msUntilNextReset(now: number = Date.now()): number {
  const next = utcMidnight(now) + DAY_MS;
  return next - now;
}

/** "07h 12m 33s" */
export function formatCountdown(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSec = Math.floor(clamped / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

/** Resolve a 0-based index into a fully-hydrated puzzle, or null if missing. */
export function puzzleForIndex(index: number): DailyPuzzle | null {
  const entry = puzzlesData.days[index];
  if (!entry) return null;
  const questions = entry.factIds
    .map((id) => factById.get(id))
    .filter((f): f is Fact => Boolean(f));
  if (questions.length === 0) return null;
  return { id: entry.id, dateISO: entry.dateISO, questions };
}

/** Today's puzzle. */
export function todaysPuzzle(now: number = Date.now()): DailyPuzzle | null {
  return puzzleForIndex(todayIndex(now));
}

/** "Tue · Oct 7, 2026" from a yyyy-mm-dd UTC date string. */
export function dateLabel(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
