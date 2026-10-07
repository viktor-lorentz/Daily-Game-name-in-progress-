import type { Scale } from "./types";

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

/** Round to `n` significant figures. */
export function sigFigs(value: number, n = 2): number {
  if (value === 0) return 0;
  const digits = Math.ceil(Math.log10(Math.abs(value)));
  const power = n - digits;
  const mag = Math.pow(10, power);
  return Math.round(value * mag) / mag;
}

/** A "nice" step (1/2/5 × 10^k) that divides a range into ~100 parts. */
export function niceStep(range: number): number {
  if (range <= 0) return 1;
  const raw = range / 100;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const nice = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
  return nice * mag;
}

/**
 * Map a 0..1 slider fraction to a value in [min, max] on the given scale,
 * then snap it to a tidy number so the player's bracket reads cleanly.
 */
export function fracToValue(
  frac: number,
  min: number,
  max: number,
  scale: Scale,
): number {
  const f = clamp(frac, 0, 1);
  let raw: number;
  if (scale === "log") {
    const lo = Math.log(min);
    const hi = Math.log(max);
    raw = Math.exp(lo + f * (hi - lo));
    return snap(raw, min, max, scale);
  }
  raw = min + f * (max - min);
  return snap(raw, min, max, scale);
}

/** Inverse of {@link fracToValue} (no snapping). */
export function valueToFrac(
  value: number,
  min: number,
  max: number,
  scale: Scale,
): number {
  if (scale === "log") {
    const lo = Math.log(min);
    const hi = Math.log(max);
    return clamp((Math.log(value) - lo) / (hi - lo), 0, 1);
  }
  return clamp((value - min) / (max - min), 0, 1);
}

/** Snap a raw value to a tidy number appropriate to the scale. */
export function snap(
  value: number,
  min: number,
  max: number,
  scale: Scale,
): number {
  if (scale === "log") {
    return sigFigs(value, 2);
  }
  const step = niceStep(max - min);
  const snapped = Math.round(value / step) * step;
  // Avoid floating point crumbs like 1847.0000002.
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  return Number(snapped.toFixed(decimals));
}

const UNITS = [
  { v: 1e12, s: "T" },
  { v: 1e9, s: "B" },
  { v: 1e6, s: "M" },
  { v: 1e3, s: "k" },
];

/**
 * Human-friendly number: 7,000 → "7,000", 1_300_000_000 → "1.3B".
 * Values below 1,000 keep up to two decimals when they aren't whole.
 */
export function formatNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e6) {
    for (const u of UNITS) {
      if (abs >= u.v) {
        const n = value / u.v;
        const str = n >= 100 ? n.toFixed(0) : n.toFixed(n % 1 === 0 ? 0 : 1);
        return `${str}${u.s}`;
      }
    }
  }
  if (abs >= 1000) return Math.round(value).toLocaleString("en-US");
  if (Number.isInteger(value)) return value.toLocaleString("en-US");
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** Value with unit, e.g. "7,000 m" or "63%". */
export function formatValue(value: number, unit: string): string {
  const n = formatNumber(value);
  if (!unit) return n;
  if (unit === "%") return `${n}%`;
  return `${n} ${unit}`;
}
