"use client";

import { useState } from "react";
import { useAgentStore } from "@/lib/store";

export function TasksPanel({
  selectedTask,
  setSelectedTask,
}: {
  selectedTask?: string;
  setSelectedTask: (id?: string) => void;
}) {
  const tasks = useAgentStore((s) => s.tasks);
  const addTask = useAgentStore((s) => s.addTask);
  const completeTask = useAgentStore((s) => s.completeTask);
  const [title, setTitle] = useState("");

  return (
    <div className="glass w-80 rounded-2xl p-4">
      <h2 className="mb-3 text-sm font-medium" style={{ color: "var(--muted)" }}>
        Tasks
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          const t = addTask(title.trim());
          setSelectedTask(t.id);
          setTitle("");
        }}
        className="mb-3 flex gap-2"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What are you working on?"
          className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none transition focus:border-white/40"
        />
        <button
          type="submit"
          className="rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10"
        >
          +
        </button>
      </form>
      <ul className="flex max-h-60 flex-col gap-1.5 overflow-y-auto">
        {tasks
          .filter((t) => !t.done)
          .map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition"
              style={{
                borderColor:
                  selectedTask === t.id
                    ? "rgba(251,122,142,0.6)"
                    : "rgba(255,255,255,0.1)",
                background:
                  selectedTask === t.id ? "rgba(255,255,255,0.06)" : "transparent",
              }}
            >
              <button
                onClick={() => completeTask(t.id)}
                className="h-4 w-4 shrink-0 rounded-full border border-white/40 transition hover:bg-white/20"
                aria-label="Complete task"
              />
              <button onClick={() => setSelectedTask(t.id)} className="flex-1 text-left">
                {t.title}
              </button>
              <span style={{ color: "var(--muted)" }}>
                {t.spentBlocks}
                {t.estimateBlocks ? `/${t.estimateBlocks}` : ""} ▮
              </span>
            </li>
          ))}
        {tasks.filter((t) => !t.done).length === 0 && (
          <li className="text-sm" style={{ color: "var(--muted)" }}>
            No tasks yet.
          </li>
        )}
      </ul>
    </div>
  );
}
