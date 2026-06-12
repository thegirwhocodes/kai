import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms",
  description: "Kai Focus terms for the adaptive AI focus coach.",
};

export default function TermsPage() {
  return (
    <main className="public-shell min-h-screen px-6 py-16 text-[#f6f3ef]">
      <article className="mx-auto max-w-3xl">
        <Nav />
        <h1 className="mt-16 text-5xl font-semibold">Terms</h1>
        <p className="mt-5 leading-8 text-white/70">
          Kai Focus is an early product. These plain-language terms describe
          the expected use of the app while the formal legal terms are prepared.
        </p>
        <Section title="Use Kai responsibly">
          Kai helps with focus, planning, drafts, and music. It is not legal,
          medical, financial, or emergency advice.
        </Section>
        <Section title="User control">
          The user remains responsible for reviewing calendar events, email
          drafts, music choices, and any action Kai prepares.
        </Section>
        <Section title="No automatic sending">
          Kai can create and edit Gmail drafts when connected, but it should not
          send messages automatically.
        </Section>
        <Section title="Third-party services">
          Google, Spotify, Anthropic, speech providers, Vercel, and other
          providers may be needed for connected features.
        </Section>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="public-card mt-8 rounded-lg p-6">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-4 leading-8 text-white/70">{children}</p>
    </section>
  );
}

function Nav() {
  return (
    <nav className="flex items-center justify-between">
      <Link href="/" className="text-lg font-semibold">
        Kai Focus
      </Link>
      <Link href="/privacy" className="btn-ghost">
        Privacy
      </Link>
    </nav>
  );
}
