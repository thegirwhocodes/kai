import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Whisper transcription via Groq (whisper-large-v3-turbo) — fast + accurate,
// the same kind of STT Sabi uses, instead of the flaky browser SpeechRecognition.
// Accepts a multipart form with an "audio" file; returns { text }.

export async function POST(req: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "stt_unconfigured" }, { status: 503 });
  }

  let inForm: FormData;
  try {
    inForm = await req.formData();
  } catch {
    return NextResponse.json({ error: "expected_multipart" }, { status: 400 });
  }
  const audio = inForm.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "no_audio" }, { status: 400 });
  }

  const form = new FormData();
  form.append("file", audio, "speech.webm");
  form.append("model", "whisper-large-v3-turbo");
  form.append("response_format", "json");
  // A light prompt nudges spelling of the assistant's name and domain words.
  form.append("prompt", "Kai, pomodoro, focus block, Spotify, calendar.");

  try {
    const res = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form },
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message ?? `stt_${res.status}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ text: (data.text ?? "").trim() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "stt_failed" },
      { status: 502 },
    );
  }
}
