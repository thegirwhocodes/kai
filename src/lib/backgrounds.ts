// Real high-res background photos (downloaded from Unsplash into /public).
// The user can also paste any image URL, stored as-is.

export interface Background {
  id: string;
  name: string;
  src: string; // path under /public
}

export const BACKGROUNDS: Background[] = [
  { id: "pink-bloom", name: "Pink Bloom", src: "/backgrounds/pink-bloom.jpg" },
  { id: "ghibli-forest", name: "Forest Glade", src: "/backgrounds/ghibli-forest.jpg" },
  { id: "ghibli-sunset", name: "Anime Sunset", src: "/backgrounds/ghibli-sunset.jpg" },
  { id: "pink-clouds", name: "Pink Clouds", src: "/backgrounds/pink-clouds.jpg" },
  { id: "sakura-girl", name: "Sakura", src: "/backgrounds/sakura-girl.jpg" },
  { id: "kimono-glow", name: "Golden Hour", src: "/backgrounds/kimono-glow.jpg" },
  { id: "beach-dusk", name: "Quiet Shore", src: "/backgrounds/beach-dusk.jpg" },
  { id: "starry-night", name: "Starry Night", src: "/backgrounds/starry-night.jpg" },
];

export const DEFAULT_BACKGROUND = "/backgrounds/pink-bloom.jpg";

const KNOWN = new Set(BACKGROUNDS.map((b) => b.src));

/** Turn a stored background value (path or pasted URL) into a CSS background. */
export function toCss(bg: string): string {
  let v = bg || DEFAULT_BACKGROUND;
  // A persisted /backgrounds/* path that no longer exists (an old preset we
  // removed) would 404 — fall back to the current default. Pasted http(s)
  // URLs are always honored.
  if (v.startsWith("/backgrounds/") && !KNOWN.has(v)) v = DEFAULT_BACKGROUND;
  return `url("${v}") center / cover no-repeat fixed`;
}
