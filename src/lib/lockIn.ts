// Lock-in planning. Given a total time budget the user commits to (focus +
// breaks combined) and their classic Pomodoro settings, lay out the whole
// sequence of blocks up front. The plan always ends on a focus block — you
// finish a session focused, not mid-break — and any leftover slack is absorbed
// into the final focus block so the committed budget is honored exactly.

import type {
  AgentSettings,
  Block,
  LockIn,
  LockInProgress,
  PlannedBlock,
} from "./types";

/** Build the block sequence that fills a lock-in budget of `totalSec`. */
export function planLockIn(
  totalSec: number,
  settings: AgentSettings,
): PlannedBlock[] {
  const focus = Math.max(60, settings.baselineFocusSec);
  const shortB = Math.max(60, settings.shortBreakSec);
  const longB = Math.max(60, settings.longBreakSec);
  const perLong = Math.max(2, Math.round(settings.blocksBeforeLongBreak));
  const minFocus = Math.min(focus, 5 * 60);

  const plan: PlannedBlock[] = [];
  let used = 0;
  let focusCount = 0;

  while (totalSec - used >= minFocus) {
    const f = Math.min(focus, totalSec - used);
    plan.push({ kind: "focus", sec: f });
    used += f;
    focusCount += 1;

    const remaining = totalSec - used;
    if (remaining <= 0) break;

    const isLong = focusCount % perLong === 0;
    const breakLen = isLong ? longB : shortB;
    // No room for a real break -> end this lock-in on the focus block.
    if (remaining < Math.min(breakLen, 60)) break;

    const b = Math.min(breakLen, remaining);
    plan.push({ kind: isLong ? "long_break" : "short_break", sec: b });
    used += b;
  }

  // Always finish on a focus block.
  while (plan.length && plan[plan.length - 1].kind !== "focus") {
    used -= plan.pop()!.sec;
  }

  // Absorb any leftover into the final focus block so the budget is exact.
  if (plan.length) {
    const slack = totalSec - used;
    if (slack > 0) plan[plan.length - 1].sec += slack;
  }

  return plan;
}

/** Count of focus blocks in a plan. */
export function focusCount(plan: PlannedBlock[]): number {
  return plan.filter((b) => b.kind === "focus").length;
}

/**
 * Pure progress computation over stable state, safe to call in render (it never
 * allocates from a store selector). Returns null when no lock-in is active.
 */
export function computeProgress(
  lockIn: LockIn | null,
  activeBlock: Block | null,
  remainingSec: number,
): LockInProgress | null {
  if (!lockIn) return null;
  const { plan, index } = lockIn;
  let consumed = 0;
  for (let i = 0; i < index; i++) consumed += plan[i].sec;
  if (activeBlock && activeBlock.lockInId === lockIn.id) {
    consumed += Math.max(0, activeBlock.plannedSec - remainingSec);
  }
  const current = plan[index] ?? null;
  const focusDoneBefore = plan
    .slice(0, index)
    .filter((b) => b.kind === "focus").length;
  return {
    totalSec: lockIn.totalSec,
    consumedSec: Math.min(lockIn.totalSec, Math.round(consumed)),
    focusDone: focusDoneBefore + (current?.kind === "focus" ? 1 : 0),
    focusTotal: plan.filter((b) => b.kind === "focus").length,
    blockIndex: index,
    blockCount: plan.length,
    current,
    next: plan[index + 1] ?? null,
  };
}

/** A short, human summary of a plan, e.g. "4 focus blocks · 3 breaks · 2h". */
export function summarizePlan(plan: PlannedBlock[]): string {
  const focuses = focusCount(plan);
  const breaks = plan.length - focuses;
  const totalMin = Math.round(plan.reduce((a, b) => a + b.sec, 0) / 60);
  const parts = [
    `${focuses} focus block${focuses === 1 ? "" : "s"}`,
    breaks > 0 ? `${breaks} break${breaks === 1 ? "" : "s"}` : null,
    prettyDuration(totalMin),
  ].filter(Boolean);
  return parts.join(" · ");
}

/** "1h 55m" / "45m" style duration from whole minutes. */
export function prettyDuration(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
