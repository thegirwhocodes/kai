import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with Kai Focus, Spotify, Google Calendar, Gmail, and voice.",
};

const items = [
  {
    title: "Spotify will not play",
    body: "Open Spotify on one device first. Spotify playback control requires an active device and usually a Premium account.",
  },
  {
    title: "Hey Kai is not listening",
    body: "Wake listening depends on browser speech support and microphone permission. Keep the app open and use Chrome or Safari first.",
  },
  {
    title: "Calendar or Gmail is missing",
    body: "The connected Google refresh token must include the right Calendar or Gmail scopes.",
  },
];

export default function SupportPage() {
  return (
    <main className="public-shell min-h-screen px-6 py-16 text-[#f6f3ef]">
      <div className="mx-auto max-w-4xl">
        <Nav />
        <section className="py-16">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#b6a6ff]">
            Support
          </p>
          <h1 className="mt-4 text-5xl font-semibold">How can we help?</h1>
          <p className="mt-5 leading-8 text-white/70">
            Kai Focus is early. The fastest path is to describe what you were
            trying to do, which browser you used, and whether Spotify or Google
            was connected.
          </p>
        </section>
        <section className="grid gap-4">
          {items.map((item) => (
            <article
              key={item.title}
              className="public-card rounded-lg p-6"
            >
              <h2 className="text-2xl font-semibold">{item.title}</h2>
              <p className="mt-3 leading-8 text-white/70">{item.body}</p>
            </article>
          ))}
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
