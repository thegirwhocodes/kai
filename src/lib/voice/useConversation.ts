"use client";

// Sabi-style voice: you start a "call" once, then just talk — no wake word.
// A mic VAD watches the audio level; when you finish a sentence (a beat of
// silence after speech), it sends that utterance to Whisper (Groq), runs the
// agent, speaks the reply, then automatically listens again. While Kai is
// speaking the mic is gated so she never hears herself.

import { useCallback, useRef, useState } from "react";
import { runUserTurn, type Message } from "@/lib/agent/client";
import { speakKai } from "@/lib/voice/speak";

export interface ChatEntry {
  who: "you" | "coach";
  text: string;
}

type Phase = "idle" | "listening" | "thinking" | "speaking";

// VAD tuning.
const SPEECH_RMS = 0.018; // above this = speech
const SILENCE_MS = 900; // quiet-after-speech that ends a turn
const MIN_SPEECH_MS = 250; // ignore blips (coughs, clicks)
const MAX_UTTERANCE_MS = 30_000; // safety cap

export function useConversation() {
  const [active, setActive] = useState(false); // call in progress
  const [phase, setPhase] = useState<Phase>("idle");
  const [log, setLog] = useState<ChatEntry[]>([]);
  const [level, setLevel] = useState(0); // 0..1 for a live mic meter

  const historyRef = useRef<Message[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const activeRef = useRef(false);

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  // Pull one utterance: start a recorder, watch the level, resolve the audio
  // blob once the user stops talking (or cap hit). Resolves null if the call
  // ended or nothing was said.
  const captureUtterance = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const stream = streamRef.current;
      const analyser = analyserRef.current;
      if (!stream || !analyser) return resolve(null);

      const rec = new MediaRecorder(stream, { mimeType: pickMime() });
      recRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        resolve(blob.size > 1200 ? blob : null);
      };

      const data = new Uint8Array(analyser.fftSize);
      const start = Date.now();
      let speechStart = 0;
      let lastVoice = 0;

      const tick = () => {
        if (!activeRef.current) {
          try {
            rec.stop();
          } catch {}
          return;
        }
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        setLevel(Math.min(1, rms * 6));
        const now = Date.now();

        if (rms > SPEECH_RMS) {
          if (!speechStart) speechStart = now;
          lastVoice = now;
        }
        const spokeEnough = speechStart && now - speechStart > MIN_SPEECH_MS;
        const silentLongEnough = lastVoice && now - lastVoice > SILENCE_MS;
        const tooLong = now - start > MAX_UTTERANCE_MS;

        if ((spokeEnough && silentLongEnough) || (tooLong && speechStart)) {
          try {
            rec.stop();
          } catch {}
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rec.start();
      rafRef.current = requestAnimationFrame(tick);
    });
  }, []);

  const transcribe = useCallback(async (blob: Blob): Promise<string> => {
    const fd = new FormData();
    fd.append("audio", blob, "speech.webm");
    const res = await fetch("/api/transcribe", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "transcription failed");
    return (data.text ?? "").trim();
  }, []);

  // The conversation loop: listen -> transcribe -> agent -> speak -> repeat.
  const loop = useCallback(async () => {
    while (activeRef.current) {
      setPhaseBoth("listening");
      const blob = await captureUtterance();
      if (!activeRef.current) break;
      if (!blob) continue; // silence — keep listening

      setPhaseBoth("thinking");
      let text = "";
      try {
        text = await transcribe(blob);
      } catch {
        continue;
      }
      if (!text || text.length < 2) continue;
      setLog((l) => [...l, { who: "you", text }]);

      let reply = "Okay.";
      try {
        const r = await runUserTurn(historyRef.current, text);
        historyRef.current = r.history;
        reply = r.said || "Okay.";
      } catch (e) {
        reply = e instanceof Error ? `Sorry — ${e.message}` : "Something went wrong.";
      }
      if (!activeRef.current) break;

      setLog((l) => [...l, { who: "coach", text: reply }]);
      setPhaseBoth("speaking");
      await new Promise<void>((done) => {
        void speakKai(reply, { onEnd: done });
        // safety: don't hang forever if TTS never fires onEnd
        setTimeout(done, 15_000);
      });
    }
  }, [captureUtterance, transcribe]);

  const start = useCallback(async () => {
    if (activeRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      analyserRef.current = analyser;

      activeRef.current = true;
      setActive(true);
      void speakKai("Hey, I'm here. What do you want to work on?");
      // brief beat so she isn't transcribing her own greeting
      setTimeout(() => void loop(), 1600);
    } catch {
      setActive(false);
      activeRef.current = false;
    }
  }, [loop]);

  const stop = useCallback(() => {
    activeRef.current = false;
    setActive(false);
    setPhaseBoth("idle");
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    try {
      recRef.current?.stop();
    } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;
  }, []);

  const sendText = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setLog((l) => [...l, { who: "you", text: clean }]);
    setPhaseBoth("thinking");
    try {
      const r = await runUserTurn(historyRef.current, clean);
      historyRef.current = r.history;
      const reply = r.said || "Okay.";
      setLog((l) => [...l, { who: "coach", text: reply }]);
      void speakKai(reply);
    } catch (e) {
      setLog((l) => [
        ...l,
        { who: "coach", text: `(${e instanceof Error ? e.message : "error"})` },
      ]);
    } finally {
      setPhaseBoth(activeRef.current ? "listening" : "idle");
    }
  }, []);

  return { active, phase, level, log, start, stop, sendText };
}

function pickMime(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c))
      return c;
  }
  return "";
}
