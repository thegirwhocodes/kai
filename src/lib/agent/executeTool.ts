"use client";

// Executes an agent tool call against the live store and returns a short
// result string fed back to the model as a tool_result. This is the bridge
// that makes "pause" by voice identical to clicking Pause.

import { useAgentStore } from "@/lib/store";
import { KIND_LABEL } from "@/lib/format";
import type { KaiRecommendation, TaskPriority } from "@/lib/types";

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

// Calendar tools talk to the server (which holds the Google secret); the rest
// are local store mutations. Async so calendar tools can await the network.
export async function executeToolCall(call: ToolCall): Promise<string> {
  if (
    call.name === "get_schedule" ||
    call.name === "search_calendar" ||
    call.name === "schedule_event" ||
    call.name === "create_calendar" ||
    call.name === "reschedule_calendar_events"
  ) {
    return executeCalendarTool(call);
  }
  if (
    call.name === "search_email_history" ||
    call.name === "get_email" ||
    call.name === "create_email_draft" ||
    call.name === "update_email_draft"
  ) {
    return executeEmailTool(call);
  }
  if (call.name === "web_search") {
    return executeWebSearchTool(call);
  }
  if (call.name === "play_music" || call.name === "pause_music") {
    return executeSpotifyTool(call);
  }
  if (
    call.name === "suggest_next_session" ||
    call.name === "start_recommended_focus"
  ) {
    return executeRecommendationTool(call);
  }

  const s = useAgentStore.getState();
  const { input } = call;

  switch (call.name) {
    case "start_focus": {
      const block = s.startNextFocus(input.taskId as string | undefined, {
        minutesUntilNextCommitment:
          input.minutesUntilNextCommitment != null
            ? Number(input.minutesUntilNextCommitment)
            : undefined,
      });
      // Re-read for the freshly-set rationale.
      const rationale = useAgentStore.getState().lastDecisionRationale;
      return `Started a ${Math.round(block.plannedSec / 60)} min focus block. Engine rationale: ${rationale}`;
    }
    case "start_break": {
      const block = s.startBreak();
      const rationale = useAgentStore.getState().lastDecisionRationale;
      return `Started a ${KIND_LABEL[block.kind]?.toLowerCase() ?? block.kind} of ${Math.round(block.plannedSec / 60)} min. Rationale: ${rationale}`;
    }
    case "start_lock_in": {
      const minutes = Number(input.minutes);
      if (!(minutes >= 5)) return "Lock-in needs at least 5 minutes.";
      const block = s.startLockIn(minutes, input.taskId as string | undefined);
      if (!block) return "Could not build a lock-in plan for that length.";
      const progress = useAgentStore.getState().lockInProgress();
      const focusTotal = progress?.focusTotal ?? 0;
      return `Locked in for ${minutes} min: ${focusTotal} focus block${
        focusTotal === 1 ? "" : "s"
      } with breaks between, ending focused. Started the first ${Math.round(
        block.plannedSec / 60,
      )} min focus block.`;
    }
    case "end_lock_in": {
      if (!useAgentStore.getState().lockIn) return "No lock-in is active.";
      s.endLockIn();
      return "Ended the lock-in commitment.";
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
        {
          priority: normalizePriority(input.priority),
          dueAt: typeof input.dueAt === "string" ? input.dueAt : undefined,
          sphere: typeof input.sphere === "string" ? input.sphere : undefined,
          source: "kai",
        },
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

async function executeRecommendationTool(call: ToolCall): Promise<string> {
  const store = useAgentStore.getState();
  let recommendation = store.latestRecommendation;

  if (call.name === "suggest_next_session" || !recommendation) {
    const res = await fetch("/api/recommendation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        state: buildStateSnapshot(),
        horizonHours:
          call.input.horizonHours != null
            ? Number(call.input.horizonHours)
            : undefined,
        intent: "next_session",
      }),
    });
    const data = (await res.json()) as {
      recommendation?: KaiRecommendation;
      error?: string;
    };
    if (!res.ok || !data.recommendation) {
      return `Recommendation failed: ${data.error ?? res.status}`;
    }
    recommendation = data.recommendation;
    useAgentStore.getState().setLatestRecommendation(recommendation);
  }

  if (call.name === "start_recommended_focus") {
    const block = useAgentStore.getState().startRecommendedFocus();
    if (!block) return "There isn't a recommendation to start yet.";
    return `Started ${Math.round(block.plannedSec / 60)} minutes for "${recommendation.title}". Why: ${recommendation.reason}`;
  }

  return `Recommended "${recommendation.title}" for ${recommendation.durationMinutes} minutes. Why: ${recommendation.reason}`;
}

async function executeCalendarTool(call: ToolCall): Promise<string> {
  const { input } = call;
  const action =
    call.name === "get_schedule"
      ? "free"
      : call.name === "search_calendar"
        ? "search"
        : call.name === "schedule_event"
          ? "schedule"
          : call.name === "create_calendar"
            ? "create_calendar"
            : "reschedule_spaced";
  const payload =
    action === "free"
      ? {
          action,
          timeMin: input.timeMin,
          timeMax: input.timeMax,
          minMinutes: input.minMinutes ?? 25,
        }
      : action === "search"
        ? {
            action,
            anchorISO: input.anchorISO,
            pastDays: input.pastDays,
            futureDays: input.futureDays,
            query: input.query,
          maxResults: input.maxResults,
        }
      : action === "create_calendar"
        ? {
            action,
            summary: input.summary,
          }
        : action === "reschedule_spaced"
          ? {
              action,
              sourceTimeMin: input.sourceTimeMin,
              sourceTimeMax: input.sourceTimeMax,
              targetTimeMin: input.targetTimeMin,
              targetTimeMax: input.targetTimeMax,
              calendarId: input.calendarId,
              dayStartHour: input.dayStartHour,
              dayEndHour: input.dayEndHour,
              gapMinutes: input.gapMinutes,
              apply: input.apply === true,
            }
      : {
          action,
          summary: input.summary,
          start: input.start,
          end: input.end,
        };

  try {
    const res = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.status === 503 || data.error === "calendar_not_connected") {
      return "Calendar isn't connected yet — tell the user to connect Google Calendar in settings.";
    }
    if (!res.ok) return `Calendar error: ${data.error ?? res.status}`;

    if (action === "free") {
      const busy = (data.busy ?? [])
        .map((e: { summary: string; start: string; end: string }) =>
          `${e.summary} (${fmt(e.start)}–${fmt(e.end)})`,
        )
        .join("; ");
      const slots = (data.slots ?? [])
        .map((s: { start: string; end: string }) => `${fmt(s.start)}–${fmt(s.end)}`)
        .join("; ");
      return `Busy: ${busy || "nothing"}. Free slots: ${slots || "none in that window"}.`;
    }
    if (action === "search") {
      const events = (data.events ?? [])
        .map((e: { id?: string; summary: string; start: string; end: string }) =>
          `${e.summary} (${fmt(e.start)}-${fmt(e.end)}${e.id ? `, id ${e.id}` : ""})`,
        )
        .join("; ");
      return `Calendar window ${fmt(data.timeMin)} to ${fmt(data.timeMax)}. Events: ${events || "none"}.`;
    }
    if (action === "create_calendar") {
      return `Calendar ready: ${data.calendar?.summary} (${data.calendar?.id}).`;
    }
    if (action === "reschedule_spaced") {
      const plan = (data.plan ?? [])
        .map(
          (m: {
            summary: string;
            oldStart: string;
            oldEnd: string;
            newStart: string;
            newEnd: string;
          }) =>
            `${m.summary}: ${fmt(m.oldStart)}-${fmt(m.oldEnd)} -> ${fmt(m.newStart)}-${fmt(m.newEnd)}`,
        )
        .join("; ");
      return `${data.applied ? "Applied" : "Preview"} reschedule: ${plan || "no timed events found or no room in target window"}.`;
    }
    return `Scheduled "${data.created?.summary}" at ${fmt(data.created?.start)}.`;
  } catch (e) {
    return `Calendar request failed: ${e instanceof Error ? e.message : "network error"}`;
  }
}

async function executeEmailTool(call: ToolCall): Promise<string> {
  const { input } = call;
  const action =
    call.name === "search_email_history"
      ? "search"
      : call.name === "get_email"
        ? "get"
        : call.name === "create_email_draft"
          ? "create_draft"
          : "update_draft";
  const payload = { action, ...input };
  try {
    const res = await fetch("/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.status === 503 || data.error === "gmail_not_connected") {
      return "Gmail isn't connected yet.";
    }
    if (!res.ok) return `Gmail error: ${data.error ?? res.status}`;

    if (action === "search") {
      const emails = (data.emails ?? [])
        .map(
          (e: {
            id: string;
            threadId?: string;
            from: string;
            subject: string;
            date?: string;
            snippet?: string;
            body?: string;
          }) =>
            `id ${e.id}${e.threadId ? ` thread ${e.threadId}` : ""}: ${e.subject} from ${e.from}${e.date ? ` on ${e.date}` : ""}. ${excerpt(e.body ?? e.snippet ?? "", 420)}`,
        )
        .join("\n");
      return emails || "No matching emails found.";
    }

    if (action === "get") {
      const e = data.email;
      return `Email id ${e.id}${e.threadId ? ` thread ${e.threadId}` : ""}: "${e.subject}" from ${e.from} to ${e.to ?? "unknown"}${e.date ? ` on ${e.date}` : ""}. Body: ${excerpt(e.body ?? e.snippet ?? "", 1800)}${e.messageId ? ` Message-ID: ${e.messageId}` : ""}`;
    }

    const draft = data.draft;
    return `Draft saved in Gmail. Draft id ${draft.id}${draft.threadId ? `, thread ${draft.threadId}` : ""}. It has not been sent.`;
  } catch (e) {
    return `Gmail request failed: ${e instanceof Error ? e.message : "network error"}`;
  }
}

async function executeWebSearchTool(call: ToolCall): Promise<string> {
  const { input } = call;
  try {
    const res = await fetch("/api/web-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: input.query,
        maxResults: input.maxResults,
        domains: input.domains,
      }),
    });
    const data = await res.json();
    if (!res.ok) return `Web search error: ${data.error ?? res.status}`;
    const results = (data.results ?? [])
      .map(
        (r: { title: string; url: string; snippet: string; source: string }, i: number) =>
          `${i + 1}. ${r.title} (${r.source}) ${r.url} - ${excerpt(r.snippet, 360)}`,
      )
      .join("\n");
    const answer = data.answer ? `Answer: ${data.answer}\n` : "";
    return `${answer}Provider: ${data.provider}. Results:\n${results || "No results."}`;
  } catch (e) {
    return `Web search failed: ${e instanceof Error ? e.message : "network error"}`;
  }
}

async function executeSpotifyTool(call: ToolCall): Promise<string> {
  const { input } = call;
  const payload =
    call.name === "pause_music"
      ? { action: "pause" }
      : {
          action: "play",
          query: input.query,
          allowCatalog: input.allowCatalog === true,
        };
  try {
    const res = await fetch("/api/spotify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.status === 503 || data.error === "spotify_not_connected") {
      return "Spotify isn't connected yet.";
    }
    if (call.name === "pause_music") return "Paused Spotify.";
    if (data.notInLibrary)
      return `"${data.query}" isn't in the user's library. ASK them if you should play it from the Spotify catalog instead — do not play it yet.`;
    if (data.notFound) return `Couldn't find "${data.query}" anywhere on Spotify.`;
    if (data.noActiveDevice)
      return `Found "${data.item?.name}" but there's no active Spotify device. Tell the user to open Spotify on a device (their devices: ${(data.devices ?? []).join(", ")}).`;
    if (data.played)
      return `Now playing ${data.played.kind ?? "music"} "${data.played.name}"${data.played.subtitle ? ` by ${data.played.subtitle}` : ""} (from ${data.source === "library" ? "their library/playlists" : "the Spotify catalog"}).`;
    if (!res.ok) return `Spotify error: ${data.error ?? res.status}`;
    return "Done.";
  } catch (e) {
    return `Spotify request failed: ${e instanceof Error ? e.message : "network error"}`;
  }
}

function fmt(iso?: string): string {
  if (!iso) return "?";
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function excerpt(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 15).trim()}...`;
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
  let timezone: string | undefined;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    timezone = undefined;
  }
  return {
    nowISO: new Date().toISOString(),
    timezone,
    userName: s.settings.userName,
    priorities: s.settings.priorities,
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
      priority: t.priority,
      source: t.source,
      dueAt: t.dueAt,
      sphere: t.sphere,
      spentBlocks: t.spentBlocks,
      estimateBlocks: t.estimateBlocks,
      done: t.done,
    })),
    settings: {
      baselineFocusSec: s.settings.baselineFocusSec,
      shortBreakSec: s.settings.shortBreakSec,
      longBreakSec: s.settings.longBreakSec,
      blocksBeforeLongBreak: s.settings.blocksBeforeLongBreak,
      minFocusSec: s.settings.minFocusSec,
      maxFocusSec: s.settings.maxFocusSec,
      adaptive: s.settings.adaptive,
    },
    lockIn: s.lockInProgress(),
    latestRecommendation: s.latestRecommendation,
    lastRationale: s.lastDecisionRationale,
  };
}

function normalizePriority(input: unknown): TaskPriority | undefined {
  if (
    input === "low" ||
    input === "medium" ||
    input === "high" ||
    input === "urgent"
  ) {
    return input;
  }
  return undefined;
}
