"use client";

// Single source of truth for live session state. The web UI and the voice
// agent both call these actions, so timer control stays consistent no matter
// which channel the user uses ("pause" by voice == clicking pause).

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { decideBreakBlock, decideFocusBlock } from "./adaptive";
import {
  type AdaptiveContext,
  type AgentSettings,
  type Block,
  type Session,
  type Task,
  DEFAULT_SETTINGS,
} from "./types";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

interface StoreState {
  settings: AgentSettings;
  session: Session | null;
  tasks: Task[];
  /** The block currently in focus in the UI (active or just-finished). */
  activeBlock: Block | null;
  /** Seconds remaining on the active block. */
  remainingSec: number;
  lastDecisionRationale: string | null;
  /** Last completed focus block awaiting a focus rating (or null). */
  lastCompletedFocusId: string | null;

  // --- lifecycle ---
  ensureSession: () => Session;
  startNextFocus: (taskId?: string) => Block;
  startBreak: () => Block;
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
  addTask: (title: string, estimateBlocks?: number) => Task;
  completeTask: (id: string) => void;

  // --- settings ---
  updateSettings: (patch: Partial<AgentSettings>) => void;
}

function buildContext(
  session: Session | null,
  settings: AgentSettings,
  hourOfDay: number,
): AdaptiveContext {
  const blocks = session?.blocks ?? [];
  const recentFocusBlocks = blocks.filter((b) => b.kind === "focus");
  // Focus streak = completed focus blocks since the last long break.
  let streak = 0;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (b.kind === "long_break" && b.status === "completed") break;
    if (b.kind === "focus" && b.status === "completed") streak++;
  }
  return {
    recentFocusBlocks,
    focusStreak: streak,
    hourOfDay,
    baselineFocusSec: settings.baselineFocusSec,
  };
}

export const useAgentStore = create<StoreState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      session: null,
      tasks: [],
      activeBlock: null,
      remainingSec: 0,
      lastDecisionRationale: null,
      lastCompletedFocusId: null,

      ensureSession: () => {
        const existing = get().session;
        if (existing) return existing;
        const session: Session = {
          id: uid(),
          startedAt: Date.now(),
          blocks: [],
          currentBlockIndex: -1,
        };
        set({ session });
        return session;
      },

      startNextFocus: (taskId) => {
        const session = get().ensureSession();
        const { settings } = get();
        const hour = new Date().getHours();
        const ctx = buildContext(session, settings, hour);
        const decision = decideFocusBlock(ctx, settings);
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
          lastDecisionRationale: decision.rationale,
        });
        return block;
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

      addTask: (title, estimateBlocks) => {
        const task: Task = {
          id: uid(),
          title,
          estimateBlocks,
          spentBlocks: 0,
          done: false,
          createdAt: Date.now(),
        };
        set((s) => ({ tasks: [...s.tasks, task] }));
        return task;
      },

      completeTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: true } : t)),
        })),

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    {
      // NOTE: keep this key as "pomodoro-agent" forever — it's where existing
      // users' tasks/sessions live in localStorage. Renaming it would orphan
      // their saved data. (The product is "Kai"; the storage key is legacy.)
      name: "pomodoro-agent",
      partialize: (s) => ({
        settings: s.settings,
        tasks: s.tasks,
        session: s.session,
      }),
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
