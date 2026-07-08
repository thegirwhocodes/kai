"use client";

import { useEffect } from "react";
import { useAgentStore } from "@/lib/store";
import { useVoiceAgent } from "@/lib/voice/useVoiceAgent";

export function WakeListener({ onOpenVoice }: { onOpenVoice: () => void }) {
  const wakeListening = useAgentStore((s) => s.settings.wakeListening);
  const wake = useVoiceAgent();
  const { alwaysOn, listening, startAlwaysOn, supported } = wake;

  useEffect(() => {
    if (!wakeListening || !supported.stt || alwaysOn || listening) return;
    const id = window.setTimeout(() => startAlwaysOn(), 650);
    return () => window.clearTimeout(id);
  }, [alwaysOn, listening, startAlwaysOn, supported.stt, wakeListening]);

  if (!wakeListening) return null;

  const unavailable = !wake.supported.stt;
  const label = unavailable
    ? "Hey Kai needs Chrome or Safari"
    : wake.alwaysOn
      ? wake.awake
        ? "Kai is awake"
        : "Listening for Hey Kai"
      : "Enable Hey Kai";

  return (
    <button
      type="button"
      onClick={() => {
        onOpenVoice();
        if (!wake.alwaysOn && !unavailable) wake.startAlwaysOn();
      }}
      className="fixed left-1/2 top-6 z-30 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-[#15101f]/60 px-4 py-2 text-xs font-medium text-white/82 shadow-[0_18px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl transition hover:bg-white/10 sm:flex"
      title={wake.lastError ?? label}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{
          background: wake.alwaysOn ? "var(--focus)" : "rgba(255,255,255,0.45)",
          boxShadow: wake.alwaysOn ? "0 0 18px var(--focus)" : undefined,
        }}
      />
      <span>{label}</span>
    </button>
  );
}
