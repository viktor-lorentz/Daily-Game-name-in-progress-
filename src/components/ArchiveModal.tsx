import { useState } from "react";
import { EPOCH_UTC, maxPlayableIndex, TOTAL_PUZZLES } from "../lib/daily";
import { loadResult } from "../lib/storage";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import Modal from "./Modal";

const DAY_MS = 86_400_000;
const epochMs = Date.parse(`${EPOCH_UTC}T00:00:00Z`);
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

interface Props {
  open: boolean;
  onClose: () => void;
  /** index is 0-based; App decides daily vs archive from it. */
  onSelect: (index: number) => void;
}

function indexFor(y: number, m: number, d: number): number {
  return Math.round((Date.UTC(y, m, d) - epochMs) / DAY_MS);
}

export default function ArchiveModal({ open, onClose, onSelect }: Props) {
  const maxIndex = maxPlayableIndex();
  const maxDate = new Date(epochMs + maxIndex * DAY_MS);
  const epochDate = new Date(epochMs);

  const [view, setView] = useState({
    y: maxDate.getUTCFullYear(),
    m: maxDate.getUTCMonth(),
  });

  const firstWeekday = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();

  const atEpochMonth =
    view.y === epochDate.getUTCFullYear() && view.m === epochDate.getUTCMonth();
  const atMaxMonth =
    view.y === maxDate.getUTCFullYear() && view.m === maxDate.getUTCMonth();

  const monthLabel = new Date(Date.UTC(view.y, view.m, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const step = (dir: number) => {
    setView((v) => {
      const d = new Date(Date.UTC(v.y, v.m + dir, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    });
  };

  let played = 0;
  for (let i = 0; i <= maxIndex && i < TOTAL_PUZZLES; i++) {
    if (loadResult(i + 1)) played++;
  }

  return (
    <Modal open={open} onClose={onClose} title="Archive">
      <div className="mb-4 flex items-center justify-between">
        <button
          className="icon-btn"
          onClick={() => step(-1)}
          disabled={atEpochMonth}
          aria-label="Previous month"
        >
          <ChevronLeftIcon />
        </button>
        <span className="font-display font-semibold">{monthLabel}</span>
        <button
          className="icon-btn"
          onClick={() => step(1)}
          disabled={atMaxMonth}
          aria-label="Next month"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-muted">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1.5">
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const index = indexFor(view.y, view.m, d);
          const playable = index >= 0 && index <= maxIndex && index < TOTAL_PUZZLES;
          const done = playable && Boolean(loadResult(index + 1));
          const isToday = index === maxIndex;

          if (!playable) {
            return (
              <span
                key={d}
                className="grid aspect-square place-items-center rounded-lg text-sm text-muted/30"
              >
                {d}
              </span>
            );
          }
          return (
            <button
              key={d}
              onClick={() => {
                onSelect(index);
                onClose();
              }}
              className={`relative grid aspect-square place-items-center rounded-lg border text-sm
                font-medium transition-colors
                ${
                  done
                    ? "border-accent/60 bg-accent/15 text-text"
                    : "border-border bg-surface-2 text-text hover:border-accent/50"
                }
                ${isToday ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`}
              title={`Ballpark #${index + 1}`}
            >
              {d}
              {done && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> completed
        </span>
        <span>
          {played} of {maxIndex + 1} played
        </span>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted">
        Archive rounds are just for fun — they don't affect your streak or today's ranking.
      </p>
    </Modal>
  );
}
