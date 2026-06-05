"use client";

// Browser-native voice loop: Web Speech API for STT (webkitSpeechRecognition)
// and SpeechSynthesis for TTS. Zero extra infra — the pragmatic MVP. The
// research's modular streaming STT->LLM->TTS pipeline (<1s latency) is the
// documented upgrade path when we outgrow the browser APIs.

import { useCallback, useEffect, useRef, useState } from "react";
import { runUserTurn, type Message } from "@/lib/agent/client";

// --- Minimal Web Speech typings (not in lib.dom for all targets) ---
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike> & {
    [i: number]: SpeechRecognitionResultLike;
  };
  resultIndex: number;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export interface ChatEntry {
  who: "you" | "coach";
  text: string;
}

export function useVoiceAgent() {
  const [supported, setSupported] = useState({ stt: false, tts: false });
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState("");
  const [log, setLog] = useState<ChatEntry[]>([]);

  const historyRef = useRef<Message[]>([]);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    setSupported({
      stt: !!Ctor,
      tts: typeof window !== "undefined" && "speechSynthesis" in window,
    });
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speakBrowser = useCallback((text: string) => {
    if (!text || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, []);

  // Prefer Kai's ElevenLabs voice; fall back to browser speech if the TTS
  // route is unconfigured/unavailable.
  const speak = useCallback(
    async (text: string) => {
      if (!text) return;
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error(`tts ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        audioRef.current?.pause();
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onplay = () => setSpeaking(true);
        audio.onended = audio.onerror = () => {
          setSpeaking(false);
          URL.revokeObjectURL(url);
        };
        await audio.play();
      } catch {
        speakBrowser(text); // graceful fallback
      }
    },
    [speakBrowser],
  );

  // Core: take a final user utterance, run the agent loop, speak the reply.
  const handleUtterance = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      setLog((l) => [...l, { who: "you", text: clean }]);
      setThinking(true);
      try {
        const { said, history } = await runUserTurn(historyRef.current, clean);
        historyRef.current = history;
        const reply = said || "Okay.";
        setLog((l) => [...l, { who: "coach", text: reply }]);
        void speak(reply);
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Something went wrong reaching the coach.";
        setLog((l) => [...l, { who: "coach", text: `(${msg})` }]);
      } finally {
        setThinking(false);
      }
    },
    [speak],
  );

  const startListening = useCallback(() => {
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < (e.results as ArrayLike<unknown>).length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim(interimText);
      if (finalText) {
        setInterim("");
        void handleUtterance(finalText);
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }, [handleUtterance]);

  const stopListening = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  // Text fallback so the agent is testable without a mic / in any browser.
  const sendText = useCallback(
    (text: string) => void handleUtterance(text),
    [handleUtterance],
  );

  return {
    supported,
    listening,
    thinking,
    speaking,
    interim,
    log,
    startListening,
    stopListening,
    sendText,
  };
}
