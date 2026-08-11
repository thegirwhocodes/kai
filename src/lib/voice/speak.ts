"use client";

// Single voice path for Kai. Tries the ElevenLabs route first, falls back to
// the browser's SpeechSynthesis. Used by both the voice panel and the
// autopilot's spoken alerts so Kai always sounds the same.

let current: HTMLAudioElement | null = null;

// If the hosted voice is unavailable — no key, an unpaid account, a network
// blip — it will be unavailable for the rest of the visit too. Remember that
// after the first failure so a transition never waits on a doomed request.
let hostedVoiceDown = false;

export interface SpeakOpts {
  onStart?: () => void;
  onEnd?: () => void;
}

function speakBrowser(text: string, opts?: SpeakOpts) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    opts?.onEnd?.();
    return;
  }
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.02;
  u.onstart = () => opts?.onStart?.();
  u.onend = () => opts?.onEnd?.();
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export async function speakKai(text: string, opts?: SpeakOpts): Promise<void> {
  if (!text) return;
  if (hostedVoiceDown) {
    speakBrowser(text, opts);
    return;
  }
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`tts ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    current?.pause();
    const audio = new Audio(url);
    current = audio;
    audio.onplay = () => opts?.onStart?.();
    audio.onended = audio.onerror = () => {
      opts?.onEnd?.();
      URL.revokeObjectURL(url);
    };
    await audio.play();
  } catch {
    hostedVoiceDown = true;
    speakBrowser(text, opts);
  }
}
