import Image from "next/image";
import Link from "next/link";
import WaitlistForm from "@/components/WaitlistForm";

// Everything listed here works on the first click, with no account and no
// connected services. Nothing aspirational belongs in this list.
const features = [
  {
    title: "Lock in for a set stretch",
    body: "Commit to two hours and Kai lays out the whole sequence up front — focus blocks and breaks that fill the time exactly and always end on focus, running hands-free to the finish.",
  },
  {
    title: "Your lengths, not a preset",
    body: "Classic Pomodoro out of the box, with every duration under your control. Turn on adaptive mode and Kai flexes the focus length from your own ratings, streak, and time of day.",
  },
  {
    title: "Focus sounds, no account",
    body: "Rainfall, brown noise, soft static, slow waves, and night wind, generated right in the browser. Layer them, set each level, and they keep playing while you work.",
  },
  {
    title: "A calm room to work in",
    body: "Full-screen study scenes and gradients, a big clock, tasks, and keyboard control for everything. Hide any widget you don't want and it's just you and the timer.",
  },
];

// The stats panel measures these from completed blocks — no estimates.
const stats = [
  "Focus time today",
  "Seven-day chart",
  "Day streak",
  "Blocks finished",
  "Average focus rating",
  "Your best hour",
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
      "Kai Focus is a calm Pomodoro focus room: commit to a stretch of time and it plans the focus blocks and breaks, with layered focus sounds, tasks, voice control, and measured focus stats. Free, no account.",
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
            src="/backgrounds/library-lamps.webp"
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
              A calm room for focused work
            </p>
            <h1 className="text-5xl font-semibold leading-[1.02] sm:text-7xl">
              Commit to the time. Kai holds the shape of it.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/74 sm:text-xl">
              Tell Kai you&apos;re locking in for two hours and it plans the whole
              stretch — focus blocks, real breaks, ending focused — then runs it
              while you work. Focus sounds, tasks, and your stats come with it.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/app" className="btn-primary">
                Start focusing
              </Link>
              <span className="text-sm text-white/55">
                Free, no account, nothing to install
              </span>
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
            What you get on the first click
          </p>
          <h2 className="mt-3 text-3xl font-semibold sm:text-5xl">
            The whole focus room, open and working.
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
              Your focus, measured
            </p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-5xl">
              Numbers you can actually trust.
            </h2>
            <p className="mt-5 leading-8 text-white/68">
              Every figure comes from blocks you finished — nothing modelled,
              nothing padded. Kai will tell you the hour your focus rates
              highest only once it has genuinely seen enough to say so. Your
              history stays in your own browser.
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
          <h2 className="text-3xl font-semibold">Talk to it instead of clicking.</h2>
          <p className="mt-4 max-w-3xl leading-8 text-white/72">
            Say &ldquo;lock in for two hours&rdquo; or &ldquo;take a break&rdquo;
            and Kai does it, then tells you the plan in a sentence. Turn on
            opt-in wake listening and it&apos;s hands-free while the tab is
            open.
          </p>
          <p className="mt-4 max-w-3xl leading-8 text-white/60">
            Connecting your own calendar, inbox, and Spotify so Kai can plan
            around your real day is the next thing being built — that&apos;s
            what the early-access list below is for.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link href="/app" className="btn-primary">
              Try it now
            </Link>
            <a
              href="#waitlist"
              className="text-sm text-white/70 underline-offset-4 transition hover:text-white hover:underline"
            >
              Join early access
            </a>
          </div>
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
            Want Kai to plan around your calendar?
          </h2>
          <p className="mt-4 max-w-xl leading-8 text-white/72">
            The focus room above is free and open right now. Leave your email
            and we&apos;ll tell you the moment you can connect your own calendar,
            inbox, and Spotify.
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
