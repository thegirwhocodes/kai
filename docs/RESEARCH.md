# Research: evidence base & architecture for an adaptive Pomodoro agent

Deep-research run (105 agents, 23 sources fetched, 100 claims extracted, 25 adversarially verified → 19 confirmed, 6 refuted). This file records what survived verification and how it shapes the build. Cite with care — effect sizes are real but small/moderate.

## The one design insight that matters

**The validated win of Pomodoro-style timing is not the 25/5 interval — it's that _predetermined, scheduled_ breaks beat _self-chosen_ breaks at sustaining focus, motivation, and mood, while completing comparable work in less time.** Build the agent around *enforcing structure*, not around any magic number.
— Biwer et al. 2023 (RCT, n=87): self-regulated breakers had higher fatigue/distraction and lower concentration/motivation; no difference in task completion. https://bpspsychub.onlinelibrary.wiley.com/doi/10.1111/bjep.12593

## What's true (confirmed)

1. **No single technique is overall superior.** Pomodoro vs Flowtime vs self-regulated: no significant difference in motivation/productivity/fatigue/completion/flow over 2h. *But Pomodoro produced a **faster rise in fatigue and steeper motivation decline** over time.* → rigid fixed intervals have a real downside an adaptive agent should counter. (PMC12292963, RCT n=94)
2. **The 25-min interval is unproven.** It comes from Cirillo's personal experimentation; the cognitive mechanism is "largely untested." Don't treat 25/5 as optimal. (Brown Daily Herald fact-check; BMC scoping review 2025)
3. **The vigilance decrement is the real problem** a timed-break system addresses — sustained attention reliably declines over uninterrupted time-on-task (75+ yrs of replication). (Ariga & Lleras 2011)
4. **Break LENGTH matters more than frequency.** Within the micro-break range, *longer breaks predict greater performance recovery* (b=.07, R²=.34). Micro-breaks reliably help well-being (vigor d=.36, fatigue d=.35) but had *no* significant overall effect on performance (d=.16, n.s.). Cognitively demanding tasks may need breaks **>10 min**. → tune break **duration** and **task type**, not just cadence. (Albulescu et al. 2022, PLOS ONE meta-analysis, N=2335)
5. **There is no fixed optimal work/break ratio.** DeskTime's own "52/17" drifted to 80/17 then 112/26 — and it's vendor marketing, not science. The instability *is* the case for personalization. (DeskTime; Fast Company)
6. **Structured time management has a moderate real benefit** broadly: job performance r=.259, academic r=.262, wellbeing r=.313. The *category* is evidence-backed even though Pomodoro's specific mechanism isn't. (Aeon/Faber/Panaccio 2021, meta-analysis N=53,957)
7. **Voice-driven Pomodoro already ships in production** (Mind Your Now: "Start a Pomodoro for the quarterly report" → fuzzy-match to tasks at 80%+ → start). The feature is viable.

## What's a myth (refuted in verification — do NOT build logic on these)

- ❌ Waking ~90-min ultradian (BRAC) cycles govern attention → **don't hard-code 90-min blocks.** BRAC is real in *sleep*, unproven in wakefulness.
- ❌ Brief breaks fully *prevent* the vigilance decrement.
- ❌ A 15–30% performance drop hits at 20–30 min (misattributed to Mackworth 1948).
- ❌ Attention lapses at 8–10 min justify the 25-min interval.
- ❌ Timer-cued (external) task switches are more efficient than internally-cued ones.

## Build recommendation (voice + web)

- **Voice pipeline: start modular streaming STT→LLM→TTS** — overlapping stages reach **<1s** end-to-end (vs 2–4s sequential). Budget: transport <50ms, STT first partial 100–200ms, LLM TTFT 200–400ms, TTS first-audio 100–300ms. Modular = debuggable + provider-flexible. (LiveKit 2026)
- **Upgrade path: integrated speech-to-speech** (OpenAI Realtime ~232ms, Gemini Live <500ms) for more natural prosody, at the cost of component control. Start modular, offer S2S as premium feel.
- **Web companion + shared session/timer state store**, adaptivity driven by *predetermined-but-personalized* block scheduling plus nudges that counter the fatigue/motivation decline of rigid intervals.

## How this maps to our code

- `adaptive.ts` frames blocks as **predetermined structure** (the validated win), **personalizes** length from the user's measured focus ratings (not a hard-coded interval), **does not shrink breaks when focus is high** (longer breaks aid recovery), **lengthens breaks as fatigue accumulates**, and **tapers focus length late in a streak** to counter the rigid-interval fatigue trajectory. Circadian shaping is framed as a *personalized guess*, not settled science.
- Voice agent (`agent/`) follows the Mind-Your-Now pattern: natural language → match to the user's real tasks → drive the shared store.

## Open questions (need our own product experiment, unanswered by literature)

- Long-term (weeks–months) effect on retention, habit, burnout — evidence is almost all single-session.
- Can algorithmic per-user adaptation actually beat fixed 25/5? No study has tested it.
- Which signals best measure "focus/energy" for adaptation (self-report, completion velocity, calendar load, time-of-day, interruptions) and how to weight them.
