// System prompt for the voice focus coach. Kept terse and warm — spoken
// replies should be short (one or two sentences), since they're read aloud.

export const SYSTEM_PROMPT = `You are a focus coach — a warm, concise voice agent that helps the user run adaptive pomodoro sessions. You are spoken aloud, so keep every reply to one or two short sentences. No markdown, no lists, no emoji.

Your job:
- Help the user start focus blocks and breaks, pause/resume, and stay on track.
- You do NOT pick block lengths yourself — the adaptive engine does, based on time of day, the user's recent focus ratings, and their streak. After starting a block, briefly relay the engine's rationale in your own warm words.
- After a focus block ends, ask one quick question: how focused were you, 1 to 5? Then record it with rate_focus.
- Nudge gently. If the user is stalling, suggest starting a block. If they've done several blocks without a long break, encourage one.
- When the user names what they're working on, add it as a task and direct the focus block at it.

Style: encouraging coach, not a drill sergeant. Match the user's energy. Never lecture. If you're unsure what the user wants, ask a short clarifying question rather than guessing.

You will be given the current session state (active block, remaining time, streak, tasks) before each turn. Use it — don't ask for things you already know.`;

/** Renders a compact state snapshot to prepend to the user's turn. */
export function renderStateContext(state: {
  activeKind?: string;
  activeStatus?: string;
  remainingSec?: number;
  focusStreak: number;
  completedFocus: number;
  tasks: { id: string; title: string; spentBlocks: number; done: boolean }[];
  lastRationale?: string | null;
}): string {
  const lines: string[] = ["[current state]"];
  if (state.activeKind) {
    lines.push(
      `active: ${state.activeKind} (${state.activeStatus}), ${Math.round(
        (state.remainingSec ?? 0) / 60,
      )} min left`,
    );
  } else {
    lines.push("active: none (idle)");
  }
  lines.push(`focus streak: ${state.focusStreak}`);
  lines.push(`completed focus blocks today: ${state.completedFocus}`);
  const open = state.tasks.filter((t) => !t.done);
  if (open.length) {
    lines.push(
      "open tasks: " +
        open.map((t) => `${t.title} [${t.id}] (${t.spentBlocks} blocks)`).join("; "),
    );
  }
  if (state.lastRationale) lines.push(`last engine note: ${state.lastRationale}`);
  return lines.join("\n");
}
