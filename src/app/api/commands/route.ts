import { NextResponse } from "next/server";
import { listKaiCommands } from "@/lib/server/commandQueue";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const after = Number(url.searchParams.get("after") ?? 0);
  return NextResponse.json({
    commands: listKaiCommands(Number.isFinite(after) ? after : 0),
  });
}
