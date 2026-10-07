import { CalendarIcon, ChartIcon, MoonIcon, QuestionIcon, SunIcon } from "./icons";

interface Props {
  onHowTo: () => void;
  onStats: () => void;
  onArchive: () => void;
  dark: boolean;
  onToggleTheme: () => void;
}

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden className="shrink-0">
      <rect x="10" y="30" width="44" height="4" rx="2" className="fill-surface-2" />
      <rect
        x="20"
        y="24"
        width="22"
        height="16"
        rx="5"
        fill="none"
        strokeWidth="3"
        className="stroke-accent"
      />
      <circle cx="34" cy="32" r="4.5" className="fill-truth" />
      <line
        x1="34"
        y1="18"
        x2="34"
        y2="27.5"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-truth"
      />
    </svg>
  );
}

export default function Header({ onHowTo, onStats, onArchive, dark, onToggleTheme }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Logo />
          <div className="leading-none">
            <span className="font-display text-lg font-bold tracking-tight">Ballpark</span>
            <span className="ml-2 hidden text-xs text-muted sm:inline">
              box the answer
            </span>
          </div>
        </div>
        <nav className="flex items-center gap-0.5">
          <button className="icon-btn" onClick={onHowTo} aria-label="How to play">
            <QuestionIcon />
          </button>
          <button className="icon-btn" onClick={onArchive} aria-label="Archive">
            <CalendarIcon />
          </button>
          <button className="icon-btn" onClick={onStats} aria-label="Statistics">
            <ChartIcon />
          </button>
          <button
            className="icon-btn"
            onClick={onToggleTheme}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </nav>
      </div>
    </header>
  );
}
