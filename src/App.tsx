import { useCallback, useEffect, useRef, useState } from "react";
import ArchiveModal from "./components/ArchiveModal";
import Header from "./components/Header";
import HowToPlayModal from "./components/HowToPlayModal";
import PlayScreen from "./components/PlayScreen";
import ResultsScreen from "./components/ResultsScreen";
import StatsModal from "./components/StatsModal";
import Toast from "./components/Toast";
import { useCountdown } from "./hooks/useCountdown";
import { useTheme } from "./hooks/useTheme";
import { maxPlayableIndex, puzzleForIndex } from "./lib/daily";
import { applyDailyResult } from "./lib/stats";
import {
  hasSeenIntro,
  loadResult,
  loadStats,
  markIntroSeen,
  saveResult,
  saveStats,
} from "./lib/storage";
import type { RoundResult, StatsState } from "./lib/types";

interface View {
  index: number;
  isArchive: boolean;
  result: RoundResult | null;
}

/** The view for "today": shows a stored daily result if there is one. */
function todayView(): View {
  const index = maxPlayableIndex();
  const existing = loadResult(index + 1);
  return {
    index,
    isArchive: false,
    result: existing && !existing.isArchive ? existing : null,
  };
}

export default function App() {
  const { dark, toggle } = useTheme();
  const { ms, dayIndex } = useCountdown();

  const [stats, setStats] = useState<StatsState>(() => loadStats());
  const [view, setView] = useState<View>(() => todayView());
  const [howto, setHowto] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();

  // How-to on first visit.
  useEffect(() => {
    if (!hasSeenIntro()) setHowto(true);
  }, []);

  // When the UTC day rolls over, jump to the new puzzle (unless mid-archive).
  const prevDay = useRef(dayIndex);
  useEffect(() => {
    if (dayIndex !== prevDay.current) {
      prevDay.current = dayIndex;
      if (!view.isArchive) setView(todayView());
    }
  }, [dayIndex, view.isArchive]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  const closeHowTo = useCallback(() => {
    setHowto(false);
    markIntroSeen();
  }, []);

  const onComplete = useCallback(
    (result: RoundResult) => {
      saveResult(result);
      if (!result.isArchive) {
        setStats((prev) => {
          const next = applyDailyResult(prev, result);
          saveStats(next);
          return next;
        });
      }
      setView((v) => ({ ...v, result }));
    },
    [],
  );

  const onSelectArchive = useCallback((index: number) => {
    const today = maxPlayableIndex();
    if (index === today) {
      setView(todayView());
    } else {
      setView({ index, isArchive: true, result: null });
    }
  }, []);

  const backToToday = useCallback(() => setView(todayView()), []);

  const puzzle = puzzleForIndex(view.index);
  const todayResult = (() => {
    const r = loadResult(maxPlayableIndex() + 1);
    return r && !r.isArchive ? r.total : undefined;
  })();

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Header
        onHowTo={() => setHowto(true)}
        onStats={() => setStatsOpen(true)}
        onArchive={() => setArchiveOpen(true)}
        dark={dark}
        onToggleTheme={toggle}
      />

      <main className="flex-1 px-4 py-6 sm:py-10">
        {!puzzle ? (
          <div className="mx-auto max-w-md text-center text-sm text-muted">
            That puzzle isn't available yet. Check back soon!
          </div>
        ) : view.result ? (
          <ResultsScreen
            result={view.result}
            countdownMs={ms}
            onOpenStats={() => setStatsOpen(true)}
            onBackToToday={backToToday}
            onToast={showToast}
          />
        ) : (
          <PlayScreen
            key={`${view.index}:${view.isArchive}`}
            puzzle={puzzle}
            isArchive={view.isArchive}
            onComplete={onComplete}
          />
        )}
      </main>

      <footer className="border-t border-border/70 px-4 py-5 text-center">
        <p className="text-xs text-muted">
          A free daily game of educated guesses · new puzzle at 00:00 UTC
        </p>
        <button
          className="mt-1 text-xs font-medium text-accent hover:underline"
          onClick={() => setHowto(true)}
        >
          How to play
        </button>
      </footer>

      <HowToPlayModal open={howto} onClose={closeHowTo} />
      <StatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        stats={stats}
        highlightScore={todayResult}
      />
      <ArchiveModal
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onSelect={onSelectArchive}
      />
      <Toast message={toast} />
    </div>
  );
}
