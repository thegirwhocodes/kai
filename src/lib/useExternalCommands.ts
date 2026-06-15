"use client";

import { useEffect, useRef } from "react";
import { useAgentStore } from "@/lib/store";
import type { KaiCommand } from "@/lib/types";

export function useExternalCommands() {
  const lastSeenRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    if (lastSeenRef.current === 0) lastSeenRef.current = Date.now();

    const poll = async () => {
      try {
        const res = await fetch(`/api/commands?after=${lastSeenRef.current}`);
        if (!res.ok) return;
        const data = (await res.json()) as { commands?: KaiCommand[] };
        const commands = data.commands ?? [];
        for (const command of commands) {
          lastSeenRef.current = Math.max(lastSeenRef.current, command.createdAt);
          applyCommand(command);
        }
      } catch {
        // External control is opportunistic; never disturb the focus surface.
      }
    };

    void poll();
    const id = window.setInterval(() => {
      if (!cancelled) void poll();
    }, 3500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);
}

function applyCommand(command: KaiCommand) {
  const store = useAgentStore.getState();
  if (command.recommendation) {
    store.setLatestRecommendation(command.recommendation);
  }

  switch (command.type) {
    case "start_recommended_focus":
      store.startRecommendedFocus();
      break;
    case "start_break":
      store.startBreak();
      break;
    case "pause_active":
      store.pause();
      break;
    case "resume_active":
      store.resume();
      break;
    case "complete_active":
      store.completeActive();
      break;
    case "skip_active":
      store.skipActive();
      break;
    case "show_recommendation":
      break;
  }
}
