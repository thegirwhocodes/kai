import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Kai's voice. Streams ElevenLabs TTS audio back to the browser. The client
// plays it instead of the robotic SpeechSynthesis voice, and falls back to
// SpeechSynthesis if this route is unavailable (no key, quota, network).
//
// Voice + model are env-configurable so you can swap Kai's voice without a
// code change:
//   ELEVENLABS_API_KEY   (required)
//   ELEVENLABS_VOICE_ID  (default: "River" — a calm, neutral coach voice)
//   ELEVENLABS_MODEL_ID  (default: eleven_turbo_v2_5 — low latency)

const DEFAULT_VOICE_ID = "SAz9YHcvj6GT2YYXdXww"; // River
const DEFAULT_MODEL_ID = "eleven_turbo_v2_5";

export async function POST(req: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    // Signal the client to fall back to browser speech.
    return NextResponse.json({ error: "tts_unconfigured" }, { status: 503 });
  }

  let text = "";
  try {
    ({ text } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text_required" }, { status: 400 });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  const modelId = process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL_ID;

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: { stability: 0.4, similarity_boost: 0.75 },
      }),
    },
  );

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: "tts_failed", status: upstream.status, detail: detail.slice(0, 300) },
      { status: 502 },
    );
  }

  // Stream the audio straight through.
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
