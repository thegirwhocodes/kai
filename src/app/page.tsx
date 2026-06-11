"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Clock, greeting } from "@/components/Clock";
import { Dock, type Panel } from "@/components/Dock";
import { Quote } from "@/components/Quote";
import { PlanPanel } from "@/components/PlanPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { TasksPanel } from "@/components/TasksPanel";
import { VoicePanel } from "@/components/VoicePanel";
import { unlockAudio } from "@/lib/alerts";
import { buildStateSnapshot } from "@/lib/agent/executeTool";
import { toCss } from "@/lib/backgrounds";
import { KIND_LABEL, mmss } from "@/lib/format";
import { useAgentStore } from "@/lib/store";
import type { KaiRecommendation } from "@/lib/types";
import { useAutopilot } from "@/lib/useAutopilot";
import { useExternalCommands } from "@/lib/useExternalCommands";
import { useTicker } from "@/lib/useTicker";

export default function Home() {
  useTicker();
  useAutopilot();
  useExternalCommands();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

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
  const latestRecommendation = useAgentStore((s) => s.latestRecommendation);
  const setLatestRecommendation = useAgentStore((s) => s.setLatestRecommendation);
  const startRecommendedFocus = useAgentStore((s) => s.startRecommendedFocus);

  const [panel, setPanel] = useState<Panel>(null);
  const [selectedTask, setSelectedTask] = useState<string | undefined>();
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const refreshPlan = useCallback(async () => {
    setPlanning(true);
    setPlanError(null);
    try {
      const res = await fetch("/api/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: buildStateSnapshot(), intent: "next_session" }),
      });
      const data = (await res.json()) as {
        recommendation?: KaiRecommendation;
        error?: string;
      };
      if (!res.ok || !data.recommendation) {
        throw new Error(data.error ?? "Kai could not plan right now.");
      }
      setLatestRecommendation(data.recommendation);
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : "Kai could not plan right now.");
    } finally {
      setPlanning(false);
    }
  }, [setLatestRecommendation]);

  useEffect(() => {
    if (!mounted || latestRecommendation) return;
    const id = window.setTimeout(() => void refreshPlan(), 350);
    return () => window.clearTimeout(id);
  }, [mounted, latestRecommendation, refreshPlan]);

  const isRunning = active?.status === "running";
  const isPaused = active?.status === "paused";
  const justFinished =
    active?.status === "completed" || active?.status === "abandoned";
  const autoAdvancing = active?.status === "completed" && settings.autoStart;
  const idle = !active || justFinished;

  const beginFocus = () => {
    unlockAudio();
    startFocus(selectedTask);
  };
  const beginRecommended = () => {
    unlockAudio();
    const block = startRecommendedFocus();
    if (!block) void refreshPlan();
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
        <span className="text-2xl font-semibold lowercase">kai</span>
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
              {latestRecommendation && (
                <button onClick={beginRecommended} className="btn-primary">
                  Start next
                </button>
              )}
              <button onClick={beginFocus} className={latestRecommendation ? "btn-ghost" : "btn-primary"}>
                Start focus
              </button>
              <button onClick={beginBreak} className="btn-ghost">
                Take a break
              </button>
            </div>
            <HeroPlan
              recommendation={latestRecommendation}
              loading={planning}
              error={planError}
              onRefresh={refreshPlan}
              onStart={beginRecommended}
              onOpenPlan={() => setPanel("plan")}
            />
          </>
        ) : (
          <>
            <span
              className="mb-2 text-xs font-semibold uppercase"
              style={{ color: accent }}
            >
              {KIND_LABEL[active.kind] ?? "Focus"}
            </span>
            <span className="clock-num text-8xl sm:text-[9rem] lg:text-[11rem]">
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

        {rationale && !idle && (
          <p
            className="mt-6 max-w-md text-sm font-light italic"
            style={{ color: "var(--muted)" }}
          >
            &ldquo;{rationale}&rdquo;
          </p>
        )}

        {autoAdvancing && (
          <p className="mt-4 text-xs" style={{ color: accent }}>
            {active?.kind === "focus"
              ? "Break starting..."
              : "Next focus block starting..."}
          </p>
        )}

        {lastCompletedFocusId && (
          <div className="glass mt-6 flex flex-col items-center gap-2 rounded-lg px-5 py-3">
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
        <div className="fixed bottom-24 left-4 z-20 max-w-[calc(100vw-2rem)] sm:bottom-6 sm:left-6">
          {panel === "voice" && <VoicePanel />}
          {panel === "plan" && <PlanPanel />}
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

function HeroPlan({
  recommendation,
  loading,
  error,
  onRefresh,
  onStart,
  onOpenPlan,
}: {
  recommendation: KaiRecommendation | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onStart: () => void;
  onOpenPlan: () => void;
}) {
  return (
    <section className="glass mt-8 w-full max-w-xl rounded-lg p-4 text-left">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase" style={{ color: "var(--muted)" }}>
            Next session
          </p>
          <h2 className="mt-1 break-words text-xl font-semibold leading-snug">
            {recommendation?.title ??
              (loading ? "Kai is checking the day" : "Ask Kai to pick the next block")}
          </h2>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10 disabled:opacity-50"
        >
          {loading ? "..." : "Refresh"}
        </button>
      </div>

      {recommendation && (
        <>
          <div className="mt-3 flex flex-wrap gap-2 text-xs" style={{ color: "var(--muted)" }}>
            <span className="rounded-full border border-white/15 px-2 py-1">
              {recommendation.durationMinutes} min
            </span>
            <span className="rounded-full border border-white/15 px-2 py-1">
              {recommendation.mode === "admin" ? "admin focus" : recommendation.mode}
            </span>
            <span className="rounded-full border border-white/15 px-2 py-1">
              {recommendation.confidence} confidence
            </span>
          </div>
          <p className="mt-3 break-words text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            {recommendation.reasonParts.slice(0, 3).join("; ")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={onStart} className="btn-primary">
              Start this
            </button>
            <button type="button" onClick={onOpenPlan} className="btn-ghost">
              Details
            </button>
          </div>
        </>
      )}

      {!recommendation && (
        <p className="mt-3 text-sm" style={{ color: error ? "var(--break)" : "var(--muted)" }}>
          {error ?? "Calendar, tasks, and inbox signals will shape this once connected."}
        </p>
      )}
    </section>
  );
}
