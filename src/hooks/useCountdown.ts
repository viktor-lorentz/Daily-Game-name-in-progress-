import { useEffect, useState } from "react";
import { msUntilNextReset, todayIndex } from "../lib/daily";

/**
 * Ticks once a second toward the next 00:00 UTC reset. When the day actually
 * rolls over, `dayIndex` changes so the caller can refresh to the new puzzle.
 */
export function useCountdown() {
  const [ms, setMs] = useState(() => msUntilNextReset());
  const [dayIndex, setDayIndex] = useState(() => todayIndex());

  useEffect(() => {
    const tick = () => {
      setMs(msUntilNextReset());
      setDayIndex(todayIndex());
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return { ms, dayIndex };
}
