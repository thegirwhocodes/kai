import { DEFAULT_BACKGROUND } from "@/lib/backgrounds";

// Core domain model for the adaptive Pomodoro agent.
// A "session" is a working day's worth of blocks. A "block" is one
// focus or break interval. The agent adapts block length using the
// rolling history of completed blocks and the user's focus ratings.

export type BlockKind = "focus" | "short_break" | "long_break";

export type BlockStatus =
  | "pending" // queued, not started
  | "running" // actively counting down
  | "paused" // user paused mid-block
  | "completed" // ran to the end (or user marked done)
  | "abandoned"; // user skipped/cancelled early

export interface Task {
  id: string;
  title: string;
  /** Optional rough estimate in focus blocks the user expects this to take. */
  estimateBlocks?: number;
  /** Blocks actually spent on this task so far. */
  spentBlocks: number;
  done: boolean;
  createdAt: number;
  /** Priority is intentionally human-scale, not a brittle numeric score. */
  priority?: TaskPriority;
  /** Where Kai learned about this task. */
  source?: TaskSource;
  /** Optional ISO datetime when this task starts mattering. */
  dueAt?: string;
  /** Naomi's life/work area this belongs to, e.g. Sabi, school, family. */
  sphere?: string;
  notes?: string;
  /** Why Kai suggested or created it. */
  reason?: string;
}

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskSource = "manual" | "kai" | "calendar" | "email" | "alexa";

export type EmailCategory =
  | "sabi"
  | "school"
  | "family"
  | "faith"
  | "kai"
  | "opportunity"
  | "admin"
  | "noise"
  | "unknown";

export interface EmailSignal {
  id: string;
  from: string;
  subject: string;
  date?: string;
  category: EmailCategory;
  priority: TaskPriority;
  reason: string;
}

export interface CalendarSummary {
  connected: boolean;
  busyCount: number;
  nextEvent?: {
    summary: string;
    start: string;
    end: string;
  };
  freeSlots: { start: string; end: string }[];
  error?: string;
}

export interface KaiRecommendation {
  id: string;
  createdAt: number;
  mode: "focus" | "break" | "admin";
  title: string;
  taskTitle?: string;
  taskId?: string;
  taskPriority?: TaskPriority;
  durationMinutes: number;
  suggestedStartISO: string;
  suggestedEndISO: string;
  minutesUntilNextCommitment?: number;
  reason: string;
  reasonParts: string[];
  source: "tasks" | "calendar" | "email" | "priorities" | "recovery";
  confidence: "low" | "medium" | "high";
  canStartNow: boolean;
  emailSignals: EmailSignal[];
  calendarSummary: CalendarSummary;
}

export interface KaiCommand {
  id: string;
  createdAt: number;
  type:
    | "show_recommendation"
    | "start_recommended_focus"
    | "start_break"
    | "pause_active"
    | "resume_active"
    | "complete_active"
    | "skip_active";
  source: "alexa" | "api";
  recommendation?: KaiRecommendation;
  spoken?: string;
}

export interface Block {
  id: string;
  kind: BlockKind;
  /** Planned duration in seconds, as decided by the adaptive engine. */
  plannedSec: number;
  /** Seconds actually elapsed in the focus/break (for analytics). */
  elapsedSec: number;
  status: BlockStatus;
  /** Task this focus block was directed at (focus blocks only). */
  taskId?: string;
  startedAt?: number;
  endedAt?: number;
  /**
   * Post-block self-report, 1–5, captured by the agent ("how focused were
   * you?"). Drives the adaptive engine. Undefined until rated.
   */
  focusRating?: 1 | 2 | 3 | 4 | 5;
  /** Number of times the user paused or got interrupted during the block. */
  interruptions: number;
}

export interface Session {
  id: string;
  startedAt: number;
  blocks: Block[];
  /** Index into blocks[] of the active/last block. */
  currentBlockIndex: number;
}

/**
 * Inputs the adaptive engine reads to decide the next block's shape.
 * Kept explicit so the logic is testable and the voice agent can explain
 * *why* it chose a given length.
 */
export interface AdaptiveContext {
  /** Completed focus blocks this session, most-recent-last. */
  recentFocusBlocks: Block[];
  /** Consecutive completed focus blocks since the last long break. */
  focusStreak: number;
  /** Completed focus minutes since the last long break. */
  focusMinutesSinceLongBreak: number;
  /** Local hour 0–23, used as a proxy for circadian energy. */
  hourOfDay: number;
  /** Minutes free before the user's next calendar commitment, if known. */
  minutesUntilNextCommitment?: number;
  /** User's baseline preferred focus length in seconds (their "default"). */
  baselineFocusSec: number;
}

export interface AdaptiveDecision {
  kind: BlockKind;
  plannedSec: number;
  /** Human-readable rationale the voice agent can speak aloud. */
  rationale: string;
}

/** Tunable knobs, surfaced in settings and to the agent. */
export interface AgentSettings {
  baselineFocusSec: number; // default focus length (e.g. 25 min)
  shortBreakSec: number; // default short break (e.g. 5 min)
  longBreakSec: number; // default long break (e.g. 15 min)
  blocksBeforeLongBreak: number; // e.g. 4
  minFocusSec: number; // adaptive floor
  maxFocusSec: number; // adaptive ceiling
  adaptive: boolean; // master switch for the adaptive engine
  autoStart: boolean; // auto-advance focus <-> break without a click
  autoStartDelaySec: number; // grace period before the next block begins
  soundAlerts: boolean; // chime on start/end
  voiceAlerts: boolean; // Kai speaks each transition aloud
  background: string; // CSS gradient preset, or an image URL
}

export const DEFAULT_SETTINGS: AgentSettings = {
  baselineFocusSec: 25 * 60,
  shortBreakSec: 5 * 60,
  longBreakSec: 15 * 60,
  blocksBeforeLongBreak: 4,
  minFocusSec: 10 * 60,
  maxFocusSec: 50 * 60,
  adaptive: true,
  autoStart: true,
  autoStartDelaySec: 5,
  soundAlerts: true,
  voiceAlerts: true,
  background: DEFAULT_BACKGROUND,
};
