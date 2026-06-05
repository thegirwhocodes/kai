"use client";

// Executes an agent tool call against the live store and returns a short
// result string fed back to the model as a tool_result. This is the bridge
// that makes "pause" by voice identical to clicking Pause.

import { useAgentStore } from "@/lib/store";
import { KIND_LABEL } from "@/lib/format";

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export function executeToolCall(call: ToolCall): string {
  const s = useAgentStore.getState();
  const { input } = call;

  switch (call.name) {
    case "start_focus": {
      const block = s.startNextFocus(input.taskId as string | undefined);
      // Re-read for the freshly-set rationale.
      const rationale = useAgentStore.getState().lastDecisionRationale;
      return `Started a ${Math.round(block.plannedSec / 60)} min focus block. Engine rationale: ${rationale}`;
    }
    case "start_break": {
      const block = s.startBreak();
      const rationale = useAgentStore.getState().lastDecisionRationale;
      return `Started a ${KIND_LABEL[block.kind]?.toLowerCase() ?? block.kind} of ${Math.round(block.plannedSec / 60)} min. Rationale: ${rationale}`;
    }
    case "pause": {
      if (!s.activeBlock || s.activeBlock.status !== "running")
        return "Nothing is running to pause.";
      s.pause();
      return "Paused.";
    }
    case "resume": {
      if (s.activeBlock?.status !== "paused") return "Nothing is paused.";
      s.resume();
      return "Resumed.";
    }
    case "complete_block": {
      if (!s.activeBlock) return "No active block.";
      s.completeActive();
      return "Marked the block complete.";
    }
    case "skip_block": {
      if (!s.activeBlock) return "No active block.";
      s.skipActive();
      return "Skipped the block.";
    }
    case "rate_focus": {
      const r = Number(input.rating);
      if (!(r >= 1 && r <= 5)) return "Rating must be 1-5.";
      // Prefer the just-finished focus block (autopilot may have moved on to a
      // break); fall back to the active block.
      const targetId = s.lastCompletedFocusId ?? s.activeBlock?.id;
      if (!targetId) return "No focus block to rate yet.";
      s.rateBlock(targetId, r as 1 | 2 | 3 | 4 | 5);
      return `Recorded focus rating ${r}. The engine will use it for the next block.`;
    }
    case "add_task": {
      const title = String(input.title ?? "").trim();
      if (!title) return "Task title was empty.";
      const t = s.addTask(
        title,
        input.estimateBlocks != null ? Number(input.estimateBlocks) : undefined,
      );
      return `Added task "${t.title}" (id ${t.id}).`;
    }
    case "complete_task": {
      const id = String(input.taskId ?? "");
      const task = s.tasks.find((t) => t.id === id);
      if (!task) return `No task with id ${id}.`;
      s.completeTask(id);
      return `Marked "${task.title}" done.`;
    }
    default:
      return `Unknown tool: ${call.name}`;
  }
}

/** Snapshot of live state to send the model so it never asks what it can see. */
export function buildStateSnapshot() {
  const s = useAgentStore.getState();
  const blocks = s.session?.blocks ?? [];
  let streak = 0;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (b.kind === "long_break" && b.status === "completed") break;
    if (b.kind === "focus" && b.status === "completed") streak++;
  }
  return {
    activeKind: s.activeBlock?.kind,
    activeStatus: s.activeBlock?.status,
    remainingSec: s.remainingSec,
    focusStreak: streak,
    completedFocus: blocks.filter(
      (b) => b.kind === "focus" && b.status === "completed",
    ).length,
    tasks: s.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      spentBlocks: t.spentBlocks,
      done: t.done,
    })),
    lastRationale: s.lastDecisionRationale,
  };
}
