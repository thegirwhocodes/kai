import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Kai Focus privacy notes for calendar, Gmail, Spotify, voice, and productivity data.",
};

export default function PrivacyPage() {
  return (
    <main className="public-shell min-h-screen px-6 py-16 text-[#f6f3ef]">
      <article className="mx-auto max-w-3xl">
        <Nav />
        <h1 className="mt-16 text-5xl font-semibold">Privacy</h1>
        <p className="mt-5 leading-8 text-white/70">
          Kai Focus is being built as a personal productivity assistant. The
          product should use the smallest amount of private data needed to plan
          useful focus sessions.
        </p>
        <Section title="Calendar">
          Kai may use Google Calendar events to understand availability, avoid
          conflicts, and suggest focus blocks. Calendar data should not be sold
          or used for advertising.
        </Section>
        <Section title="Gmail">
          Kai may search Gmail history, fetch email context, and create or edit
          drafts when the user asks. Kai must never send, delete, archive, or
          label email automatically.
        </Section>
        <Section title="Spotify">
          Kai may search saved tracks, playlists, and the public Spotify catalog
          to play requested focus music. Spotify playback requires a connected
          Spotify account and an active device.
        </Section>
        <Section title="Voice">
          Voice features require browser microphone permission. Wake listening is
          opt-in and only runs while the Kai web app is open and the browser
          allows it.
        </Section>
        <Section title="Google API Limited Use">
          Information received from Google APIs should comply with the Google
          API Services User Data Policy, including the Limited Use requirements.
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
      <Link href="/support" className="btn-ghost">
        Support
      </Link>
    </nav>
  );
}
