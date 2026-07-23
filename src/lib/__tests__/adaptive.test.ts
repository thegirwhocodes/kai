import { describe, expect, it } from "vitest";
import { decideBreakBlock, decideFocusBlock } from "../adaptive";
import {
  DEFAULT_SETTINGS,
  type AdaptiveContext,
  type AgentSettings,
} from "../types";

const classic: AgentSettings = {
  ...DEFAULT_SETTINGS,
  adaptive: false,
  baselineFocusSec: 25 * 60,
  shortBreakSec: 5 * 60,
  longBreakSec: 15 * 60,
  blocksBeforeLongBreak: 4,
};

function ctx(patch: Partial<AdaptiveContext> = {}): AdaptiveContext {
  return {
    recentFocusBlocks: [],
    focusStreak: 0,
    focusMinutesSinceLongBreak: 0,
    hourOfDay: 10,
    baselineFocusSec: classic.baselineFocusSec,
    ...patch,
  };
}

describe("classic (non-adaptive) mode", () => {
  it("uses the user's exact focus length regardless of time or streak", () => {
    for (const hour of [7, 10, 14, 20, 23]) {
      const d = decideFocusBlock(ctx({ hourOfDay: hour, focusStreak: 3 }), classic);
      expect(d.plannedSec).toBe(25 * 60);
    }
  });

  it("REGRESSION: a short break is exactly the user's 5 min, never a textbook 15", () => {
    const d = decideBreakBlock(ctx({ focusStreak: 1 }), classic);
    expect(d.kind).toBe("short_break");
    expect(d.plannedSec).toBe(5 * 60);
    expect(d.rationale).toContain("5 minute");
    expect(d.rationale).not.toContain("15");
  });

  it("gives a long break exactly every Nth block at the user's length", () => {
    expect(decideBreakBlock(ctx({ focusStreak: 2 }), classic).kind).toBe(
      "short_break",
    );
    const long = decideBreakBlock(ctx({ focusStreak: 4 }), classic);
    expect(long.kind).toBe("long_break");
    expect(long.plannedSec).toBe(15 * 60);
  });

  it("honors custom break lengths", () => {
    const custom = { ...classic, shortBreakSec: 8 * 60 };
    const d = decideBreakBlock(ctx({ focusStreak: 1 }), custom);
    expect(d.plannedSec).toBe(8 * 60);
    expect(d.rationale).toContain("8 minute");
  });
});

describe("adaptive mode", () => {
  const adaptive = { ...classic, adaptive: true };

  it("keeps focus length within the configured [min, max] bounds", () => {
    for (const hour of [7, 10, 14, 20, 23]) {
      for (const streak of [0, 1, 3, 5]) {
        const d = decideFocusBlock(ctx({ hourOfDay: hour, focusStreak: streak }), adaptive);
        expect(d.plannedSec).toBeGreaterThanOrEqual(adaptive.minFocusSec);
        expect(d.plannedSec).toBeLessThanOrEqual(adaptive.maxFocusSec);
      }
    }
  });

  it("does not exceed the time until the next commitment", () => {
    const d = decideFocusBlock(
      ctx({ minutesUntilNextCommitment: 20 }),
      adaptive,
    );
    expect(d.plannedSec).toBeLessThanOrEqual(20 * 60);
  });

  it("snaps to whole-minute durations (no odd 24-min blocks)", () => {
    for (const hour of [9, 13, 17, 22]) {
      const d = decideFocusBlock(ctx({ hourOfDay: hour }), adaptive);
      expect(d.plannedSec % 60).toBe(0);
    }
  });
});
