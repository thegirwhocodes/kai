import { NextResponse } from "next/server";
import {
  buildKaiRecommendation,
  type RecommendationState,
} from "@/lib/life/recommend";

export const runtime = "nodejs";

export async function GET() {
  try {
    const recommendation = await buildKaiRecommendation();
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
    });
    return NextResponse.json({ recommendation });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "recommendation_error" },
      { status: 502 },
    );
  }
}
