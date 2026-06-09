import { NextResponse } from "next/server";
import {
  getDevices,
  pausePlayback,
  play,
  searchCatalog,
  searchLibrary,
  spotifyConfigured,
} from "@/lib/spotify/spotify";

export const runtime = "nodejs";

// Music actions for Kai. Honors the "library-first" rule: a play request
// searches saved tracks first and will NOT touch the catalog unless the caller
// explicitly opts in (allowCatalog) — so the agent can ask the user first.
//
// Body: { action: "play" | "pause", query?, allowCatalog? }

export async function POST(req: Request) {
  if (!spotifyConfigured()) {
    return NextResponse.json({ error: "spotify_not_connected" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    if (body.action === "pause") {
      await pausePlayback();
      return NextResponse.json({ paused: true });
    }

    if (body.action === "play") {
      const query = String(body.query ?? "").trim();
      const allowCatalog = body.allowCatalog === true;
      if (!query) {
        return NextResponse.json({ error: "missing_query" }, { status: 400 });
      }

      // 1) Library first.
      const fromLib = await searchLibrary(query);
      let track = fromLib;

      // 2) Only fall through to the catalog when explicitly allowed.
      if (!track) {
        if (!allowCatalog) {
          return NextResponse.json({ notInLibrary: true, query });
        }
        track = await searchCatalog(query);
        if (!track) {
          return NextResponse.json({ notFound: true, query });
        }
      }

      // 3) Play on the active device (e.g. an Echo, phone, or laptop).
      try {
        await play(track.uri);
      } catch (e) {
        if (e instanceof Error && e.message === "no_active_device") {
          const devices = await getDevices();
          return NextResponse.json({
            noActiveDevice: true,
            track,
            devices: devices.map((d) => d.name),
          });
        }
        throw e;
      }

      return NextResponse.json({ played: track, source: track.source });
    }

    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "spotify_error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
