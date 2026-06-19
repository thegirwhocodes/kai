"use client";

import { useEffect, useRef, useState } from "react";
import { MUSIC_MODES, type MusicMode } from "@/lib/music/modes";
import {
  AMBIENT_PRESETS,
  AmbientEngine,
  type AmbientKind,
} from "@/lib/music/ambient";

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
  const [query, setQuery] = useState(MUSIC_MODES[1].query);
  const [allowCatalog, setAllowCatalog] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Ambient focus sounds — generated client-side, no account or device needed.
  const engineRef = useRef<AmbientEngine | null>(null);
  const [ambient, setAmbient] = useState<AmbientKind | null>(null);
  const [ambientVol, setAmbientVol] = useState(0.4);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const toggleAmbient = (kind: AmbientKind) => {
    if (!engineRef.current) engineRef.current = new AmbientEngine();
    const engine = engineRef.current;
    if (engine.current === kind) {
      engine.stop();
      setAmbient(null);
    } else {
      engine.setVolume(ambientVol);
      engine.start(kind);
      setAmbient(kind);
    }
  };

  const changeAmbientVol = (v: number) => {
    setAmbientVol(v);
    engineRef.current?.setVolume(v);
  };

  const play = async (mode?: MusicMode) => {
    const clean = (mode?.query ?? query).trim();
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
          allowCatalog: mode?.allowCatalog ?? allowCatalog,
        }),
      });
      const data = (await res.json()) as PlayResult;
      if (res.status === 503 || data.error === "spotify_not_connected") {
        setMessage(
          "Spotify isn't connected. Try the ambient focus sounds below — they work with no account.",
        );
        return;
      }
      if (data.notInLibrary) {
        setMessage("Not in your library or playlists. Turn on Spotify catalog search.");
      } else if (data.notFound) {
        setMessage("I could not find that on Spotify.");
      } else if (data.noActiveDevice) {
        setMessage(
          `Open Spotify on a device first${data.devices?.length ? `: ${data.devices.join(", ")}` : ""}. Or use the ambient sounds below.`,
        );
      } else if (data.played) {
        setMessage(
          `Playing ${mode ? `${mode.name}: ` : ""}${data.played.kind ?? "music"} "${data.played.name}"${data.played.subtitle ? ` by ${data.played.subtitle}` : ""}.`,
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium" style={{ color: "var(--muted)" }}>
            Focus music
          </h2>
          <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>
            Spotify library and playlists first. Wider search only when a mode needs it.
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {MUSIC_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => {
              setQuery(mode.query);
              setAllowCatalog(mode.allowCatalog);
              void play(mode);
            }}
            disabled={loading}
            className="rounded-lg border border-white/12 bg-white/[0.045] px-3 py-2 text-left transition hover:bg-white/10 disabled:opacity-50"
          >
            <span className="block text-sm font-medium">{mode.name}</span>
            <span className="mt-0.5 block text-xs leading-5" style={{ color: "var(--muted)" }}>
              {mode.description}
            </span>
          </button>
        ))}
      </div>
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

      <div className="mt-5 border-t border-white/10 pt-4">
        <h3 className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          Ambient sounds
        </h3>
        <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>
          No account needed — quiet textures to study to, like a corner of a calm cafe.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {AMBIENT_PRESETS.map((preset) => {
            const active = ambient === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => toggleAmbient(preset.id)}
                aria-pressed={active}
                title={preset.description}
                className={`rounded-lg border px-2 py-2 text-center text-xs font-medium transition ${
                  active
                    ? "border-[#fb7a8e]/60 bg-[#fb7a8e]/15 text-white"
                    : "border-white/12 bg-white/[0.045] hover:bg-white/10"
                }`}
              >
                {active ? `■ ${preset.name}` : preset.name}
              </button>
            );
          })}
        </div>
        <label className="mt-3 flex items-center gap-3 text-xs" style={{ color: "var(--muted)" }}>
          <span className="shrink-0">Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={ambientVol}
            onChange={(e) => changeAmbientVol(Number(e.target.value))}
            className="w-full"
            aria-label="Ambient volume"
          />
        </label>
      </div>
    </section>
  );
}
