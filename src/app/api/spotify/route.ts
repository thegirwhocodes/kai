import { NextResponse } from "next/server";
import {
  getDevices,
  pausePlayback,
  playPlayable,
  searchSpotifyCatalog,
  searchUserMusic,
  spotifyConfigured,
} from "@/lib/spotify/spotify";
import { resolveMusicMode } from "@/lib/music/modes";

export const runtime = "nodejs";

// Music actions for Kai. Honors the "library-first" rule: a play request
// searches saved tracks and user playlists first. It only touches the public
// catalog when the caller explicitly opts in (allowCatalog), so the agent can
// ask first unless the user already said "from Spotify" or "search Spotify."
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
      const rawQuery = String(body.query ?? "").trim();
      const mode = resolveMusicMode(rawQuery);
      const query = mode?.query ?? rawQuery;
      const allowCatalog = body.allowCatalog === true || mode?.allowCatalog === true;
      if (!query) {
        return NextResponse.json({ error: "missing_query" }, { status: 400 });
      }

      // 1) User music first: saved tracks and playlists.
      const fromUserMusic = await searchUserMusic(query);
      let item = fromUserMusic;

      // 2) Only fall through to the catalog when explicitly allowed.
      if (!item) {
        if (!allowCatalog) {
          return NextResponse.json({ notInLibrary: true, query: rawQuery || query });
        }
        item = await searchSpotifyCatalog(query);
        if (!item) {
          return NextResponse.json({ notFound: true, query: rawQuery || query });
        }
      }

      // 3) Play on the active device (e.g. an Echo, phone, or laptop).
      try {
        await playPlayable(item);
      } catch (e) {
        if (e instanceof Error && e.message === "no_active_device") {
          const devices = await getDevices();
          return NextResponse.json({
            noActiveDevice: true,
            item,
            devices: devices.map((d) => d.name),
          });
        }
        throw e;
      }

      return NextResponse.json({
        played: item,
        source: item.source,
        mode: mode?.id,
        query,
      });
    }

    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "spotify_error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
