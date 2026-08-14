// Focus statistics, computed from the block log. Pure functions over an array
// of blocks so they're trivially testable and can run in render.
//
// Honesty rule (AGENTS.md): everything here is measured from real completed
// blocks. Nothing is modelled, smoothed, or inferred — if there isn't enough
// data for a claim, the claim isn't made (see `bestHour`).

import type { Block } from "./types";

export interface DayStat {
  /** Local midnight of the day, as a timestamp. */
  dayStart: number;
  label: string;
  focusMin: number;
  blocks: number;
}

export interface FocusStats {
  todayFocusMin: number;
  todayBlocks: number;
  weekFocusMin: number;
  weekBlocks: number;
  monthFocusMin: number;
  monthBlocks: number;
  allTimeFocusMin: number;
  allTimeBlocks: number;
  /** Completed / (completed + abandoned) focus blocks, 0–1, or null if none. */
  completionRate: number | null;
  /** Mean self-reported focus rating, 1–5, or null if nothing rated. */
  avgRating: number | null;
  /** Consecutive days up to today with at least one completed focus block. */
  dayStreak: number;
  /** Last 7 days, oldest first, for the bar chart. */
  week: DayStat[];
  /** Last 30 days, oldest first. */
  month: DayStat[];
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Local midnight for the day containing `ts`. */
export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Minutes actually spent in a block (falls back to the planned length). */
function minutesOf(block: Block): number {
  const sec = block.elapsedSec || block.plannedSec || 0;
  return sec / 60;
}

/**
 * Roll a flat block log into the numbers the Stats panel shows.
 * `now` is injectable so tests don't depend on the wall clock.
 */
export function computeStats(blocks: Block[], now = Date.now()): FocusStats {
  const focus = blocks.filter((b) => b.kind === "focus");
  const completed = focus.filter((b) => b.status === "completed");
  const finished = focus.filter(
    (b) => b.status === "completed" || b.status === "abandoned",
  );

  const today = startOfDay(now);
  const dayOf = (b: Block) => startOfDay(b.startedAt ?? now);

  const todayBlocks = completed.filter((b) => dayOf(b) === today);
  const weekStart = today - 6 * 86_400_000;
  const weekBlocks = completed.filter((b) => dayOf(b) >= weekStart);

  const series = (days: number): DayStat[] => {
    const out: DayStat[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = today - i * 86_400_000;
      const onDay = completed.filter((b) => dayOf(b) === dayStart);
      out.push({
        dayStart,
        label: DAY_LABELS[new Date(dayStart).getDay()],
        focusMin: Math.round(sum(onDay.map(minutesOf))),
        blocks: onDay.length,
      });
    }
    return out;
  };
  const week = series(7);
  const month = series(30);
  const monthStart = today - 29 * 86_400_000;
  const monthBlocks = completed.filter((b) => dayOf(b) >= monthStart);

  const rated = focus.filter((b) => b.focusRating != null);

  return {
    todayFocusMin: Math.round(sum(todayBlocks.map(minutesOf))),
    todayBlocks: todayBlocks.length,
    weekFocusMin: Math.round(sum(weekBlocks.map(minutesOf))),
    weekBlocks: weekBlocks.length,
    monthFocusMin: Math.round(sum(monthBlocks.map(minutesOf))),
    monthBlocks: monthBlocks.length,
    allTimeFocusMin: Math.round(sum(completed.map(minutesOf))),
    allTimeBlocks: completed.length,
    completionRate: finished.length ? completed.length / finished.length : null,
    avgRating: rated.length
      ? sum(rated.map((b) => b.focusRating ?? 0)) / rated.length
      : null,
    dayStreak: computeDayStreak(completed, today),
    week,
    month,
  };
}

/** Consecutive days ending today (or yesterday) with a completed focus block. */
function computeDayStreak(completed: Block[], today: number): number {
  if (!completed.length) return 0;
  const days = new Set(completed.map((b) => startOfDay(b.startedAt ?? today)));
  // Today not being done yet shouldn't zero out a live streak, so start
  // counting from yesterday when today is still empty.
  let cursor = days.has(today) ? today : today - 86_400_000;
  if (!days.has(cursor)) return 0;
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor -= 86_400_000;
  }
  return streak;
}

/**
 * The hour of day where this user's rated focus is genuinely strongest.
 * Returns null unless there's enough evidence to say it honestly — we never
 * claim a pattern from one or two blocks.
 */
export function bestHour(
  blocks: Block[],
  minRated = 8,
): { hour: number; avgRating: number } | null {
  const rated = blocks.filter(
    (b) => b.kind === "focus" && b.focusRating != null && b.startedAt != null,
  );
  if (rated.length < minRated) return null;

  const buckets = new Map<number, number[]>();
  for (const b of rated) {
    const hour = new Date(b.startedAt as number).getHours();
    buckets.set(hour, [...(buckets.get(hour) ?? []), b.focusRating as number]);
  }
  // Require at least two samples in an hour before it can win.
  const candidates = [...buckets.entries()].filter(([, r]) => r.length >= 2);
  if (!candidates.length) return null;

  const best = candidates
    .map(([hour, ratings]) => ({ hour, avgRating: mean(ratings) }))
    .sort((a, b) => b.avgRating - a.avgRating)[0];
  return best;
}

/** "2h 15m" / "45m" from whole minutes. */
export function formatMinutes(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
const mean = (ns: number[]) => (ns.length ? sum(ns) / ns.length : 0);
