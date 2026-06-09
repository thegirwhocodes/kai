// Server-side Spotify access for Kai. Refresh-token -> access token; secrets
// stay server-side. Premium account required for playback control (a Spotify
// rule). Single-user (Naomi's own account).
//
// Env:
//   SPOTIFY_CLIENT_ID
//   SPOTIFY_CLIENT_SECRET
//   SPOTIFY_REFRESH_TOKEN

export interface Track {
  uri: string;
  name: string;
  artists: string;
  source: "library" | "catalog";
}

export function spotifyConfigured(): boolean {
  return !!(
    process.env.SPOTIFY_CLIENT_ID &&
    process.env.SPOTIFY_CLIENT_SECRET &&
    process.env.SPOTIFY_REFRESH_TOKEN
  );
}

export async function accessToken(): Promise<string> {
  const basic = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
  ).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN!,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Spotify token refresh failed: ${data.error ?? res.status}`);
  }
  return data.access_token as string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();

function matches(query: string, name: string, artists: string): boolean {
  const q = norm(query);
  const hay = norm(`${name} ${artists}`);
  if (hay.includes(q)) return true;
  // all query words present
  const words = q.split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((w) => hay.includes(w));
}

/**
 * Search the user's SAVED tracks (their library) first. Pages through up to
 * ~`maxPages`*50 saved tracks looking for a match. Returns the first match.
 */
export async function searchLibrary(
  query: string,
  maxPages = 6,
): Promise<Track | null> {
  const token = await accessToken();
  for (let page = 0; page < maxPages; page++) {
    const url =
      "https://api.spotify.com/v1/me/tracks?" +
      new URLSearchParams({ limit: "50", offset: String(page * 50) });
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) break;
    const data = await res.json();
    const items = data.items ?? [];
    for (const it of items) {
      const t = it.track;
      if (!t?.uri) continue;
      const artists = (t.artists ?? []).map((a: { name: string }) => a.name).join(", ");
      if (matches(query, t.name, artists)) {
        return { uri: t.uri, name: t.name, artists, source: "library" };
      }
    }
    if (items.length < 50) break; // no more pages
  }
  return null;
}

/** Search the public Spotify catalog. Returns the top track match. */
export async function searchCatalog(query: string): Promise<Track | null> {
  const token = await accessToken();
  const url =
    "https://api.spotify.com/v1/search?" +
    new URLSearchParams({ q: query, type: "track", limit: "1" });
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const data = await res.json();
  const t = data.tracks?.items?.[0];
  if (!t?.uri) return null;
  const artists = (t.artists ?? []).map((a: { name: string }) => a.name).join(", ");
  return { uri: t.uri, name: t.name, artists, source: "catalog" };
}

export async function getDevices(): Promise<
  { id: string; name: string; is_active: boolean }[]
> {
  const token = await accessToken();
  const res = await fetch("https://api.spotify.com/v1/me/player/devices", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.devices ?? [];
}

/** Start playback of a track uri, optionally on a specific device. */
export async function play(uri: string, deviceId?: string): Promise<void> {
  const token = await accessToken();
  const url =
    "https://api.spotify.com/v1/me/player/play" +
    (deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "");
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uris: [uri] }),
  });
  // 204 = success. 404 = no active device.
  if (res.status === 404) {
    throw new Error("no_active_device");
  }
  if (!res.ok && res.status !== 204) {
    const d = await res.text();
    throw new Error(`play failed: ${res.status} ${d.slice(0, 200)}`);
  }
}

export async function pausePlayback(): Promise<void> {
  const token = await accessToken();
  await fetch("https://api.spotify.com/v1/me/player/pause", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
}
