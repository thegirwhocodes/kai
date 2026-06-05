"use client";

// Autopilot: makes Kai run hands-free. Watches the active block and:
//  - announces every START (chime + browser notification + Kai's voice)
//  - announces every END
//  - when autoStart is on, automatically begins the next block (break after a
//    focus block, focus after a break) once a short grace period elapses.
//
// All alerts are best-effort; with sound/voice off it stays silent but still
// auto-advances.

import { useEffect, useRef } from "react";
import { chime, notify } from "@/lib/alerts";
import { useAgentStore } from "@/lib/store";
import { speakKai } from "@/lib/voice/speak";
import type { Block } from "@/lib/types";

const mins = (sec: number) => Math.max(1, Math.round(sec / 60));

export function useAutopilot() {
  const active = useAgentStore((s) => s.activeBlock);
  const id = active?.id ?? null;
  const status = active?.status ?? null;

  const prevId = useRef<string | null>(null);
  const prevStatus = useRef<string | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const s = useAgentStore.getState();
    const block = s.activeBlock;
    const { settings } = s;

    const clearAdvance = () => {
      if (advanceTimer.current) {
        clearTimeout(advanceTimer.current);
        advanceTimer.current = null;
      }
    };

    // --- a block just STARTED running (new id, now running) ---
    if (block && status === "running" && id !== prevId.current) {
      clearAdvance(); // a fresh start cancels any pending auto-advance
      announceStart(block, settings.soundAlerts, settings.voiceAlerts);
    }

    // --- the active block just COMPLETED (fire once) ---
    const justCompleted =
      block &&
      status === "completed" &&
      !(prevId.current === id && prevStatus.current === "completed");

    if (justCompleted && block) {
      announceEnd(block, settings.soundAlerts, settings.voiceAlerts);

      if (settings.autoStart) {
        clearAdvance();
        const wasFocus = block.kind === "focus";
        advanceTimer.current = setTimeout(() => {
          const store = useAgentStore.getState();
          // Bail if the user already started something else during the grace.
          if (store.activeBlock?.status === "running") return;
          if (wasFocus) store.startBreak();
          else store.startNextFocus(store.lastFocusTaskId());
        }, Math.max(0, settings.autoStartDelaySec) * 1000);
      }
    }

    prevId.current = id;
    prevStatus.current = status;
  }, [id, status]);

  // Clean up on unmount.
  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );
}

function announceStart(block: Block, sound: boolean, voice: boolean) {
  const m = mins(block.plannedSec);
  if (block.kind === "focus") {
    if (sound) chime("focus");
    notify("Focus started", `${m} min — stay with it.`);
    if (voice) {
      // The engine's rationale is exactly what Kai should say.
      const rationale = useAgentStore.getState().lastDecisionRationale;
      void speakKai(rationale || `Focus time — ${m} minutes. Let's go.`);
    }
  } else {
    const label = block.kind === "long_break" ? "Long break" : "Break";
    if (sound) chime("break");
    notify(`${label} started`, `${m} min — step away from the screen.`);
    if (voice) {
      const rationale = useAgentStore.getState().lastDecisionRationale;
      void speakKai(rationale || `${label} — ${m} minutes. Step away.`);
    }
  }
}

function announceEnd(block: Block, sound: boolean, voice: boolean) {
  if (sound) chime("end");
  if (block.kind === "focus") {
    notify("Focus block done", "Nice work — break coming up.");
    if (voice) void speakKai("Time. Nice work — let's take a break.");
  } else {
    notify("Break over", "Back to it.");
    if (voice) void speakKai("Break's over. Ready when you are.");
  }
}
