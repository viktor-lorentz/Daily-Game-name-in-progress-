import { useCallback, useMemo, useState } from "react";
import { fracToValue } from "../lib/format";
import { scoreQuestion, scoreRound } from "../lib/scoring";
import type { DailyPuzzle, Fact, Guess, QuestionResult, RoundResult } from "../lib/types";

function defaultGuess(f: Fact): Guess {
  return {
    low: fracToValue(0.3, f.min, f.max, f.scale),
    high: fracToValue(0.7, f.min, f.max, f.scale),
  };
}

export interface GameApi {
  phase: "playing" | "results";
  index: number;
  total: number;
  fact: Fact;
  guess: Guess;
  setGuess: (low: number, high: number) => void;
  locked: boolean;
  currentResult: QuestionResult | null;
  lockIn: () => void;
  next: () => void;
  result: RoundResult | null;
}

/**
 * Drives one round: five questions, one at a time, each locked and revealed
 * before moving on. Mount with a `key` tied to the puzzle so replays reset.
 */
export function useGame(
  puzzle: DailyPuzzle,
  isArchive: boolean,
  onComplete: (result: RoundResult) => void,
): GameApi {
  const facts = puzzle.questions;
  const total = facts.length;

  const [guesses, setGuesses] = useState<Guess[]>(() => facts.map(defaultGuess));
  const [locked, setLocked] = useState<boolean[]>(() => facts.map(() => false));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"playing" | "results">("playing");
  const [result, setResult] = useState<RoundResult | null>(null);

  const fact = facts[index];
  const guess = guesses[index];
  const isLocked = locked[index];

  const currentResult = useMemo(
    () => (isLocked ? scoreQuestion(guess, fact) : null),
    [isLocked, guess, fact],
  );

  const setGuess = useCallback(
    (low: number, high: number) => {
      if (locked[index]) return;
      setGuesses((prev) => {
        const next = prev.slice();
        next[index] = { low, high };
        return next;
      });
    },
    [index, locked],
  );

  const lockIn = useCallback(() => {
    setLocked((prev) => {
      if (prev[index]) return prev;
      const next = prev.slice();
      next[index] = true;
      return next;
    });
  }, [index]);

  const next = useCallback(() => {
    if (index < total - 1) {
      setIndex((i) => i + 1);
      return;
    }
    const round = scoreRound(guesses, facts, {
      puzzleId: puzzle.id,
      dateISO: puzzle.dateISO,
      isArchive,
    });
    setResult(round);
    setPhase("results");
    onComplete(round);
  }, [facts, guesses, index, isArchive, onComplete, puzzle.dateISO, puzzle.id, total]);

  return {
    phase,
    index,
    total,
    fact,
    guess,
    setGuess,
    locked: isLocked,
    currentResult,
    lockIn,
    next,
    result,
  };
}
