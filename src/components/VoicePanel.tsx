"use client";

import { useState } from "react";
import { useConversation } from "@/lib/voice/useConversation";

export function VoicePanel() {
  const { active, phase, level, log, start, stop, sendText } = useConversation();
  const [text, setText] = useState("");

  const status =
    phase === "thinking"
      ? "Thinking…"
      : phase === "speaking"
        ? "Kai is talking…"
        : phase === "listening"
          ? "Listening — just talk"
          : "Tap to start a conversation";

  return (
    <section className="glass w-full max-w-md rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          Talk to Kai
        </h2>
        <span
          className="text-xs"
          style={{ color: active ? "var(--focus)" : "var(--muted)" }}
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
                className="inline-block rounded-2xl px-3 py-1.5"
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
          onClick={active ? stop : start}
          className="flex h-12 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-medium transition"
          style={
            active
              ? { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }
              : { background: "linear-gradient(135deg,#ffb199,#fb7a8e)", color: "#1a1530" }
          }
        >
          {active ? "■ End" : "🎙 Start conversation"}
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

      {/* Text fallback — always available */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          void sendText(text.trim());
          setText("");
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="…or type to Kai"
          className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none transition focus:border-white/40"
        />
        <button
          type="submit"
          className="rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10"
        >
          Send
        </button>
      </form>

      <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
        Start a conversation and just talk — no wake word. Kai listens, you pause,
        she answers. Works in Chrome, Edge, and Safari.
      </p>
    </section>
  );
}
