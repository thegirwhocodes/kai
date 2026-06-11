import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { buildKaiRecommendation } from "@/lib/life/recommend";
import { commandForRecommendation } from "@/lib/server/commandQueue";
import type { KaiRecommendation } from "@/lib/types";

export const runtime = "nodejs";

interface AlexaEnvelope {
  version?: string;
  session?: {
    application?: { applicationId?: string };
    attributes?: Record<string, unknown>;
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

export async function POST(req: Request) {
  const rawBody = await req.text();
  if (!(await validateAlexaRequest(req, rawBody))) {
    return NextResponse.json({ error: "invalid_alexa_signature" }, { status: 401 });
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
  if (requestType === "LaunchRequest") {
    return alexaResponse(
      "Kai is here. You can ask what should I focus on next, or say start a focus session.",
      { shouldEndSession: false },
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
      "Try saying, what should I focus on next, or start a focus session.",
      { shouldEndSession: false },
    );
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
      attributes: { recommendationId: recommendation.id },
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
    attributes?: Record<string, unknown>;
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
                text: "Want me to start it?",
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
  if (process.env.ALEXA_VERIFY_SIGNATURES !== "true") return true;

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
