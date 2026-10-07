import { describe, expect, it } from "vitest";
import { buildShareText } from "../lib/share";
import type { QuestionResult, RoundResult } from "../lib/types";

function qr(points: number, inside: boolean): QuestionResult {
  return { factId: "f", low: 0, high: 1, value: 0.5, inside, coverage: 0.3, points };
}

const base: RoundResult = {
  puzzleId: 7,
  dateISO: "2026-10-07",
  total: 510,
  hits: 3,
  isArchive: false,
  results: [qr(180, true), qr(120, true), qr(50, true), qr(0, false), qr(160, true)],
};

describe("buildShareText", () => {
  it("is spoiler-free: no question text, no answers, no bracket values", () => {
    const text = buildShareText(base, "https://ballpark.example");
    expect(text).not.toMatch(/\d{2,}\s?(km|m|°|%)/); // no answer-like values
    expect(text).toContain("Ballpark #7");
    expect(text).toContain("510/1000 · 3/5 boxed");
    expect(text).toContain("https://ballpark.example");
  });

  it("renders the emoji grid by tier", () => {
    const text = buildShareText(base, "x");
    expect(text).toContain("🎯🟩🟨⬛🎯");
  });

  it("flags archive rounds", () => {
    expect(buildShareText({ ...base, isArchive: true }, "x")).toContain("#7 (archive)");
  });
});
