import { motion } from "framer-motion";

interface Props {
  buckets: number[];
  /** Index of the bucket to highlight as "you". */
  highlight: number;
  /** Labels for the far-left and far-right of the x-axis. */
  axis?: [string, string];
  /** Tooltip shown above the highlighted bar. */
  marker?: string;
}

/** A compact histogram with the player's bucket highlighted. */
export default function DistributionChart({ buckets, highlight, axis, marker }: Props) {
  const max = Math.max(1, ...buckets);
  return (
    <div className={marker ? "pt-5" : ""}>
      <div className="flex h-28 items-stretch gap-1">
        {buckets.map((count, i) => {
          const isYou = i === highlight;
          const pct = (count / max) * 100;
          return (
            <div
              key={i}
              className="relative flex h-full flex-1 flex-col items-center justify-end"
            >
              {isYou && marker && (
                <span
                  className="absolute -top-6 z-10 whitespace-nowrap rounded-md bg-accent px-1.5 py-0.5
                    text-[10px] font-bold text-bg"
                >
                  {marker}
                </span>
              )}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(pct, count > 0 ? 6 : 3)}%` }}
                transition={{ delay: 0.1 + i * 0.03, type: "spring", stiffness: 260, damping: 26 }}
                className={`w-full rounded-t-sm ${
                  isYou ? "bg-accent" : "bg-border"
                }`}
                style={{ minHeight: 3 }}
              />
            </div>
          );
        })}
      </div>
      {axis && (
        <div className="mt-1.5 flex justify-between text-[10px] text-muted nums">
          <span>{axis[0]}</span>
          <span>{axis[1]}</span>
        </div>
      )}
    </div>
  );
}
