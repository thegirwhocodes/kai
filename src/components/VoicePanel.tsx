"use client";

import { useState } from "react";
import { useVoiceAgent } from "@/lib/voice/useVoiceAgent";

export function VoicePanel() {
  const {
    supported,
    listening,
    thinking,
    speaking,
    interim,
    log,
    startListening,
    stopListening,
    sendText,
  } = useVoiceAgent();
  const [text, setText] = useState("");

  const status = thinking
    ? "Thinking…"
    : speaking
      ? "Speaking…"
      : listening
        ? "Listening…"
        : "Talk to your coach";

  const busy = listening || thinking || speaking;

  return (
    <section className="glass w-full max-w-md rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          Talk to Kai
        </h2>
        <span
          className="text-xs"
          style={{ color: busy ? "var(--focus)" : "var(--muted)" }}
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

      {interim && (
        <p className="mb-2 text-right text-sm italic opacity-50">{interim}…</p>
      )}

      {/* Mic */}
      <div className="flex items-center gap-2">
        {supported.stt ? (
          <button
            onClick={listening ? stopListening : startListening}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg transition ${
              listening
                ? "animate-pulse text-[#1a1530]"
                : "border border-white/20 hover:bg-white/10"
            }`}
            style={
              listening
                ? { background: "linear-gradient(135deg,#ffb199,#fb7a8e)" }
                : undefined
            }
            aria-label={listening ? "Stop listening" : "Start listening"}
          >
            {listening ? "■" : "🎤"}
          </button>
        ) : null}

        {/* Text fallback — always available */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            sendText(text.trim());
            setText("");
          }}
          className="flex flex-1 gap-2"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              supported.stt ? "…or type to Kai" : "Type to Kai"
            }
            className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none transition focus:border-white/40"
          />
          <button
            type="submit"
            disabled={thinking}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10 disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>

      {!supported.stt && (
        <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
          Voice input needs Chrome or Edge. Typing works everywhere; replies are
          spoken aloud if your browser supports speech.
        </p>
      )}
    </section>
  );
}
