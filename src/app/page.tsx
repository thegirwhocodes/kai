"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Clock, greeting } from "@/components/Clock";
import { Dock, type Panel } from "@/components/Dock";
import { Quote } from "@/components/Quote";
import { SettingsPanel } from "@/components/SettingsPanel";
import { TasksPanel } from "@/components/TasksPanel";
import { VoicePanel } from "@/components/VoicePanel";
import { unlockAudio } from "@/lib/alerts";
import { toCss } from "@/lib/backgrounds";
import { KIND_LABEL, mmss } from "@/lib/format";
import { useAgentStore } from "@/lib/store";
import { useAutopilot } from "@/lib/useAutopilot";
import { useTicker } from "@/lib/useTicker";

export default function Home() {
  useTicker();
  useAutopilot();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const active = useAgentStore((s) => s.activeBlock);
  const remaining = useAgentStore((s) => s.remainingSec);
  const rationale = useAgentStore((s) => s.lastDecisionRationale);
  const settings = useAgentStore((s) => s.settings);
  const lastCompletedFocusId = useAgentStore((s) => s.lastCompletedFocusId);
  const startFocus = useAgentStore((s) => s.startNextFocus);
  const startBreak = useAgentStore((s) => s.startBreak);
  const pause = useAgentStore((s) => s.pause);
  const resume = useAgentStore((s) => s.resume);
  const complete = useAgentStore((s) => s.completeActive);
  const skip = useAgentStore((s) => s.skipActive);
  const rateBlock = useAgentStore((s) => s.rateBlock);

  const [panel, setPanel] = useState<Panel>(null);
  const [selectedTask, setSelectedTask] = useState<string | undefined>();

  const isRunning = active?.status === "running";
  const isPaused = active?.status === "paused";
  const justFinished =
    active?.status === "completed" || active?.status === "abandoned";
  const idle = !active || justFinished;

  const beginFocus = () => {
    unlockAudio();
    startFocus(selectedTask);
  };
  const beginBreak = () => {
    unlockAudio();
    startBreak();
  };
  const fullscreen = () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.();
    else void document.exitFullscreen?.();
  };

  if (!mounted) {
    return <main className="min-h-screen" style={{ background: "#15101f" }} />;
  }

  const accent =
    active?.kind === "short_break"
      ? "var(--break)"
      : active?.kind === "long_break"
        ? "var(--long)"
        : "var(--focus)";

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="scene-bg" style={{ background: toCss(settings.background) }} />
      <div className="scene-veil" />

      {/* Logo */}
      <div className="fixed left-6 top-6 z-20 flex items-center gap-2.5">
        <Image src="/logo.svg" alt="Kai" width={36} height={36} priority />
        <span className="text-2xl font-semibold lowercase tracking-tight">kai</span>
      </div>

      {/* Quote */}
      <div className="fixed right-6 top-6 z-20 hidden sm:block">
        <Quote />
      </div>

      {/* Center */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        {idle ? (
          <>
            <Clock />
            <p className="mt-5 text-xl font-light sm:text-2xl">{greeting()}</p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <button onClick={beginFocus} className="btn-primary">
                Start focus
              </button>
              <button onClick={beginBreak} className="btn-ghost">
                Take a break
              </button>
            </div>
          </>
        ) : (
          <>
            <span
              className="mb-2 text-xs font-semibold uppercase tracking-[0.3em]"
              style={{ color: accent }}
            >
              {KIND_LABEL[active.kind] ?? "Focus"}
            </span>
            <span className="clock-num text-[clamp(5rem,18vw,11rem)]">
              {mmss(remaining)}
            </span>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {isRunning && (
                <button onClick={pause} className="btn-ghost">
                  Pause
                </button>
              )}
              {isPaused && (
                <button onClick={resume} className="btn-primary">
                  Resume
                </button>
              )}
              <button onClick={complete} className="btn-ghost">
                Done early
              </button>
              <button
                onClick={skip}
                className="rounded-full px-4 py-2.5 text-sm opacity-60 transition hover:opacity-100"
              >
                Skip
              </button>
            </div>
          </>
        )}

        {rationale && (
          <p
            className="mt-6 max-w-md text-sm font-light italic"
            style={{ color: "var(--muted)" }}
          >
            &ldquo;{rationale}&rdquo;
          </p>
        )}

        {justFinished && settings.autoStart && (
          <p className="mt-4 text-xs" style={{ color: accent }}>
            {active?.kind === "focus"
              ? "Break starting…"
              : "Next focus block starting…"}
          </p>
        )}

        {lastCompletedFocusId && (
          <div className="glass mt-6 flex flex-col items-center gap-2 rounded-2xl px-5 py-3">
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              How focused were you?
            </span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => rateBlock(lastCompletedFocusId, n as 1 | 2 | 3 | 4 | 5)}
                  className="h-9 w-9 rounded-full border border-white/20 text-sm transition hover:bg-white/10"
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active panel (bottom-left, Flocus-style) */}
      {panel && (
        <div className="fixed bottom-6 left-6 z-20 max-w-[calc(100vw-3rem)]">
          {panel === "voice" && <VoicePanel />}
          {panel === "tasks" && (
            <TasksPanel selectedTask={selectedTask} setSelectedTask={setSelectedTask} />
          )}
          {panel === "settings" && <SettingsPanel />}
        </div>
      )}

      <Dock active={panel} onSelect={setPanel} onFullscreen={fullscreen} />
    </main>
  );
}
