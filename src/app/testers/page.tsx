import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Founding Testers",
  description:
    "Become a Kai Focus founding tester and help shape the adaptive AI focus coach.",
};

const cohorts = [
  "Students preparing for exams or long projects",
  "Founders and builders with scattered calendars",
  "Remote workers with too many meetings",
  "People who use music to get into focus",
  "ADHD and productivity experimenters",
];

export default function TestersPage() {
  return (
    <main className="public-shell min-h-screen px-6 py-16 text-[#f6f3ef]">
      <div className="mx-auto max-w-4xl">
        <Nav />
        <section className="py-16">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#fb7a8e]">
            Founding testers
          </p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight">
            Help Kai learn what real focus looks like.
          </h1>
          <p className="mt-5 leading-8 text-white/70">
            The first Kai Focus testers get free founding access in exchange for
            honest feedback. Demo mode should be used before connecting private
            inbox or calendar data.
          </p>
        </section>
        <section className="public-card rounded-lg p-6">
          <h2 className="text-2xl font-semibold">Who we want to test with</h2>
          <ul className="mt-5 space-y-3 text-white/78">
            {cohorts.map((cohort) => (
              <li key={cohort}>{cohort}</li>
            ))}
          </ul>
        </section>
        <section className="public-card mt-6 rounded-lg p-6">
          <h2 className="text-2xl font-semibold">What testers do</h2>
          <p className="mt-4 leading-8 text-white/70">
            Complete at least three focus blocks, try one calendar-aware
            recommendation, test one music request, and send a short feedback
            form. Optional interviews help shape Kai Trends.
          </p>
        </section>
      </div>
    </main>
  );
}

function Nav() {
  return (
    <nav className="flex items-center justify-between">
      <Link href="/" className="text-lg font-semibold">
        Kai Focus
      </Link>
      <Link href="/app" className="btn-ghost">
        Open app
      </Link>
    </nav>
  );
}
