import { clamp } from "./format";
import { MAX_TOTAL } from "./scoring";
import { getClientId } from "./storage";
import type { Ranking } from "./types";

/** Histogram resolution for the "today's scores" chart. */
export const RANK_BUCKETS = 10;
export const RANK_BUCKET_W = MAX_TOTAL / RANK_BUCKETS; // 100

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const TIMEOUT_MS = 6000;

export function hasBackend(): boolean {
  return API_URL.length > 0;
}

/** Which histogram bucket a score falls in. */
export function bucketOf(score: number): number {
  return Math.min(RANK_BUCKETS - 1, Math.floor(score / RANK_BUCKET_W));
}

/** Percentile of `score` given histogram counts (% of players beaten). */
export function percentileFromBuckets(buckets: number[], score: number): number {
  const total = buckets.reduce((a, b) => a + b, 0);
  if (total === 0) return 50;
  const myBucket = bucketOf(score);
  let below = 0;
  for (let i = 0; i < myBucket; i++) below += buckets[i];
  // Count roughly half of your own bucket as "below" you.
  below += buckets[myBucket] * 0.5;
  return clamp(Math.round((below / total) * 100), 1, 99);
}

async function fetchJSON(url: string, init?: RequestInit): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function normalizeBuckets(raw: unknown): number[] {
  if (!Array.isArray(raw)) return new Array(RANK_BUCKETS).fill(0);
  const out = new Array(RANK_BUCKETS).fill(0);
  for (let i = 0; i < RANK_BUCKETS; i++) {
    const v = Number(raw[i]);
    out[i] = Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
  }
  return out;
}

/**
 * Submit today's score and get back the live ranking. Throws on any failure
 * so the caller can fall back to the offline estimate.
 */
export async function submitScore(
  day: number,
  score: number,
  hits: number,
): Promise<Ranking> {
  const data = (await fetchJSON(`${API_URL}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ day, score, hits, clientId: getClientId() }),
  })) as { buckets?: unknown; total?: unknown };
  const buckets = normalizeBuckets(data.buckets);
  const total = Number(data.total) || buckets.reduce((a, b) => a + b, 0);
  return {
    buckets,
    total,
    percentile: percentileFromBuckets(buckets, score),
    estimated: false,
  };
}

/** Read today's distribution without submitting (throws on failure). */
export async function fetchDistribution(day: number, score: number): Promise<Ranking> {
  const data = (await fetchJSON(`${API_URL}/distribution?day=${day}`)) as {
    buckets?: unknown;
    total?: unknown;
  };
  const buckets = normalizeBuckets(data.buckets);
  const total = Number(data.total) || buckets.reduce((a, b) => a + b, 0);
  return {
    buckets,
    total,
    percentile: percentileFromBuckets(buckets, score),
    estimated: false,
  };
}

// --- Offline estimate ------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A deterministic, plausible score distribution seeded by the day number, used
 * when there's no backend or it can't be reached. Same day → same curve, so the
 * chart is stable across reloads. Clearly flagged as an estimate in the UI.
 */
export function localEstimate(day: number, score: number): Ranking {
  const rand = mulberry32((day + 1) * 48271);
  const mean = 470 + Math.floor(rand() * 140); // 470..610
  const sd = 150 + Math.floor(rand() * 60); // 150..210
  const samples = 400;
  const buckets = new Array(RANK_BUCKETS).fill(0);
  let below = 0;

  for (let i = 0; i < samples; i++) {
    // Box–Muller for an approximately-normal sample.
    const u1 = Math.max(rand(), 1e-9);
    const u2 = rand();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const s = clamp(Math.round(mean + z * sd), 0, MAX_TOTAL);
    buckets[bucketOf(s)]++;
    if (s < score) below++;
  }

  return {
    buckets,
    total: samples,
    percentile: clamp(Math.round((below / samples) * 100), 1, 99),
    estimated: true,
  };
}

/**
 * Get today's ranking: submit to the backend when configured, otherwise (or on
 * any error/timeout) fall back to the offline estimate. Never throws.
 */
export async function getRanking(
  day: number,
  score: number,
  hits: number,
  { submit }: { submit: boolean } = { submit: true },
): Promise<Ranking> {
  if (hasBackend()) {
    try {
      return submit
        ? await submitScore(day, score, hits)
        : await fetchDistribution(day, score);
    } catch {
      /* fall through to estimate */
    }
  }
  return localEstimate(day, score);
}
