// The adaptive engine. Transparent + explainable so the voice agent can say
// *why* it chose a block length.
//
// Grounded in docs/RESEARCH.md. Key evidence shaping this logic:
//  - The validated win is PREDETERMINED structure + PERSONALIZED length, not a
//    magic interval. We never hard-code 25/5 or 90-min as "optimal".
//  - Break LENGTH drives recovery more than frequency, so we DON'T shrink
//    breaks when focus is high (that was the rigid-Pomodoro anti-pattern).
//  - Rigid fixed intervals accelerate fatigue/motivation decline, so we taper
//    focus length and grow breaks as fatigue accumulates over a streak.
//  - Circadian time-of-day shaping is a gentle PERSONALIZED GUESS, not settled
//    science (waking ultradian/90-min cycles were refuted in verification).

import type {
  AdaptiveContext,
  AdaptiveDecision,
  AgentSettings,
  Block,
} from "./types";

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

/** Average focus rating over the last N rated focus blocks (1–5, or null). */
function recentFocusScore(blocks: Block[], n = 3): number | null {
  const rated = blocks
    .filter((b) => b.kind === "focus" && b.focusRating != null)
    .slice(-n);
  if (rated.length === 0) return null;
  const sum = rated.reduce((acc, b) => acc + (b.focusRating ?? 0), 0);
  return sum / rated.length;
}

/**
 * Circadian multiplier — a gentle PERSONALIZED GUESS at energy by time of day,
 * not settled science. Morning/late-morning lean longer; the post-lunch dip
 * (~13–15h) and late evening lean shorter. Intentionally small (±15%) and the
 * first thing a user's own focus ratings should override.
 */
function circadianFactor(hour: number): number {
  if (hour >= 9 && hour < 12) return 1.15; // morning peak
  if (hour >= 12 && hour < 13) return 1.0; // late morning
  if (hour >= 13 && hour < 15) return 0.85; // post-lunch dip
  if (hour >= 15 && hour < 18) return 1.05; // afternoon recovery
  if (hour >= 18 && hour < 21) return 0.95; // evening
  return 0.8; // late night / early morning
}

/**
 * Decide the next FOCUS block's length.
 * Combines: user baseline → circadian energy → recent focus quality,
 * then clamps to [min,max] and to any upcoming calendar constraint.
 */
export function decideFocusBlock(
  ctx: AdaptiveContext,
  settings: AgentSettings,
): AdaptiveDecision {
  if (!settings.adaptive) {
    return {
      kind: "focus",
      plannedSec: settings.baselineFocusSec,
      rationale: `Adaptive mode off — using your default ${Math.round(
        settings.baselineFocusSec / 60,
      )} minute block.`,
    };
  }

  let sec = ctx.baselineFocusSec;
  const reasons: string[] = [];

  // 1) Circadian shaping — a silent, gentle guess. We do not narrate this as
  //    "your energy tends..." unless the user's own ratings actually show it.
  const circ = circadianFactor(ctx.hourOfDay);
  sec *= circ;

  // 2) Recent focus quality — the strongest personal signal. Lengthen when
  //    you're in the zone (riding flow beats forcing a rigid cutoff), shorten
  //    when the last blocks felt scattered.
  const score = recentFocusScore(ctx.recentFocusBlocks);
  if (score != null) {
    if (score >= 4.3) {
      sec *= 1.2;
      reasons.push("your last blocks were deep focus");
    } else if (score <= 2.3) {
      sec *= 0.75;
      reasons.push(encouragingShortSprint(ctx.recentFocusBlocks.length));
    }
  }

  // 3) Fatigue taper — rigid fixed intervals accelerate fatigue/motivation
  //    decline (PMC12292963). As the streak since the last long break grows,
  //    gently shorten focus so we stay ahead of that curve.
  if (ctx.focusStreak >= 2) {
    const taper = Math.max(0.8, 1 - 0.06 * (ctx.focusStreak - 1));
    sec *= taper;
    if (ctx.focusStreak >= 3) reasons.push("a touch shorter to stay fresh");
  }

  // 4) Don't blow past an upcoming commitment — leave 1 min buffer.
  if (
    ctx.minutesUntilNextCommitment != null &&
    ctx.minutesUntilNextCommitment > 0
  ) {
    const fitSec = (ctx.minutesUntilNextCommitment - 1) * 60;
    if (fitSec < sec && fitSec >= settings.minFocusSec) {
      sec = fitSec;
      reasons.push(
        `you've got ${ctx.minutesUntilNextCommitment} min before your next thing`,
      );
    }
  }

  sec = clamp(sec, settings.minFocusSec, settings.maxFocusSec);
  // Round to the nearest minute for a clean spoken number.
  sec = Math.round(sec / 60) * 60;

  const mins = Math.round(sec / 60);
  const rationale =
    reasons.length > 0
      ? `Let's do ${mins} minutes — ${reasons.join(", and ")}.`
      : `Let's do a ${mins} minute focus block.`;

  return { kind: "focus", plannedSec: sec, rationale };
}

function encouragingShortSprint(seed: number): string {
  const options = [
    "let's make this one light and winnable",
    "a shorter sprint will make it easier to build momentum",
    "small, clean wins count too",
  ];
  return options[seed % options.length];
}

/** Decide whether the next break is short or long, and how long. */
export function decideBreakBlock(
  ctx: AdaptiveContext,
  settings: AgentSettings,
): AdaptiveDecision {
  const longDue = ctx.focusStreak > 0 &&
    ctx.focusStreak % settings.blocksBeforeLongBreak === 0;

  if (longDue) {
    const mins = Math.round(settings.longBreakSec / 60);
    return {
      kind: "long_break",
      plannedSec: settings.longBreakSec,
      rationale: `That's ${ctx.focusStreak} blocks done — take a proper ${mins} minute break. Step away from the screen.`,
    };
  }

  // Break LENGTH drives recovery more than frequency (Albulescu 2022), so we
  // never shrink a break to "keep momentum" — that's the rigid-Pomodoro trap.
  // Baseline by default; lengthen when focus is draining or fatigue has built
  // up over the streak.
  const score = recentFocusScore(ctx.recentFocusBlocks);
  let sec = settings.shortBreakSec;
  let why = "";
  if (score != null && score <= 2.3) {
    sec = Math.round(settings.shortBreakSec * 1.4);
    why = " — a little longer to properly reset";
  } else if (ctx.focusStreak >= 3) {
    sec = Math.round(settings.shortBreakSec * 1.2);
    why = " — a bit longer, you've been at it a while";
  }
  const mins = Math.max(1, Math.round(sec / 60));
  return {
    kind: "short_break",
    plannedSec: sec,
    rationale: `${mins} minute break${why}.`,
  };
}
