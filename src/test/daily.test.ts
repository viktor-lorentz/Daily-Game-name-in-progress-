import { describe, expect, it } from "vitest";
import {
  dateLabel,
  EPOCH_UTC,
  formatCountdown,
  msUntilNextReset,
  puzzleForIndex,
  todayIndex,
  TOTAL_PUZZLES,
} from "../lib/daily";
import { QUESTIONS_PER_ROUND } from "../lib/scoring";

const epochMs = Date.parse(`${EPOCH_UTC}T00:00:00Z`);
const DAY = 86_400_000;

describe("todayIndex", () => {
  it("is 0 at the launch epoch", () => {
    expect(todayIndex(epochMs)).toBe(0);
    expect(todayIndex(epochMs + 1000)).toBe(0);
  });

  it("advances one per UTC day", () => {
    expect(todayIndex(epochMs + 7 * DAY)).toBe(7);
    expect(todayIndex(epochMs + 7 * DAY - 1)).toBe(6);
  });
});

describe("msUntilNextReset", () => {
  it("is a full day exactly at reset and shrinks through the day", () => {
    expect(msUntilNextReset(epochMs)).toBe(DAY);
    expect(msUntilNextReset(epochMs + DAY / 2)).toBe(DAY / 2);
  });

  it("always lands within (0, DAY]", () => {
    for (const t of [epochMs + 1, epochMs + 123456, epochMs + DAY - 1]) {
      const ms = msUntilNextReset(t);
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThanOrEqual(DAY);
    }
  });
});

describe("formatCountdown", () => {
  it("formats hours, minutes and seconds with padding", () => {
    expect(formatCountdown(0)).toBe("00h 00m 00s");
    expect(formatCountdown(DAY - 1000)).toBe("23h 59m 59s");
    expect(formatCountdown(3_661_000)).toBe("01h 01m 01s");
  });

  it("never goes negative", () => {
    expect(formatCountdown(-5000)).toBe("00h 00m 00s");
  });
});

describe("puzzleForIndex", () => {
  it("hydrates a full puzzle with the right number of questions", () => {
    const p = puzzleForIndex(0);
    expect(p).not.toBeNull();
    expect(p!.id).toBe(1);
    expect(p!.questions).toHaveLength(QUESTIONS_PER_ROUND);
    expect(p!.questions[0]).toHaveProperty("prompt");
  });

  it("returns null past the end of the schedule", () => {
    expect(puzzleForIndex(TOTAL_PUZZLES)).toBeNull();
  });

  it("ships well beyond the 60-day minimum", () => {
    expect(TOTAL_PUZZLES).toBeGreaterThanOrEqual(60);
  });
});

describe("dateLabel", () => {
  it("renders a readable UTC date", () => {
    expect(dateLabel("2026-10-07")).toContain("Oct");
    expect(dateLabel("2026-10-07")).toContain("2026");
  });
});
