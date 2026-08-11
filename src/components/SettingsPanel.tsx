"use client";

import { useState } from "react";
import { BACKGROUNDS } from "@/lib/backgrounds";
import { notificationsEnabled, unlockAudio } from "@/lib/alerts";
import { getOwnerToken, setOwnerToken } from "@/lib/ownerClient";
import { useAgentStore } from "@/lib/store";
import { SHORTCUTS } from "@/lib/useKeyboard";

export function SettingsPanel() {
  const settings = useAgentStore((s) => s.settings);
  const update = useAgentStore((s) => s.updateSettings);
  const [url, setUrl] = useState("");
  const [notifOn, setNotifOn] = useState(
    typeof window !== "undefined" && notificationsEnabled(),
  );
  const [ownerToken, setOwnerTokenInput] = useState(() => getOwnerToken());
  const [saved, setSaved] = useState(false);

  return (
    <div
      className="max-h-[76vh] w-full overflow-y-auto rounded-lg border border-white/12 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.58)] backdrop-blur-2xl"
      style={{ background: "rgba(18, 15, 31, 0.96)" }}
    >
      {/* Who this room belongs to. */}
      <p className="mb-2 text-xs" style={{ color: "var(--muted)" }}>
        You
      </p>
      <div className="mb-5 flex flex-col gap-2">
        <label className="flex flex-col gap-1.5 rounded-lg border border-white/10 px-3 py-2">
          <span className="text-xs">What Kai calls you</span>
          <input
            value={settings.userName}
            onChange={(e) => update({ userName: e.target.value.slice(0, 40) })}
            placeholder="Your name"
            className="rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-xs outline-none transition focus:border-white/40"
          />
        </label>
        <label className="flex flex-col gap-1.5 rounded-lg border border-white/10 px-3 py-2">
          <span className="text-xs">What matters right now</span>
          <input
            value={settings.priorities}
            onChange={(e) => update({ priorities: e.target.value.slice(0, 200) })}
            placeholder="Thesis, job applications, fitness"
            className="rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-xs outline-none transition focus:border-white/40"
          />
          <span className="text-[11px] leading-4" style={{ color: "var(--muted)" }}>
            Comma separated. Kai weights matching tasks first when it plans.
          </span>
        </label>
      </div>

      <div className="mb-4">
        <h2 className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          Ambient worlds
        </h2>
        <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>
          Calm study rooms, soft light, and legible focus gradients.
        </p>
      </div>

      {/* Background picker */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        {BACKGROUNDS.map((b) => (
          <button
            key={b.id}
            onClick={() => update({ background: b.value })}
            className="group relative overflow-hidden rounded-lg border bg-white/[0.035] p-2 text-left transition hover:bg-white/[0.07]"
            style={{
              borderColor:
                settings.background === b.value
                  ? "var(--focus)"
                  : "rgba(255,255,255,0.15)",
            }}
            title={b.name}
            aria-label={b.name}
          >
            <span
              className="block aspect-video rounded-md bg-cover bg-center shadow-[inset_0_-30px_60px_rgba(0,0,0,0.24)]"
              style={{
                background:
                  b.kind === "gradient"
                    ? b.value
                    : `linear-gradient(rgba(0,0,0,0.04),rgba(0,0,0,0.18)), url("${b.value}") center / cover no-repeat`,
              }}
            />
            <span className="mt-2 flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">{b.name}</span>
              {settings.background === b.value && (
                <span className="rounded-full bg-white/12 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/80">
                  active
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim()) update({ background: url.trim() });
          setUrl("");
        }}
        className="mb-4 flex gap-2"
      >
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste an image URL"
          className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs outline-none transition focus:border-white/40"
        />
        <button
          type="submit"
          className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs transition hover:bg-white/10"
        >
          Set
        </button>
      </form>

      <p className="mb-2 text-xs" style={{ color: "var(--muted)" }}>
        Timing
      </p>
      <div className="mb-4 flex flex-col gap-3">
        <PresetRow
          label="Focus"
          value={Math.round(settings.baselineFocusSec / 60)}
          presets={[15, 25, 30, 45, 50, 60, 90]}
          onChange={(minutes) => update({ baselineFocusSec: minutes * 60 })}
        />
        <PresetRow
          label="Short break"
          value={Math.round(settings.shortBreakSec / 60)}
          presets={[3, 5, 10, 15]}
          onChange={(minutes) => update({ shortBreakSec: minutes * 60 })}
        />
        <PresetRow
          label="Long break"
          value={Math.round(settings.longBreakSec / 60)}
          presets={[10, 15, 20, 30]}
          onChange={(minutes) => update({ longBreakSec: minutes * 60 })}
        />
        <NumberRow
          label="Long break after"
          value={settings.blocksBeforeLongBreak}
          min={2}
          max={8}
          unit="blocks"
          onChange={(blocks) => update({ blocksBeforeLongBreak: blocks })}
        />
        <NumberRow
          label="Autostart delay"
          value={settings.autoStartDelaySec}
          min={0}
          max={60}
          unit="sec"
          onChange={(seconds) => update({ autoStartDelaySec: seconds })}
        />
      </div>

      {/* Adaptive engine — opt-in "let Kai tune it" mode. */}
      <div className="mb-4 flex flex-col gap-2">
        <Row
          label="Adaptive: let Kai tune block lengths"
          on={settings.adaptive}
          onClick={() => update({ adaptive: !settings.adaptive })}
        />
        {settings.adaptive && (
          <div className="flex flex-col gap-2 rounded-lg border border-white/10 p-2">
            <p className="text-[11px] leading-4" style={{ color: "var(--muted)" }}>
              When on, Kai flexes focus length within these bounds from your
              time of day, streak, and focus ratings.
            </p>
            <NumberRow
              label="Minimum focus"
              value={Math.round(settings.minFocusSec / 60)}
              min={3}
              max={Math.round(settings.maxFocusSec / 60)}
              unit="min"
              onChange={(minutes) => update({ minFocusSec: minutes * 60 })}
            />
            <NumberRow
              label="Maximum focus"
              value={Math.round(settings.maxFocusSec / 60)}
              min={Math.round(settings.minFocusSec / 60)}
              max={180}
              unit="min"
              onChange={(minutes) => update({ maxFocusSec: minutes * 60 })}
            />
          </div>
        )}
      </div>

      {/* Toggles */}
      <p className="mb-2 text-xs" style={{ color: "var(--muted)" }}>
        Hands-free
      </p>
      <div className="flex flex-col gap-2">
        <Row
          label="Autopilot: auto-advance focus/breaks"
          on={settings.autoStart}
          onClick={() => update({ autoStart: !settings.autoStart })}
        />
        <Row
          label="Sound: chime on start/end"
          on={settings.soundAlerts}
          onClick={() => update({ soundAlerts: !settings.soundAlerts })}
        />
        <Row
          label="Voice: Kai speaks transitions"
          on={settings.voiceAlerts}
          onClick={() => update({ voiceAlerts: !settings.voiceAlerts })}
        />
        <Row
          label="Hey Kai: listen when app opens"
          on={settings.wakeListening}
          onClick={() => update({ wakeListening: !settings.wakeListening })}
        />
        {!notifOn && (
          <button
            onClick={() => {
              unlockAudio();
              setTimeout(() => setNotifOn(notificationsEnabled()), 800);
            }}
            className="mt-1 rounded-lg border border-white/15 px-3 py-2 text-xs transition hover:bg-white/10"
          >
            Enable notifications
          </button>
        )}
      </div>

      {/* Strip the room back to just the timer. */}
      <p className="mb-2 mt-4 text-xs" style={{ color: "var(--muted)" }}>
        Room
      </p>
      <div className="flex flex-col gap-2">
        <Row
          label="Show the clock"
          on={settings.showClock}
          onClick={() => update({ showClock: !settings.showClock })}
        />
        <Row
          label="Show the greeting"
          on={settings.showGreeting}
          onClick={() => update({ showGreeting: !settings.showGreeting })}
        />
        <Row
          label="Show the quote"
          on={settings.showQuote}
          onClick={() => update({ showQuote: !settings.showQuote })}
        />
      </div>

      {/* Connected accounts belong to whoever deployed this Kai, so they're
          unlocked per-browser with a token rather than served to every visitor. */}
      <details className="mt-4 rounded-lg border border-white/10 px-3 py-2">
        <summary className="cursor-pointer text-xs">Connected accounts</summary>
        <p className="mt-2 text-[11px] leading-4" style={{ color: "var(--muted)" }}>
          Calendar, email, and Spotify run on this deployment&rsquo;s own
          accounts, so they stay locked unless you hold the owner key. The
          timer, focus sounds, tasks, and stats never need it.
        </p>
        <div className="mt-2 flex gap-2">
          <input
            type="password"
            value={ownerToken}
            onChange={(e) => setOwnerTokenInput(e.target.value)}
            placeholder="Owner key"
            className="flex-1 rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-xs outline-none transition focus:border-white/40"
          />
          <button
            type="button"
            onClick={() => {
              setOwnerToken(ownerToken);
              setSaved(true);
              setTimeout(() => setSaved(false), 1500);
            }}
            className="rounded-md border border-white/15 px-2.5 py-1.5 text-xs transition hover:bg-white/10"
          >
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </details>

      <details className="mt-2 rounded-lg border border-white/10 px-3 py-2">
        <summary className="cursor-pointer text-xs">Keyboard shortcuts</summary>
        <ul className="mt-2 flex flex-col gap-1">
          {SHORTCUTS.map((s) => (
            <li
              key={s.keys}
              className="flex items-center justify-between gap-3 text-[11px]"
            >
              <span style={{ color: "var(--muted)" }}>{s.action}</span>
              <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 font-sans">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function PresetRow({
  label,
  value,
  presets,
  onChange,
}: {
  label: string;
  value: number;
  presets: number[];
  onChange: (value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const isPreset = presets.includes(value);
  return (
    <div className="rounded-lg border border-white/10 px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-xs">{label}</span>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {value} min
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setEditing(false);
              onChange(p);
            }}
            className="rounded-full border px-3 py-1 text-xs transition"
            style={{
              borderColor:
                value === p && !editing ? "var(--focus)" : "rgba(255,255,255,0.15)",
              background:
                value === p && !editing ? "rgba(251,122,142,0.15)" : "transparent",
            }}
          >
            {p}
          </button>
        ))}
        {editing || !isPreset ? (
          <input
            type="number"
            min={1}
            max={240}
            autoFocus={editing}
            value={value}
            onChange={(e) => onChange(clamp(Number(e.target.value), 1, 240))}
            className="w-14 rounded-full border border-white/30 bg-white/5 px-2 py-1 text-center text-xs outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-full border border-white/15 px-3 py-1 text-xs transition hover:bg-white/10"
          >
            custom
          </button>
        )}
      </div>
    </div>
  );
}

function NumberRow({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2 text-xs">
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(clamp(Number(e.target.value), min, max))}
          className="w-16 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-right outline-none transition focus:border-white/40"
        />
        <span style={{ color: "var(--muted)" }}>{unit}</span>
      </span>
    </label>
  );
}

function Row({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-left text-xs transition hover:bg-white/5"
    >
      <span>{label}</span>
      <span
        className="ml-2 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition"
        style={{ background: on ? "var(--focus)" : "rgba(255,255,255,0.2)" }}
      >
        <span
          className="h-4 w-4 rounded-full bg-white transition-transform"
          style={{ transform: on ? "translateX(16px)" : "translateX(0)" }}
        />
      </span>
    </button>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}
