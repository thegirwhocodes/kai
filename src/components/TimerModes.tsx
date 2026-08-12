"use client";

// Countdown and stopwatch, the two timers Flocus has that a Pomodoro-only app
// doesn't. Both are deliberately plain: a countdown is one block of exactly
// the length you asked for (no break chained onto it), and the stopwatch just
// counts up until you stop it, then logs the time so it still shows in stats.

import { useState } from "react";
import { unlockAudio } from "@/lib/alerts";
import { mmss } from "@/lib/format";
import { useAgentStore } from "@/lib/store";
import type { TimerMode } from "@/lib/types";

const MODES: { id: TimerMode; label: string }[] = [
  { id: "pomodoro", label: "Pomodoro" },
  { id: "countdown", label: "Countdown" },
  { id: "stopwatch", label: "Stopwatch" },
];

export function ModeSwitch({
  mode,
  onChange,
}: {
  mode: TimerMode;
  onChange: (m: TimerMode) => void;
}) {
  return (
    <div className="glass mt-7 inline-flex rounded-full p-1">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(m.id)}
          aria-pressed={mode === m.id}
          className="rounded-full px-4 py-1.5 text-xs font-medium transition"
          style={
            mode === m.id
              ? { background: "rgba(251,122,142,0.9)", color: "#1a1530" }
              : { color: "var(--muted)" }
          }
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

const PRESETS = [5, 10, 15, 20, 30, 45, 60];

export function CountdownStarter({ taskId }: { taskId?: string }) {
  const startCountdown = useAgentStore((s) => s.startCountdown);
  const [minutes, setMinutes] = useState(10);

  return (
    <div className="glass mt-6 w-full max-w-md rounded-lg p-4 text-left">
      <p className="text-xs font-medium uppercase" style={{ color: "var(--muted)" }}>
        Countdown
      </p>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
        One timer, exactly this long. No break after it.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setMinutes(p)}
            className="rounded-full border px-3 py-1 text-xs transition"
            style={{
              borderColor: minutes === p ? "var(--focus)" : "rgba(255,255,255,0.15)",
              background: minutes === p ? "rgba(251,122,142,0.15)" : "transparent",
            }}
          >
            {p}m
          </button>
        ))}
        <input
          type="number"
          min={1}
          max={480}
          value={minutes}
          onChange={(e) =>
            setMinutes(Math.max(1, Math.min(480, Number(e.target.value) || 1)))
          }
          aria-label="Countdown minutes"
          className="w-16 rounded-full border border-white/25 bg-white/5 px-2 py-1 text-center text-xs outline-none"
        />
      </div>
      <button
        type="button"
        onClick={() => {
          unlockAudio();
          startCountdown(minutes, taskId);
        }}
        className="btn-primary mt-4"
      >
        Start {minutes} min
      </button>
    </div>
  );
}

export function StopwatchPanel({ taskId }: { taskId?: string }) {
  const stopwatch = useAgentStore((s) => s.stopwatch);
  const start = useAgentStore((s) => s.startStopwatch);
  const toggle = useAgentStore((s) => s.toggleStopwatch);
  const stop = useAgentStore((s) => s.stopStopwatch);
  const [note, setNote] = useState<string | null>(null);

  if (!stopwatch) {
    return (
      <div className="mt-7 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => {
            unlockAudio();
            setNote(null);
            start(taskId);
          }}
          className="btn-primary"
        >
          Start stopwatch
        </button>
        {note && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {note}
          </p>
        )}
      </div>
    );
  }

  const elapsed = Math.floor(stopwatch.elapsedSec);
  const hours = Math.floor(elapsed / 3600);
  const label = hours > 0 ? `${hours}:${mmss(elapsed % 3600)}` : mmss(elapsed);

  return (
    <div className="mt-4 flex flex-col items-center">
      <span className="clock-num text-7xl sm:text-8xl">{label}</span>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={toggle} className="btn-ghost">
          {stopwatch.running ? "Pause" : "Resume"}
        </button>
        <button
          type="button"
          onClick={() => {
            const block = stop();
            setNote(
              block
                ? `Logged ${Math.round(block.elapsedSec / 60)} minutes of focus.`
                : "Under a minute, so nothing was logged.",
            );
          }}
          className="btn-primary"
        >
          Stop
        </button>
      </div>
    </div>
  );
}
