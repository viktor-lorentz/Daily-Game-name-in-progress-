import { describe, expect, it } from "vitest";
import {
  bucketOf,
  localEstimate,
  percentileFromBuckets,
  RANK_BUCKETS,
} from "../lib/ranking";

describe("bucketOf", () => {
  it("maps scores into the right histogram bucket", () => {
    expect(bucketOf(0)).toBe(0);
    expect(bucketOf(150)).toBe(1);
    expect(bucketOf(999)).toBe(9);
    expect(bucketOf(1000)).toBe(RANK_BUCKETS - 1); // clamped
  });
});

describe("percentileFromBuckets", () => {
  it("returns 50 for an empty distribution", () => {
    expect(percentileFromBuckets(new Array(RANK_BUCKETS).fill(0), 500)).toBe(50);
  });

  it("ranks a high score above a low score in the same distribution", () => {
    const buckets = [10, 20, 30, 40, 50, 40, 30, 20, 10, 5];
    const low = percentileFromBuckets(buckets, 100);
    const high = percentileFromBuckets(buckets, 800);
    expect(high).toBeGreaterThan(low);
    expect(low).toBeGreaterThanOrEqual(1);
    expect(high).toBeLessThanOrEqual(99);
  });
});

describe("localEstimate", () => {
  it("is deterministic for a given day", () => {
    const a = localEstimate(12, 600);
    const b = localEstimate(12, 600);
    expect(a.buckets).toEqual(b.buckets);
    expect(a.percentile).toBe(b.percentile);
    expect(a.estimated).toBe(true);
  });

  it("gives a higher percentile for a better score", () => {
    const lo = localEstimate(3, 200).percentile;
    const hi = localEstimate(3, 900).percentile;
    expect(hi).toBeGreaterThan(lo);
  });

  it("produces a full-width histogram that sums to the sample count", () => {
    const r = localEstimate(5, 500);
    expect(r.buckets).toHaveLength(RANK_BUCKETS);
    expect(r.buckets.reduce((a, b) => a + b, 0)).toBe(r.total);
  });
});
