"use client";

// Non-voice alerts: a soft chime (synthesized, no audio file) and browser
// notifications. Both are best-effort and degrade silently.
//
// Browser audio is blocked until a user gesture, so `unlockAudio()` must be
// called from a click/tap (we call it from the Start buttons). After that the
// AudioContext stays usable for chimes even when the tab is backgrounded.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** Call from a user gesture to unlock audio + ask for notification permission. */
export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") void c.resume();
  if (
    typeof Notification !== "undefined" &&
    Notification.permission === "default"
  ) {
    void Notification.requestPermission();
  }
}

/**
 * A short two-tone chime. `kind` shapes the pitch: a brighter rising tone to
 * begin focus, a softer one for breaks/end.
 */
export function chime(kind: "focus" | "break" | "end" = "end") {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();

  const now = c.currentTime;
  const notes =
    kind === "focus"
      ? [523.25, 783.99] // C5 -> G5, bright "go"
      : kind === "break"
        ? [659.25, 440.0] // E5 -> A4, gentle "ease off"
        : [587.33, 392.0]; // D5 -> G4, soft "done"

  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t0 = now + i * 0.18;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + 0.45);
  });
}

/** Best-effort browser notification (does nothing without permission). */
export function notify(title: string, body: string) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.ico", tag: "kai-timer" });
  } catch {
    // some browsers require a service worker; ignore failures
  }
}

export function notificationsEnabled(): boolean {
  return (
    typeof Notification !== "undefined" && Notification.permission === "granted"
  );
}
