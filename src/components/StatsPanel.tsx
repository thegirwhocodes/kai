"use client";

// Focus stats. Everything here is measured from completed blocks in this
// browser — no estimates, no filler. When there isn't enough data for a claim
// (see "best hour"), the claim simply isn't shown.

import { useMemo, useState } from "react";
import { bestHour, computeStats, formatMinutes } from "@/lib/stats";
import { useAgentStore } from "@/lib/store";

export function StatsPanel() {
  const session = useAgentStore((s) => s.session);
  const history = useAgentStore((s) => s.history);

  const blocks = useMemo(
    () => [...history, ...(session?.blocks ?? [])],
    [history, session],
  );
  const stats = useMemo(() => computeStats(blocks), [blocks]);
  const peak = useMemo(() => bestHour(blocks), [blocks]);

  const [range, setRange] = useState<"week" | "month">("week");
  const series = range === "week" ? stats.week : stats.month;
  const peakMax = Math.max(...series.map((d) => d.focusMin), 1);

  return (
    <div
      className="max-h-[76vh] w-full overflow-y-auto rounded-lg border border-white/12 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.58)] backdrop-blur-2xl"
      style={{ background: "rgba(18, 15, 31, 0.96)" }}
    >
      <h2 className="text-sm font-medium" style={{ color: "var(--muted)" }}>
        Your focus
      </h2>

      {stats.allTimeBlocks === 0 ? (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          Nothing here yet. Finish a focus block and this fills in — time
          focused, your week, and the streak you&rsquo;re building.
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-end gap-2">
            <span className="clock-num text-5xl">
              {formatMinutes(stats.todayFocusMin)}
            </span>
            <span className="mb-1.5 text-xs" style={{ color: "var(--muted)" }}>
              focused today · {stats.todayBlocks} block
              {stats.todayBlocks === 1 ? "" : "s"}
            </span>
          </div>

          {/* Trend, over the window you pick */}
          <div className="mt-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Last {range === "week" ? "7" : "30"} days
              </p>
              <div className="flex gap-1">
                {(["week", "month"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className="rounded-full border px-2.5 py-0.5 text-[11px] transition"
                    style={{
                      borderColor:
                        range === r ? "var(--focus)" : "rgba(255,255,255,0.15)",
                      background:
                        range === r ? "rgba(251,122,142,0.15)" : "transparent",
                    }}
                  >
                    {r === "week" ? "Week" : "Month"}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 flex h-24 items-end gap-1.5">
              {series.map((day, i) => {
                const isToday = i === series.length - 1;
                return (
                  <div
                    key={day.dayStart}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                    title={`${day.label}: ${formatMinutes(day.focusMin)}`}
                  >
                    {/* A track behind every bar so the chart still reads as a
                        chart on a day with nothing in it. */}
                    <span className="flex w-full flex-1 items-end rounded bg-white/[0.06]">
                      <span
                        className="w-full rounded transition-all"
                        style={{
                          height: `${Math.max(day.focusMin > 0 ? 4 : 0, (day.focusMin / peakMax) * 100)}%`,
                          background: isToday
                            ? "var(--focus)"
                            : "rgba(255,255,255,0.28)",
                        }}
                      />
                    </span>
                    {range === "week" && (
                      <span
                        className="text-[10px]"
                        style={{
                          color: isToday ? "var(--foreground)" : "var(--muted)",
                        }}
                      >
                        {day.label[0]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Stat
              label={range === "week" ? "This week" : "This month"}
              value={formatMinutes(
                range === "week" ? stats.weekFocusMin : stats.monthFocusMin,
              )}
            />
            <Stat
              label="Day streak"
              value={`${stats.dayStreak} day${stats.dayStreak === 1 ? "" : "s"}`}
            />
            <Stat
              label="Blocks finished"
              value={
                stats.completionRate == null
                  ? "—"
                  : `${Math.round(stats.completionRate * 100)}%`
              }
            />
            <Stat
              label="Avg focus"
              value={stats.avgRating == null ? "—" : `${stats.avgRating.toFixed(1)}/5`}
            />
          </div>

          {peak && (
            <p className="mt-4 text-xs leading-5" style={{ color: "var(--muted)" }}>
              Your best-rated focus so far lands around{" "}
              <span style={{ color: "var(--foreground)" }}>{hourLabel(peak.hour)}</span>
              , averaging {peak.avgRating.toFixed(1)} out of 5.
            </p>
          )}

          <p className="mt-3 text-[11px]" style={{ color: "var(--muted)" }}>
            {formatMinutes(stats.allTimeFocusMin)} focused all time, across{" "}
            {stats.allTimeBlocks} block{stats.allTimeBlocks === 1 ? "" : "s"}.
            Saved in this browser only.
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 px-3 py-2">
      <p className="text-[11px]" style={{ color: "var(--muted)" }}>
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
    </div>
  );
}

function hourLabel(hour: number): string {
  const suffix = hour < 12 ? "am" : "pm";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${suffix}`;
}
