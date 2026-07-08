# Kai Focus — Competitive & Architecture Review

_Generated 2026-06-18. Combines (a) a code-level audit of how Kai is actually wired and
(b) a verified deep-research pass on the 2025–2026 market. Pricing and platform policies in
this space change fast — re-check primary sources before any launch decision._

---

## Part 1 — Is Kai set up the way it should be?

**Short answer: the _craft_ is right; the _foundation for a business_ is missing.**
As a clean, modern, genuinely-wired single-user app, Kai is in good shape. As a product you can
hand to 30–50 testers, it is not yet — because every integration is hardwired to Naomi's own
accounts and there is no auth / multi-tenant layer.

### What's genuinely good

- **Modern, current stack**: Next.js 16 (App Router), React 19, TypeScript strict, Tailwind 4,
  Zustand. Deployed on Vercel (`heykai.vercel.app`).
- **Integrations are real, not stubbed** — all call live APIs with credentials:
  - Google Calendar (read/write, free-busy, reschedule) — `src/lib/google/calendar.ts`
  - Gmail (search + draft-only, metadata-first, never sends) — `src/lib/google/gmail.ts`
  - Spotify (library-first playback) — `src/lib/spotify/spotify.ts`
  - Anthropic agent, `claude-haiku-4-5-20251001`, 19 tools, prompt caching — `src/lib/agent/`
  - Groq Whisper STT + ElevenLabs TTS, with browser-API fallbacks
  - Alexa custom skill — `src/app/api/alexa/route.ts`
  - 5-provider web-search fallback chain (Brave→Tavily→Serper→Google→DuckDuckGo)
- **Good engineering hygiene**: secrets server-side only, graceful degradation everywhere,
  clean separation (lib/components/app), error handling in every route.
- **Security false alarm cleared**: `.env.local` is **not** committed (`.gitignore` has `.env*`;
  only `.env.local.example` is tracked). Keys are not exposed.

### The real gaps (in priority order for "becoming a business")

1. **Single-user by design — this is the #1 blocker.** No auth, no database, no per-user OAuth.
   All Google/Spotify tokens are Naomi's personal accounts; the recommendation engine even
   hardcodes "Sabi/Education for Equality" as priority context. **Testers literally cannot use
   it** without connecting their own accounts. Needs: auth (e.g. Clerk/Auth.js), a DB
   (Vercel-marketplace Postgres/Neon or Supabase), and per-user OAuth token storage.
2. **Platform constraints the current design under-accounts for** (see Part 2 §4):
   Spotify extended API access is effectively closed to new indie apps, and Gmail restricted
   scopes through a Vercel backend trigger a paid, annual **CASA** security assessment.
3. **No error tracking / monitoring** — Naomi's global config explicitly wants **Sentry**;
   it's not wired. Add before tester rollout.
4. **No tests, no CI** — no jest/vitest/Playwright, no GitHub Actions. At minimum add a
   build+lint CI gate and smoke tests on the agent/tool loop.
5. **Hardening**: no rate limiting on `/api/agent`, `/api/spotify`, `/api/calendar`; thin input
   validation; Alexa signature verification defaults off.
6. **"Hey Kai" wake word is brittle** — browser Web Speech API + regex match, Chrome/Safari
   only, no on-device wake model (see §4).

---

## Part 2 — Market & competitive research (verified)

Method: 5 search angles → 26 sources fetched → 114 claims → 25 adversarially verified
(3-vote) → 23 confirmed. Confidence noted per item.

### 1. Direct competitors — ambient focus & focus-music apps

| App | Pricing (2025–26) | Model / traction | Notes |
|---|---|---|---|
| **Flocus** | $9/mo; **$5/mo annual**; **$99 lifetime** | Freemium; permanent free tier (no card) | Closest aesthetic comp. Free is capped (timer, 3 tasks, 1-day stats). |
| **Forest** | Freemium; regional-priced Plus; legacy one-time Pro discontinued | **Reports 60M+ users** since 2014 | Market leader; gamified tree mechanic. |
| **Focusmate** | **$8/mo annual / $12/mo monthly**; free = 3 sessions/wk | Body-doubling coworking | Different mechanic (live accountability). |
| **Brain.fm** | **$14.99/mo, $99.99/yr** | Science-backed premium | Real NSF grant + 2025 _Communications Biology_ paper. ~60% above ambient band. |

**Implications**
- The ambient band is **$5–9/mo**, with **lifetime ($99)** as a common lever. Kai's proposed
  **$9/mo / $72/yr ($6/mo) sits at the TOP** of this band.
- A calm room + timer is a **commodity** at this price. Kai's price is only defensible because of
  the **AI planning + voice + integrations** layer — that must be the headline, not backgrounds.
- Brain.fm proves **willingness-to-pay above $9 exists _if_ claims are substantiated.** Per your
  own AGENTS.md: do **not** imply Brain.fm-grade neuromodulation or copy Ali Abdaal's audio.
  Frame "Christian lofi" / "lock-in" as curated functional traits, grounded in `docs/RESEARCH.md`.

### 2. AI assistant + calendar/voice

- **Motion**: raised **$60M at a $550M valuation** (Sept 2025), **~$50M ARR**, by **pivoting from
  consumer calendar to B2B autonomous "AI Employees."** (ARR is founder/PR-sourced, unaudited.)
- **Reclaim.ai**: **acquired by Dropbox in 2024** (~$40M, 22-person team).
- **Takeaway**: consumer AI-calendar-planning is **a feature, not a standalone business** — the
  serious players are consolidating **upmarket/B2B and leaving the consumer space.** That vacated
  consumer "calm focus + AI planning" niche is exactly Kai's wedge. **Don't try to out-build
  Motion as a scheduling engine**; be the personal focus companion.
- **AI hardware cohort** (lower verification — fetched but not 3-vote confirmed): Humane AI Pin
  **dead** (HP bought assets ~$116M, Feb 2025); Bee **acquired by Amazon** (July 2025); Rabbit R1
  widely panned. **Cautionary tale: do NOT position Kai as hardware-like always-listening AI** —
  that's where the flops are. Kai's advantage is being **software, free to start, in the browser.**

### 3. Companies to model after

- **Raycast**: Pro **$10/mo, $8/mo annual**; **Free Forever incl. 50 AI messages** — AI in free
  as the conversion hook.
- **Granola**: **$0 Basic** with real (capped) AI; **$14/user/mo** Business for unlimited + integrations.
- **Pattern to copy**: *free-forever-with-real-value + a TASTE of AI in free + unlimited/advanced AI
  and integrations behind paid, at $8–14/mo.* Flocus, Forest, Raycast, Granola all do (a) lovable
  free tier, no card.

**Implications for Kai's pricing** (validating the business plan)
- $9/mo is **consistent with the cohort**, but **$8/mo-annual is a sharper anchor** (Raycast) and
  **$5/mo-annual matches Flocus**. Consider lowering the annual or adding a **$99 lifetime** tier
  (cash-flow + matches Flocus) for founding users.
- **Put a taste of the AI in Free** (e.g. a few AI plans / voice commands per day). Gate *unlimited*
  AI planning, full Calendar/Gmail, voice, and all music modes behind Plus. A hard paywall on all
  AI would underperform the cohort norm.

### 4. Build / architecture constraints (these change the roadmap)

- **Spotify (high confidence, verified):** As of **Nov 27 2024**, new/dev-mode apps **lost**
  Recommendations, Audio Features, Audio Analysis, Related Artists, Featured/Category playlists,
  30-sec previews, and **editorial/algorithmic playlists.** Extended access is now **reserved for
  large established orgs** (~250K MAU, registered companies) — a documented **catch-22 for indies.**
  Dev mode is **not** a viable production path. → **Architect focus-music only around what new apps
  CAN do: search + playback of the _user's own_ playlists/saved tracks, plus Kai's own curated
  track tags** for "Christian lofi" / "lock-in." Do **not** depend on Audio Features/Recommendations.
  Longer term, evaluate hosting/licensing Kai's own focus audio.
- **Gmail (high confidence, verified):** Restricted Gmail scopes routed through a third-party server
  (your Vercel backend) require a **mandatory CASA Tier-2 assessment by a Google-approved lab,
  re-done every 12 months** — a real cost + timeline gate. → **Phase Gmail _behind_ Calendar**
  (lighter verification), use the least-sensitive scopes, and budget annual re-verification.
- **Voice / wake word (not externally verified here):** browser "Hey Kai" reliability across
  browsers is an open question; comparable apps tend to use **on-device wake models** (e.g.
  Picovoice) rather than Web Speech regex. The repo's modular STT→LLM→TTS approach is sound;
  see `docs/RESEARCH.md` for the <1s streaming-pipeline budget.

---

## Recommended next moves (synthesis)

1. **Build the multi-user foundation** (auth + DB + per-user OAuth) — without it there is no
   business and no tester rollout. Highest priority.
2. **Wire Sentry** (and a lint+build CI gate) before testers touch it.
3. **Re-architect Spotify** around user-owned playlists + Kai-curated tags; stop assuming extended API.
4. **Sequence OAuth**: launch on Calendar; phase Gmail behind a CASA budget/plan.
5. **Pricing**: keep $9/mo, but consider **$8/mo-annual** anchor + a **$99 lifetime** founding tier,
   and **put a daily taste of AI in Free.**
6. **Positioning**: lead with **AI planning + voice**, not backgrounds; own the **consumer calm-focus
   + AI-planning** niche that Motion/Reclaim vacated; avoid always-listening "AI hardware" framing.

## Open questions (unverified — worth a follow-up research pass)
- Endel, Sunsama, Akiflow, Cal.ai current pricing/traction (did not survive verification this run).
- AI-hardware post-mortems (Rabbit R1, Friend, Limitless, Bee) — fetched but not 3-vote verified.
- Browser wake-word production reliability vs on-device models.
- Focus-music licensing economics: user-playlist-only vs hosting own audio vs alt provider.

## Key sources
Flocus pricing · Forest · Focusmate pricing · Brain.fm pricing + _Communications Biology_ 2025 ·
Motion $60M/$550M (BusinessWire) · Reclaim→Dropbox · Raycast pricing · Granola pricing ·
Spotify Web API changes (2024-11-27, 2025-04-15) · Google restricted-scope verification (CASA).
