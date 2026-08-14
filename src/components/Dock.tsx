"use client";

export type Panel =
  | "voice"
  | "plan"
  | "tasks"
  | "music"
  | "stats"
  | "themes"
  | "settings"
  | null;

export function Dock({
  active,
  onSelect,
  onFullscreen,
}: {
  active: Panel;
  onSelect: (p: Panel) => void;
  onFullscreen: () => void;
}) {
  const items: {
    id: Exclude<Panel, null>;
    icon: string;
    label: string;
    key: string;
  }[] = [
    { id: "voice", icon: "🎙", label: "Talk to Kai", key: "V" },
    { id: "plan", icon: "◇", label: "Plan next", key: "P" },
    { id: "tasks", icon: "✓", label: "Tasks", key: "T" },
    { id: "music", icon: "♫", label: "Focus sounds", key: "M" },
    { id: "stats", icon: "▤", label: "Your focus", key: "R" },
    // Themes get their own button rather than living inside Customize —
    // it's the thing people reach for most, and the whole library was
    // invisible when it was two clicks deep.
    { id: "themes", icon: "◐", label: "Themes", key: "A" },
    { id: "settings", icon: "✦", label: "Customize", key: "C" },
  ];
  return (
    <div className="fixed bottom-4 right-4 z-20 flex max-w-[calc(100vw-2rem)] flex-wrap justify-end gap-2 sm:bottom-6 sm:right-6">
      {items.map((it) => (
        <button
          key={it.id}
          className="dock-btn"
          data-active={active === it.id}
          onClick={() => onSelect(active === it.id ? null : it.id)}
          title={`${it.label} (${it.key})`}
          aria-label={it.label}
        >
          {it.icon}
        </button>
      ))}
      <button
        className="dock-btn"
        onClick={onFullscreen}
        title="Fullscreen (F)"
        aria-label="Fullscreen"
      >
        ⛶
      </button>
    </div>
  );
}
