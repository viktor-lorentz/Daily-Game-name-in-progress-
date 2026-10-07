import { bucketLabel, deriveStats, DIST_BUCKETS } from "../lib/stats";
import type { StatsState } from "../lib/types";
import DistributionChart from "./DistributionChart";
import { FlameIcon } from "./icons";
import Modal from "./Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  stats: StatsState;
  /** Highlight the bucket of this score (e.g. today's result). */
  highlightScore?: number;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-3 text-center">
      <p className={`font-display text-2xl font-bold nums ${accent ? "text-accent" : ""}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] leading-tight text-muted">{label}</p>
    </div>
  );
}

export default function StatsModal({ open, onClose, stats, highlightScore }: Props) {
  const d = deriveStats(stats);
  const highlight =
    highlightScore !== undefined
      ? Math.min(DIST_BUCKETS - 1, Math.floor(highlightScore / (1000 / DIST_BUCKETS)))
      : -1;

  return (
    <Modal open={open} onClose={onClose} title="Statistics">
      {d.gamesPlayed === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          Play your first round to start tracking your stats.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Played" value={String(d.gamesPlayed)} />
            <Stat label="Win rate" value={`${d.winRate}%`} />
            <Stat label="Avg score" value={String(d.average)} />
            <Stat
              label="Current streak"
              value={String(d.currentStreak)}
              accent={d.currentStreak > 0}
            />
            <Stat label="Max streak" value={String(d.maxStreak)} />
            <Stat label="Best score" value={String(d.best)} accent />
          </div>

          <div className="mt-5 flex items-center gap-2 text-sm">
            <FlameIcon width={16} height={16} className="text-truth" />
            <p className="text-muted">
              {d.currentStreak > 0
                ? `You're on a ${d.currentStreak}-day streak. Keep it alive!`
                : "Play today to start a new streak."}
            </p>
          </div>

          <div className="mt-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Score distribution
            </h3>
            <DistributionChart
              buckets={d.distribution}
              highlight={highlight}
              axis={[bucketLabel(0), bucketLabel(DIST_BUCKETS - 1)]}
              marker={highlight >= 0 ? "today" : undefined}
            />
          </div>

          <p className="mt-5 text-center text-[11px] text-muted">
            A win = boxing at least 3 of 5 answers. Stats are stored on this device only.
          </p>
        </>
      )}
    </Modal>
  );
}
