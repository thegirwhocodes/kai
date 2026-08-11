import { NextResponse } from "next/server";
import { isOwnerRequest } from "@/lib/server/owner";
import {
  buildKaiRecommendation,
  type RecommendationState,
} from "@/lib/life/recommend";

export const runtime = "nodejs";

// Planning is open to everyone, but only the owner's own browser gets planning
// that reads the connected Google accounts. For everyone else this falls back
// to task-only planning — never another person's calendar or inbox.

export async function GET(req: Request) {
  try {
    const recommendation = await buildKaiRecommendation({
      allowIntegrations: isOwnerRequest(req),
    });
    return NextResponse.json({ recommendation });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "recommendation_error" },
      { status: 502 },
    );
  }
}

export async function POST(req: Request) {
  let body: {
    state?: RecommendationState;
    horizonHours?: number;
    intent?: "next_session" | "plan_day";
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const recommendation = await buildKaiRecommendation({
      state: body.state,
      horizonHours: body.horizonHours,
      intent: body.intent,
      allowIntegrations: isOwnerRequest(req),
    });
    return NextResponse.json({ recommendation });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "recommendation_error" },
      { status: 502 },
    );
  }
}
