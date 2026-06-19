import Image from "next/image";
import Link from "next/link";
import WaitlistForm from "@/components/WaitlistForm";

const features = [
  {
    title: "Adaptive focus blocks",
    body: "Kai uses your recent focus ratings, breaks, streaks, and calendar room to choose the next session length instead of forcing a generic 25 minute timer.",
  },
  {
    title: "Calendar-aware planning",
    body: "Kai looks at the day ahead and suggests focus blocks that fit before classes, meetings, calls, errands, and deadlines.",
  },
  {
    title: "Inbox and priority signals",
    body: "Gmail context can become one clear admin block or draft, without turning Kai into another inbox.",
  },
  {
    title: "Voice and music controls",
    body: "Talk to Kai, start sessions hands-free, and ask for Spotify playlists or focus music while you stay in the work.",
  },
];

const stats = [
  "Focus time",
  "Energy patterns",
  "Session completion",
  "Calendar fragmentation",
  "Music fit",
  "Weekly trends",
];

const navLinks = [
  { href: "/pricing", label: "Pricing" },
  { href: "/testers", label: "Testers" },
  { href: "/support", label: "Support" },
];

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Kai Focus",
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web",
    url: "https://heykai.vercel.app",
    description:
      "Kai Focus is an adaptive AI focus coach for Pomodoro sessions, calendar-aware planning, inbox signals, voice commands, Spotify focus music, and productivity trends.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <main className="min-h-screen bg-[#120f1f] text-[#f6f3ef]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-20">
          <Image
            src="/backgrounds/library-lamps.jpg"
            alt=""
            fill
            preload
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(18,15,31,0.94),rgba(18,15,31,0.72),rgba(18,15,31,0.4)),linear-gradient(180deg,rgba(18,15,31,0.35),rgba(18,15,31,0.96))]" />

        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <Link href="/" className="flex items-center gap-3" aria-label="Kai Focus home">
            <Image src="/logo.svg" alt="" width={42} height={42} preload />
            <span className="text-xl font-semibold tracking-normal">Kai Focus</span>
          </Link>
          <div className="flex items-center gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hidden rounded-lg px-3 py-2 text-sm text-white/72 transition hover:bg-white/10 hover:text-white md:inline-flex"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/app" className="btn-ghost hidden sm:inline-flex">
              Open app
            </Link>
            <Link href="/app" className="btn-primary">
              Start focusing
            </Link>
          </div>
        </nav>

        <div className="mx-auto flex min-h-[calc(100vh-5.8rem)] w-full max-w-6xl items-center px-6 pb-20 pt-10">
          <div className="max-w-3xl">
            <p className="mb-5 text-sm font-medium uppercase tracking-[0.16em] text-[#ffd9c2]">
              AI focus coach for the right next block
            </p>
            <h1 className="text-5xl font-semibold leading-[1.02] sm:text-7xl">
              Kai plans your next focus session around your real life.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/74 sm:text-xl">
              Kai Focus is a calm Pomodoro-style workspace with voice, adaptive
              timing, Google Calendar planning, Gmail signals, Spotify focus music,
              and productivity trends that learn when you actually lock in.
            </p>
            <div className="mt-9">
              <WaitlistForm variant="hero" />
            </div>
            <p className="mt-5 text-sm text-white/55">
              <a
                href="#business"
                className="underline-offset-4 transition hover:text-white/80 hover:underline"
              >
                See what Kai does ↓
              </a>
            </p>
          </div>
        </div>
      </section>

      <section id="business" className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#fb7a8e]">
            More than a timer
          </p>
          <h2 className="mt-3 text-3xl font-semibold sm:text-5xl">
            A focus room with a personal operations layer.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-lg border border-white/12 bg-white/[0.055] p-6"
            >
              <h3 className="text-xl font-semibold">{feature.title}</h3>
              <p className="mt-3 leading-7 text-white/68">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.035]">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#b6a6ff]">
              Kai Trends
            </p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-5xl">
              Learn when your focus actually works.
            </h2>
            <p className="mt-5 leading-8 text-white/68">
              Kai Trends is designed to connect sessions, calendar pressure,
              energy ratings, interruptions, and music into practical coaching:
              what helped, what hurt, and what to try next.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {stats.map((item) => (
              <div
                key={item}
                className="rounded-lg border border-white/12 bg-[#1a1530]/75 p-4 text-sm font-medium text-white/82"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="rounded-lg border border-white/12 bg-[linear-gradient(135deg,rgba(255,177,153,0.14),rgba(182,166,255,0.13))] p-8 sm:p-10">
          <h2 className="text-3xl font-semibold">Say “Hey Kai” and keep working.</h2>
          <p className="mt-4 max-w-3xl leading-8 text-white/72">
            Turn on opt-in wake listening while Kai is open, then ask for a focus
            block, a calendar check, or Spotify music like “play Christian lofi
            instrumental from Spotify.” Kai searches your library first and can
            use the wider Spotify catalog when you ask for it.
          </p>
          <a href="#waitlist" className="btn-primary mt-7 inline-flex">
            Get early access
          </a>
        </div>
      </section>

      <section
        id="waitlist"
        className="mx-auto w-full max-w-6xl scroll-mt-24 px-6 pb-24 pt-4"
      >
        <div className="flex flex-col items-center rounded-3xl border border-white/12 bg-[linear-gradient(135deg,rgba(182,166,255,0.16),rgba(255,177,153,0.14))] px-6 py-14 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#ffd9c2]">
            Early access
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold sm:text-4xl">
            Be first to focus with Kai.
          </h2>
          <p className="mt-4 max-w-xl leading-8 text-white/72">
            Kai is opening to a small first group. Join the waitlist and we&apos;ll
            email you the moment you can connect your calendar and start.
          </p>
          <div className="mt-8 flex w-full justify-center">
            <WaitlistForm variant="band" />
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 text-sm text-white/58 sm:flex-row sm:items-center sm:justify-between">
          <p>Kai Focus - adaptive focus coach.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/pricing">Pricing</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/changelog">Changelog</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
