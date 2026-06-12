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

export type SpotifyItemKind = "track" | "playlist" | "album" | "artist";

export interface SpotifyPlayable {
  uri: string;
  name: string;
  subtitle: string;
  kind: SpotifyItemKind;
  source: "library" | "catalog";
  score: number;
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

function scoreMatch(query: string, name: string, subtitle = "", kind?: SpotifyItemKind): number {
  const q = norm(query);
  const hay = norm(`${name} ${subtitle}`);
  const words = q.split(/\s+/).filter(Boolean);
  if (!q || !hay) return 0;

  let score = 0;
  if (hay === q) score += 100;
  if (hay.includes(q)) score += 60;
  for (const word of words) {
    if (hay.includes(word)) score += 10;
  }

  // Generic mood/genre requests usually mean "find me a playlist or station."
  const genericIntent = /\b(lofi|lo-fi|instrumental|focus|study|work|ambient|worship|christian|playlist|radio|mix|beats|deep work)\b/i.test(
    query,
  );
  if (genericIntent && kind === "playlist") score += 24;
  if (genericIntent && kind === "album") score += 8;
  if (!genericIntent && kind === "track") score += 16;

  return score;
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

/** Search saved tracks and the user's playlists before touching the public catalog. */
export async function searchUserMusic(query: string): Promise<SpotifyPlayable | null> {
  const [playlist, track] = await Promise.all([
    searchUserPlaylists(query),
    searchSavedTrack(query),
  ]);
  const candidates = [playlist, track].filter(
    (item): item is SpotifyPlayable => !!item,
  );
  return candidates.sort((a, b) => b.score - a.score)[0] ?? null;
}

export async function searchSavedTrack(query: string): Promise<SpotifyPlayable | null> {
  const track = await searchLibrary(query);
  if (!track) return null;
  return {
    uri: track.uri,
    name: track.name,
    subtitle: track.artists,
    kind: "track",
    source: "library",
    score: scoreMatch(query, track.name, track.artists, "track"),
  };
}

export async function searchUserPlaylists(
  query: string,
  maxPages = 4,
): Promise<SpotifyPlayable | null> {
  const token = await accessToken();
  let best: SpotifyPlayable | null = null;
  for (let page = 0; page < maxPages; page++) {
    const url =
      "https://api.spotify.com/v1/me/playlists?" +
      new URLSearchParams({ limit: "50", offset: String(page * 50) });
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) break;
    const data = await res.json();
    const items = data.items ?? [];
    for (const playlist of items) {
      if (!playlist?.uri || !playlist?.name) continue;
      const owner = playlist.owner?.display_name ?? "playlist";
      const score = scoreMatch(query, playlist.name, owner, "playlist");
      if (score > (best?.score ?? 0)) {
        best = {
          uri: playlist.uri,
          name: playlist.name,
          subtitle: owner,
          kind: "playlist",
          source: "library",
          score,
        };
      }
    }
    if (items.length < 50) break;
  }
  return best && best.score >= 20 ? best : null;
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

/** Search public Spotify for the best playable match across playlists, tracks, albums, and artists. */
export async function searchSpotifyCatalog(query: string): Promise<SpotifyPlayable | null> {
  const token = await accessToken();
  const url =
    "https://api.spotify.com/v1/search?" +
    new URLSearchParams({
      q: query,
      type: "playlist,track,album,artist",
      limit: "5",
    });
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const data = await res.json();
  const candidates: SpotifyPlayable[] = [];

  for (const playlist of data.playlists?.items ?? []) {
    if (!playlist?.uri || !playlist?.name) continue;
    const owner = playlist.owner?.display_name ?? "playlist";
    candidates.push({
      uri: playlist.uri,
      name: playlist.name,
      subtitle: owner,
      kind: "playlist",
      source: "catalog",
      score: scoreMatch(query, playlist.name, owner, "playlist"),
    });
  }
  for (const track of data.tracks?.items ?? []) {
    if (!track?.uri || !track?.name) continue;
    const artists = (track.artists ?? [])
      .map((a: { name: string }) => a.name)
      .join(", ");
    candidates.push({
      uri: track.uri,
      name: track.name,
      subtitle: artists,
      kind: "track",
      source: "catalog",
      score: scoreMatch(query, track.name, artists, "track"),
    });
  }
  for (const album of data.albums?.items ?? []) {
    if (!album?.uri || !album?.name) continue;
    const artists = (album.artists ?? [])
      .map((a: { name: string }) => a.name)
      .join(", ");
    candidates.push({
      uri: album.uri,
      name: album.name,
      subtitle: artists,
      kind: "album",
      source: "catalog",
      score: scoreMatch(query, album.name, artists, "album"),
    });
  }
  for (const artist of data.artists?.items ?? []) {
    if (!artist?.uri || !artist?.name) continue;
    candidates.push({
      uri: artist.uri,
      name: artist.name,
      subtitle: "artist",
      kind: "artist",
      source: "catalog",
      score: scoreMatch(query, artist.name, "artist", "artist"),
    });
  }

  return candidates.sort((a, b) => b.score - a.score)[0] ?? null;
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

/** Start playback of a track, playlist, album, or artist uri. */
export async function playPlayable(item: SpotifyPlayable, deviceId?: string): Promise<void> {
  const token = await accessToken();
  const url =
    "https://api.spotify.com/v1/me/player/play" +
    (deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "");
  const body =
    item.kind === "track" ? { uris: [item.uri] } : { context_uri: item.uri };
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
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
