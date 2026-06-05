"use client";

import { useEffect, useState } from "react";
import { TimerDial } from "@/components/TimerDial";
import { VoicePanel } from "@/components/VoicePanel";
import { KIND_LABEL } from "@/lib/format";
import { useAgentStore } from "@/lib/store";
import { useTicker } from "@/lib/useTicker";

export default function Home() {
  useTicker();

  // Persisted state rehydrates only on the client; render after mount to avoid
  // a server/client hydration mismatch on the timer.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const active = useAgentStore((s) => s.activeBlock);
  const remaining = useAgentStore((s) => s.remainingSec);
  const rationale = useAgentStore((s) => s.lastDecisionRationale);
  const tasks = useAgentStore((s) => s.tasks);
  const session = useAgentStore((s) => s.session);

  const startFocus = useAgentStore((s) => s.startNextFocus);
  const startBreak = useAgentStore((s) => s.startBreak);
  const pause = useAgentStore((s) => s.pause);
  const resume = useAgentStore((s) => s.resume);
  const complete = useAgentStore((s) => s.completeActive);
  const skip = useAgentStore((s) => s.skipActive);
  const rate = useAgentStore((s) => s.rateActiveFocus);
  const addTask = useAgentStore((s) => s.addTask);
  const completeTask = useAgentStore((s) => s.completeTask);

  const [taskTitle, setTaskTitle] = useState("");
  const [selectedTask, setSelectedTask] = useState<string | undefined>();

  const kind = active?.kind ?? "idle";
  const isFocus = active?.kind === "focus";
  const isRunning = active?.status === "running";
  const isPaused = active?.status === "paused";
  const justFinished =
    active?.status === "completed" || active?.status === "abandoned";
  const awaitingRating =
    isFocus && active?.status === "completed" && active.focusRating == null;

  const completedFocus =
    session?.blocks.filter(
      (b) => b.kind === "focus" && b.status === "completed",
    ).length ?? 0;

  if (!mounted) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-12">
        <span className="text-sm opacity-40">Loading…</span>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center gap-8 px-6 py-12">
      <header className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Focus Coach</h1>
        <p className="mt-1 text-sm opacity-60">
          An adaptive pomodoro agent — talk to it, or drive it here.
        </p>
      </header>

      <TimerDial
        remainingSec={active ? remaining : 0}
        plannedSec={active?.plannedSec ?? 1}
        kind={kind}
        label={active ? KIND_LABEL[active.kind] ?? "Focus" : "Ready"}
      />

      {/* The agent's reasoning — the "smart" part made visible. */}
      {rationale && (
        <p className="max-w-md text-center text-sm italic opacity-75">
          “{rationale}”
        </p>
      )}

      {/* Rating prompt after a focus block. */}
      {awaitingRating && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm opacity-70">How focused were you?</span>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => rate(n as 1 | 2 | 3 | 4 | 5)}
                className="h-10 w-10 rounded-full border border-current/20 text-sm font-medium hover:bg-current/10"
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Primary controls. */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {!active || justFinished ? (
          <>
            <button
              onClick={() => startFocus(selectedTask)}
              className="rounded-full bg-red-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-600"
            >
              Start focus
            </button>
            <button
              onClick={() => startBreak()}
              className="rounded-full border border-current/20 px-6 py-2.5 text-sm font-medium hover:bg-current/10"
            >
              Take a break
            </button>
          </>
        ) : (
          <>
            {isRunning && (
              <button
                onClick={pause}
                className="rounded-full border border-current/20 px-6 py-2.5 text-sm font-medium hover:bg-current/10"
              >
                Pause
              </button>
            )}
            {isPaused && (
              <button
                onClick={resume}
                className="rounded-full bg-red-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-600"
              >
                Resume
              </button>
            )}
            <button
              onClick={complete}
              className="rounded-full border border-current/20 px-6 py-2.5 text-sm font-medium hover:bg-current/10"
            >
              Done early
            </button>
            <button
              onClick={skip}
              className="rounded-full px-4 py-2.5 text-sm opacity-60 hover:opacity-100"
            >
              Skip
            </button>
          </>
        )}
      </div>

      {/* Session ribbon — completed focus blocks so far. */}
      <div className="flex items-center gap-1.5 text-xs opacity-60">
        {Array.from({ length: Math.max(4, completedFocus) }).map((_, i) => (
          <span
            key={i}
            className={`h-2.5 w-2.5 rounded-full ${
              i < completedFocus ? "bg-red-500" : "bg-current/15"
            }`}
          />
        ))}
        <span className="ml-2">{completedFocus} blocks today</span>
      </div>

      {/* Voice coach — talk to it, or type. Drives the same store. */}
      <VoicePanel />

      {/* Tasks. */}
      <section className="w-full max-w-md">
        <h2 className="mb-2 text-sm font-medium opacity-70">Tasks</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!taskTitle.trim()) return;
            const t = addTask(taskTitle.trim());
            setSelectedTask(t.id);
            setTaskTitle("");
          }}
          className="mb-3 flex gap-2"
        >
          <input
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="What are you working on?"
            className="flex-1 rounded-lg border border-current/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-current/40"
          />
          <button
            type="submit"
            className="rounded-lg border border-current/20 px-3 py-2 text-sm hover:bg-current/10"
          >
            Add
          </button>
        </form>
        <ul className="flex flex-col gap-1.5">
          {tasks
            .filter((t) => !t.done)
            .map((t) => (
              <li
                key={t.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                  selectedTask === t.id
                    ? "border-red-500/60"
                    : "border-current/15"
                }`}
              >
                <button
                  onClick={() => completeTask(t.id)}
                  className="h-4 w-4 rounded-full border border-current/40 hover:bg-current/20"
                  aria-label="Complete task"
                />
                <button
                  onClick={() => setSelectedTask(t.id)}
                  className="flex-1 text-left"
                >
                  {t.title}
                </button>
                <span className="opacity-50">
                  {t.spentBlocks}
                  {t.estimateBlocks ? `/${t.estimateBlocks}` : ""} ▮
                </span>
              </li>
            ))}
          {tasks.filter((t) => !t.done).length === 0 && (
            <li className="text-sm opacity-50">No tasks yet.</li>
          )}
        </ul>
      </section>
    </main>
  );
}
