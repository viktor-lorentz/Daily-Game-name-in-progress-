import { useCallback, useEffect, useState } from "react";

const KEY = "ballpark.theme";

/** Dark/light theme with a persisted preference and an in-sync <html> class. */
export function useTheme() {
  const [dark, setDark] = useState<boolean>(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : true,
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", dark ? "#0b0f14" : "#f6f8fa");
    try {
      localStorage.setItem(KEY, dark ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, [dark]);

  const toggle = useCallback(() => setDark((d) => !d), []);
  return { dark, toggle };
}
