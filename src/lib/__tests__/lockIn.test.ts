import { describe, expect, it } from "vitest";
import {
  computeProgress,
  focusCount,
  planLockIn,
  prettyDuration,
  summarizePlan,
} from "../lockIn";
import { DEFAULT_SETTINGS, type AgentSettings, type Block, type LockIn } from "../types";

const S: AgentSettings = {
  ...DEFAULT_SETTINGS,
  baselineFocusSec: 25 * 60,
  shortBreakSec: 5 * 60,
  longBreakSec: 15 * 60,
  blocksBeforeLongBreak: 4,
};

const total = (plan: { sec: number }[]) => plan.reduce((a, b) => a + b.sec, 0);

describe("planLockIn", () => {
  const durations = [5, 10, 25, 30, 45, 50, 60, 75, 90, 120, 150, 180, 240];

  it("fills the exact committed budget for every duration", () => {
    for (const m of durations) {
      const plan = planLockIn(m * 60, S);
      expect(total(plan)).toBe(m * 60);
    }
  });

  it("always ends on a focus block", () => {
    for (const m of durations) {
      const plan = planLockIn(m * 60, S);
      expect(plan.at(-1)?.kind).toBe("focus");
    }
  });

  it("starts with focus and never places two breaks back to back", () => {
    for (const m of durations) {
      const plan = planLockIn(m * 60, S);
      expect(plan[0]?.kind).toBe("focus");
      for (let i = 1; i < plan.length; i++) {
        const bothBreaks =
          plan[i].kind !== "focus" && plan[i - 1].kind !== "focus";
        expect(bothBreaks).toBe(false);
      }
    }
  });

  it("places a long break only after every Nth focus block", () => {
    const plan = planLockIn(180 * 60, S); // long enough to include a long break
    let focusSeen = 0;
    for (const b of plan) {
      if (b.kind === "focus") focusSeen++;
      if (b.kind === "long_break") {
        expect(focusSeen % S.blocksBeforeLongBreak).toBe(0);
      }
    }
    expect(plan.some((b) => b.kind === "long_break")).toBe(true);
  });

  it("handles a budget too small for a full block as a single focus", () => {
    const plan = planLockIn(8 * 60, S);
    expect(plan).toEqual([{ kind: "focus", sec: 8 * 60 }]);
  });

  it("never returns an empty plan for a usable budget", () => {
    expect(planLockIn(5 * 60, S).length).toBeGreaterThan(0);
  });

  it("respects custom focus/break lengths", () => {
    const custom: AgentSettings = {
      ...S,
      baselineFocusSec: 50 * 60,
      shortBreakSec: 10 * 60,
    };
    const plan = planLockIn(120 * 60, custom);
    expect(total(plan)).toBe(120 * 60);
    expect(plan[0]).toEqual({ kind: "focus", sec: 50 * 60 });
    expect(plan.at(-1)?.kind).toBe("focus");
  });
});

describe("summaries", () => {
  it("summarizePlan counts focus + breaks and total", () => {
    const plan = planLockIn(120 * 60, S);
    const summary = summarizePlan(plan);
    expect(summary).toContain(`${focusCount(plan)} focus blocks`);
    expect(summary).toContain("2h");
  });

  it("prettyDuration formats hours and minutes", () => {
    expect(prettyDuration(45)).toBe("45m");
    expect(prettyDuration(60)).toBe("1h");
    expect(prettyDuration(115)).toBe("1h 55m");
  });
});

describe("computeProgress", () => {
  const plan = planLockIn(120 * 60, S);
  const lockIn: LockIn = {
    id: "L1",
    totalSec: 120 * 60,
    startedAt: 0,
    plan,
    index: 2, // third block
  };
  const activeBlock: Block = {
    id: "b",
    kind: plan[2].kind,
    plannedSec: plan[2].sec,
    elapsedSec: 60,
    status: "running",
    interruptions: 0,
    lockInId: "L1",
  };

  it("returns null when no lock-in", () => {
    expect(computeProgress(null, null, 0)).toBeNull();
  });

  it("sums prior blocks plus current elapsed, capped at total", () => {
    const priorSec = plan[0].sec + plan[1].sec;
    const p = computeProgress(lockIn, activeBlock, plan[2].sec - 60)!;
    expect(p.consumedSec).toBe(priorSec + 60);
    expect(p.consumedSec).toBeLessThanOrEqual(p.totalSec);
    expect(p.blockCount).toBe(plan.length);
  });

  it("counts the current focus block toward focusDone", () => {
    const p = computeProgress(lockIn, activeBlock, plan[2].sec)!;
    expect(p.focusDone).toBeGreaterThanOrEqual(1);
    expect(p.focusTotal).toBe(focusCount(plan));
  });
});
