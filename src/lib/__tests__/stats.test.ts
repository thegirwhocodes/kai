import { describe, expect, it } from "vitest";
import { bestHour, computeStats, formatMinutes, startOfDay } from "../stats";
import type { Block } from "../types";

const DAY = 86_400_000;
// A fixed "now" so nothing here depends on the wall clock: 2026-03-12, 14:00.
const NOW = new Date(2026, 2, 12, 14, 0, 0).getTime();

let seq = 0;
function block(patch: Partial<Block> = {}): Block {
  seq += 1;
  return {
    id: `b${seq}`,
    kind: "focus",
    plannedSec: 25 * 60,
    elapsedSec: 25 * 60,
    status: "completed",
    startedAt: NOW,
    interruptions: 0,
    ...patch,
  };
}

describe("computeStats", () => {
  it("returns empty, non-null-crashing stats for no blocks", () => {
    const s = computeStats([], NOW);
    expect(s.todayFocusMin).toBe(0);
    expect(s.allTimeBlocks).toBe(0);
    expect(s.completionRate).toBeNull();
    expect(s.avgRating).toBeNull();
    expect(s.dayStreak).toBe(0);
    expect(s.week).toHaveLength(7);
  });

  it("counts only today's completed focus blocks in the today totals", () => {
    const s = computeStats(
      [
        block({ startedAt: NOW }),
        block({ startedAt: NOW - 60_000 }),
        block({ startedAt: NOW - DAY }), // yesterday
        block({ startedAt: NOW, kind: "short_break" }), // not focus
        block({ startedAt: NOW, status: "abandoned" }), // not completed
      ],
      NOW,
    );
    expect(s.todayBlocks).toBe(2);
    expect(s.todayFocusMin).toBe(50);
    expect(s.allTimeBlocks).toBe(3);
  });

  it("uses elapsed time rather than the planned length", () => {
    const s = computeStats(
      [block({ plannedSec: 25 * 60, elapsedSec: 10 * 60 })],
      NOW,
    );
    expect(s.todayFocusMin).toBe(10);
  });

  it("falls back to planned time when elapsed was never recorded", () => {
    const s = computeStats([block({ elapsedSec: 0, plannedSec: 30 * 60 })], NOW);
    expect(s.todayFocusMin).toBe(30);
  });

  it("scores completion over finished focus blocks only", () => {
    const s = computeStats(
      [
        block(),
        block(),
        block({ status: "abandoned" }),
        block({ status: "running" }), // in flight, not counted either way
      ],
      NOW,
    );
    expect(s.completionRate).toBeCloseTo(2 / 3);
  });

  it("averages the focus ratings that exist", () => {
    const s = computeStats(
      [block({ focusRating: 5 }), block({ focusRating: 3 }), block()],
      NOW,
    );
    expect(s.avgRating).toBe(4);
  });

  it("builds a 7-day window ending today, oldest first", () => {
    const s = computeStats(
      [block({ startedAt: NOW }), block({ startedAt: NOW - 3 * DAY })],
      NOW,
    );
    expect(s.week).toHaveLength(7);
    expect(s.week.at(-1)?.dayStart).toBe(startOfDay(NOW));
    expect(s.week.at(-1)?.blocks).toBe(1);
    expect(s.week[3].blocks).toBe(1); // three days back
    expect(s.weekBlocks).toBe(2);
  });

  it("excludes blocks older than the 7-day window from week totals", () => {
    const s = computeStats([block({ startedAt: NOW - 30 * DAY })], NOW);
    expect(s.weekBlocks).toBe(0);
    expect(s.allTimeBlocks).toBe(1);
  });

  it("builds a 30-day window that reaches back further than the week", () => {
    const s = computeStats(
      [
        block({ startedAt: NOW }),
        block({ startedAt: NOW - 20 * DAY }),
        block({ startedAt: NOW - 45 * DAY }), // outside the month
      ],
      NOW,
    );
    expect(s.month).toHaveLength(30);
    expect(s.month.at(-1)?.dayStart).toBe(startOfDay(NOW));
    expect(s.monthBlocks).toBe(2);
    expect(s.weekBlocks).toBe(1);
    expect(s.monthFocusMin).toBe(50);
  });

  it("keeps the week window as the last 7 entries of the month window", () => {
    const s = computeStats([block({ startedAt: NOW })], NOW);
    expect(s.month.slice(-7).map((d) => d.dayStart)).toEqual(
      s.week.map((d) => d.dayStart),
    );
  });
});

describe("day streak", () => {
  it("counts consecutive days back from today", () => {
    const s = computeStats(
      [
        block({ startedAt: NOW }),
        block({ startedAt: NOW - DAY }),
        block({ startedAt: NOW - 2 * DAY }),
      ],
      NOW,
    );
    expect(s.dayStreak).toBe(3);
  });

  it("keeps a live streak when today hasn't started yet", () => {
    const s = computeStats(
      [block({ startedAt: NOW - DAY }), block({ startedAt: NOW - 2 * DAY })],
      NOW,
    );
    expect(s.dayStreak).toBe(2);
  });

  it("breaks on a missed day", () => {
    const s = computeStats(
      [block({ startedAt: NOW }), block({ startedAt: NOW - 3 * DAY })],
      NOW,
    );
    expect(s.dayStreak).toBe(1);
  });

  it("is zero once two days have been missed", () => {
    const s = computeStats([block({ startedAt: NOW - 2 * DAY })], NOW);
    expect(s.dayStreak).toBe(0);
  });
});

describe("bestHour", () => {
  const at = (hour: number, rating: 1 | 2 | 3 | 4 | 5) =>
    block({
      startedAt: new Date(2026, 2, 12, hour, 0, 0).getTime(),
      focusRating: rating,
    });

  it("stays silent until there is enough rated evidence", () => {
    expect(bestHour([at(9, 5), at(9, 5), at(10, 1)])).toBeNull();
  });

  it("stays silent when no single hour has repeat samples", () => {
    const spread = [9, 10, 11, 12, 13, 14, 15, 16].map((h) => at(h, 4));
    expect(bestHour(spread)).toBeNull();
  });

  it("picks the highest-rated hour once the bar is met", () => {
    const blocks = [
      at(9, 5),
      at(9, 5),
      at(9, 4),
      at(14, 2),
      at(14, 2),
      at(14, 1),
      at(20, 3),
      at(20, 3),
    ];
    const best = bestHour(blocks);
    expect(best?.hour).toBe(9);
    expect(best?.avgRating).toBeCloseTo(14 / 3);
  });
});

describe("formatMinutes", () => {
  it("formats hours and minutes", () => {
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(135)).toBe("2h 15m");
  });
});
