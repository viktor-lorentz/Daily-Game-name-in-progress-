import { describe, expect, it } from "vitest";
import {
  coverageOf,
  isWin,
  MAX_PER_QUESTION,
  scoreQuestion,
  scoreRound,
  tierOf,
} from "../lib/scoring";
import type { Fact } from "../lib/types";

const linFact: Fact = {
  id: "lin",
  category: "Test",
  prompt: "A year?",
  unit: "",
  value: 1950,
  min: 1900,
  max: 2000,
  scale: "linear",
  blurb: "",
};

const logFact: Fact = {
  id: "log",
  category: "Test",
  prompt: "A distance?",
  unit: "km",
  value: 1000,
  min: 10,
  max: 100000,
  scale: "log",
  blurb: "",
};

describe("coverageOf", () => {
  it("measures linear coverage as a fraction of the domain", () => {
    expect(coverageOf(1900, 2000, 1900, 2000, "linear")).toBeCloseTo(1, 5);
    expect(coverageOf(1940, 1960, 1900, 2000, "linear")).toBeCloseTo(0.2, 5);
  });

  it("measures log coverage in log space", () => {
    // Full domain spans 4 decades; one decade is a quarter of it.
    expect(coverageOf(100, 1000, 10, 100000, "log")).toBeCloseTo(0.25, 5);
    expect(coverageOf(10, 100000, 10, 100000, "log")).toBeCloseTo(1, 5);
  });

  it("is order-independent and clamped to [0,1]", () => {
    expect(coverageOf(2000, 1900, 1900, 2000, "linear")).toBeCloseTo(1, 5);
    expect(coverageOf(1850, 2050, 1900, 2000, "linear")).toBe(1);
  });
});

describe("scoreQuestion", () => {
  it("awards nothing when the answer is outside the bracket", () => {
    const r = scoreQuestion({ low: 1960, high: 1990 }, linFact);
    expect(r.inside).toBe(false);
    expect(r.points).toBe(0);
  });

  it("awards almost nothing for a domain-wide bracket that technically contains it", () => {
    const r = scoreQuestion({ low: 1900, high: 2000 }, linFact);
    expect(r.inside).toBe(true);
    expect(r.points).toBeLessThanOrEqual(2);
  });

  it("rewards a tight, correct bracket near the max", () => {
    const r = scoreQuestion({ low: 1948, high: 1952 }, linFact);
    expect(r.inside).toBe(true);
    expect(r.points).toBeGreaterThan(0.9 * MAX_PER_QUESTION);
  });

  it("is tighter == more points, monotonically", () => {
    const tight = scoreQuestion({ low: 1945, high: 1955 }, linFact).points;
    const loose = scoreQuestion({ low: 1920, high: 1980 }, linFact).points;
    expect(tight).toBeGreaterThan(loose);
  });

  it("works on a log-scale fact", () => {
    const r = scoreQuestion({ low: 800, high: 1200 }, logFact);
    expect(r.inside).toBe(true);
    expect(r.points).toBeGreaterThan(0.7 * MAX_PER_QUESTION);
  });

  it("never exceeds the per-question cap", () => {
    const r = scoreQuestion({ low: 1950, high: 1950 }, linFact);
    expect(r.points).toBeLessThanOrEqual(MAX_PER_QUESTION);
  });
});

describe("tierOf", () => {
  it("maps points to tiers", () => {
    expect(tierOf(0)).toBe("miss");
    expect(tierOf(40)).toBe("wide");
    expect(tierOf(120)).toBe("solid");
    expect(tierOf(180)).toBe("pinpoint");
  });
});

describe("scoreRound", () => {
  const facts = [linFact, logFact];
  it("sums points and counts hits", () => {
    const round = scoreRound(
      [
        { low: 1945, high: 1955 }, // hit
        { low: 2000, high: 5000 }, // miss (1000 is below 2000)
      ],
      facts,
      { puzzleId: 1, dateISO: "2026-10-01", isArchive: false },
    );
    expect(round.hits).toBe(1);
    expect(round.total).toBe(round.results[0].points + round.results[1].points);
    expect(round.results[1].points).toBe(0);
  });
});

describe("isWin", () => {
  it("needs at least three boxed answers", () => {
    expect(isWin(2)).toBe(false);
    expect(isWin(3)).toBe(true);
    expect(isWin(5)).toBe(true);
  });
});
