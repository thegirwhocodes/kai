"use client";

// Single source of truth for live session state. The web UI and the voice
// agent both call these actions, so timer control stays consistent no matter
// which channel the user uses ("pause" by voice == clicking pause).

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { decideBreakBlock, decideFocusBlock } from "./adaptive";
import { computeProgress, planLockIn } from "./lockIn";
import {
  type AdaptiveContext,
  type AgentSettings,
  type Block,
  type KaiRecommendation,
  type LockIn,
  type LockInProgress,
  type Session,
  type Task,
  type TaskPriority,
  DEFAULT_SETTINGS,
} from "./types";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/** Roughly two years of heavy use; keeps localStorage bounded. */
const MAX_HISTORY_BLOCKS = 4000;

/** Same local calendar day? Used to roll the session over at midnight. */
export function isSameDay(a: number, b: number): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

interface StoreState {
  settings: AgentSettings;
  session: Session | null;
  /**
   * Blocks from previous days, oldest first. The live `session` only ever holds
   * today, so stats read `history` + `session.blocks` and every "today" count
   * stays honest across midnight. Capped so localStorage can't grow forever.
   */
  history: Block[];
  tasks: Task[];
  /** The block currently in focus in the UI (active or just-finished). */
  activeBlock: Block | null;
  /** Seconds remaining on the active block. */
  remainingSec: number;
  lastDecisionRationale: string | null;
  /** Last completed focus block awaiting a focus rating (or null). */
  lastCompletedFocusId: string | null;
  /** Most recent life-aware recommendation from Kai's planner. */
  latestRecommendation: KaiRecommendation | null;
  /** Active lock-in commitment, or null when running open-ended. */
  lockIn: LockIn | null;

  // --- lifecycle ---
  ensureSession: () => Session;
  startNextFocus: (
    taskId?: string,
    options?: {
      minutesUntilNextCommitment?: number;
      rationalePrefix?: string;
    },
  ) => Block;
  startRecommendedFocus: () => Block | null;
  startBreak: () => Block;
  /** Commit to a total lock-in budget and start its first block. */
  startLockIn: (totalMinutes: number, taskId?: string) => Block | null;
  /** Advance to the next block in the active lock-in, or finish it. */
  advanceLockIn: () => Block | null;
  /** Drop the lock-in commitment (the current block keeps running). */
  endLockIn: () => void;
  /** Live progress of the active lock-in, or null. */
  lockInProgress: () => LockInProgress | null;
  pause: () => void;
  resume: () => void;
  /** Mark the active block done (ran out or user said "done"). */
  completeActive: () => void;
  /** Abandon the active block early. */
  skipActive: () => void;
  rateActiveFocus: (rating: 1 | 2 | 3 | 4 | 5) => void;
  /** Rate any block by id (used after auto-advance moved past it). */
  rateBlock: (id: string, rating: 1 | 2 | 3 | 4 | 5) => void;
  /** Task id of the most recent focus block, for auto-continuing on it. */
  lastFocusTaskId: () => string | undefined;
  noteInterruption: () => void;
  tick: (deltaSec: number) => void;

  // --- tasks ---
  addTask: (
    title: string,
    estimateBlocks?: number,
    patch?: Partial<
      Pick<Task, "priority" | "source" | "dueAt" | "sphere" | "notes" | "reason">
    >,
  ) => Task;
  completeTask: (id: string) => void;
  setLatestRecommendation: (recommendation: KaiRecommendation | null) => void;

  // --- settings ---
  updateSettings: (patch: Partial<AgentSettings>) => void;
}

function buildContext(
  session: Session | null,
  settings: AgentSettings,
  hourOfDay: number,
  minutesUntilNextCommitment?: number,
): AdaptiveContext {
  const blocks = session?.blocks ?? [];
  const recentFocusBlocks = blocks.filter((b) => b.kind === "focus");
  // Focus streak = completed focus blocks since the last long break.
  let streak = 0;
  let focusMinutesSinceLongBreak = 0;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (b.kind === "long_break" && b.status === "completed") break;
    if (b.kind === "focus" && b.status === "completed") {
      streak++;
      focusMinutesSinceLongBreak += Math.round((b.elapsedSec || b.plannedSec) / 60);
    }
  }
  return {
    recentFocusBlocks,
    focusStreak: streak,
    focusMinutesSinceLongBreak,
    hourOfDay,
    minutesUntilNextCommitment,
    baselineFocusSec: settings.baselineFocusSec,
  };
}

export const useAgentStore = create<StoreState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      session: null,
      history: [],
      tasks: [],
      activeBlock: null,
      remainingSec: 0,
      lastDecisionRationale: null,
      lastCompletedFocusId: null,
      latestRecommendation: null,
      lockIn: null,

      ensureSession: () => {
        const existing = get().session;
        if (existing && isSameDay(existing.startedAt, Date.now())) return existing;
        const session: Session = {
          id: uid(),
          startedAt: Date.now(),
          blocks: [],
          currentBlockIndex: -1,
        };
        // A session left over from an earlier day is retired into history so
        // today starts clean (and yesterday still counts in stats).
        set({
          session,
          history: existing
            ? [...get().history, ...existing.blocks].slice(-MAX_HISTORY_BLOCKS)
            : get().history,
        });
        return session;
      },

      startNextFocus: (taskId, options) => {
        const session = get().ensureSession();
        const { settings } = get();
        const hour = new Date().getHours();
        const ctx = buildContext(
          session,
          settings,
          hour,
          options?.minutesUntilNextCommitment,
        );
        const decision = decideFocusBlock(ctx, settings);
        const rationale = options?.rationalePrefix
          ? `${sentence(options.rationalePrefix)} ${decision.rationale}`
          : decision.rationale;
        const block: Block = {
          id: uid(),
          kind: "focus",
          plannedSec: decision.plannedSec,
          elapsedSec: 0,
          status: "running",
          taskId,
          startedAt: Date.now(),
          interruptions: 0,
        };
        const blocks = [...session.blocks, block];
        set({
          session: { ...session, blocks, currentBlockIndex: blocks.length - 1 },
          activeBlock: block,
          remainingSec: block.plannedSec,
          lastDecisionRationale: rationale,
        });
        return block;
      },

      startRecommendedFocus: () => {
        const recommendation = get().latestRecommendation;
        if (!recommendation) return null;
        if (recommendation.mode === "break") return get().startBreak();

        let taskId = recommendation.taskId;
        const existing = taskId
          ? get().tasks.find((t) => t.id === taskId && !t.done)
          : undefined;
        if (!existing && recommendation.taskTitle) {
          const normalized = recommendation.taskTitle.trim().toLowerCase();
          const match = get().tasks.find(
            (t) => !t.done && t.title.trim().toLowerCase() === normalized,
          );
          taskId =
            match?.id ??
            get().addTask(recommendation.taskTitle, undefined, {
              priority: recommendation.taskPriority ?? "medium",
              source:
                recommendation.source === "email"
                  ? "email"
                  : recommendation.source === "calendar"
                    ? "calendar"
                    : "kai",
              reason: recommendation.reason,
            }).id;
        }

        return get().startNextFocus(taskId, {
          minutesUntilNextCommitment:
            recommendation.minutesUntilNextCommitment,
          rationalePrefix: recommendation.reason,
        });
      },

      startBreak: () => {
        const session = get().ensureSession();
        const { settings } = get();
        const hour = new Date().getHours();
        const ctx = buildContext(session, settings, hour);
        const decision = decideBreakBlock(ctx, settings);
        const block: Block = {
          id: uid(),
          kind: decision.kind,
          plannedSec: decision.plannedSec,
          elapsedSec: 0,
          status: "running",
          startedAt: Date.now(),
          interruptions: 0,
        };
        const blocks = [...session.blocks, block];
        set({
          session: { ...session, blocks, currentBlockIndex: blocks.length - 1 },
          activeBlock: block,
          remainingSec: block.plannedSec,
          lastDecisionRationale: decision.rationale,
        });
        return block;
      },

      startLockIn: (totalMinutes, taskId) => {
        const totalSec = Math.max(60, Math.round(totalMinutes * 60));
        const { settings } = get();
        const plan = planLockIn(totalSec, settings);
        if (!plan.length) return null;
        get().ensureSession();
        const lockIn: LockIn = {
          id: uid(),
          totalSec,
          startedAt: Date.now(),
          plan,
          index: 0,
          taskId,
        };
        return beginPlannedBlock(set, get, lockIn, 0, taskId);
      },

      advanceLockIn: () => {
        const lockIn = get().lockIn;
        if (!lockIn) return null;
        const next = lockIn.index + 1;
        if (next >= lockIn.plan.length) {
          get().endLockIn();
          return null;
        }
        return beginPlannedBlock(set, get, lockIn, next, lockIn.taskId);
      },

      endLockIn: () => {
        const lockIn = get().lockIn;
        if (!lockIn) return;
        const focusTotal = lockIn.plan.filter((b) => b.kind === "focus").length;
        set({
          lockIn: null,
          lastDecisionRationale: `Lock-in complete — ${focusTotal} focus block${
            focusTotal === 1 ? "" : "s"
          } done. Proud of you.`,
        });
      },

      lockInProgress: () => {
        const { lockIn, activeBlock, remainingSec } = get();
        return computeProgress(lockIn, activeBlock, remainingSec);
      },

      pause: () => {
        const b = get().activeBlock;
        if (!b || b.status !== "running") return;
        patchActive(set, get, { status: "paused" });
      },

      resume: () => {
        const b = get().activeBlock;
        if (!b || b.status !== "paused") return;
        patchActive(set, get, { status: "running" });
      },

      completeActive: () => {
        const b = get().activeBlock;
        if (!b) return;
        const elapsed = b.plannedSec - get().remainingSec;
        patchActive(set, get, {
          status: "completed",
          endedAt: Date.now(),
          elapsedSec: Math.max(b.elapsedSec, elapsed),
        });
        // Credit the task with a spent block, and flag it for a focus rating.
        if (b.kind === "focus") {
          set({ lastCompletedFocusId: b.id });
          if (b.taskId) {
            set((s) => ({
              tasks: s.tasks.map((t) =>
                t.id === b.taskId ? { ...t, spentBlocks: t.spentBlocks + 1 } : t,
              ),
            }));
          }
        }
      },

      skipActive: () => {
        const b = get().activeBlock;
        if (!b) return;
        patchActive(set, get, { status: "abandoned", endedAt: Date.now() });
        // In a lock-in, skipping this block rolls straight into the next one.
        if (get().lockIn) get().advanceLockIn();
      },

      rateActiveFocus: (rating) => {
        patchActive(set, get, { focusRating: rating });
      },

      rateBlock: (id, rating) => {
        set((s) => ({
          lastCompletedFocusId:
            s.lastCompletedFocusId === id ? null : s.lastCompletedFocusId,
          activeBlock:
            s.activeBlock?.id === id
              ? { ...s.activeBlock, focusRating: rating }
              : s.activeBlock,
          session: s.session
            ? {
                ...s.session,
                blocks: s.session.blocks.map((x) =>
                  x.id === id ? { ...x, focusRating: rating } : x,
                ),
              }
            : s.session,
        }));
      },

      lastFocusTaskId: () => {
        const blocks = get().session?.blocks ?? [];
        for (let i = blocks.length - 1; i >= 0; i--) {
          if (blocks[i].kind === "focus") return blocks[i].taskId;
        }
        return undefined;
      },

      noteInterruption: () => {
        const b = get().activeBlock;
        if (!b) return;
        patchActive(set, get, { interruptions: b.interruptions + 1 });
      },

      tick: (deltaSec) => {
        const b = get().activeBlock;
        if (!b || b.status !== "running") return;
        const remaining = Math.max(0, get().remainingSec - deltaSec);
        set({ remainingSec: remaining });
        patchActive(set, get, {
          elapsedSec: b.plannedSec - remaining,
        });
        if (remaining === 0) get().completeActive();
      },

      addTask: (title, estimateBlocks, patch) => {
        const task: Task = {
          id: uid(),
          title,
          estimateBlocks,
          spentBlocks: 0,
          done: false,
          createdAt: Date.now(),
          priority: normalizePriority(patch?.priority),
          source: patch?.source ?? "manual",
          dueAt: patch?.dueAt,
          sphere: patch?.sphere,
          notes: patch?.notes,
          reason: patch?.reason,
        };
        set((s) => ({ tasks: [...s.tasks, task] }));
        return task;
      },

      completeTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: true } : t)),
        })),

      setLatestRecommendation: (latestRecommendation) =>
        set({ latestRecommendation }),

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    {
      // NOTE: keep this key as "pomodoro-agent" forever — it's where existing
      // users' tasks/sessions live in localStorage. Renaming it would orphan
      // their saved data. (The product is "Kai"; the storage key is legacy.)
      name: "pomodoro-agent",
      version: 2,
      partialize: (s) => ({
        settings: s.settings,
        tasks: s.tasks,
        session: s.session,
        history: s.history,
      }),
      // v0 -> v1: classic Pomodoro became the product default. The adaptive
      // toggle had no UI before v1, so a persisted `adaptive: true` was never a
      // deliberate choice — it's the stale old default. Flip it off once.
      // Cast: migrate returns a partial; the merge() below fills any gaps with
      // DEFAULT_SETTINGS at runtime, so a partial shape is safe here.
      migrate: (persisted, version) =>
        migratePersisted(persisted, version) as {
          settings: AgentSettings;
          tasks: Task[];
          session: Session | null;
          history: Block[];
        },
      // Default merge is shallow, which would let an OLD persisted `settings`
      // object (missing newer keys like autoStart) clobber the defaults. Deep-
      // merge settings so new fields get their defaults, while tasks/session are
      // taken verbatim from storage (never overwritten).
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<StoreState>;
        return {
          ...current,
          ...p,
          settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
        };
      },
    },
  ),
);

/**
 * Migrate persisted state across schema versions. Exported so it can be unit
 * tested directly (the zustand persist wiring is hard to exercise in a test).
 */
export function migratePersisted(
  persisted: unknown,
  version: number,
): Partial<StoreState> {
  const p = { ...((persisted ?? {}) as Partial<StoreState>) };
  if (version < 1 && p.settings) {
    p.settings = { ...p.settings, adaptive: false };
  }
  // v1 -> v2: `session` used to run forever, so an existing user's blocks span
  // many days and every "today" count was inflated. Split the old pile: keep
  // today in the session, retire the rest to history.
  if (version < 2) {
    const now = Date.now();
    const blocks = p.session?.blocks ?? [];
    const past = blocks.filter((b) => !isSameDay(b.startedAt ?? now, now));
    const today = blocks.filter((b) => isSameDay(b.startedAt ?? now, now));
    p.history = [...(p.history ?? []), ...past].slice(-MAX_HISTORY_BLOCKS);
    if (p.session) {
      p.session = {
        ...p.session,
        startedAt: today[0]?.startedAt ?? now,
        blocks: today,
        currentBlockIndex: today.length - 1,
      };
    }
  }
  return p;
}

/**
 * Start a specific planned block from a lock-in and record it as the active
 * block. Length is fixed by the plan (not the adaptive engine), and the block
 * is tagged with the lock-in id so progress can be measured.
 */
function beginPlannedBlock(
  set: (partial: Partial<StoreState>) => void,
  get: () => StoreState,
  lockIn: LockIn,
  index: number,
  taskId?: string,
): Block {
  const session = get().ensureSession();
  const planned = lockIn.plan[index];
  const isFocus = planned.kind === "focus";
  const mins = Math.max(1, Math.round(planned.sec / 60));
  const focusDoneBefore = lockIn.plan
    .slice(0, index)
    .filter((b) => b.kind === "focus").length;
  const focusTotal = lockIn.plan.filter((b) => b.kind === "focus").length;
  const rationale = isFocus
    ? `Focus block ${focusDoneBefore + 1} of ${focusTotal} — ${mins} minute${
        mins === 1 ? "" : "s"
      }. Let's lock in.`
    : `${mins} minute${mins === 1 ? "" : "s"} ${
        planned.kind === "long_break" ? "long break" : "break"
      }. Reset before the next block.`;
  const block: Block = {
    id: uid(),
    kind: planned.kind,
    plannedSec: planned.sec,
    elapsedSec: 0,
    status: "running",
    taskId: isFocus ? taskId : undefined,
    startedAt: Date.now(),
    interruptions: 0,
    lockInId: lockIn.id,
  };
  const blocks = [...session.blocks, block];
  set({
    session: { ...session, blocks, currentBlockIndex: blocks.length - 1 },
    activeBlock: block,
    remainingSec: block.plannedSec,
    lastDecisionRationale: rationale,
    lockIn: { ...lockIn, index },
  });
  return block;
}

/** Apply a patch to the active block in both `activeBlock` and the session. */
function patchActive(
  set: (fn: (s: StoreState) => Partial<StoreState>) => void,
  get: () => StoreState,
  patch: Partial<Block>,
) {
  const b = get().activeBlock;
  if (!b) return;
  const updated = { ...b, ...patch };
  set((s) => ({
    activeBlock: updated,
    session: s.session
      ? {
          ...s.session,
          blocks: s.session.blocks.map((x) => (x.id === b.id ? updated : x)),
        }
      : s.session,
  }));
}

function normalizePriority(priority?: TaskPriority): TaskPriority | undefined {
  if (
    priority === "low" ||
    priority === "medium" ||
    priority === "high" ||
    priority === "urgent"
  ) {
    return priority;
  }
  return priority == null ? undefined : "medium";
}

function sentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const capitalized = trimmed[0].toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}
