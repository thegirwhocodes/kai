"use client";

import { useEffect, useState } from "react";
import { buildStateSnapshot } from "@/lib/agent/executeTool";
import { unlockAudio } from "@/lib/alerts";
import { useAgentStore } from "@/lib/store";
import type { KaiRecommendation } from "@/lib/types";

export function PlanPanel() {
  const latest = useAgentStore((s) => s.latestRecommendation);
  const setLatest = useAgentStore((s) => s.setLatestRecommendation);
  const startRecommended = useAgentStore((s) => s.startRecommendedFocus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState<string | null>(null);

  const suggest = async () => {
    setLoading(true);
    setError(null);
    setScheduled(null);
    try {
      const res = await fetch("/api/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: buildStateSnapshot(),
          intent: "next_session",
        }),
      });
      const data = (await res.json()) as {
        recommendation?: KaiRecommendation;
        error?: string;
      };
      if (!res.ok || !data.recommendation) {
        throw new Error(data.error ?? "Could not plan the next session.");
      }
      setLatest(data.recommendation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not plan the next session.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (!latest) void suggest();
    }, 0);
    return () => window.clearTimeout(id);
    // Run only when the panel first opens; `suggest` closes over fresh store state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = () => {
    unlockAudio();
    startRecommended();
  };

  const schedule = async () => {
    if (!latest) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule",
          summary: `${latest.mode === "break" ? "Reset" : "Focus"}: ${latest.title}`,
          start: latest.suggestedStartISO,
          end: latest.suggestedEndISO,
        }),
      });
      const data = await res.json();
      if (res.status === 503 || data.error === "calendar_not_connected") {
        throw new Error("Calendar is not connected yet.");
      }
      if (!res.ok) throw new Error(data.error ?? "Could not schedule this block.");
      setScheduled(`Scheduled for ${formatTime(latest.suggestedStartISO)}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not schedule this block.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass w-[23rem] rounded-lg p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium" style={{ color: "var(--muted)" }}>
            Next
          </h2>
          <p className="mt-1 text-lg font-semibold leading-snug">
            {latest?.title ?? "Finding the next right block"}
          </p>
        </div>
        <button
          type="button"
          onClick={suggest}
          disabled={loading}
          className="rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10 disabled:opacity-50"
        >
          {loading ? "..." : "Refresh"}
        </button>
      </div>

      {latest && (
        <>
          <div className="mb-3 flex flex-wrap gap-2 text-xs" style={{ color: "var(--muted)" }}>
            <span className="rounded-full border border-white/15 px-2 py-1">
              {latest.durationMinutes} min
            </span>
            <span className="rounded-full border border-white/15 px-2 py-1">
              {labelMode(latest.mode)}
            </span>
            <span className="rounded-full border border-white/15 px-2 py-1">
              {latest.confidence} confidence
            </span>
          </div>

          <ul className="mb-4 flex flex-col gap-1.5 text-sm" style={{ color: "var(--muted)" }}>
            {latest.reasonParts.slice(0, 4).map((part) => (
              <li key={part}>{part}</li>
            ))}
          </ul>

          <div className="mb-4 grid grid-cols-2 gap-2 text-xs" style={{ color: "var(--muted)" }}>
            <div className="rounded-lg border border-white/10 px-3 py-2">
              <div className="font-medium text-white/80">Calendar</div>
              <div className="mt-1">{calendarLine(latest)}</div>
            </div>
            <div className="rounded-lg border border-white/10 px-3 py-2">
              <div className="font-medium text-white/80">Email</div>
              <div className="mt-1">
                {latest.emailSignals.length
                  ? `${latest.emailSignals.length} useful signal${latest.emailSignals.length === 1 ? "" : "s"}`
                  : "quiet"}
              </div>
            </div>
          </div>

          <button type="button" onClick={start} className="btn-primary w-full">
            {latest.mode === "break" ? "Start break" : "Start session"}
          </button>
          <button
            type="button"
            onClick={schedule}
            disabled={!latest.calendarSummary.connected || loading}
            className="mt-2 w-full rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10 disabled:opacity-50"
          >
            Schedule
          </button>
        </>
      )}

      {!latest && !error && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Checking calendar, priorities, and email signals.
        </p>
      )}

      {error && (
        <p className="text-sm" style={{ color: "var(--break)" }}>
          {error}
        </p>
      )}
      {scheduled && !error && (
        <p className="mt-2 text-sm" style={{ color: "var(--break)" }}>
          {scheduled}
        </p>
      )}
    </div>
  );
}

function labelMode(mode: KaiRecommendation["mode"]) {
  if (mode === "admin") return "admin focus";
  return mode;
}

function calendarLine(recommendation: KaiRecommendation) {
  if (recommendation.calendarSummary.error) return "needs reconnect";
  if (!recommendation.calendarSummary.connected) return "not connected";
  if (!recommendation.calendarSummary.nextEvent) return "open";
  return `next: ${recommendation.calendarSummary.nextEvent.summary}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
