import { useEffect, useMemo, useRef, useState } from "react";
import "./PresentationTimer.css";

const DURATION_SECONDS = 30 * 60;
const FIVE_MINUTES = 5 * 60;
const ONE_MINUTE = 60;

type TimerPhase = "standard" | "warning" | "final" | "done";

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getPhase(secondsLeft: number): TimerPhase {
  if (secondsLeft <= 0) return "done";
  if (secondsLeft <= ONE_MINUTE) return "final";
  if (secondsLeft <= FIVE_MINUTES) return "warning";
  return "standard";
}

function getPhaseLabel(phase: TimerPhase) {
  switch (phase) {
    case "done":
      return "Time is up";
    case "final":
      return "Final minute: wrap up";
    case "warning":
      return "Last 5 minutes";
    default:
      return "Presentation time";
  }
}

export function PresentationTimer() {
  const [secondsLeft, setSecondsLeft] = useState(DURATION_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const phase = useMemo(() => getPhase(secondsLeft), [secondsLeft]);
  const progress = 1 - secondsLeft / DURATION_SECONDS;

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          setIsRunning(false);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("button")) return;

      if (event.code === "Space") {
        event.preventDefault();
        setIsRunning((current) => !current);
      }

      if (event.key.toLowerCase() === "r") {
        setIsRunning(false);
        setSecondsLeft(DURATION_SECONDS);
      }

      if (event.key.toLowerCase() === "f") {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => undefined);
        } else {
          document.exitFullscreen().catch(() => undefined);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleReset = () => {
    setIsRunning(false);
    setSecondsLeft(DURATION_SECONDS);
  };

  const handlePrimaryAction = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(DURATION_SECONDS);
      setIsRunning(true);
      return;
    }

    setIsRunning((current) => !current);
  };

  return (
    <main className={`presentation-timer presentation-timer--${phase}`}>
      <div className="timer-aurora" aria-hidden="true" />
      <div className="timer-paint timer-paint--one" aria-hidden="true" />
      <div className="timer-paint timer-paint--two" aria-hidden="true" />
      <div className="timer-paint timer-paint--three" aria-hidden="true" />

      <div className="floating-tiles" aria-hidden="true">
        {Array.from({ length: 16 }).map((_, index) => (
          <span key={index} className={`floating-tile floating-tile--${(index % 5) + 1}`} />
        ))}
      </div>

      <section className="timer-stage" aria-label="30 minute presentation timer">
        <div className="timer-kicker">
          <span>BMMA Capstone Defense</span>
          <span>30 Minute Presentation</span>
        </div>

        <div className="timer-cube" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        <p className="timer-status">{getPhaseLabel(phase)}</p>

        <div className="timer-readout" aria-live="polite" aria-label={`${formatTime(secondsLeft)} remaining`}>
          {formatTime(secondsLeft)}
        </div>

        <div className="timer-progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>

        <div className="timer-actions">
          <button type="button" onClick={handlePrimaryAction}>
            {isRunning ? "Pause" : secondsLeft === 0 ? "Restart" : "Start"}
          </button>
          <button type="button" onClick={handleReset}>
            Reset
          </button>
        </div>

        <p className="timer-help">Space start/pause · R reset · F fullscreen</p>
      </section>
    </main>
  );
}
