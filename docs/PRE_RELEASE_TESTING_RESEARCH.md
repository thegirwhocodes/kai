# Pre-Release Testing & Validation Research

How real software teams and founders test a product before a full public launch — the
engineering-QA side and the product-validation side — synthesized and mapped to Kai's
actual state. Research window 2024–2026, weighted to primary sources (URLs at the end).

**The one-sentence version:** two independent questions must both pass before you go
wide — *"is it correct and stable?"* (engineering QA) and *"do people actually want it
and will they keep using / paying for it?"* (founder validation). Teams that only do
one ship a bug-free product nobody wants, or a beloved demo that falls over on launch day.

---

## Mental model: two funnels, both graduated

Nobody "tests at the end." Both disciplines run a cheap-to-expensive funnel where each
stage fails faster and cheaper than the next.

- **Engineering (shift-left):** static checks (ms) → unit (ms) → integration (s) → E2E
  (min) → preview/staging smoke → canary/percentage rollout → full release, with
  production observability catching whatever leaked. Cheap tests are the default;
  expensive ones are reserved for the flows that most need them. (Fowler's test pyramid.)
- **Founder (validate demand before build):** interviews → landing/fake-door demand test
  → concierge/Wizard-of-Oz → usability test → closed beta → PMF measurement → staged
  public launch. The unit of progress is *validated learning*, not lines of code.

Marty Cagan's **Four Big Risks** frame the founder side: **Value** (will they use/buy
it?), **Usability** (can they figure it out?), **Feasibility** (can we build it?),
**Business Viability** (legal/finance/brand). Founders most often skip **Value** — and
that's what kills products.

---

# Part A — How coders test (engineering QA)

### 1. The testing pyramid
A balanced portfolio: many fast unit tests, fewer integration tests, a handful of slow
end-to-end tests. Avoid the inverted "ice-cream cone" (mostly slow UI tests).

| Layer | Catches | Speed | Rough share | Tools |
|---|---|---|---|---|
| **Unit** | logic in one function/component, collaborators mocked | ms | ~70% | Vitest, Jest, React Testing Library |
| **Integration** | one integration point (component↔API/DB/route) | s | ~20% | Vitest + MSW, Supertest |
| **E2E** | full user journeys through real UI+API+data | min | ~10% | Playwright, Cypress |

React rule (Kent C. Dodds): *"The more your tests resemble the way your software is
used, the more confidence they give."* Test behavior (query the DOM by role/label/text),
**not** implementation details (state vars, handler names).

### 2. Regression, snapshot, contract testing
- **Regression** = re-run the suite so fixed bugs can't silently return. It's emergent:
  every bug you fix should gain a test. (Essential.)
- **Snapshot** = serialize rendered output, fail on change. Keep snapshots small
  (~20–30 lines) and human-verifiable, or they get rubber-stamped and rot.
- **Contract testing** (Pact / consumer-driven contracts) = catch breaking API changes
  across services. Overkill for one codebase; revisit if Kai grows separate mobile/Alexa
  clients hitting the same API.

### 3. CI/CD quality gates
Checks that must pass before code merges, enforced by **branch protection / required
status checks**. The standard gate on every PR: **typecheck → lint → unit/integration
tests → build** (+ optionally E2E on the preview URL and a coverage report). Gotcha:
branch protection matches the exact job-name string; renamed/nested workflows can
silently un-gate a check.

### 4. Test coverage — a proxy, not a goal
Google's median is ~78%; 75% is "commendable." Mature orgs sit 70–85% line coverage.
Past ~85%, cost rises sharply for shrinking benefit and 100% forces brittle tests.
Better: **risk-tiered** — auth/payments/data-integrity ≥90%, UI/glue 60–70%. Coverage
tells you what *ran*, never whether the assertions were meaningful.

### 5. Static analysis / type safety / security scanning
- **TypeScript `strict` + `tsc --noEmit`** — cheapest, highest-leverage "test."
- **ESLint + Prettier** — consistency + a class of bug prevention.
- **Dependabot** (auto-PRs for vulnerable deps), **secret scanning + push protection**
  (block committed credentials — free on GitHub), **CodeQL** SAST (triage; ~34% false
  positives). Critical for an app holding Google/Spotify OAuth tokens.

### 6. Pre-production environments
- **Preview / ephemeral environments** — per-PR, auto-deployed, unique URL. **Vercel
  does this natively** on every push; production-like infra catches deploy/config bugs
  localhost can't. Largely replaces a classic long-lived staging env for frontend work.
- **Smoke tests** — a tiny "is it fundamentally alive?" suite (home loads, auth works,
  timer starts) run against the deployed URL before promoting to production.

### 7. Progressive delivery
Decouple *deploy* from *release*; expose changes gradually and roll back instantly.
**Feature flags** (ship dark, toggle per %/segment), **canary** (1→5→20→100% while
watching error/latency), **blue-green** (two envs, flip traffic), **dark launch** (run
new code without exposing output), **instant rollback**. ~89% of eng orgs use feature
flags. Tools: LaunchDarkly, Flagsmith, PostHog flags; **Vercel Instant Rollback** +
**Rolling Releases**.

### 8. Load / performance / accessibility
- **Load/stress:** k6 (find the breaking point) — matters before traffic spikes.
- **Frontend perf:** Lighthouse / Lighthouse CI on **Core Web Vitals** (LCP, INP, CLS;
  INP replaced FID in March 2024). Directly affects SEO and the "calm, fast first load" bar.
- **Accessibility:** `@axe-core/playwright` / `jest-axe` catch ~up to 50% of WCAG issues
  (only ~30% of criteria are machine-testable); the rest need a manual keyboard/screen-
  reader pass. Target WCAG 2.2 AA.

### 9. Observability = the release safety net
You can't test everything pre-release, so instrument production to *see* problems fast.
**Sentry** (exceptions + stack traces + release health / crash-free sessions, source maps
for Next.js), structured logging/tracing (OpenTelemetry), **SLOs/error budgets** (alert
on burn, not infra noise), alerting you'll actually see. For a solo founder without a QA
team, **production telemetry IS your QA.**

### 10. Manual/exploratory testing + a go/no-go checklist
Automated tests confirm *known* behavior; a human poking with intent finds the
unknown-unknowns. A **release checklist / go-no-go** is the final gate: all CI green,
preview smoke-tested, migrations tested **and reversible**, flags/config reviewed,
monitoring + alerts live, **rollback plan defined**, an owner watching post-deploy.

---

# Part B — How founders validate (product/market)

### 1. Lean Startup & the MVP
The MVP is the *smallest* artifact that starts the learning loop — a test of a
hypothesis, not a small version of the finished product. Write the riskiest assumption
as a falsifiable hypothesis, pick the metric + threshold **before** building, build the
cheapest thing that produces it, and decide the pivot/persevere rule in advance.

### 2. Validate demand BEFORE building
- **Customer interviews — The Mom Test:** talk about *their* life, ask about *specific
  past* behavior (not hypotheticals), talk less. Ignore compliments, hypotheticals, and
  wishlist statements. Good signal = past behavior and prior spending. ~15–30 before building.
- **Landing-page / waitlist / smoke test:** a page + one CTA; conversion = demand.
  Drive ≥100 (ideally 300+) targeted visitors. On a genuine *purchase-intent* CTA (fake
  checkout), ~10–15% is strong; under 5% means refine or pivot.
- **Fake-door test:** a real-looking entry point for a feature that doesn't exist yet →
  "coming soon" + email capture. Measures per-feature demand before you build expensive
  AI features.
- **Concierge / Wizard-of-Oz:** deliver the outcome *manually* (concierge, in the open)
  or behind a curtain (WoZ, users think it's automated). Validates the value of the
  *automated* solution at near-zero build cost. **Highest-leverage pre-build step.**

### 3. Usability testing
Watch real users attempt real tasks. **Moderated** (live, probes "why") vs
**unmoderated** (scales, cheaper); **think-aloud** reveals *why*, not just *what*.
Nielsen's rule: **5 users surface ~85% of usability problems** in qualitative testing —
run more small tests across iterations, ~5 per distinct segment (quantitative
benchmarking needs ~40). Tools: Maze, UserTesting, Hotjar.

### 4. Alpha vs beta
Alpha (internal) → **closed/private beta** (invite-only, curated, qualitative) → **open
beta** (public, stress infra). The modern model is **beta cohorts gated by feature flags
with kill switches**. Whatever the stage: *limit the audience, instrument everything* —
activation, funnel drop-off, retention cohorts, API failure rates (token expiry / rate
limits), latency, an in-app feedback channel.

### 5. Dogfooding
Use your own product daily. Closes the empathy gap, surfaces friction before users hit
it, makes you a credible spokesperson. If you won't use it daily, that's your first
(free) validation failure.

### 6. Measuring product-market fit
- **Sean Ellis 40% test:** survey engaged users *"How would you feel if you could no
  longer use this?"* → **≥40% "very disappointed" ⇒ PMF.** 25–40% = close; <25% = keep iterating.
- **Superhuman's PMF engine** (operationalizes it, 22%→58% in 3 quarters): segment to
  the "very disappointed" and define your High-Expectation Customer; disregard the
  not-disappointed; a **50/50 roadmap** (double down on what fans love + remove blockers
  for fence-sitters); re-survey continuously and make "very disappointed %" the primary OKR.
- **Retention cohorts — the behavioral truth:** the strongest PMF signal is a **retention
  curve that flattens** (reaches an asymptote) rather than decaying to zero. D7 is the
  earliest *reliable* leading indicator (D1 is gameable). Strong D30 ≈ 25%+ consumer /
  35%+ B2B; a true *daily* app looks ~60/30/15 for D1/D7/D30.
- **Activation** (% reaching first value) — fix this first; it's where most users leak.
- **NPS** is a sentiment trend, **not** a PMF substitute.

### 7. Analytics & instrumentation
Event tracking → funnels → activation → retention + session replay to *see* confusion.
**PostHog** (analytics + replay + flags + experiments + surveys, generous free tier) is
the best solo pick — one tool instead of stitching four. Define a small deliberate event
taxonomy from day one and one explicit **activation event**.

### 8. A/B testing (the solo caveat)
Randomized variant comparison at 95% confidence — but **early-stage traffic is usually
too thin** for trustworthy tests (pricing tests need ~250–500 visitors/variant over
30–60 days). Until then, prefer sequential qualitative iteration (ship → watch replays →
interview). Reserve real A/B tests for high-traffic surfaces (landing, pricing) later.

### 9. Staged launch vs big-bang
YC: **launch early, even if mediocre** — until you launch you're designing for
hypothetical users. Then **do things that don't scale** (hand-hold early users). Sequence
a soft/staged launch (waitlist → closed beta → wider), not one big splash on an
unvalidated product. For students, niche communities (subreddits, Discords, campus
channels) often convert 3–8× better than a Product Hunt splash.

### 10. Pricing / willingness-to-pay
**Van Westendorp** (4 questions: too cheap / cheap / expensive / too expensive) yields an
acceptable price corridor; triangulate with a **fake pricing page** (real click-intent)
and then a real paywall in beta. Students are price-sensitive — WTP validation is not
optional.

### 11. Legal / trust readiness — Kai's gating item
Baseline: **Privacy Policy + Terms** (Kai has these), data-handling basis, breach plan.
The blocker: Kai requests **Google sensitive/restricted OAuth scopes** (Calendar, Gmail).
- **Sensitive scopes** → require **OAuth app verification** (brand review, verified
  domain, homepage, privacy policy, demo video).
- **Restricted scopes** (full Gmail content) → verification **plus an annual independent
  CASA security assessment** if you store/transmit that data.
- **Until verified, the app is capped at ~100 users** and shows an **"unverified app"
  warning** on consent — a real conversion/trust killer.
- Review takes weeks–months. **Start early; minimize scopes** (e.g. `calendar.events`,
  Gmail metadata/send rather than full-content read) to avoid CASA entirely.

### 12. Common founder mistakes
Not talking to users / "validating while building" (confirmation bias); **vanity
metrics** (signups, page views — a growing waitlist is *not* PMF); launching too late
(perfectionism) or too early/big-bang on the wrong thing; skipping the Value & Viability
risks while over-polishing the UI.

---

# Kai: where it stands & what to do next

### Current state (2026-07)
- ✅ Automated tests exist now: **22 unit tests** over the timing engine + lock-in planner
  + settings migration (`npm test`).
- ✅ `tsc`/`next build` + ESLint pass; on GitHub; auto-preview + prod deploys on Vercel.
- ✅ Privacy + Terms pages; early-access waitlist; classic-Pomodoro timing that's
  explainable (per AGENTS.md).
- ❌ No branch protection / required checks on `main`.
- ❌ No E2E/smoke tests; no Sentry; no product analytics; no feature-flag mechanism.
- ❌ Google OAuth verification status unconfirmed — **the long-pole launch blocker.**
- ⚠️ Several connectors (Gmail/Calendar/Drive) still need OAuth authorization to function.

### Right-sized engineering stack (solo)
**Do now (essential, cheap):** branch-protect `main` requiring typecheck + lint +
`vitest run` + build · keep unit-testing the correctness core (timing math, calendar
reschedule/spacing, AI tool-output parsing) · 3–5 Playwright smoke tests against the
Vercel preview URL · turn on Dependabot + secret scanning + push protection · audit API
routes against the OWASP Top 10 (authz on every calendar/email route; no tokens client-
side or in logs) · **wire Sentry** (frontend + API, release-tagged) + Vercel
Analytics/Speed Insights · a one-page go/no-go checklist · Vercel Instant Rollback as the
rollback plan.
**Worth it later:** risk-tiered coverage reporting (not a hard gate) · Lighthouse CI on
main pages · one axe-core scan + a manual keyboard pass · a simple feature flag to ship dark.
**Skip for now (overkill solo):** contract testing, dedicated staging, canary/blue-green
infra, k6-at-scale, chaos engineering, formal SLO tooling, third-party pen test.

### Founder validation priority stack (in order)
1. **Start Google OAuth verification; minimize scopes to dodge CASA** — the only item
   with a weeks-long external dependency; gates public launch.
2. **Dogfood Kai daily** — build Kai *using* Kai. Free, instant friction feedback.
3. **Concierge / Wizard-of-Oz** hand-planned pomodoros for 5–10 students — validates the
   risky core (AI planning from real calendar/email signals) before over-building it.
4. **10–20 Mom Test interviews** + a fake pricing page + Van Westendorp — truth on demand
   and willingness-to-pay for price-sensitive students.
5. **Instrument with PostHog**; define the one activation event (= completed a first full
   pomodoro on a Kai-suggested plan). Nothing below is measurable without this.
6. **5-user moderated usability tests on the OAuth-consent onboarding** — the biggest
   likely drop-off.
7. **Closed beta, 20–50 students, feature-flagged** — qualitative depth; stays under the
   100-user unverified cap.
8. **Run the Sean Ellis 40% survey + weekly cohort retention continuously** — the real
   go/no-go for widening.
9. **Staged public launch** (student communities + Product Hunt) *only after* verification
   clears and the retention curve flattens.
10. **A/B test** landing + pricing *after* traffic supports significance.

**The trap to avoid for Kai specifically:** polishing the Flocus-grade UI and celebrating
waitlist signups before proving students will connect their Google data and *follow Kai's
AI plans daily*. PMF = the retention curve flattening + ≥40% "very disappointed" — not signups.

---

## Sources
**Engineering:** Fowler test pyramid (martinfowler.com/articles/practical-test-pyramid.html) ·
Google Testing Blog test sizes (testing.googleblog.com/2010/12/test-sizes.html) · SWE at
Google ch.14 (abseil.io/resources/swe-book/html/ch14.html) · Kent C. Dodds testing-
implementation-details & common-mistakes-rtl (kentcdodds.com) · Playwright a11y
(playwright.dev/docs/accessibility-testing) · Microsoft Eng Playbook branching/CI-CD ·
LaunchDarkly progressive delivery · Code Coverage at Google (ResearchGate 334259697) ·
Sonar coverage · GitHub Advanced Security (systemshardening.com) · Grafana k6 vs
Lighthouse · Vercel Academy preview deployments · Sentry guide 2025
(baytechconsulting.com) · Cortex release checklist · DX production-readiness checklist.
**Founder:** Lean Startup principles (theleanstartup.com) · SVPG four-big-risks · The Mom
Test (momtestbook.com) · NN/g 5-users & how-many-test-users · Maze moderated-vs-
unmoderated · startups.com beta testing · LaunchDarkly beta programs · dogfooding
(Wikipedia; maddevs.io) · Sean Ellis score (learningloop.io) · Superhuman PMF engine
(review.firstround.com) · Lenny retention (lennysnewsletter.com) · Sequoia retention
(articles.sequoiacap.com) · PostHog vs Mixpanel · Statsig A/B sample size · Van Westendorp
(conjointly.com; getmonetizely.com) · YC essential startup advice · Indie Hackers launch
guide · Google OAuth sensitive/restricted scope verification (developers.google.com) ·
Sprinto GDPR-for-SaaS · vanity-metrics (epirus.vc).

*Exact stats above (e.g. "89% use flags", axe %'s, retention benchmarks) come partly from
secondary summaries — treat as directional and verify the primary report before quoting
in marketing/business docs.*
