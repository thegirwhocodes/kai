"use client";

import { useState } from "react";
import { useConversation } from "@/lib/voice/useConversation";
import { useVoiceAgent } from "@/lib/voice/useVoiceAgent";

export function VoicePanel() {
  const conversation = useConversation();
  const wake = useVoiceAgent();
  const [text, setText] = useState("");

  const active = conversation.active;
  const phase = conversation.phase;
  const level = conversation.level;
  const log = wake.alwaysOn || wake.log.length > 0 ? wake.log : conversation.log;
  const status = statusText(wake, phase);

  return (
    <section className="glass w-full max-w-md rounded-lg p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          Talk to Kai
        </h2>
        <span
          className="text-xs"
          style={{
            color: active || wake.alwaysOn ? "var(--focus)" : "var(--muted)",
          }}
        >
          {status}
        </span>
      </div>

      {/* Conversation log */}
      {log.length > 0 && (
        <div className="mb-3 flex max-h-48 flex-col gap-2 overflow-y-auto">
          {log.map((e, i) => (
            <div
              key={i}
              className={`text-sm ${
                e.who === "you" ? "text-right" : "text-left opacity-80"
              }`}
            >
              <span
                className="inline-block rounded-lg px-3 py-1.5"
                style={{
                  background:
                    e.who === "you"
                      ? "rgba(251,122,142,0.15)"
                      : "rgba(255,255,255,0.06)",
                }}
              >
                {e.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Call control */}
      <div className="flex items-center gap-3">
        <button
          onClick={active ? conversation.stop : conversation.start}
          className="flex h-12 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-medium transition"
          style={
            active
              ? { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }
              : { background: "linear-gradient(135deg,#ffb199,#fb7a8e)", color: "#1a1530" }
          }
        >
          {active ? "End" : "Start conversation"}
        </button>

        {/* Live mic meter while in a call */}
        {active && (
          <div className="flex flex-1 items-center gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <span
                key={i}
                className="h-6 flex-1 rounded-full transition-all"
                style={{
                  background:
                    phase === "listening" && level * 12 > i
                      ? "var(--focus)"
                      : "rgba(255,255,255,0.12)",
                  opacity: phase === "speaking" ? 0.4 : 1,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Hey Kai</p>
            <p className="mt-1 text-xs leading-5" style={{ color: "var(--muted)" }}>
              Opt-in wake listening while this tab is open. Browser support is best
              in Chrome/Safari.
            </p>
          </div>
          <button
            type="button"
            onClick={wake.toggleAlwaysOn}
            disabled={!wake.supported.stt || active}
            className="rounded-lg border border-white/15 px-3 py-2 text-xs transition hover:bg-white/10 disabled:opacity-40"
          >
            {wake.alwaysOn ? "On" : "Off"}
          </button>
        </div>
        {wake.interim && (
          <p className="mt-2 text-xs italic" style={{ color: "var(--muted)" }}>
            {wake.interim}
          </p>
        )}
      </div>

      {/* Text fallback — always available */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          if (wake.alwaysOn) void wake.sendText(text.trim());
          else void conversation.sendText(text.trim());
          setText("");
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type to Kai"
          className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none transition focus:border-white/40"
        />
        <button
          type="submit"
          className="rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10"
        >
          Send
        </button>
      </form>
    </section>
  );
}

function statusText(
  wake: ReturnType<typeof useVoiceAgent>,
  phase: ReturnType<typeof useConversation>["phase"],
) {
  if (wake.alwaysOn) return wake.awake ? "Awake" : "Listening for Hey Kai";
  if (wake.thinking || phase === "thinking") return "Thinking...";
  if (wake.speaking || phase === "speaking") return "Kai is talking...";
  if (phase === "listening") return "Listening";
  return "Tap to start a conversation";
}
