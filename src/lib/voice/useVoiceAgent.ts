"use client";

// Browser voice loop with two modes:
//  - push-to-talk: tap the mic, speak one command.
//  - always-on "Hey Kai": continuous listening that wakes on the phrase
//    "Hey Kai …" and then takes commands hands-free for a short window. Mic
//    permission is granted once by the browser (an OS rule we can't bypass);
//    after that it listens continuously while the tab is open.
//
// STT = Web Speech API; TTS = shared speakKai (ElevenLabs w/ browser fallback).

import { useCallback, useEffect, useRef, useState } from "react";
import { runUserTurn, type Message } from "@/lib/agent/client";
import { chime } from "@/lib/alerts";
import { speakKai } from "@/lib/voice/speak";

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

const WAKE = /\b(?:hey|hi|ok|okay)?\s*kai\b/i;
const AWAKE_MS = 12_000; // hands-free command window after the wake word

export function useVoiceAgent() {
  const [supported, setSupported] = useState({ stt: false, tts: false });
  const [listening, setListening] = useState(false); // mic open
  const [alwaysOn, setAlwaysOn] = useState(false);
  const [awake, setAwake] = useState(false); // heard "Hey Kai", taking commands
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState("");
  const [log, setLog] = useState<ChatEntry[]>([]);

  const historyRef = useRef<Message[]>([]);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const alwaysOnRef = useRef(false);
  const awakeUntilRef = useRef(0);
  const speakingRef = useRef(false);

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

  const speak = useCallback(
    (text: string) =>
      speakKai(text, {
        onStart: () => {
          speakingRef.current = true;
          setSpeaking(true);
        },
        onEnd: () => {
          speakingRef.current = false;
          setSpeaking(false);
        },
      }),
    [],
  );

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
        // Keep the conversation open for a natural follow-up.
        if (alwaysOnRef.current) {
          awakeUntilRef.current = Date.now() + AWAKE_MS;
          setAwake(true);
        }
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

  // Process a final transcript according to the current mode.
  const onFinal = useCallback(
    (finalText: string) => {
      // Ignore anything captured while Kai is speaking (avoid hearing herself).
      if (speakingRef.current) return;

      if (!alwaysOnRef.current) {
        void handleUtterance(finalText);
        return;
      }

      const now = Date.now();
      const stillAwake = now < awakeUntilRef.current;
      const wake = WAKE.exec(finalText);

      if (wake) {
        const after = finalText.slice(wake.index + wake[0].length).trim();
        awakeUntilRef.current = now + AWAKE_MS;
        setAwake(true);
        if (after) {
          void handleUtterance(after);
        } else {
          chime("focus"); // soft "I'm listening" acknowledgement
        }
      } else if (stillAwake) {
        void handleUtterance(finalText);
      }
      // otherwise: no wake word and not awake -> ignore ambient speech
    },
    [handleUtterance],
  );

  // (Re)start a recognition instance. In always-on mode it auto-restarts.
  const startRecognition = useCallback(() => {
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = alwaysOnRef.current;
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
      if (now() >= awakeUntilRef.current) setAwake(false);
      if (finalText) {
        setInterim("");
        onFinal(finalText);
      }
    };
    rec.onerror = () => {
      // transient (e.g. no-speech) — let onend handle restart
    };
    rec.onend = () => {
      if (alwaysOnRef.current) {
        // keep the ear open
        try {
          rec.start();
        } catch {
          setTimeout(() => {
            try {
              recRef.current?.start();
            } catch {
              /* ignore */
            }
          }, 400);
        }
      } else {
        setListening(false);
      }
    };
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      /* already started */
    }
  }, [onFinal]);

  const startListening = useCallback(() => {
    alwaysOnRef.current = false;
    startRecognition();
  }, [startRecognition]);

  const stopListening = useCallback(() => {
    alwaysOnRef.current = false;
    setAlwaysOn(false);
    setAwake(false);
    const rec = recRef.current;
    recRef.current = null;
    rec?.stop();
    setListening(false);
  }, []);

  const toggleAlwaysOn = useCallback(() => {
    if (alwaysOnRef.current) {
      stopListening();
    } else {
      alwaysOnRef.current = true;
      setAlwaysOn(true);
      startRecognition();
    }
  }, [startRecognition, stopListening]);

  // Cleanup on unmount.
  useEffect(
    () => () => {
      alwaysOnRef.current = false;
      recRef.current?.stop();
    },
    [],
  );

  const sendText = useCallback(
    (text: string) => void handleUtterance(text),
    [handleUtterance],
  );

  return {
    supported,
    listening,
    alwaysOn,
    awake,
    thinking,
    speaking,
    interim,
    log,
    startListening,
    stopListening,
    toggleAlwaysOn,
    sendText,
  };
}

function now() {
  return Date.now();
}
