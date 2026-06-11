import { NextResponse } from "next/server";
import { searchWeb } from "@/lib/web/search";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: {
    query?: string;
    maxResults?: number;
    domains?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json({ error: "missing_query" }, { status: 400 });
  }

  try {
    const result = await searchWeb({
      query,
      maxResults: body.maxResults,
      domains: body.domains,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "search_error" },
      { status: 502 },
    );
  }
}
