"use client";

// The theme picker: categories across the top, a thumbnail grid below, and the
// two ways to bring your own — upload a file from this device, or paste a URL.
//
// Uploads are read as a data URL and kept in this browser's storage. They are
// never sent anywhere, which is also why they're size-capped: localStorage is
// a few megabytes, and one oversized photo would evict everything else.

import { useRef, useState } from "react";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  THEMES,
  YOUTUBE_PREFIX,
  parseYouTube,
  type ThemeCategory,
} from "@/lib/backgrounds";
import { useAgentStore } from "@/lib/store";

const MAX_UPLOAD_BYTES = 2_500_000;

export function ThemePicker() {
  const background = useAgentStore((s) => s.settings.background);
  const update = useAgentStore((s) => s.updateSettings);

  const [category, setCategory] = useState<ThemeCategory>("cozy");
  const [url, setUrl] = useState("");
  const [video, setVideo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const themes = THEMES.filter((t) => t.category === category);
  const usingCustom = !THEMES.some((t) => t.value === background);

  const onFile = (file?: File) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file isn't an image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(
        `That image is ${(file.size / 1_000_000).toFixed(1)}MB. Keep it under 2.5MB so it fits in browser storage.`,
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") update({ background: reader.result });
    };
    reader.onerror = () => setError("Couldn't read that file.");
    reader.readAsDataURL(file);
  };

  return (
    <div>
      {/* Categories */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {CATEGORY_ORDER.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className="rounded-full border px-3 py-1 text-xs transition"
            style={{
              borderColor:
                category === c ? "var(--focus)" : "rgba(255,255,255,0.15)",
              background:
                category === c ? "rgba(251,122,142,0.15)" : "transparent",
            }}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {themes.map((t) => {
          const active = background === t.value;
          return (
            <button
              key={t.id}
              onClick={() => update({ background: t.value })}
              className="group relative overflow-hidden rounded-lg border bg-white/[0.035] p-1.5 text-left transition hover:bg-white/[0.08]"
              style={{
                borderColor: active ? "var(--focus)" : "rgba(255,255,255,0.15)",
              }}
              title={t.name}
              aria-label={t.name}
              aria-pressed={active}
            >
              <span
                className="block aspect-video rounded-md bg-cover bg-center shadow-[inset_0_-30px_60px_rgba(0,0,0,0.24)]"
                style={{
                  background:
                    t.kind === "image"
                      ? `linear-gradient(rgba(0,0,0,0.04),rgba(0,0,0,0.18)), url("${t.value}") center / cover no-repeat`
                      : t.value,
                }}
              />
              <span className="mt-1.5 flex items-center justify-between gap-1">
                <span className="truncate text-[11px] font-medium">{t.name}</span>
                {active && (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: "var(--focus)" }}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bring your own */}
      <div className="mt-4 rounded-lg border border-white/10 p-3">
        <p className="text-xs font-medium">Use your own</p>
        <p className="mt-1 text-[11px] leading-4" style={{ color: "var(--muted)" }}>
          Any image from this device, or a link. It stays in this browser.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs transition hover:bg-white/10"
          >
            Upload an image
          </button>
          {usingCustom && (
            <span
              className="self-center text-[11px]"
              style={{ color: "var(--focus)" }}
            >
              Your own image is active
            </span>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const clean = url.trim();
            if (clean) update({ background: clean });
            setUrl("");
          }}
          className="mt-2 flex gap-2"
        >
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="…or paste an image URL"
            className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs outline-none transition focus:border-white/40"
          />
          <button
            type="submit"
            className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs transition hover:bg-white/10"
          >
            Set
          </button>
        </form>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const id = parseYouTube(video);
            if (!id) {
              setError("That doesn't look like a YouTube link.");
              return;
            }
            update({ background: `${YOUTUBE_PREFIX}${id}` });
            setVideo("");
          }}
          className="mt-2 flex gap-2"
        >
          <input
            value={video}
            onChange={(e) => setVideo(e.target.value)}
            placeholder="…or a YouTube link, for a moving scene"
            className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs outline-none transition focus:border-white/40"
          />
          <button
            type="submit"
            className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs transition hover:bg-white/10"
          >
            Play
          </button>
        </form>
        <p className="mt-1.5 text-[10px] leading-4" style={{ color: "var(--muted)" }}>
          Video plays muted and looped. Long lofi or ambient videos work best.
        </p>
        {error && (
          <p className="mt-2 text-[11px]" style={{ color: "var(--focus)" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
