"use client";

import { mmss } from "@/lib/format";

const SIZE = 280;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

const RING: Record<string, string> = {
  focus: "#ef4444",
  short_break: "#10b981",
  long_break: "#3b82f6",
  idle: "#6b7280",
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

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.12}
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
          style={{ transition: "stroke-dashoffset 0.25s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-xs font-medium uppercase tracking-widest opacity-60"
          style={{ color }}
        >
          {label}
        </span>
        <span className="mt-1 font-mono text-6xl font-semibold tabular-nums">
          {mmss(remainingSec)}
        </span>
      </div>
    </div>
  );
}
