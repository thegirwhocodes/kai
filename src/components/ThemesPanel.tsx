"use client";

// Themes as a first-class panel on the dock. This is the control people reach
// for most in a focus app, so it gets one click from the room rather than
// living at the top of a long settings list.

import { ThemePicker } from "@/components/ThemePicker";
import { useAgentStore } from "@/lib/store";

export function ThemesPanel() {
  const settings = useAgentStore((s) => s.settings);
  const update = useAgentStore((s) => s.updateSettings);

  return (
    <div
      className="max-h-[76vh] w-full overflow-y-auto rounded-lg border border-white/12 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.58)] backdrop-blur-2xl"
      style={{ background: "rgba(18, 15, 31, 0.96)" }}
    >
      <h2 className="text-sm font-medium" style={{ color: "var(--muted)" }}>
        Themes
      </h2>
      <p className="mb-3 mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>
        Cozy rooms, sunsets, skies, study scenes, and animated gradients.
      </p>

      <ThemePicker />

      {/* The scenes are portrait, so on a wide screen "fill" crops hard and
          "fit" leaves blurred margins. Neither is right for everyone. */}
      <p className="mb-2 mt-5 text-xs" style={{ color: "var(--muted)" }}>
        How photos sit on screen
      </p>
      <div className="flex gap-2">
        {(
          [
            { id: "fill", label: "Fill screen", hint: "Covers everything, crops the edges" },
            { id: "fit", label: "Whole image", hint: "Shows all of it, blurs the margins" },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => update({ backgroundFit: option.id })}
            aria-pressed={settings.backgroundFit === option.id}
            className="flex-1 rounded-lg border px-3 py-2 text-left transition"
            style={{
              borderColor:
                settings.backgroundFit === option.id
                  ? "var(--focus)"
                  : "rgba(255,255,255,0.15)",
              background:
                settings.backgroundFit === option.id
                  ? "rgba(251,122,142,0.12)"
                  : "transparent",
            }}
          >
            <span className="block text-xs font-medium">{option.label}</span>
            <span
              className="mt-0.5 block text-[10px] leading-3"
              style={{ color: "var(--muted)" }}
            >
              {option.hint}
            </span>
          </button>
        ))}
      </div>

      {/* Strip the room back to just the timer. These belong next to the
          scenery rather than buried in Customize. */}
      <p className="mb-2 mt-5 text-xs" style={{ color: "var(--muted)" }}>
        Show in the room
      </p>
      <div className="flex flex-col gap-2">
        <Toggle
          label="Clock"
          on={settings.showClock}
          onClick={() => update({ showClock: !settings.showClock })}
        />
        <Toggle
          label="Greeting"
          on={settings.showGreeting}
          onClick={() => update({ showGreeting: !settings.showGreeting })}
        />
        <Toggle
          label="Quote"
          on={settings.showQuote}
          onClick={() => update({ showQuote: !settings.showQuote })}
        />
      </div>
    </div>
  );
}

function Toggle({
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
      aria-pressed={on}
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
