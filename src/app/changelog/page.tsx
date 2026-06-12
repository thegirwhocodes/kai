import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Kai Focus product updates.",
};

const updates = [
  {
    version: "v0.2",
    date: "June 2026",
    title: "Kai Focus public launch shell",
    body: "Added the landing page, SEO metadata, sitemap, Open Graph image, Spotify intent playback, Music panel, and opt-in Hey Kai listening.",
  },
  {
    version: "v0.1",
    date: "June 2026",
    title: "Adaptive focus room",
    body: "Built the adaptive timer, voice loop, calendar planning, Gmail draft tools, Alexa endpoint, web search, and Flocus-inspired app surface.",
  },
];

export default function ChangelogPage() {
  return (
    <main className="public-shell min-h-screen px-6 py-16 text-[#f6f3ef]">
      <div className="mx-auto max-w-4xl">
        <Nav />
        <h1 className="mt-16 text-5xl font-semibold">Changelog</h1>
        <div className="mt-10 space-y-4">
          {updates.map((update) => (
            <article
              key={update.version}
              className="public-card rounded-lg p-6"
            >
              <p className="text-sm text-white/54">
                {update.version} - {update.date}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">{update.title}</h2>
              <p className="mt-3 leading-8 text-white/70">{update.body}</p>
            </article>
          ))}
        </div>
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
