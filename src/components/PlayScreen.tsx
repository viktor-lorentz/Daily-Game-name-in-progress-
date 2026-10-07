import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "../hooks/useGame";
import { dateLabel } from "../lib/daily";
import { formatValue } from "../lib/format";
import { coverageOf, MAX_PER_QUESTION, tierOf } from "../lib/scoring";
import type { DailyPuzzle, RoundResult } from "../lib/types";
import AnimatedNumber from "./AnimatedNumber";
import { CheckIcon, LockIcon } from "./icons";
import LogRangeSlider from "./LogRangeSlider";

interface Props {
  puzzle: DailyPuzzle;
  isArchive: boolean;
  onComplete: (result: RoundResult) => void;
}

const tierLabel: Record<string, string> = {
  pinpoint: "Pinpoint!",
  solid: "Solid box",
  wide: "A bit wide",
  miss: "Missed it",
};

export default function PlayScreen({ puzzle, isArchive, onComplete }: Props) {
  const game = useGame(puzzle, isArchive, onComplete);
  const { fact, guess, index, total } = game;

  const coverage = coverageOf(guess.low, guess.high, fact.min, fact.max, fact.scale);
  const last = index === total - 1;

  return (
    <div className="mx-auto w-full max-w-md">
      {/* puzzle meta + progress */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg font-bold tracking-tight">
              Ballpark #{puzzle.id}
            </h1>
            {isArchive && <span className="chip">archive</span>}
          </div>
          <p className="text-xs text-muted">{dateLabel(puzzle.dateISO)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-muted">
            Question {index + 1} of {total}
          </p>
          <div className="mt-1.5 flex gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-5 rounded-full transition-colors ${
                  i < index ? "bg-accent" : i === index ? "bg-accent/60" : "bg-surface-2"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="card p-5 sm:p-6"
        >
          <span className="chip mb-4">{fact.category}</span>
          <h2 className="font-display text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
            {fact.prompt}
          </h2>

          <div className="mt-6">
            <LogRangeSlider
              min={fact.min}
              max={fact.max}
              scale={fact.scale}
              low={guess.low}
              high={guess.high}
              onChange={game.setGuess}
              disabled={game.locked}
              truth={game.locked ? fact.value : undefined}
              inside={game.currentResult?.inside}
            />
          </div>

          {/* bracket readout */}
          <div className="rounded-xl bg-surface-2 px-4 py-3 text-center">
            <p className="text-[11px] uppercase tracking-wider text-muted">Your range</p>
            <p className="font-display text-lg font-semibold nums">
              {formatValue(guess.low, fact.unit)}{" "}
              <span className="text-muted">–</span> {formatValue(guess.high, fact.unit)}
            </p>
            {!game.locked && (
              <p className="mt-0.5 text-xs text-muted">
                {coverage < 0.12
                  ? "Bold and tight — big points if you're right."
                  : coverage < 0.4
                    ? "Reasonably confident."
                    : "Playing it safe — fewer points if correct."}
              </p>
            )}
          </div>

          {/* action / reveal */}
          {!game.locked ? (
            <button className="btn-primary mt-5 w-full py-3" onClick={game.lockIn}>
              <LockIcon width={18} height={18} /> Lock in
            </button>
          ) : (
            <Reveal
              points={game.currentResult!.points}
              inside={game.currentResult!.inside}
              fact={fact}
              onNext={game.next}
              last={last}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {!game.locked && (
        <p className="mt-4 text-center text-xs text-muted">
          Drag the handles to box the answer. Tighter = more points — but only if the
          true value lands inside.
        </p>
      )}
    </div>
  );
}

function Reveal({
  points,
  inside,
  fact,
  onNext,
  last,
}: {
  points: number;
  inside: boolean;
  fact: DailyPuzzle["questions"][number];
  onNext: () => void;
  last: boolean;
}) {
  const tier = tierOf(points);
  const color = inside ? "text-hit" : "text-miss";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mt-5"
    >
      <div className="flex items-end justify-between">
        <div>
          <p className={`font-display text-sm font-bold ${color}`}>{tierLabel[tier]}</p>
          <p className="text-sm text-muted">
            Answer: <span className="font-semibold text-text nums">
              {formatValue(fact.value, fact.unit)}
            </span>
          </p>
        </div>
        <div className="text-right">
          <AnimatedNumber
            value={points}
            className={`font-display text-3xl font-bold nums ${color}`}
          />
          <p className="text-[11px] text-muted">/ {MAX_PER_QUESTION} pts</p>
        </div>
      </div>

      <p className="mt-3 rounded-xl bg-surface-2 px-4 py-3 text-sm leading-relaxed text-muted">
        {fact.blurb}
      </p>

      <button className="btn-primary mt-4 w-full py-3" onClick={onNext}>
        {last ? (
          <>
            <CheckIcon width={18} height={18} /> See results
          </>
        ) : (
          "Next question →"
        )}
      </button>
    </motion.div>
  );
}
