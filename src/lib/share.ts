import { tierOf, type Tier } from "./scoring";
import type { RoundResult } from "./types";

const EMOJI: Record<Tier, string> = {
  pinpoint: "🎯",
  solid: "🟩",
  wide: "🟨",
  miss: "⬛",
};

/**
 * Build a spoiler-free, Wordle-style share string. It reveals the SHAPE of your
 * round (how tight each bracket was) but never the questions or the answers.
 */
export function buildShareText(result: RoundResult, siteUrl: string): string {
  const grid = result.results.map((r) => EMOJI[tierOf(r.points)]).join("");
  const header = result.isArchive
    ? `Ballpark #${result.puzzleId} (archive)`
    : `Ballpark #${result.puzzleId}`;
  return [
    header,
    `${result.total}/1000 · ${result.hits}/5 boxed`,
    grid,
    siteUrl,
  ].join("\n");
}

/** Copy text to the clipboard, falling back to a hidden textarea + execCommand. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
