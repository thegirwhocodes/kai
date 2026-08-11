"use client";

// First-run welcome. Three answers, all optional, all skippable: what to call
// you, how long you like to focus, and what you're here to work on. It writes
// straight into settings, so the room is personal before the first block.

import { useState } from "react";
import { useAgentStore } from "@/lib/store";

const FOCUS_PRESETS = [
  { minutes: 15, label: "15", hint: "Short sprints" },
  { minutes: 25, label: "25", hint: "Classic Pomodoro" },
  { minutes: 45, label: "45", hint: "Deep work" },
  { minutes: 60, label: "60", hint: "Long haul" },
];

export function Welcome() {
  const settings = useAgentStore((s) => s.settings);
  const update = useAgentStore((s) => s.updateSettings);
  const addTask = useAgentStore((s) => s.addTask);

  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState(25);
  const [working, setWorking] = useState("");

  if (settings.onboarded) return null;

  const finish = (skipped = false) => {
    const first = working.trim();
    update({
      onboarded: true,
      ...(skipped
        ? {}
        : {
            userName: name.trim(),
            priorities: first,
            baselineFocusSec: minutes * 60,
          }),
    });
    // Their answer to "what are you working on" becomes the first task, so the
    // list is never empty on the first block.
    if (!skipped && first) addTask(first, undefined, { priority: "high" });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#15101f]/80 p-4 backdrop-blur-md">
      <div className="glass w-full max-w-md rounded-2xl p-6 sm:p-7">
        <h2 className="text-2xl font-semibold">Welcome to Kai</h2>
        <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          A calm room for focused work. Three quick things — or skip and start
          right away.
        </p>

        <label className="mt-6 block">
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            What should Kai call you?
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="given-name"
            maxLength={40}
            className="mt-1.5 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm outline-none transition focus:border-white/40"
          />
        </label>

        <div className="mt-5">
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            How long is a good focus block for you?
          </span>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {FOCUS_PRESETS.map((preset) => (
              <button
                key={preset.minutes}
                type="button"
                onClick={() => setMinutes(preset.minutes)}
                title={preset.hint}
                className="rounded-lg border px-2 py-2.5 text-sm transition"
                style={{
                  borderColor:
                    minutes === preset.minutes
                      ? "var(--focus)"
                      : "rgba(255,255,255,0.15)",
                  background:
                    minutes === preset.minutes
                      ? "rgba(251,122,142,0.15)"
                      : "transparent",
                }}
              >
                {preset.label}
                <span className="block text-[10px]" style={{ color: "var(--muted)" }}>
                  min
                </span>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px]" style={{ color: "var(--muted)" }}>
            You can change this any time in Customize.
          </p>
        </div>

        <label className="mt-5 block">
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            What are you working on? (optional)
          </span>
          <input
            value={working}
            onChange={(e) => setWorking(e.target.value)}
            placeholder="Thesis chapter 2"
            maxLength={120}
            className="mt-1.5 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm outline-none transition focus:border-white/40"
          />
        </label>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => finish()} className="btn-primary">
            Start focusing
          </button>
          <button
            type="button"
            onClick={() => finish(true)}
            className="rounded-full px-4 py-2.5 text-sm opacity-60 transition hover:opacity-100"
          >
            Skip
          </button>
        </div>

        <p className="mt-4 text-[11px] leading-4" style={{ color: "var(--muted)" }}>
          Everything stays in this browser. No account, nothing uploaded.
        </p>
      </div>
    </div>
  );
}
