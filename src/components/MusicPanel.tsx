"use client";

// Focus sounds. The generated ambient mixer comes first because it works for
// everyone with no account, no device, and no network. Spotify sits below it
// and is honest about needing a connected account.

import { useEffect, useState } from "react";
import { MUSIC_MODES, type MusicMode } from "@/lib/music/modes";
import { AMBIENT_PRESETS, ambientMixer } from "@/lib/music/ambient";
import { useAgentStore } from "@/lib/store";
import { kaiFetch } from "@/lib/ownerClient";

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

const DEFAULT_LEVEL = 0.4;

export function MusicPanel() {
  const levels = useAgentStore((s) => s.settings.ambientLevels);
  const update = useAgentStore((s) => s.updateSettings);

  const [query, setQuery] = useState(MUSIC_MODES[1].query);
  const [allowCatalog, setAllowCatalog] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Opening the panel is itself a user gesture, so the audio context can
  // resume here and pick the saved mix back up.
  useEffect(() => {
    ambientMixer.apply(levels);
    // Only on mount: later changes go through setLevel, which drives the mixer
    // directly and would otherwise re-apply every slider tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLevel = (id: string, level: number) => {
    const next = { ...levels };
    if (level <= 0) delete next[id];
    else next[id] = level;
    update({ ambientLevels: next });
    ambientMixer.set(id as never, level);
  };

  const stopAll = () => {
    ambientMixer.stopAll();
    update({ ambientLevels: {} });
  };

  const activeCount = Object.keys(levels).length;

  const play = async (mode?: MusicMode) => {
    const clean = (mode?.query ?? query).trim();
    if (!clean) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await kaiFetch("/api/spotify", {
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
          "Spotify isn't connected. The focus sounds above work with no account.",
        );
        return;
      }
      if (data.notInLibrary) {
        setMessage("Not in your library or playlists. Turn on Spotify catalog search.");
      } else if (data.notFound) {
        setMessage("I could not find that on Spotify.");
      } else if (data.noActiveDevice) {
        setMessage(
          `Open Spotify on a device first${data.devices?.length ? `: ${data.devices.join(", ")}` : ""}. Or use the focus sounds above.`,
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
      const res = await kaiFetch("/api/spotify", {
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
    <section className="glass max-h-[76vh] w-full max-w-md overflow-y-auto rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium" style={{ color: "var(--muted)" }}>
            Focus sounds
          </h2>
          <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>
            Layer as many as you like. Generated in your browser — no account,
            works offline.
          </p>
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={stopAll}
            className="shrink-0 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs transition hover:bg-white/10"
          >
            Stop all
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {AMBIENT_PRESETS.map((preset) => {
          const level = levels[preset.id] ?? 0;
          const on = level > 0;
          return (
            <div
              key={preset.id}
              className="rounded-lg border px-3 py-2 transition"
              style={{
                borderColor: on ? "rgba(251,122,142,0.5)" : "rgba(255,255,255,0.12)",
                background: on ? "rgba(251,122,142,0.1)" : "rgba(255,255,255,0.045)",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setLevel(preset.id, on ? 0 : DEFAULT_LEVEL)}
                  aria-pressed={on}
                  title={preset.description}
                  className="flex-1 text-left"
                >
                  <span className="block text-sm font-medium">
                    {on ? "■" : "▶"} {preset.name}
                  </span>
                  <span
                    className="mt-0.5 block text-[11px] leading-4"
                    style={{ color: "var(--muted)" }}
                  >
                    {preset.description}
                  </span>
                </button>
              </div>
              {on && (
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.01}
                  value={level}
                  onChange={(e) => setLevel(preset.id, Number(e.target.value))}
                  className="mt-2 w-full"
                  aria-label={`${preset.name} volume`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <h3 className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          Spotify
        </h3>
        <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>
          Plays through a connected Spotify account, your own library and
          playlists first. Needs Premium and an open device.
        </p>
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
              <span
                className="mt-0.5 block text-xs leading-5"
                style={{ color: "var(--muted)" }}
              >
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
        <label
          className="mt-3 flex items-center gap-2 text-xs"
          style={{ color: "var(--muted)" }}
        >
          <input
            type="checkbox"
            checked={allowCatalog}
            onChange={(e) => setAllowCatalog(e.target.checked)}
          />
          Search wider Spotify catalog when needed
        </label>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => void pause()}
            disabled={loading}
            className="btn-ghost"
          >
            Pause Spotify
          </button>
        </div>
        {message && (
          <p className="mt-3 text-sm leading-6" style={{ color: "var(--muted)" }}>
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
