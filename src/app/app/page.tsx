"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Clock, greeting } from "@/components/Clock";
import { Dock, type Panel } from "@/components/Dock";
import { Quote } from "@/components/Quote";
import { LockInBar, LockInChooser, LockInNext } from "@/components/LockIn";
import { PlanPanel } from "@/components/PlanPanel";
import { MusicPanel } from "@/components/MusicPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { StatsPanel } from "@/components/StatsPanel";
import { TasksPanel } from "@/components/TasksPanel";
import {
  CountdownStarter,
  ModeSwitch,
  StopwatchPanel,
} from "@/components/TimerModes";
import { VoicePanel } from "@/components/VoicePanel";
import { WakeListener } from "@/components/WakeListener";
import { Welcome } from "@/components/Welcome";
import { unlockAudio } from "@/lib/alerts";
import { buildStateSnapshot } from "@/lib/agent/executeTool";
import {
  animationFor,
  isImageValue,
  scrimFor,
  toCss,
  youtubeIdOf,
} from "@/lib/backgrounds";
import { KIND_LABEL, mmss } from "@/lib/format";
import { useAgentStore } from "@/lib/store";
import type { KaiRecommendation, TimerMode } from "@/lib/types";
import { useAutopilot } from "@/lib/useAutopilot";
import { useExternalCommands } from "@/lib/useExternalCommands";
import { useKeyboard } from "@/lib/useKeyboard";
import { useTicker } from "@/lib/useTicker";
import { VoiceAgentProvider } from "@/lib/voice/useVoiceAgent";
import { kaiFetch } from "@/lib/ownerClient";

export default function Home() {
  return (
    <VoiceAgentProvider>
      <KaiApp />
    </VoiceAgentProvider>
  );
}

function KaiApp() {
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
  const lockIn = useAgentStore((s) => s.lockIn);
  const startLockIn = useAgentStore((s) => s.startLockIn);
  const advanceLockIn = useAgentStore((s) => s.advanceLockIn);
  const endLockIn = useAgentStore((s) => s.endLockIn);
  const pause = useAgentStore((s) => s.pause);
  const resume = useAgentStore((s) => s.resume);
  const complete = useAgentStore((s) => s.completeActive);
  const skip = useAgentStore((s) => s.skipActive);
  const rateBlock = useAgentStore((s) => s.rateBlock);
  const latestRecommendation = useAgentStore((s) => s.latestRecommendation);
  const setLatestRecommendation = useAgentStore((s) => s.setLatestRecommendation);
  const startRecommendedFocus = useAgentStore((s) => s.startRecommendedFocus);

  const [panel, setPanel] = useState<Panel>(null);
  const [mode, setMode] = useState<TimerMode>("pomodoro");
  const stopwatch = useAgentStore((s) => s.stopwatch);
  const [selectedTask, setSelectedTask] = useState<string | undefined>();
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const refreshPlan = useCallback(async () => {
    setPlanning(true);
    setPlanError(null);
    try {
      const res = await kaiFetch("/api/recommendation", {
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

  // Planning is deliberately opt-in: it reaches out to connected accounts, so
  // it only ever runs when the user asks for it from the Plan panel. A fresh
  // visitor gets a timer that works instantly and no surprise network calls.

  const isRunning = active?.status === "running";
  const isPaused = active?.status === "paused";
  const justFinished =
    active?.status === "completed" || active?.status === "abandoned";
  // A standalone countdown ends where it ends — nothing is queued behind it,
  // so don't promise a break that isn't coming.
  const autoAdvancing =
    active?.status === "completed" && settings.autoStart && !active.standalone;
  const idle = !active || justFinished;
  const stopwatchActive = mode === "stopwatch" && stopwatch !== null;

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
  const beginLockIn = (minutes: number) => {
    unlockAudio();
    startLockIn(minutes, selectedTask);
  };
  const nextLockIn = () => {
    unlockAudio();
    advanceLockIn();
  };
  const fullscreen = useCallback(() => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.();
    else void document.exitFullscreen?.();
  }, []);

  useKeyboard({ panel, setPanel, onFullscreen: fullscreen, selectedTask });

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
      <Scene value={settings.background} />
      <div className="scene-veil" data-scrim={scrimFor(settings.background)} />

      {/* Logo */}
      <div className="fixed left-6 top-6 z-20 flex items-center gap-2.5">
        <Image src="/logo.svg" alt="Kai" width={36} height={36} preload />
        <span className="text-2xl font-semibold lowercase">kai</span>
      </div>

      {/* Quote */}
      {settings.showQuote && (
        <div className="fixed right-6 top-6 z-20 hidden sm:block">
          <Quote />
        </div>
      )}
      <WakeListener onOpenVoice={() => setPanel("voice")} />

      {/* Center */}
      <div
        className={`relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center transition-transform duration-300 ${
          panel ? "xl:translate-x-60" : ""
        }`}
      >
        {idle ? (
          <>
            {/* In stopwatch mode the running count is the headline number, so
                the wall clock steps aside rather than stacking two of them. */}
            {settings.showClock && !stopwatchActive && <Clock />}
            {settings.showGreeting && !stopwatchActive && (
              <p className="mt-5 text-xl font-light sm:text-2xl">
                {greeting(settings.userName)}
              </p>
            )}
            {lockIn ? (
              // Mid lock-in, between blocks (autostart off): keep the plan going.
              <>
                <LockInBar />
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <LockInNext onNext={nextLockIn} />
                  <button onClick={endLockIn} className="btn-ghost">
                    End lock-in
                  </button>
                </div>
              </>
            ) : mode !== "pomodoro" ? (
              <>
                <ModeSwitch mode={mode} onChange={setMode} />
                {mode === "countdown" ? (
                  <CountdownStarter taskId={selectedTask} />
                ) : (
                  <StopwatchPanel taskId={selectedTask} />
                )}
              </>
            ) : (
              <>
                <ModeSwitch mode={mode} onChange={setMode} />
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  {latestRecommendation && (
                    <button onClick={beginRecommended} className="btn-primary">
                      Start next
                    </button>
                  )}
                  <button
                    onClick={beginFocus}
                    className={latestRecommendation ? "btn-ghost" : "btn-primary"}
                  >
                    Start {Math.round(settings.baselineFocusSec / 60)} min focus
                  </button>
                  <button onClick={beginBreak} className="btn-ghost">
                    Take a break
                  </button>
                </div>
                <LockInChooser onStart={beginLockIn} />
                {/* The planner card appears once it has something to say —
                    asking Kai to plan is a deliberate act, not a page load. */}
                {(latestRecommendation || planning || planError) && (
                  <HeroPlan
                    recommendation={latestRecommendation}
                    loading={planning}
                    error={planError}
                    onRefresh={refreshPlan}
                    onStart={beginRecommended}
                    onOpenPlan={() => setPanel("plan")}
                  />
                )}
              </>
            )}
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
            <LockInBar />
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
        <>
          <div className="fixed inset-0 z-[15] bg-[#15101f]/60 backdrop-blur-sm sm:hidden" />
          <div
            className={`fixed bottom-32 left-4 z-40 max-w-[calc(100vw-2rem)] sm:bottom-6 sm:left-6 ${
              panel === "settings"
                ? "w-[min(42rem,calc(100vw-2rem))]"
                : "w-[min(28rem,calc(100vw-2rem))]"
            }`}
          >
            {panel === "voice" && <VoicePanel />}
            {panel === "plan" && <PlanPanel />}
            {panel === "music" && <MusicPanel />}
            {panel === "tasks" && (
              <TasksPanel selectedTask={selectedTask} setSelectedTask={setSelectedTask} />
            )}
            {panel === "stats" && <StatsPanel />}
            {panel === "settings" && <SettingsPanel />}
          </div>
        </>
      )}

      <Dock active={panel} onSelect={setPanel} onFullscreen={fullscreen} />
      <Welcome />
    </main>
  );
}

/**
 * The background itself. A photo renders as two layers (sharp centre, blurred
 * fill); anything else is a single CSS background, animated when the theme
 * asks for it.
 */
function Scene({ value }: { value: string }) {
  const videoId = youtubeIdOf(value);
  if (videoId) {
    // Muted + looped so it can autoplay at all, and pointer-events off so the
    // video never steals a click meant for the timer.
    const src =
      `https://www.youtube-nocookie.com/embed/${videoId}` +
      `?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&rel=0` +
      `&modestbranding=1&playsinline=1&disablekb=1&iv_load_policy=3`;
    return (
      <div className="scene-video">
        <iframe
          src={src}
          title="Background video"
          allow="autoplay; encrypted-media"
          referrerPolicy="strict-origin-when-cross-origin"
          tabIndex={-1}
        />
      </div>
    );
  }
  if (isImageValue(value)) {
    const layer = { backgroundImage: `url("${value}")` };
    return (
      <>
        <div className="scene-photo-blur" style={layer} />
        <div className="scene-photo" style={layer} />
      </>
    );
  }
  return (
    <div
      className={`scene-bg ${animationFor(value) ?? ""}`}
      style={{ background: toCss(value) }}
    />
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
