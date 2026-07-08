# Kai Project Instructions

## Workspace

This project is Kai, the AI pomodoro/life-organization agent. The correct workspace is:

`/Users/naomiivie/kai`

If a session opens in another folder while the user is asking about Kai, switch your tool working directory to `/Users/naomiivie/kai` before editing, testing, committing, or deploying.

## Context Recovery

Do not guess what happened in earlier Kai work. Before making broad decisions or resuming after compaction, recover the relevant thread context.

Known Kai Codex threads:

- `019eb76f-525d-7770-801e-9867427e6423` - original "Kai / Finish Kai pomodoro agent" thread, started from `/Users/naomiivie/Education for Equality`.
- `019ecd67-72b3-7931-8a21-fda97d0299b1` - "Kai 2" thread, already rooted at `/Users/naomiivie/kai`.

Look for available transcripts in:

- `/Users/naomiivie/.codex/sessions/`
- `/Users/naomiivie/Education for Equality/.claude-sessions/`
- `/Users/naomiivie/kai/.claude-sessions/`, if it exists later

If the user asks about a decision you do not recognize, search transcripts and Kai docs before answering.

## Product Vision

Kai should feel like a polished personal focus companion: a Flocus-level ambient focus app plus an AI assistant that can organize Naomi's day.

Core product requirements:

- Website first: the app should be beautiful, calm, and usable on first load.
- UI quality should be at least as polished as Flocus.
- Use real study/productivity aesthetics: soft libraries, desks, lamps, books, plants, natural light, quiet nighttime workspaces. Avoid anime, childish art, or generic AI fantasy unless explicitly requested.
- Kai should default to hands-free readiness: opening the app should show it waiting for "Hey Kai" when browser support and microphone permissions allow.
- Kai should suggest the next pomodoro from real signals: calendar, tasks, priorities, email history, and the user's stated intent.
- Kai should be able to move forward and backward through calendar time when reasoning about the user's schedule.
- Kai should avoid generic fake claims like "energy tends to dip around now" unless it is backed by real user data. Prefer grounded encouragement or actual observed energy/productivity patterns.
- Pomodoro timing should be clean and explainable. Do not invent odd durations like 24 minutes or 6-minute breaks unless the user explicitly sets them or a real task estimate requires it.
- If Kai says "you've been at it a while," it should be based on actual elapsed work time and session history.

## Integrations

Calendar:

- Google Calendar integration is first-class.
- Kai should be able to create calendars, list events, create events, and reschedule groups of events with spacing.
- When applying calendar mutations, return the concrete changed dates/times in the response so the user can audit the result.

Email:

- Gmail/email history is part of Kai's intended context.
- Kai should help draft and edit replies, summarize threads, and use email-derived priorities for planning.

Music:

- Spotify integration is first-class.
- Search the user's playlists first, then Spotify catalog when the intent clearly requires it.
- Include a Christian lofi instrumental mode.
- Include an Ali Abdaal / study-with-me inspired "lock-in" mode based on functional traits: instrumental, deep focus, brainwave/binaural/40 Hz/gamma/deep-work cues. Do not claim to copy or provide Ali Abdaal's exact copyrighted audio unless verified from an official source.
- Brain.fm-style focus music should be represented through research and user-facing modes, but do not imply Brain.fm itself is wired unless an actual Brain.fm API/license implementation exists.

Voice/Alexa:

- Browser voice should support "Hey Kai" wake listening as much as Web Speech/browser permission rules allow.
- Alexa integration should route intents to Kai APIs where practical.
- Be honest about platform limits: browser wake words and Alexa skills have permission/platform constraints.

Internet:

- Kai is intended to search the internet like Claude/Codex when a request requires current information. Route through the app's web-search API/tooling where implemented.

## Business/Launch Direction

Naomi wants Kai to become a real business, not just a demo.

Keep these docs up to date when relevant:

- `docs/BUSINESS_PLAN.md`
- `docs/PRODUCTIVITY_STATS_RESEARCH.md`
- `docs/AI_MUSIC_AND_SPOTIFY_RESEARCH.md`
- `docs/BRAND_VISUAL_RESEARCH.md`
- SEO, testers, ads, pricing/trial strategy, logo/brand, and onboarding docs/pages as they are added.

Research-before-deciding rule:

- Before doing new web research, check existing Kai docs and any research files already in the repo.
- For current market facts, laws, pricing, platform policies, APIs, ads, SEO, or app-store/platform constraints, browse or consult primary docs because these can change.

## Deployment Preference

Naomi usually wants completed Kai changes pushed to GitHub and deployed to Vercel.

Before finalizing implementation work:

- Run `npm run lint`.
- Run `npm run build`.
- Visually inspect important frontend changes in the browser when possible.
- Commit intentionally.
- Push `main`.
- Deploy to Vercel production when the request includes deployment or clearly implies "ship it".

Known deployment context from prior work:

- GitHub remote: `https://github.com/thegirwhocodes/kai.git`
- Vercel project: `naomi-ivies-projects/kai`
- Public URL: `https://heykai.vercel.app`

## Coding Rules

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

- Follow the existing architecture and style.
- Keep changes scoped and production-minded.
- Use `rg`/`rg --files` for search.
- Use `apply_patch` for manual edits.
- Do not revert user changes unless explicitly asked.
- Be careful with external side effects, but do not over-ask when Naomi has clearly authorized the action.
- Keep the UI clear on mobile and desktop; no overlapping text, no cramped controls, and no decorative clutter.

