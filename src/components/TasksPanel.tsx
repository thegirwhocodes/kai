"use client";

import { useState } from "react";
import { useAgentStore } from "@/lib/store";
import type { TaskPriority } from "@/lib/types";

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
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [sphere, setSphere] = useState("");
  const [due, setDue] = useState("");

  return (
    <div className="glass w-80 rounded-lg p-4">
      <h2 className="mb-3 text-sm font-medium" style={{ color: "var(--muted)" }}>
        Tasks
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          const t = addTask(title.trim(), undefined, {
            priority,
            sphere: sphere.trim() || undefined,
            dueAt: due ? new Date(due).toISOString() : undefined,
          });
          setSelectedTask(t.id);
          setTitle("");
          setSphere("");
          setDue("");
        }}
        className="mb-3 flex flex-col gap-2"
      >
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are you working on?"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none transition focus:border-white/40"
          />
          <button
            type="submit"
            aria-label="Add task"
            className="rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10"
          >
            +
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={priority}
            aria-label="Priority"
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="min-w-0 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none transition focus:border-white/40"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <input
            value={sphere}
            aria-label="Area"
            onChange={(e) => setSphere(e.target.value)}
            placeholder="Area"
            className="min-w-0 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none transition focus:border-white/40"
          />
        </div>
        <input
          type="datetime-local"
          value={due}
          aria-label="Due date"
          onChange={(e) => setDue(e.target.value)}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none transition focus:border-white/40"
        />
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
              <button
                onClick={() => setSelectedTask(t.id)}
                className="flex-1 text-left"
                aria-label={`${t.title}${t.priority ? `, ${t.priority} priority` : ""}`}
              >
                {t.title}
                {t.priority && (
                  <span
                    aria-hidden="true"
                    className="ml-2 text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    {t.priority}
                  </span>
                )}
                {(t.sphere || t.dueAt) && (
                  <span className="mt-0.5 block text-xs" style={{ color: "var(--muted)" }}>
                    {[t.sphere, t.dueAt ? formatDue(t.dueAt) : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </button>
              <span style={{ color: "var(--muted)" }}>
                {t.spentBlocks}
                {t.estimateBlocks ? `/${t.estimateBlocks}` : ""} b
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

function formatDue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
