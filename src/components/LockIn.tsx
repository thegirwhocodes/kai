"use client";

import { useMemo, useState } from "react";
import {
  computeProgress,
  planLockIn,
  prettyDuration,
  summarizePlan,
} from "@/lib/lockIn";
import { useAgentStore } from "@/lib/store";
import { KIND_LABEL } from "@/lib/format";

const PRESETS = [25, 50, 90, 120]; // minutes

/**
 * The headline lock-in chooser, shown when idle. The user commits to a total
 * block of time and Kai lays out the whole Pomodoro plan across it.
 */
export function LockInChooser({ onStart }: { onStart: (minutes: number) => void }) {
  const settings = useAgentStore((s) => s.settings);
  const [minutes, setMinutes] = useState(50);
  const [custom, setCustom] = useState("");

  const plan = useMemo(
    () => planLockIn(minutes * 60, settings),
    [minutes, settings],
  );
  const summary = plan.length ? summarizePlan(plan) : null;

  const pick = (m: number) => {
    setMinutes(m);
    setCustom("");
  };

  return (
    <section className="glass mt-8 w-full max-w-xl rounded-lg p-5 text-left">
      <p className="text-xs font-medium uppercase" style={{ color: "var(--muted)" }}>
        Lock in
      </p>
      <h2 className="mt-1 text-xl font-semibold leading-snug">
        How long are we locking in?
      </h2>

      <div className="mt-4 flex flex-wrap gap-2">
        {PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => pick(m)}
            className="rounded-full border px-4 py-2 text-sm transition"
            style={{
              borderColor:
                minutes === m && !custom ? "var(--focus)" : "rgba(255,255,255,0.15)",
              background: minutes === m && !custom ? "rgba(251,122,142,0.15)" : "transparent",
            }}
          >
            {prettyDuration(m)}
          </button>
        ))}
        <span className="flex items-center gap-1 rounded-full border border-white/15 px-3 py-1">
          <input
            type="number"
            min={5}
            max={480}
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n >= 5) setMinutes(Math.min(480, Math.round(n)));
            }}
            placeholder="custom"
            className="w-16 bg-transparent text-sm outline-none"
          />
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            min
          </span>
        </span>
      </div>

      {summary && (
        <p className="mt-4 text-sm" style={{ color: "var(--muted)" }}>
          {summary} · ends focused
        </p>
      )}

      <button
        type="button"
        onClick={() => onStart(minutes)}
        className="btn-primary mt-4"
      >
        Lock in for {prettyDuration(minutes)}
      </button>
    </section>
  );
}

/** Progress strip shown while a lock-in is running. */
export function LockInBar() {
  const lockIn = useAgentStore((s) => s.lockIn);
  const activeBlock = useAgentStore((s) => s.activeBlock);
  const remainingSec = useAgentStore((s) => s.remainingSec);
  const endLockIn = useAgentStore((s) => s.endLockIn);
  const progress = useMemo(
    () => computeProgress(lockIn, activeBlock, remainingSec),
    [lockIn, activeBlock, remainingSec],
  );
  if (!progress) return null;

  const pct = Math.min(100, (progress.consumedSec / progress.totalSec) * 100);
  const consumedMin = Math.round(progress.consumedSec / 60);
  const totalMin = Math.round(progress.totalSec / 60);

  return (
    <div className="glass mt-8 w-full max-w-md rounded-lg px-4 py-3">
      <div className="flex items-center justify-between text-xs" style={{ color: "var(--muted)" }}>
        <span>
          Locked in · {consumedMin} / {totalMin} min
        </span>
        <span className="flex items-center gap-3">
          <span>
            block {progress.focusDone} of {progress.focusTotal}
          </span>
          <button
            type="button"
            onClick={endLockIn}
            className="opacity-70 underline-offset-2 transition hover:opacity-100 hover:underline"
          >
            End
          </button>
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: "var(--focus)" }}
        />
      </div>
    </div>
  );
}

/** Between-blocks prompt when autostart is off but a lock-in is in progress. */
export function LockInNext({ onNext }: { onNext: () => void }) {
  const lockIn = useAgentStore((s) => s.lockIn);
  const activeBlock = useAgentStore((s) => s.activeBlock);
  const remainingSec = useAgentStore((s) => s.remainingSec);
  const progress = useMemo(
    () => computeProgress(lockIn, activeBlock, remainingSec),
    [lockIn, activeBlock, remainingSec],
  );
  if (!progress?.next) return null;
  const next = progress.next;
  const mins = Math.max(1, Math.round(next.sec / 60));
  return (
    <button type="button" onClick={onNext} className="btn-primary">
      Start {KIND_LABEL[next.kind]?.toLowerCase() ?? next.kind} · {mins} min
    </button>
  );
}
