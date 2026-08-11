import {
  calendarConfigured,
  freeSlots,
  listEvents,
  type CalEvent,
} from "@/lib/google/calendar";
import { gmailConfigured, listEmailSignals } from "@/lib/google/gmail";
import type {
  CalendarSummary,
  EmailSignal,
  KaiRecommendation,
  Task,
  TaskPriority,
} from "@/lib/types";

interface RecommendationSettings {
  baselineFocusSec?: number;
  minFocusSec?: number;
  maxFocusSec?: number;
}

export interface RecommendationState {
  nowISO?: string;
  timezone?: string;
  activeKind?: string;
  activeStatus?: string;
  remainingSec?: number;
  focusStreak?: number;
  completedFocus?: number;
  tasks?: Partial<Task>[];
  settings?: RecommendationSettings;
  lastRationale?: string | null;
  /** The user's own free-text priorities, used to weight task scoring. */
  priorities?: string;
  userName?: string;
}

export interface BuildRecommendationOptions {
  state?: RecommendationState;
  horizonHours?: number;
  intent?: "next_session" | "plan_day";
  /**
   * Whether this caller may read the owner's connected Google accounts. Off for
   * ordinary visitors, who get task-only planning — still useful, and it never
   * reaches into someone else's calendar or inbox.
   */
  allowIntegrations?: boolean;
}

interface Candidate {
  title: string;
  taskId?: string;
  taskTitle?: string;
  priority: TaskPriority;
  source: KaiRecommendation["source"];
  score: number;
  reasonParts: string[];
  emailSignals?: EmailSignal[];
}

const priorityWeight: Record<TaskPriority, number> = {
  low: 10,
  medium: 35,
  high: 65,
  urgent: 95,
};

export async function buildKaiRecommendation(
  options: BuildRecommendationOptions = {},
): Promise<KaiRecommendation> {
  const state = options.state ?? {};
  const now = validDate(state.nowISO) ?? new Date();
  const horizon = new Date(
    now.getTime() + Math.max(2, options.horizonHours ?? 10) * 60 * 60_000,
  );

  const allowIntegrations = options.allowIntegrations ?? false;
  const calendar = allowIntegrations
    ? await buildCalendarSummary(now, horizon)
    : { connected: false, busyCount: 0, freeSlots: [] };
  const emailSignals = allowIntegrations ? await buildEmailSignals() : [];
  const minutesUntilNextCommitment = calendar.nextEvent
    ? Math.max(
        0,
        Math.round((Date.parse(calendar.nextEvent.start) - now.getTime()) / 60_000),
      )
    : undefined;

  const tasks = normalizeTasks(state.tasks ?? []);
  const priorityKeywords = parsePriorities(state.priorities);
  const candidates = [
    ...tasks.map((task) => taskCandidate(task, now, priorityKeywords)),
    ...emailCandidates(emailSignals),
  ].sort((a, b) => b.score - a.score);

  const activePenalty =
    state.activeKind && state.activeStatus && state.activeStatus !== "completed"
      ? 30
      : 0;
  const nextSlot = calendar.freeSlots[0];
  const canStartNow =
    !nextSlot || Date.parse(nextSlot.start) <= now.getTime() + 2 * 60_000;
  const shortGap =
    minutesUntilNextCommitment != null && minutesUntilNextCommitment < 14;

  const settings = state.settings ?? {};
  const baselineMinutes = clamp(
    Math.round((settings.baselineFocusSec ?? 25 * 60) / 60),
    Math.round((settings.minFocusSec ?? 10 * 60) / 60),
    Math.round((settings.maxFocusSec ?? 50 * 60) / 60),
  );
  const durationMinutes = fitDuration(
    baselineMinutes,
    settings,
    minutesUntilNextCommitment,
    shortGap,
  );

  if (shortGap) {
    const reasonParts = [
      `there are only ${minutesUntilNextCommitment} minutes before ${calendar.nextEvent?.summary ?? "your next thing"}`,
      "a reset beats a rushed sprint",
    ];
    return recommendation({
      now,
      mode: "break",
      title: "Reset before the next thing",
      taskTitle: undefined,
      taskId: undefined,
      taskPriority: "medium",
      durationMinutes,
      minutesUntilNextCommitment,
      reasonParts,
      source: "recovery",
      confidence: calendar.connected ? "high" : "medium",
      canStartNow: true,
      emailSignals,
      calendarSummary: calendar,
    });
  }

  const candidate =
    candidates[0] ??
    ({
      title: "Choose one small next step",
      taskTitle: "Choose one small next step",
      priority: "medium",
      source: "priorities",
      score: 20 - activePenalty,
      reasonParts: ["no urgent task is visible, so keep the next block simple"],
    } satisfies Candidate);

  const reasonParts = [...candidate.reasonParts];
  if (calendar.nextEvent && minutesUntilNextCommitment) {
    reasonParts.push(
      `it fits before ${calendar.nextEvent.summary} in ${minutesUntilNextCommitment} minutes`,
    );
  } else if (calendar.connected) {
    reasonParts.push("your calendar has enough open space right now");
  }
  if (state.focusStreak && state.focusStreak >= 3) {
    reasonParts.push("keep it contained because you have a focus streak going");
  }

  return recommendation({
    now,
    mode: candidate.source === "email" ? "admin" : "focus",
    title: candidate.title,
    taskTitle: candidate.taskTitle ?? candidate.title,
    taskId: candidate.taskId,
    taskPriority: candidate.priority,
    durationMinutes,
    minutesUntilNextCommitment,
    reasonParts,
    source: candidate.source,
    confidence:
      candidate.score >= 90 || calendar.connected || emailSignals.length > 0
        ? "high"
        : candidate.score >= 45
          ? "medium"
          : "low",
    canStartNow,
    emailSignals: candidate.emailSignals ?? emailSignals,
    calendarSummary: calendar,
  });
}

async function buildCalendarSummary(
  now: Date,
  horizon: Date,
): Promise<CalendarSummary> {
  if (!calendarConfigured()) {
    return { connected: false, busyCount: 0, freeSlots: [] };
  }
  try {
    const busy = await listEvents(now.toISOString(), horizon.toISOString());
    const slots = freeSlots(now.toISOString(), horizon.toISOString(), busy, 10, 6);
    const nextEvent = busy.find((event) => Date.parse(event.start) > now.getTime());
    return {
      connected: true,
      busyCount: busy.length,
      nextEvent: nextEvent ? eventSummary(nextEvent) : undefined,
      freeSlots: slots,
    };
  } catch (e) {
    return {
      connected: false,
      busyCount: 0,
      freeSlots: [],
      error: e instanceof Error ? e.message : "calendar_error",
    };
  }
}

async function buildEmailSignals(): Promise<EmailSignal[]> {
  if (!gmailConfigured()) return [];
  try {
    return await listEmailSignals(10);
  } catch {
    return [];
  }
}

function normalizeTasks(tasks: Partial<Task>[]): Task[] {
  return tasks
    .filter((t) => t.title && !t.done)
    .map((t) => ({
      id: t.id ?? `task-${slug(t.title ?? "task")}`,
      title: t.title ?? "Untitled task",
      estimateBlocks: t.estimateBlocks,
      spentBlocks: t.spentBlocks ?? 0,
      done: false,
      createdAt: t.createdAt ?? Date.now(),
      priority: normalizePriority(t.priority),
      source: t.source,
      dueAt: t.dueAt,
      sphere: t.sphere,
      notes: t.notes,
      reason: t.reason,
    }));
}

function taskCandidate(
  task: Task,
  now: Date,
  priorityKeywords: string[],
): Candidate {
  const priority = normalizePriority(task.priority);
  const text = `${task.title} ${task.sphere ?? ""} ${task.notes ?? ""}`.toLowerCase();
  let score = 25 + priorityWeight[priority];
  const reasonParts: string[] = [];

  if (priority === "urgent" || priority === "high") {
    reasonParts.push(`${priority} priority task`);
  }
  if (task.spentBlocks > 0 && !task.done) {
    score += 18;
    reasonParts.push("already in motion");
  }
  if (task.dueAt) {
    const due = Date.parse(task.dueAt);
    if (!Number.isNaN(due)) {
      const hours = (due - now.getTime()) / 3_600_000;
      if (hours <= 8) {
        score += 50;
        reasonParts.push("due today");
      } else if (hours <= 48) {
        score += 25;
        reasonParts.push("coming up soon");
      }
    }
  }

  // Boost work that touches whatever the user told us matters right now.
  // There is no built-in list of "important" topics — it's their answer or
  // nothing, so this reads the same for every user.
  const hit = priorityKeywords.find((keyword) => text.includes(keyword));
  if (hit) {
    score += 30;
    reasonParts.push(`it's one of your priorities right now (${hit})`);
  }

  return {
    title: task.title,
    taskTitle: task.title,
    taskId: task.id,
    priority,
    source: "tasks",
    score,
    reasonParts: reasonParts.length
      ? reasonParts
      : ["it is the clearest open task"],
  };
}

function emailCandidates(signals: EmailSignal[]): Candidate[] {
  return signals
    .filter((signal) => signal.priority !== "low" && signal.category !== "noise")
    .slice(0, 4)
    .map((signal) => {
      const fromName = signal.from.replace(/<.*?>/g, "").replaceAll('"', "").trim();
      const taskTitle = `Reply to ${fromName || "email"}: ${signal.subject}`;
      return {
        title: taskTitle,
        taskTitle,
        priority: signal.priority,
        source: "email",
        score: 20 + priorityWeight[signal.priority],
        reasonParts: [`${signal.reason} in your inbox`],
        emailSignals: [signal],
      };
    });
}

function fitDuration(
  baselineMinutes: number,
  settings: RecommendationSettings,
  minutesUntilNextCommitment?: number,
  shortGap = false,
): number {
  const min = Math.round((settings.minFocusSec ?? 10 * 60) / 60);
  const max = Math.round((settings.maxFocusSec ?? 50 * 60) / 60);
  if (shortGap && minutesUntilNextCommitment != null) {
    return clamp(Math.max(3, minutesUntilNextCommitment - 2), 3, 10);
  }
  let duration = clamp(baselineMinutes, min, max);
  if (minutesUntilNextCommitment != null && minutesUntilNextCommitment > 0) {
    duration = Math.min(duration, Math.max(min, minutesUntilNextCommitment - 3));
  }
  return clamp(duration, min, max);
}

function recommendation(args: {
  now: Date;
  mode: KaiRecommendation["mode"];
  title: string;
  taskTitle?: string;
  taskId?: string;
  taskPriority?: TaskPriority;
  durationMinutes: number;
  minutesUntilNextCommitment?: number;
  reasonParts: string[];
  source: KaiRecommendation["source"];
  confidence: KaiRecommendation["confidence"];
  canStartNow: boolean;
  emailSignals: EmailSignal[];
  calendarSummary: CalendarSummary;
}): KaiRecommendation {
  const createdAt = Date.now();
  const start = args.now;
  const end = new Date(start.getTime() + args.durationMinutes * 60_000);
  return {
    id: `rec-${createdAt}-${slug(args.title).slice(0, 18)}`,
    createdAt,
    mode: args.mode,
    title: args.title,
    taskTitle: args.taskTitle,
    taskId: args.taskId,
    taskPriority: args.taskPriority,
    durationMinutes: args.durationMinutes,
    suggestedStartISO: start.toISOString(),
    suggestedEndISO: end.toISOString(),
    minutesUntilNextCommitment: args.minutesUntilNextCommitment,
    reason: args.reasonParts.join("; "),
    reasonParts: args.reasonParts,
    source: args.source,
    confidence: args.confidence,
    canStartNow: args.canStartNow,
    emailSignals: args.emailSignals.slice(0, 5),
    calendarSummary: args.calendarSummary,
  };
}

function eventSummary(event: CalEvent): CalendarSummary["nextEvent"] {
  return {
    summary: event.summary,
    start: event.start,
    end: event.end,
  };
}

function normalizePriority(priority?: TaskPriority): TaskPriority {
  if (
    priority === "low" ||
    priority === "medium" ||
    priority === "high" ||
    priority === "urgent"
  ) {
    return priority;
  }
  return "medium";
}

function validDate(iso?: string): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Turn the user's free-text priorities ("thesis, job applications") into
 * lowercase keywords. Very short fragments are dropped so a stray "a" can't
 * match every task.
 */
export function parsePriorities(priorities?: string): string[] {
  if (!priorities) return [];
  return priorities
    .toLowerCase()
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3)
    .slice(0, 12);
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
