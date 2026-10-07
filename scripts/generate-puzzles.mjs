// @ts-check
/**
 * Deterministically assembles the daily puzzle schedule from the fact pool.
 *
 * Design goals:
 *  - Reproducible: the same fact pool always yields the same schedule.
 *  - Incremental: running this after adding new facts only APPENDS future days;
 *    already-published days are read back from puzzles.json and left untouched,
 *    so everyone keeps seeing the same puzzle for a date that has already run.
 *  - Varied: no fact repeats within MIN_GAP days, and a single day avoids
 *    repeating a category where possible.
 *
 * Usage:
 *   node scripts/generate-puzzles.mjs            # extend the schedule
 *   node scripts/generate-puzzles.mjs --fresh    # rebuild from scratch
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../src/data");
const FACTS_PATH = resolve(DATA_DIR, "facts.json");
const PUZZLES_PATH = resolve(DATA_DIR, "puzzles.json");

// ---- Tunables -------------------------------------------------------------
const EPOCH_UTC = "2026-10-01"; // Ballpark #1 is this UTC date.
const TARGET_DAYS = 120; // Generate well beyond the 60-day minimum.
const QUESTIONS_PER_DAY = 5;
const MIN_GAP = 20; // Don't reuse a fact within this many days if avoidable.
const DAY_MS = 86_400_000;
// ---------------------------------------------------------------------------

const fresh = process.argv.includes("--fresh");

/** Small, fast, seedable PRNG (mulberry32). */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dateISOForIndex(i) {
  const epoch = Date.parse(`${EPOCH_UTC}T00:00:00Z`);
  return new Date(epoch + i * DAY_MS).toISOString().slice(0, 10);
}

/** @type {Array<{id:string, category:string}>} */
const facts = JSON.parse(readFileSync(FACTS_PATH, "utf8"));
const factIds = new Set(facts.map((f) => f.id));
const categoryOf = new Map(facts.map((f) => [f.id, f.category]));

if (facts.length < QUESTIONS_PER_DAY) {
  throw new Error(`Need at least ${QUESTIONS_PER_DAY} facts, found ${facts.length}.`);
}

/** @type {Array<{id:number, dateISO:string, factIds:string[]}>} */
let days = [];
if (!fresh && existsSync(PUZZLES_PATH)) {
  const existing = JSON.parse(readFileSync(PUZZLES_PATH, "utf8"));
  if (existing.epochUTC === EPOCH_UTC && Array.isArray(existing.days)) {
    // Keep only days whose facts all still exist in the pool.
    days = existing.days.filter((d) =>
      d.factIds.every((/** @type {string} */ id) => factIds.has(id)),
    );
  }
}

function pickDay(index) {
  const rand = mulberry32((index + 1) * 2654435761);
  const recent = new Set();
  for (let d = Math.max(0, days.length - MIN_GAP); d < days.length; d++) {
    days[d].factIds.forEach((id) => recent.add(id));
  }

  const chosen = [];
  const usedCats = new Set();

  // Pass 1: fresh facts, distinct categories.
  for (const f of shuffle(facts, rand)) {
    if (chosen.length >= QUESTIONS_PER_DAY) break;
    if (recent.has(f.id) || usedCats.has(f.category)) continue;
    chosen.push(f.id);
    usedCats.add(f.category);
  }
  // Pass 2: relax the category rule, still avoid recent repeats.
  if (chosen.length < QUESTIONS_PER_DAY) {
    for (const f of shuffle(facts, rand)) {
      if (chosen.length >= QUESTIONS_PER_DAY) break;
      if (recent.has(f.id) || chosen.includes(f.id)) continue;
      chosen.push(f.id);
    }
  }
  // Pass 3: last resort, allow anything not already in this day.
  if (chosen.length < QUESTIONS_PER_DAY) {
    for (const f of shuffle(facts, rand)) {
      if (chosen.length >= QUESTIONS_PER_DAY) break;
      if (chosen.includes(f.id)) continue;
      chosen.push(f.id);
    }
  }
  return chosen;
}

for (let i = days.length; i < TARGET_DAYS; i++) {
  days.push({ id: i + 1, dateISO: dateISOForIndex(i), factIds: pickDay(i) });
}

// Re-stamp ids/dates so the schedule is always internally consistent.
days = days.slice(0, TARGET_DAYS).map((d, i) => ({
  id: i + 1,
  dateISO: dateISOForIndex(i),
  factIds: d.factIds,
}));

const output = {
  epochUTC: EPOCH_UTC,
  resetUTC: "00:00",
  questionsPerDay: QUESTIONS_PER_DAY,
  factCount: facts.length,
  generatedDays: days.length,
  days,
};

writeFileSync(PUZZLES_PATH, JSON.stringify(output, null, 2) + "\n");

// Report category spread as a quick sanity check.
const catCounts = {};
for (const d of days) {
  const cats = new Set(d.factIds.map((id) => categoryOf.get(id)));
  if (cats.size < d.factIds.length) {
    // Not fatal, but worth knowing about.
    // console.warn(`Day ${d.id} repeats a category.`);
  }
  for (const id of d.factIds) {
    const c = categoryOf.get(id);
    catCounts[c] = (catCounts[c] || 0) + 1;
  }
}

console.log(
  `✓ Wrote ${days.length} days (${facts.length} facts) to ${PUZZLES_PATH.replace(process.cwd() + "/", "")}`,
);
console.log("  Category spread:", catCounts);
