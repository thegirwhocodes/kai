"use client";

import { useEffect } from "react";
import { useAgentStore } from "./store";

/**
 * Drives the countdown. Uses wall-clock deltas (not a naive -1/sec) so the
 * timer stays accurate when the tab is backgrounded and throttled.
 */
export function useTicker() {
  const status = useAgentStore((s) => s.activeBlock?.status);
  const tick = useAgentStore((s) => s.tick);

  useEffect(() => {
    if (status !== "running") return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const delta = (now - last) / 1000;
      last = now;
      tick(delta);
    }, 250);
    return () => clearInterval(id);
  }, [status, tick]);
}
