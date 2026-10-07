import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { formatCountdown } from "../lib/daily";
import {
  bucketOf,
  getRanking,
  RANK_BUCKET_W,
  RANK_BUCKETS,
} from "../lib/ranking";
import { isWin, tierOf, type Tier } from "../lib/scoring";
import { buildShareText, copyToClipboard } from "../lib/share";
import type { Ranking, RoundResult } from "../lib/types";
import AnimatedNumber from "./AnimatedNumber";
import DistributionChart from "./DistributionChart";
import { ChartIcon, ChevronLeftIcon, ShareIcon } from "./icons";

const EMOJI: Record<Tier, string> = {
  pinpoint: "🎯",
  solid: "🟩",
  wide: "🟨",
  miss: "⬛",
};

function headline(total: number, hits: number): string {
  if (total >= 850) return "Bullseye brain 🎯";
  if (total >= 650) return "Sharp calibration";
  if (total >= 450) return "Solid instincts";
  if (hits >= 3) return "You boxed it";
  if (total >= 200) return "Room to tighten up";
  return "Wild day out there";
}

interface Props {
  result: RoundResult;
  countdownMs: number;
  onOpenStats: () => void;
  onBackToToday: () => void;
  onToast: (msg: string) => void;
}

export default function ResultsScreen({
  result,
  countdownMs,
  onOpenStats,
  onBackToToday,
  onToast,
}: Props) {
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const { isArchive, total, hits } = result;

  useEffect(() => {
    if (isArchive) return;
    let cancelled = false;
    getRanking(result.puzzleId, total, hits).then((r) => {
      if (!cancelled) setRanking(r);
    });
    return () => {
      cancelled = true;
    };
  }, [isArchive, result.puzzleId, total, hits]);

  const share = async () => {
    const text = buildShareText(result, window.location.origin);
    const ok = await copyToClipboard(text);
    onToast(ok ? "Result copied to clipboard" : "Couldn't copy — long-press to select");
  };

  return (
    <motion.div
      className="mx-auto w-full max-w-md"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* hero */}
      <div className="card overflow-hidden p-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="font-display text-sm font-bold tracking-tight">
            Ballpark #{result.puzzleId}
          </span>
          {isArchive && <span className="chip">archive</span>}
        </div>
        <p className="mt-1 font-display text-lg font-semibold text-accent">
          {headline(total, hits)}
        </p>

        <div className="mt-4 flex items-end justify-center gap-1">
          <AnimatedNumber
            value={total}
            className="font-display text-6xl font-bold leading-none nums"
          />
          <span className="pb-1 text-xl font-semibold text-muted">/1000</span>
        </div>
        <p className="mt-2 text-sm text-muted">
          You boxed <span className="font-semibold text-text">{hits}/5</span>{" "}
          answers{" "}
          {isWin(hits) ? (
            <span className="text-hit">· win</span>
          ) : (
            <span className="text-muted">· keep going</span>
          )}
        </p>

        {/* per-question tiles */}
        <div className="mt-5 grid grid-cols-5 gap-2">
          {result.results.map((r, i) => {
            const tier = tierOf(r.points);
            return (
              <motion.div
                key={r.factId}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 + i * 0.08, type: "spring", stiffness: 400, damping: 20 }}
                className="flex flex-col items-center gap-1 rounded-xl bg-surface-2 py-2.5"
              >
                <span className="text-xl leading-none">{EMOJI[tier]}</span>
                <span className="text-[11px] font-semibold text-muted nums">{r.points}</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ranking / archive note */}
      {isArchive ? (
        <div className="card mt-4 p-4 text-center text-sm text-muted">
          Archive round — it doesn't count toward your streak or today's ranking.
        </div>
      ) : (
        <div className="card mt-4 p-5">
          {ranking ? (
            <>
              <p className="text-center text-sm text-muted">
                You did better than
              </p>
              <p className="text-center font-display text-3xl font-bold text-accent nums">
                {ranking.percentile}%
              </p>
              <p className="mb-4 text-center text-sm text-muted">of players today</p>
              <DistributionChart
                buckets={ranking.buckets}
                highlight={bucketOf(total)}
                axis={["0", "1000"]}
                marker={`You · ${total}`}
              />
              <p className="mt-3 text-center text-[11px] text-muted">
                {ranking.estimated ? (
                  <>Estimated distribution (offline) · play online for live rankings</>
                ) : (
                  <>Based on {ranking.total.toLocaleString("en-US")} players today</>
                )}
              </p>
            </>
          ) : (
            <div className="flex h-40 animate-pulse items-center justify-center text-sm text-muted">
              Crunching today's scores…
            </div>
          )}
        </div>
      )}

      {/* countdown */}
      {!isArchive && (
        <p className="mt-4 text-center text-sm text-muted">
          Next Ballpark in{" "}
          <span className="font-semibold text-text nums">{formatCountdown(countdownMs)}</span>
        </p>
      )}

      {/* actions */}
      <div className="mt-4 flex flex-col gap-2">
        <button className="btn-primary w-full py-3" onClick={share}>
          <ShareIcon width={18} height={18} /> Share result
        </button>
        <div className="flex gap-2">
          <button className="btn-ghost w-full py-2.5" onClick={onOpenStats}>
            <ChartIcon width={18} height={18} /> Statistics
          </button>
          {isArchive && (
            <button className="btn-ghost w-full py-2.5" onClick={onBackToToday}>
              <ChevronLeftIcon width={18} height={18} /> Today
            </button>
          )}
        </div>
      </div>

      {/* hidden-ish helper so the emoji grid meaning is clear */}
      <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
        🎯 pinpoint · 🟩 solid · 🟨 wide · ⬛ missed{" "}
        <span className="opacity-60">({RANK_BUCKETS} buckets of {RANK_BUCKET_W})</span>
      </p>
    </motion.div>
  );
}
