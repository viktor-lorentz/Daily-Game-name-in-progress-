import { useCallback, useEffect, useRef, useState } from "react";
import { clamp, formatNumber, fracToValue, valueToFrac } from "../lib/format";
import type { Scale } from "../lib/types";

const MIN_GAP = 0.015; // thinnest allowed bracket, as a fraction of the track
const STEP = 0.01; // keyboard nudge
const PAGE = 0.1; // keyboard page nudge

interface Props {
  min: number;
  max: number;
  scale: Scale;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
  disabled?: boolean;
  /** When set, the true answer is pinned on the track. */
  truth?: number;
  /** Colors the bracket green/red on reveal. */
  inside?: boolean;
}

type Thumb = "low" | "high";

export default function LogRangeSlider({
  min,
  max,
  scale,
  low,
  high,
  onChange,
  disabled,
  truth,
  inside,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Thumb | null>(null);

  const lowFrac = valueToFrac(low, min, max, scale);
  const highFrac = valueToFrac(high, min, max, scale);
  const revealed = truth !== undefined;

  const fracFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return clamp((clientX - rect.left) / rect.width, 0, 1);
  }, []);

  const moveThumb = useCallback(
    (thumb: Thumb, frac: number) => {
      if (thumb === "low") {
        const f = clamp(frac, 0, highFrac - MIN_GAP);
        const next = fracToValue(f, min, max, scale);
        if (next < high) onChange(next, high);
      } else {
        const f = clamp(frac, lowFrac + MIN_GAP, 1);
        const next = fracToValue(f, min, max, scale);
        if (next > low) onChange(low, next);
      }
    },
    [high, highFrac, low, lowFrac, max, min, onChange, scale],
  );

  // Drag handling via window listeners while a thumb (or the track) is active.
  useEffect(() => {
    if (!active) return;
    const onMove = (e: PointerEvent) => moveThumb(active, fracFromClientX(e.clientX));
    const onUp = () => setActive(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [active, fracFromClientX, moveThumb]);

  const startThumb = (thumb: Thumb) => (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    setActive(thumb);
  };

  const onTrackDown = (e: React.PointerEvent) => {
    if (disabled) return;
    const frac = fracFromClientX(e.clientX);
    const thumb: Thumb =
      Math.abs(frac - lowFrac) <= Math.abs(frac - highFrac) ? "low" : "high";
    setActive(thumb);
    moveThumb(thumb, frac);
  };

  const onKey = (thumb: Thumb) => (e: React.KeyboardEvent) => {
    if (disabled) return;
    const frac = thumb === "low" ? lowFrac : highFrac;
    let delta = 0;
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        delta = -STEP;
        break;
      case "ArrowRight":
      case "ArrowUp":
        delta = STEP;
        break;
      case "PageDown":
        delta = -PAGE;
        break;
      case "PageUp":
        delta = PAGE;
        break;
      case "Home":
        return moveThumb(thumb, 0);
      case "End":
        return moveThumb(thumb, 1);
      default:
        return;
    }
    e.preventDefault();
    moveThumb(thumb, frac + delta);
  };

  const truthFrac = revealed ? valueToFrac(truth!, min, max, scale) : 0;
  const rangeColor = !revealed
    ? "bg-accent"
    : inside
      ? "bg-hit"
      : "bg-miss";

  return (
    <div className="select-none px-1 pb-7 pt-10">
      <div className="relative">
        {/* truth pin */}
        {revealed && (
          <div
            className="pointer-events-none absolute -top-9 z-20 flex -translate-x-1/2 flex-col items-center animate-pin-drop"
            style={{ left: `${truthFrac * 100}%` }}
          >
            <span className="mb-1 whitespace-nowrap rounded-md bg-truth px-1.5 py-0.5 text-[11px] font-bold text-bg nums">
              {formatNumber(truth!)}
            </span>
            <span className="h-3 w-3 rounded-full bg-truth ring-4 ring-truth/25" />
          </div>
        )}

        {/* track */}
        <div
          ref={trackRef}
          onPointerDown={onTrackDown}
          className={`relative h-3 w-full rounded-full bg-surface-2 ${
            disabled ? "cursor-default" : "cursor-pointer"
          }`}
        >
          {/* truth tick line behind the fill */}
          {revealed && (
            <span
              className="absolute top-1/2 z-10 h-7 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-truth/70"
              style={{ left: `${truthFrac * 100}%` }}
            />
          )}

          {/* selected range */}
          <div
            className={`absolute top-0 h-full rounded-full ${rangeColor} transition-colors`}
            style={{
              left: `${lowFrac * 100}%`,
              width: `${Math.max(0, (highFrac - lowFrac) * 100)}%`,
            }}
          />

          {/* thumbs */}
          {(["low", "high"] as const).map((thumb) => {
            const frac = thumb === "low" ? lowFrac : highFrac;
            const val = thumb === "low" ? low : high;
            return (
              <div
                key={thumb}
                role="slider"
                tabIndex={disabled ? -1 : 0}
                aria-label={thumb === "low" ? "Lower bound" : "Upper bound"}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={val}
                aria-valuetext={formatNumber(val)}
                aria-disabled={disabled}
                onPointerDown={startThumb(thumb)}
                onKeyDown={onKey(thumb)}
                className={`absolute top-1/2 z-20 h-6 w-6 -translate-x-1/2 -translate-y-1/2
                  rounded-full border-2 border-accent bg-surface shadow-card
                  ${disabled ? "cursor-default" : "cursor-grab touch-none active:cursor-grabbing"}
                  ${active === thumb ? "scale-110 ring-4 ring-accent/25" : ""}
                  transition-[transform,box-shadow]`}
                style={{ left: `${frac * 100}%` }}
              >
                {!revealed && (
                  <span
                    className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap
                      rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-text nums"
                  >
                    {formatNumber(val)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* end labels */}
      <div className="mt-3 flex justify-between text-xs text-muted nums">
        <span>{formatNumber(min)}</span>
        <span className="text-[10px] uppercase tracking-wider opacity-70">
          {scale === "log" ? "log scale" : "scale"}
        </span>
        <span>{formatNumber(max)}</span>
      </div>
    </div>
  );
}
