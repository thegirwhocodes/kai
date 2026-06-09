"use client";

import { mmss } from "@/lib/format";

const SIZE = 300;
const STROKE = 12;
const R = (SIZE - STROKE) / 2 - 6;
const C = 2 * Math.PI * R;

const RING: Record<string, string> = {
  focus: "#fb7a8e", // rose
  short_break: "#6fe3c8", // mint
  long_break: "#b6a6ff", // lavender
  idle: "rgba(244,241,238,0.45)",
};

export function TimerDial({
  remainingSec,
  plannedSec,
  kind,
  label,
}: {
  remainingSec: number;
  plannedSec: number;
  kind: keyof typeof RING | string;
  label: string;
}) {
  const frac = plannedSec > 0 ? remainingSec / plannedSec : 0;
  const offset = C * (1 - frac);
  const color = RING[kind] ?? RING.idle;
  const active = kind !== "idle";

  return (
    <div
      className="relative grid place-items-center rounded-full"
      style={{
        width: SIZE,
        height: SIZE,
        background:
          "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.06), transparent 70%)",
      }}
    >
      <svg
        width={SIZE}
        height={SIZE}
        className="-rotate-90"
        style={{ filter: active ? `drop-shadow(0 0 14px ${color}66)` : "none" }}
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="#ffffff"
          strokeOpacity={0.1}
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.25s linear, stroke 0.5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[0.7rem] font-semibold uppercase tracking-[0.25em]"
          style={{ color }}
        >
          {label}
        </span>
        <span className="mt-2 font-mono text-7xl font-light tabular-nums tracking-tight">
          {mmss(remainingSec)}
        </span>
      </div>
    </div>
  );
}
