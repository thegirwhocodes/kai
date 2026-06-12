"use client";

export type Panel = "voice" | "plan" | "tasks" | "music" | "settings" | null;

export function Dock({
  active,
  onSelect,
  onFullscreen,
}: {
  active: Panel;
  onSelect: (p: Panel) => void;
  onFullscreen: () => void;
}) {
  const items: { id: Exclude<Panel, null>; icon: string; label: string }[] = [
    { id: "voice", icon: "🎙", label: "Talk to Kai" },
    { id: "plan", icon: "◇", label: "Plan next" },
    { id: "tasks", icon: "✓", label: "Tasks" },
    { id: "music", icon: "♫", label: "Focus music" },
    { id: "settings", icon: "✦", label: "Customize" },
  ];
  return (
    <div className="fixed bottom-6 right-6 z-20 flex gap-2">
      {items.map((it) => (
        <button
          key={it.id}
          className="dock-btn"
          data-active={active === it.id}
          onClick={() => onSelect(active === it.id ? null : it.id)}
          title={it.label}
          aria-label={it.label}
        >
          {it.icon}
        </button>
      ))}
      <button
        className="dock-btn"
        onClick={onFullscreen}
        title="Fullscreen"
        aria-label="Fullscreen"
      >
        ⛶
      </button>
    </div>
  );
}
