// The adaptive engine. This is a transparent, heuristic first pass — the
// deep-research report will refine the specific numbers and may swap in a
// learned model. Everything here is deliberately explainable so the voice
// agent can say *why* it chose a block length.

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
 * Circadian multiplier — a rough proxy for energy by time of day.
 * Morning and late-morning are peak; the post-lunch dip (~13–15h) and
 * late evening get shorter blocks. Values intentionally gentle (±15%).
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

  // 1) Circadian shaping.
  const circ = circadianFactor(ctx.hourOfDay);
  sec *= circ;
  if (circ > 1.05) reasons.push("you tend to focus well at this hour");
  else if (circ < 0.95) reasons.push("energy usually dips around now");

  // 2) Recent focus quality — lengthen when you're in the zone, shorten
  //    when the last blocks felt scattered.
  const score = recentFocusScore(ctx.recentFocusBlocks);
  if (score != null) {
    if (score >= 4.3) {
      sec *= 1.2;
      reasons.push("your last blocks were deep focus");
    } else if (score <= 2.3) {
      sec *= 0.75;
      reasons.push("focus has been choppy, so a shorter sprint");
    }
  }

  // 3) Don't blow past an upcoming commitment — leave 1 min buffer.
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

  // Shorten the break a touch when focus is hot (keep momentum), lengthen
  // when it's been draining.
  const score = recentFocusScore(ctx.recentFocusBlocks);
  let sec = settings.shortBreakSec;
  let why = "";
  if (score != null && score >= 4.3) {
    sec = Math.round(settings.shortBreakSec * 0.8);
    why = " — quick one to keep your momentum";
  } else if (score != null && score <= 2.3) {
    sec = Math.round(settings.shortBreakSec * 1.4);
    why = " — a little longer to reset";
  }
  const mins = Math.max(1, Math.round(sec / 60));
  return {
    kind: "short_break",
    plannedSec: sec,
    rationale: `${mins} minute break${why}.`,
  };
}
