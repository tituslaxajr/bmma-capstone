import { useEffect, useMemo, useRef, useState } from "react";
import "./PresentationTimer.css";

const DEFAULT_DURATION_SECONDS = 30 * 60;
const FIVE_MINUTES = 5 * 60;
const ONE_MINUTE = 60;
const STORAGE_KEY = "bmma-presentation-timer";

const TIMER_PRESETS = [
  { id: "presentation", label: "Presentation", durationSeconds: 30 * 60 },
  { id: "qa", label: "Q and A", durationSeconds: 60 * 60 },
  { id: "deliberation", label: "Panel Deliberation", durationSeconds: 20 * 60 },
] as const;

type TimerPhase = "standard" | "warning" | "final" | "done";
type TimerPresetId = (typeof TIMER_PRESETS)[number]["id"];

type StoredTimerState = {
  secondsLeft: number;
  durationSeconds: number;
  isRunning: boolean;
  savedAt: number;
  presetId: TimerPresetId;
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatMinuteValue(totalSeconds: number) {
  return String(Math.floor(totalSeconds / 60));
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

function getPresetById(presetId: string | undefined) {
  return TIMER_PRESETS.find((preset) => preset.id === presetId) ?? TIMER_PRESETS[0];
}

function clampSeconds(value: number, durationSeconds: number) {
  if (!Number.isFinite(value)) return durationSeconds;
  return Math.min(durationSeconds, Math.max(0, Math.round(value)));
}

function getStoredTimerState(): StoredTimerState {
  if (typeof window === "undefined") {
    return {
      secondsLeft: DEFAULT_DURATION_SECONDS,
      durationSeconds: DEFAULT_DURATION_SECONDS,
      isRunning: false,
      savedAt: Date.now(),
      presetId: "presentation",
    };
  }

  try {
    const rawState = window.localStorage.getItem(STORAGE_KEY);
    if (!rawState) {
      return {
        secondsLeft: DEFAULT_DURATION_SECONDS,
        durationSeconds: DEFAULT_DURATION_SECONDS,
        isRunning: false,
        savedAt: Date.now(),
        presetId: "presentation",
      };
    }

    const parsedState = JSON.parse(rawState) as Partial<StoredTimerState>;
    const preset = getPresetById(parsedState.presetId);
    const parsedDuration = Number(parsedState.durationSeconds);
    const durationSeconds = Number.isFinite(parsedDuration) && parsedDuration > 0
      ? clampSeconds(parsedDuration, 60 * 60)
      : preset.durationSeconds;
    const savedSeconds = clampSeconds(Number(parsedState.secondsLeft), durationSeconds);
    const wasRunning = Boolean(parsedState.isRunning);
    const savedAt = Number(parsedState.savedAt);
    const elapsedSeconds = wasRunning && Number.isFinite(savedAt) ? Math.floor((Date.now() - savedAt) / 1000) : 0;
    const secondsLeft = clampSeconds(savedSeconds - elapsedSeconds, durationSeconds);

    return {
      secondsLeft,
      durationSeconds,
      isRunning: wasRunning && secondsLeft > 0,
      savedAt: Date.now(),
      presetId: preset.id,
    };
  } catch {
    return {
      secondsLeft: DEFAULT_DURATION_SECONDS,
      durationSeconds: DEFAULT_DURATION_SECONDS,
      isRunning: false,
      savedAt: Date.now(),
      presetId: "presentation",
    };
  }
}

function saveTimerState(secondsLeft: number, durationSeconds: number, isRunning: boolean, presetId: TimerPresetId) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        secondsLeft,
        durationSeconds,
        isRunning,
        savedAt: Date.now(),
        presetId,
      }),
    );
  } catch {
    // Timer controls should keep working even when storage is unavailable.
  }
}

export function PresentationTimer() {
  const initialState = useMemo(() => getStoredTimerState(), []);
  const [secondsLeft, setSecondsLeft] = useState(initialState.secondsLeft);
  const [durationSeconds, setDurationSeconds] = useState(initialState.durationSeconds);
  const [isRunning, setIsRunning] = useState(initialState.isRunning);
  const [presetId, setPresetId] = useState<TimerPresetId>(initialState.presetId);
  const intervalRef = useRef<number | null>(null);

  const phase = useMemo(() => getPhase(secondsLeft), [secondsLeft]);
  const activePreset = getPresetById(presetId);
  const progress = 1 - secondsLeft / durationSeconds;

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
    saveTimerState(secondsLeft, durationSeconds, isRunning, presetId);
  }, [secondsLeft, durationSeconds, isRunning, presetId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("button")) return;

      if (event.code === "Space") {
        event.preventDefault();
        setIsRunning((current) => !current);
      }

      if (event.key.toLowerCase() === "r") {
        setIsRunning(false);
        setSecondsLeft(durationSeconds);
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
  }, [durationSeconds]);

  const handleReset = () => {
    setIsRunning(false);
    setSecondsLeft(durationSeconds);
  };

  const handleManualSet = (value: number) => {
    setIsRunning(false);
    setSecondsLeft(clampSeconds(value, durationSeconds));
  };

  const handlePresetSelect = (nextPreset: (typeof TIMER_PRESETS)[number]) => {
    setIsRunning(false);
    setPresetId(nextPreset.id);
    setDurationSeconds(nextPreset.durationSeconds);
    setSecondsLeft(nextPreset.durationSeconds);
  };

  const handlePrimaryAction = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(durationSeconds);
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

      <section className="timer-stage" aria-label={`${activePreset.label} timer`}>
        <div className="timer-kicker">
          <span>BMMA Capstone Defense</span>
          <span>{Math.round(durationSeconds / 60)} Minute {activePreset.label}</span>
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

        <div className="timer-presets" aria-label="Capstone defense timer presets">
          {TIMER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={preset.id === presetId ? "timer-preset timer-preset--active" : "timer-preset"}
              onClick={() => handlePresetSelect(preset)}
            >
              <span>{preset.label}</span>
              <strong>{Math.round(preset.durationSeconds / 60)} min</strong>
            </button>
          ))}
        </div>

        <div className="timer-readout" aria-live="polite" aria-label={`${formatTime(secondsLeft)} remaining`}>
          {formatTime(secondsLeft)}
        </div>

        <div className="timer-progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>

        <div className="timer-manual-controls" aria-label="Manual timer correction controls">
          <label className="timer-slider-label" htmlFor="timer-manual-slider">
            Manual time
            <span>{formatTime(secondsLeft)}</span>
          </label>
          <input
            id="timer-manual-slider"
            type="range"
            min="0"
            max={durationSeconds}
            step="15"
            value={secondsLeft}
            onChange={(event) => handleManualSet(Number(event.currentTarget.value))}
            aria-label="Set remaining timer seconds"
          />
          <div className="timer-manual-row">
            <label htmlFor="timer-minute-input">Minutes left</label>
            <input
              id="timer-minute-input"
              type="number"
              min="0"
              max={Math.round(durationSeconds / 60)}
              value={formatMinuteValue(secondsLeft)}
              onChange={(event) => handleManualSet(Number(event.currentTarget.value) * 60)}
              aria-label="Set remaining timer minutes"
            />
          </div>
        </div>

        <div className="timer-actions">
          <button type="button" onClick={handlePrimaryAction}>
            {isRunning ? "Pause" : secondsLeft === 0 ? "Restart" : "Start"}
          </button>
          <button type="button" onClick={handleReset}>
            Reset
          </button>
        </div>

        <p className="timer-help">Space start/pause | R reset | F fullscreen</p>
      </section>
    </main>
  );
}
