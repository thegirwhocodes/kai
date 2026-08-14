"use client";

// Keyboard control for the focus room. Space is the one everybody tries first
// (start / pause / resume), and each dock panel has a letter.
//
// Typing always wins: while a text field or contenteditable has focus, every
// shortcut is ignored so a task titled "space" can actually be typed.

import { useEffect } from "react";
import type { Panel } from "@/components/Dock";
import { unlockAudio } from "@/lib/alerts";
import { useAgentStore } from "@/lib/store";

const PANEL_KEYS: Record<string, Exclude<Panel, null>> = {
  v: "voice",
  p: "plan",
  t: "tasks",
  m: "music",
  r: "stats",
  a: "themes",
  c: "settings",
};

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

export function useKeyboard({
  panel,
  setPanel,
  onFullscreen,
  selectedTask,
}: {
  panel: Panel;
  setPanel: (p: Panel) => void;
  onFullscreen: () => void;
  selectedTask?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      const store = useAgentStore.getState();
      const active = store.activeBlock;
      const running = active?.status === "running";
      const paused = active?.status === "paused";
      const key = e.key.toLowerCase();

      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        unlockAudio();
        if (running) store.pause();
        else if (paused) store.resume();
        else store.startNextFocus(selectedTask);
        return;
      }

      if (e.key === "Escape") {
        if (panel) {
          e.preventDefault();
          setPanel(null);
        }
        return;
      }

      if (key === "b") {
        e.preventDefault();
        unlockAudio();
        store.startBreak();
        return;
      }

      if (key === "s" && (running || paused)) {
        e.preventDefault();
        store.skipActive();
        return;
      }

      if (key === "d" && (running || paused)) {
        e.preventDefault();
        store.completeActive();
        return;
      }

      if (key === "f") {
        e.preventDefault();
        onFullscreen();
        return;
      }

      const next = PANEL_KEYS[key];
      if (next) {
        e.preventDefault();
        setPanel(panel === next ? null : next);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, setPanel, onFullscreen, selectedTask]);
}

/** Shown in Customize so the shortcuts are discoverable. */
export const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "Space", action: "Start, pause, or resume" },
  { keys: "B", action: "Take a break" },
  { keys: "D", action: "Finish this block early" },
  { keys: "S", action: "Skip this block" },
  { keys: "F", action: "Fullscreen" },
  { keys: "T", action: "Tasks" },
  { keys: "M", action: "Focus sounds" },
  { keys: "A", action: "Themes" },
  { keys: "R", action: "Your focus stats" },
  { keys: "V", action: "Talk to Kai" },
  { keys: "P", action: "Plan next" },
  { keys: "C", action: "Customize" },
  { keys: "Esc", action: "Close the panel" },
];
