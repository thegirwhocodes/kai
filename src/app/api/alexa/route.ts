import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { buildKaiRecommendation } from "@/lib/life/recommend";
import { resolveMusicMode } from "@/lib/music/modes";
import { commandForRecommendation, pushKaiCommand } from "@/lib/server/commandQueue";
import {
  getDevices,
  pausePlayback,
  playPlayable,
  searchSpotifyCatalog,
  searchUserMusic,
  spotifyConfigured,
  type SpotifyPlayable,
} from "@/lib/spotify/spotify";
import type { KaiRecommendation } from "@/lib/types";

export const runtime = "nodejs";

interface AlexaEnvelope {
  version?: string;
  session?: {
    application?: { applicationId?: string };
    attributes?: AlexaSessionAttributes;
    user?: { userId?: string; accessToken?: string };
  };
  context?: {
    System?: {
      application?: { applicationId?: string };
      user?: { userId?: string; accessToken?: string };
    };
  };
  request?: {
    type?: string;
    requestId?: string;
    timestamp?: string;
    intent?: {
      name?: string;
      slots?: Record<string, { value?: string }>;
    };
  };
}

interface AlexaSessionAttributes {
  pendingAction?: "start_recommendation" | "play_music_catalog" | "play_spotify_fallback";
  recommendationId?: string;
  musicQuery?: string;
}

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "kai-alexa",
    endpoint: "/api/alexa",
    supportedIntents: [
      "NextSessionIntent",
      "PlanDayIntent",
      "StartFocusIntent",
      "StartBreakIntent",
      "AddTaskIntent",
      "PlayMusicIntent",
      "PauseMusicIntent",
      "PauseTimerIntent",
      "ResumeTimerIntent",
      "CompleteBlockIntent",
      "SkipBlockIntent",
    ],
  });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  if (!(await validateAlexaRequest(req, rawBody))) {
    return NextResponse.json({ error: "invalid_alexa_signature" }, { status: 400 });
  }

  let body: AlexaEnvelope;
  try {
    body = JSON.parse(rawBody) as AlexaEnvelope;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const skillId = process.env.ALEXA_SKILL_ID;
  const appId =
    body.session?.application?.applicationId ??
    body.context?.System?.application?.applicationId;
  if (skillId && appId !== skillId) {
    return NextResponse.json({ error: "wrong_skill" }, { status: 403 });
  }

  if (!freshTimestamp(body.request?.timestamp)) {
    return NextResponse.json({ error: "stale_request" }, { status: 400 });
  }

  try {
    return NextResponse.json(await handleAlexa(body));
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "I could not reach Kai's planner.";
    return NextResponse.json(
      alexaResponse(`Sorry, ${message}`, { shouldEndSession: true }),
    );
  }
}

async function handleAlexa(body: AlexaEnvelope) {
  const requestType = body.request?.type;
  const attributes = body.session?.attributes ?? {};
  if (requestType === "LaunchRequest") {
    return alexaResponse(
      "Kai is here. You can ask what should I focus on next, start a focus session, take a break, or play focus music.",
      {
        repromptText: "What would you like Kai to do?",
        shouldEndSession: false,
      },
    );
  }
  if (requestType === "SessionEndedRequest") {
    return alexaResponse("", { shouldEndSession: true });
  }
  if (requestType !== "IntentRequest") {
    return alexaResponse("Kai can help plan your next focus block.", {
      shouldEndSession: false,
    });
  }

  const intent = body.request?.intent?.name;
  const slots = body.request?.intent?.slots ?? {};

  if (intent === "AMAZON.HelpIntent") {
    return alexaResponse(
      "Try saying, what should I focus on next, start a focus session, take a break, or play Christian lofi from Spotify.",
      {
        repromptText: "What would you like Kai to do?",
        shouldEndSession: false,
      },
    );
  }
  if (intent === "AMAZON.YesIntent") {
    if (attributes.pendingAction === "play_music_catalog" && attributes.musicQuery) {
      return playSpotifyFromAlexa(attributes.musicQuery, true);
    }
    if (attributes.pendingAction === "play_spotify_fallback") {
      return playSpotifyFromAlexa(attributes.musicQuery ?? "deep focus instrumental", true);
    }
    if (attributes.pendingAction === "start_recommendation") {
      const recommendation = await buildKaiRecommendation({ horizonHours: 10 });
      commandForRecommendation(
        recommendation,
        "start_recommended_focus",
        "alexa",
        speakStarted(recommendation),
      );
      return alexaResponse(speakStarted(recommendation), {
        shouldEndSession: true,
      });
    }
    return alexaResponse("Okay. Tell me what you want to start.", {
      repromptText: "What would you like Kai to start?",
      shouldEndSession: false,
    });
  }
  if (intent === "AMAZON.NoIntent") {
    return alexaResponse("Okay. I will leave it there.", {
      shouldEndSession: true,
    });
  }
  if (intent === "AMAZON.CancelIntent" || intent === "AMAZON.StopIntent") {
    return alexaResponse("Okay. I will leave the next block untouched.", {
      shouldEndSession: true,
    });
  }

  if (intent === "NextSessionIntent" || intent === "PlanDayIntent") {
    const recommendation = await buildKaiRecommendation({
      horizonHours: intent === "PlanDayIntent" ? 12 : 10,
      intent: intent === "PlanDayIntent" ? "plan_day" : "next_session",
    });
    commandForRecommendation(
      recommendation,
      "show_recommendation",
      "alexa",
      speakRecommendation(recommendation),
    );
    return alexaResponse(speakRecommendation(recommendation), {
      attributes: {
        recommendationId: recommendation.id,
        pendingAction: "start_recommendation",
      },
      repromptText: "Want me to start it?",
      shouldEndSession: false,
    });
  }

  if (intent === "StartFocusIntent") {
    const task = slotValue(slots, "task");
    const recommendation = await buildKaiRecommendation({
      state: task
        ? {
            tasks: [
              {
                title: task,
                priority: "medium",
                source: "alexa",
              },
            ],
          }
        : undefined,
      horizonHours: 10,
    });
    commandForRecommendation(
      recommendation,
      "start_recommended_focus",
      "alexa",
      speakStarted(recommendation),
    );
    return alexaResponse(speakStarted(recommendation), {
      attributes: { recommendationId: recommendation.id },
      shouldEndSession: true,
    });
  }

  if (intent === "StartBreakIntent") {
    pushKaiCommand({
      type: "start_break",
      source: "alexa",
      spoken: "Starting a break.",
    });
    return alexaResponse("Starting a break. If Kai is open in the browser, the timer will pick it up.", {
      shouldEndSession: true,
    });
  }

  if (intent === "PauseTimerIntent") {
    pushKaiCommand({
      type: "pause_active",
      source: "alexa",
      spoken: "Paused Kai.",
    });
    return alexaResponse("Paused Kai, if the browser app is open.", {
      shouldEndSession: true,
    });
  }

  if (intent === "ResumeTimerIntent") {
    pushKaiCommand({
      type: "resume_active",
      source: "alexa",
      spoken: "Resumed Kai.",
    });
    return alexaResponse("Resumed Kai, if the browser app is open.", {
      shouldEndSession: true,
    });
  }

  if (intent === "CompleteBlockIntent") {
    pushKaiCommand({
      type: "complete_active",
      source: "alexa",
      spoken: "Marked the block done.",
    });
    return alexaResponse("Marked the current block done, if Kai is open.", {
      shouldEndSession: true,
    });
  }

  if (intent === "SkipBlockIntent") {
    pushKaiCommand({
      type: "skip_active",
      source: "alexa",
      spoken: "Skipped the block.",
    });
    return alexaResponse("Skipped the current block, if Kai is open.", {
      shouldEndSession: true,
    });
  }

  if (intent === "PlayMusicIntent") {
    const query = slotValue(slots, "musicQuery") ?? "deep focus instrumental";
    if (isBrainFmRequest(query)) {
      return alexaResponse(
        "I cannot stream Brain.fm directly through Kai yet. I can play a Spotify focus alternative instead. Want me to do that?",
        {
          attributes: {
            pendingAction: "play_spotify_fallback",
            musicQuery: brainFmFallbackQuery(query),
          },
          repromptText: "Want me to play the Spotify alternative?",
          shouldEndSession: false,
        },
      );
    }
    return playSpotifyFromAlexa(query, musicRequestAllowsCatalog(query));
  }

  if (intent === "BrainFmIntent") {
    return alexaResponse(
      "Brain.fm does not expose a Kai integration I can safely use yet. I can play a Spotify focus alternative instead. Want me to do that?",
      {
        attributes: {
          pendingAction: "play_spotify_fallback",
          musicQuery: "deep focus instrumental",
        },
        repromptText: "Want me to play the Spotify alternative?",
        shouldEndSession: false,
      },
    );
  }

  if (intent === "PauseMusicIntent") {
    return pauseSpotifyFromAlexa();
  }

  if (intent === "AddTaskIntent") {
    const task = slotValue(slots, "task");
    if (!task) {
      return alexaResponse("What task should I add?", { shouldEndSession: false });
    }
    const recommendation = await buildKaiRecommendation({
      state: {
        tasks: [
          {
            title: task,
            priority: "medium",
            source: "alexa",
          },
        ],
      },
      horizonHours: 10,
    });
    commandForRecommendation(
      recommendation,
      "show_recommendation",
      "alexa",
      `I added ${task} as the next possible focus block.`,
    );
    return alexaResponse(`I added ${task} as the next possible focus block.`, {
      shouldEndSession: false,
    });
  }

  return alexaResponse("I can suggest or start your next focus session.", {
    shouldEndSession: false,
  });
}

function alexaResponse(
  text: string,
  options: {
    attributes?: AlexaSessionAttributes;
    repromptText?: string;
    shouldEndSession?: boolean;
  } = {},
) {
  return {
    version: "1.0",
    sessionAttributes: options.attributes ?? {},
    response: {
      outputSpeech: text
        ? {
            type: "PlainText",
            text,
          }
        : undefined,
      reprompt:
        options.shouldEndSession === false
          ? {
              outputSpeech: {
                type: "PlainText",
                text: options.repromptText ?? "Want me to start it?",
              },
            }
          : undefined,
      shouldEndSession: options.shouldEndSession ?? true,
    },
  };
}

function speakRecommendation(recommendation: KaiRecommendation): string {
  const intro =
    recommendation.mode === "break"
      ? "I would take a reset block"
      : "I would focus";
  return `${intro} for ${recommendation.durationMinutes} minutes on ${recommendation.title}. ${sentence(recommendation.reason)}`;
}

function speakStarted(recommendation: KaiRecommendation): string {
  return `Starting ${recommendation.durationMinutes} minutes for ${recommendation.title}. If Kai is open in the browser, the timer will pick it up.`;
}

async function playSpotifyFromAlexa(query: string, allowCatalog: boolean) {
  const mode = resolveMusicMode(query);
  const normalizedQuery = mode?.query ?? (query.trim() || "deep focus instrumental");
  const canSearchCatalog = allowCatalog || mode?.allowCatalog === true;
  if (!spotifyConfigured()) {
    return alexaResponse("Spotify is not connected to Kai yet.", {
      shouldEndSession: true,
    });
  }

  try {
    const fromUserMusic = await searchUserMusic(normalizedQuery);
    let item: SpotifyPlayable | null = fromUserMusic;

    if (!item) {
      if (!canSearchCatalog) {
        return alexaResponse(
          `I did not find ${normalizedQuery} in your Spotify library or playlists. Should I search wider Spotify?`,
          {
            attributes: {
              pendingAction: "play_music_catalog",
              musicQuery: normalizedQuery,
            },
            repromptText: "Should I search wider Spotify?",
            shouldEndSession: false,
          },
        );
      }
      item = await searchSpotifyCatalog(normalizedQuery);
      if (!item) {
        return alexaResponse(`I could not find ${normalizedQuery} on Spotify.`, {
          shouldEndSession: true,
        });
      }
    }

    try {
      await playPlayable(item);
    } catch (e) {
      if (e instanceof Error && e.message === "no_active_device") {
        const devices = await getDevices();
        const names = devices.map((d) => d.name).filter(Boolean);
        return alexaResponse(
          `I found ${item.name}, but Spotify has no active device. Open Spotify first${names.length ? ` on ${names.join(", ")}` : ""}.`,
          { shouldEndSession: true },
        );
      }
      throw e;
    }

    return alexaResponse(
      `Playing ${mode ? `${mode.name}, ` : ""}${item.kind} ${item.name}${item.subtitle ? ` by ${item.subtitle}` : ""} from ${
        item.source === "library" ? "your Spotify library" : "Spotify"
      }.`,
      { shouldEndSession: true },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Spotify failed.";
    return alexaResponse(`Spotify error: ${message}`, { shouldEndSession: true });
  }
}

async function pauseSpotifyFromAlexa() {
  if (!spotifyConfigured()) {
    return alexaResponse("Spotify is not connected to Kai yet.", {
      shouldEndSession: true,
    });
  }
  try {
    await pausePlayback();
    return alexaResponse("Paused Spotify.", { shouldEndSession: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Spotify failed.";
    return alexaResponse(`Spotify error: ${message}`, { shouldEndSession: true });
  }
}

function isBrainFmRequest(query: string): boolean {
  return /\bbrain\s*\.?\s*f\s*m\b/i.test(query);
}

function brainFmFallbackQuery(query: string): string {
  if (/\bsleep\b/i.test(query)) return "sleep ambient instrumental";
  if (/\bmeditat|relax|calm\b/i.test(query)) return "calm ambient instrumental";
  return "deep focus instrumental";
}

function musicRequestAllowsCatalog(query: string): boolean {
  return /\b(spotify|playlist|radio|mix|lofi|lo-fi|instrumental|focus|study|work|ambient|worship|christian|deep work|brown noise|white noise|rain|ali|abdaal|brainwave|brainwaves|binaural|gamma|40hz|40 hz|lock in)\b/i.test(
    query,
  );
}

function sentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const capitalized = trimmed[0].toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

function slotValue(
  slots: Record<string, { value?: string }>,
  name: string,
): string | undefined {
  const value = slots[name]?.value?.trim();
  return value || undefined;
}

function freshTimestamp(timestamp?: string): boolean {
  if (!timestamp) return false;
  const time = Date.parse(timestamp);
  if (Number.isNaN(time)) return false;
  return Math.abs(Date.now() - time) <= 150_000;
}

async function validateAlexaRequest(req: Request, rawBody: string): Promise<boolean> {
  if (process.env.ALEXA_VERIFY_SIGNATURES?.trim() !== "true") return true;

  const certUrl = req.headers.get("SignatureCertChainUrl");
  const signature = req.headers.get("Signature-256");
  if (!certUrl || !signature || !validCertUrl(certUrl)) return false;

  const pem = await fetchCert(certUrl);
  if (!pem) return false;
  const certificate = new crypto.X509Certificate(pem);
  const now = Date.now();
  if (
    Date.parse(certificate.validFrom) > now ||
    Date.parse(certificate.validTo) < now
  ) {
    return false;
  }
  if (!certificate.checkHost("echo-api.amazon.com")) return false;

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(rawBody, "utf8");
  verifier.end();
  return verifier.verify(certificate.publicKey, signature, "base64");
}

function validCertUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const port = url.port || "443";
    return (
      url.protocol === "https:" &&
      url.hostname === "s3.amazonaws.com" &&
      port === "443" &&
      url.pathname.startsWith("/echo.api/")
    );
  } catch {
    return false;
  }
}

const globalForAlexa = globalThis as unknown as {
  __kaiAlexaCerts?: Map<string, { pem: string; expiresAt: number }>;
};

async function fetchCert(url: string): Promise<string | null> {
  if (!globalForAlexa.__kaiAlexaCerts) globalForAlexa.__kaiAlexaCerts = new Map();
  const cached = globalForAlexa.__kaiAlexaCerts.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.pem;
  const res = await fetch(url);
  if (!res.ok) return null;
  const pem = await res.text();
  globalForAlexa.__kaiAlexaCerts.set(url, {
    pem,
    expiresAt: Date.now() + 60 * 60_000,
  });
  return pem;
}
