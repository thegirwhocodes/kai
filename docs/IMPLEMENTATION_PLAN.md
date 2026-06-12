# Kai Focus Implementation Plan

## Phase 0: Done in this pass

- Root `/` is now a crawlable Kai Focus landing page.
- Full app moved to `/app`.
- Metadata, Open Graph, Twitter card, robots, sitemap, manifest, and JSON-LD were added.
- Logo changed to an ownable K-shaped focus dial.
- Spotify upgraded from saved-track search to user playlist + saved track + public playlist/track/album/artist search.
- Voice panel now exposes opt-in "Hey Kai" wake listening.

## Phase 1: Public business shell

- Add `/pricing`.
- Add `/privacy`, `/terms`, `/support`, `/changelog`.
- Add Google OAuth Limited Use language before broader Gmail testing.
- Add domain and canonical URL after buying a real domain.
- Add Search Console and submit `/sitemap.xml`.
- Add event analytics: signup, first focus, first rating, first recommendation, first Spotify play, second-day return, seventh-day return.

## Phase 2: Kai Trends MVP

Data model:

- Persist blocks server-side, not only Zustand local storage.
- Store start, end, planned duration, actual duration, status, task, source, focus rating, interruptions, pause count, music item, calendar pressure, and recommendation source.
- Store daily rollups for fast charts.

Dashboard:

- Today, Week, Month.
- Focus time, completion rate, sessions, tasks completed, break balance.
- Energy heatmap by hour/day with confidence labels.
- Calendar fragmentation score.
- Music fit: focus rating/completion by music mode or Spotify item.
- Weekly insight cards.

AI layer:

- "What changed this week?"
- "When should I do deep work tomorrow?"
- "What kind of block should I do now?"
- "Which music helped me focus?"

## Phase 3: Music

- Add explicit Spotify connection UI.
- Add device picker when no active Spotify device is found.
- Add "focus music presets": Christian lofi, instrumental study, ambient, worship instrumental, piano, rain, brown noise.
- Track which music was playing during each focus block.
- Build a safe "Kai Lock-In Radio" plan with licensed music or commercial-safe generated audio.

## Phase 4: Testing and onboarding

- Demo mode with fake calendar/email so testers can try without privacy risk.
- Feedback widget after session completion.
- Tester cohort tags: student, founder, ADHD/productivity, remote worker, India tester, US student.
- Interview scripts and survey forms.
- Test whether Trends trial should start at signup or after the user completes 3 focus blocks.

## Phase 5: Paid launch

- Stripe Checkout and customer portal.
- Free, Plus, and Founding plans.
- Trial gating: Kai Trends, long history, weekly reports, advanced calendar/email planning, unlimited voice.
- OAuth verification for Google scopes.
- Privacy/security page.
- Trademark filing only after clearance.

## Risks

- "Kai" is crowded as a brand. Use "Kai Focus."
- Gmail scopes may require Google verification.
- Spotify playback requires Premium and an active device.
- Browser wake listening cannot be guaranteed if the app is closed or the browser suspends the tab.
- AI music licensing is the hardest part. Do not ship generated/commercial audio casually.
