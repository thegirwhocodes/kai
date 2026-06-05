# Focus Coach — adaptive pomodoro agent

A smart, **adaptive** pomodoro agent with two channels that share one source of truth:

1. **Web app** — a ticking timer dial, controls, task list, and a session ribbon. The agent's reasoning is shown inline ("Let's do 30 minutes — you tend to focus well at this hour").
2. **Voice coach** — a conversational agent (Claude) you can talk to. It drives the exact same timer state via tool calls, so "pause" by voice == clicking Pause.

> Scaffold built while the deep-research report is in flight. The adaptive numbers in `src/lib/adaptive.ts` are a transparent first pass and will be refined once the research lands.

## What makes it "adaptive"

The engine in [`src/lib/adaptive.ts`](src/lib/adaptive.ts) decides each block's length from:

- **Circadian energy** — gentle ±15% shaping by time of day (morning peak, post-lunch dip).
- **Recent focus quality** — your 1–5 self-ratings after each block lengthen blocks when you're in flow, shorten them when focus is choppy.
- **Streak** — long break after N focus blocks.
- **Calendar fit** — never overruns an upcoming commitment (hook is in the context; calendar integration is TODO).

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

## Not done yet (post-research)

- Wire the browser voice loop (STT/TTS) to the `/api/agent` route.
- Calendar + todo integration for real `minutesUntilNextCommitment`.
- Server-backed sessions for cross-device sync and analytics.
- Refine adaptive coefficients per the research findings.
