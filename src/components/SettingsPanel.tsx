"use client";

import { useState } from "react";
import { BACKGROUNDS } from "@/lib/backgrounds";
import { notificationsEnabled, unlockAudio } from "@/lib/alerts";
import { useAgentStore } from "@/lib/store";

export function SettingsPanel() {
  const settings = useAgentStore((s) => s.settings);
  const update = useAgentStore((s) => s.updateSettings);
  const [url, setUrl] = useState("");
  const [notifOn, setNotifOn] = useState(
    typeof window !== "undefined" && notificationsEnabled(),
  );

  return (
    <div className="glass max-h-[70vh] w-80 overflow-y-auto rounded-lg p-4">
      <h2 className="mb-3 text-sm font-medium" style={{ color: "var(--muted)" }}>
        Customize
      </h2>

      {/* Background picker */}
      <p className="mb-2 text-xs" style={{ color: "var(--muted)" }}>
        Background
      </p>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {BACKGROUNDS.map((b) => (
          <button
            key={b.id}
            onClick={() => update({ background: b.value })}
            className="relative aspect-video overflow-hidden rounded-lg border transition"
            style={{
              borderColor:
                settings.background === b.value
                  ? "var(--focus)"
                  : "rgba(255,255,255,0.15)",
              background:
                b.kind === "gradient"
                  ? b.value
                  : `url("${b.value}") center / cover no-repeat`,
            }}
            title={b.name}
            aria-label={b.name}
          />
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
      <div className="mb-4 flex flex-col gap-2">
        <NumberRow
          label="Focus"
          value={Math.round(settings.baselineFocusSec / 60)}
          min={5}
          max={180}
          unit="min"
          onChange={(minutes) => update({ baselineFocusSec: minutes * 60 })}
        />
        <NumberRow
          label="Minimum"
          value={Math.round(settings.minFocusSec / 60)}
          min={3}
          max={Math.round(settings.maxFocusSec / 60)}
          unit="min"
          onChange={(minutes) => update({ minFocusSec: minutes * 60 })}
        />
        <NumberRow
          label="Maximum"
          value={Math.round(settings.maxFocusSec / 60)}
          min={Math.round(settings.minFocusSec / 60)}
          max={180}
          unit="min"
          onChange={(minutes) => update({ maxFocusSec: minutes * 60 })}
        />
        <NumberRow
          label="Short break"
          value={Math.round(settings.shortBreakSec / 60)}
          min={1}
          max={60}
          unit="min"
          onChange={(minutes) => update({ shortBreakSec: minutes * 60 })}
        />
        <NumberRow
          label="Long break"
          value={Math.round(settings.longBreakSec / 60)}
          min={5}
          max={90}
          unit="min"
          onChange={(minutes) => update({ longBreakSec: minutes * 60 })}
        />
        <NumberRow
          label="Long after"
          value={settings.blocksBeforeLongBreak}
          min={2}
          max={8}
          unit="blocks"
          onChange={(blocks) => update({ blocksBeforeLongBreak: blocks })}
        />
        <NumberRow
          label="Autostart"
          value={settings.autoStartDelaySec}
          min={0}
          max={60}
          unit="sec"
          onChange={(seconds) => update({ autoStartDelaySec: seconds })}
        />
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
