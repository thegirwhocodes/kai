"use client";

import { useState } from "react";

interface PlayResult {
  played?: {
    name: string;
    subtitle?: string;
    kind?: string;
    source?: string;
  };
  notInLibrary?: boolean;
  notFound?: boolean;
  noActiveDevice?: boolean;
  devices?: string[];
  error?: string;
}

export function MusicPanel() {
  const [query, setQuery] = useState("Christian lofi instrumental");
  const [allowCatalog, setAllowCatalog] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const play = async () => {
    const clean = query.trim();
    if (!clean) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/spotify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "play",
          query: clean,
          allowCatalog,
        }),
      });
      const data = (await res.json()) as PlayResult;
      if (res.status === 503 || data.error === "spotify_not_connected") {
        throw new Error("Spotify is not connected yet.");
      }
      if (data.notInLibrary) {
        setMessage("Not in your library or playlists. Turn on Spotify catalog search.");
      } else if (data.notFound) {
        setMessage("I could not find that on Spotify.");
      } else if (data.noActiveDevice) {
        setMessage(
          `Open Spotify on a device first${data.devices?.length ? `: ${data.devices.join(", ")}` : ""}.`,
        );
      } else if (data.played) {
        setMessage(
          `Playing ${data.played.kind ?? "music"} "${data.played.name}"${data.played.subtitle ? ` by ${data.played.subtitle}` : ""}.`,
        );
      } else if (!res.ok) {
        throw new Error(data.error ?? "Spotify failed.");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Spotify failed.");
    } finally {
      setLoading(false);
    }
  };

  const pause = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/spotify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not pause Spotify.");
      setMessage("Paused Spotify.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not pause Spotify.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="glass w-full max-w-md rounded-lg p-4">
      <h2 className="text-sm font-medium" style={{ color: "var(--muted)" }}>
        Focus music
      </h2>
      <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>
        Searches your Spotify library and playlists first. Catalog search is for
        broader playlist requests.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void play();
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Christian lofi instrumental"
          className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none transition focus:border-white/40"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10 disabled:opacity-50"
        >
          Play
        </button>
      </form>
      <label className="mt-3 flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
        <input
          type="checkbox"
          checked={allowCatalog}
          onChange={(e) => setAllowCatalog(e.target.checked)}
        />
        Search wider Spotify catalog when needed
      </label>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void play()}
          disabled={loading}
          className="btn-primary"
        >
          Lock in
        </button>
        <button
          type="button"
          onClick={() => void pause()}
          disabled={loading}
          className="btn-ghost"
        >
          Pause
        </button>
      </div>
      {message && (
        <p className="mt-3 text-sm leading-6" style={{ color: "var(--muted)" }}>
          {message}
        </p>
      )}
    </section>
  );
}
