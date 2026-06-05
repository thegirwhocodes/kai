# Focus Coach — adaptive pomodoro agent

A smart, **adaptive** pomodoro agent with two channels that share one source of truth:

1. **Web app** — a ticking timer dial, controls, task list, and a session ribbon. The agent's reasoning is shown inline ("Let's do 30 minutes — you tend to focus well at this hour").
2. **Voice coach** — a conversational agent (Claude) you can talk to. It drives the exact same timer state via tool calls, so "pause" by voice == clicking Pause.

> Adaptive logic is grounded in a verified deep-research pass — see [`docs/RESEARCH.md`](docs/RESEARCH.md) (105 agents, 25 claims adversarially verified, 6 refuted).

## What makes it "adaptive" (and why)

The research's core finding: the validated win of Pomodoro-style timing is **predetermined structure + personalized length**, *not* the 25/5 interval — and rigid fixed intervals actually accelerate fatigue/motivation decline. So the engine in [`src/lib/adaptive.ts`](src/lib/adaptive.ts) decides each block from:

- **Recent focus quality** (strongest signal) — your 1–5 self-ratings lengthen blocks when you're in flow (ride it, don't force a cutoff), shorten them when focus is choppy.
- **Fatigue taper** — focus blocks gently shorten as your streak grows, to stay ahead of the fatigue curve rigid intervals create.
- **Break length, protected** — breaks are never shrunk "for momentum" (longer breaks drive recovery); they *grow* when you're drained or deep into a streak.
- **Circadian guess** — a gentle ±15% time-of-day nudge, explicitly a personalized guess your own ratings override (waking 90-min ultradian cycles were *refuted* in verification — no hard-coded 90-min blocks).
- **Streak** — long break after N focus blocks. **Calendar fit** — never overruns an upcoming commitment (hook present; integration is TODO).

Every decision carries a plain-English `rationale` the voice agent speaks and the UI shows.

## Architecture

```
src/
  lib/
    types.ts        # domain model: Session, Block, Task, AgentSettings
    adaptive.ts     # the adaptive engine (decideFocusBlock / decideBreakBlock)
    store.ts        # zustand store — single source of truth for live state
    useTicker.ts    # wall-clock-accurate countdown
    format.ts
    agent/
      tools.ts      # tool surface mapping 1:1 to store actions
      prompt.ts     # voice-coach system prompt + state snapshot renderer
  app/
    page.tsx        # web UI
    api/agent/route.ts  # one Claude turn -> { say, toolCalls } for the client
  components/
    TimerDial.tsx
```

**State sharing:** the web UI and the voice agent both call the same zustand actions. The agent route returns *tool calls*; the client executes them against the store, so both channels stay in lockstep. (Today the store is client-side / localStorage; a future server-backed store enables true cross-device sync — see the research report.)

## Run it

```bash
cp .env.local.example .env.local   # add ANTHROPIC_API_KEY for the voice agent
npm run dev
```

The timer works without a key; only the voice agent route needs `ANTHROPIC_API_KEY`.

## Voice loop (wired)

The browser voice loop is live: `src/lib/voice/useVoiceAgent.ts` uses the Web Speech API for STT and `SpeechSynthesis` for TTS; `src/lib/agent/client.ts` runs the act→confirm loop (executes tool calls against the store, feeds results back so the coach confirms out loud), and `src/components/VoicePanel.tsx` is the mic + transcript UI. A **text fallback** works in any browser (voice input needs Chrome/Edge). Try: *"add a task called write the essay and start a focus block on it."*

## Not done yet

- Swap Web Speech for a modular streaming STT→LLM→TTS pipeline (<1s latency) per `docs/RESEARCH.md` — the upgrade path for natural conversation.
- Calendar + todo integration for real `minutesUntilNextCommitment`.
- Server-backed sessions for cross-device sync and analytics.
- Tune adaptive coefficients against real session data.
