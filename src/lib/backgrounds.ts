// Themes for the focus room.
//
// Three kinds live side by side:
//   gradient — layered CSS, weightless, always crisp
//   animated — CSS gradient plus a slow keyframe drift (the "ambient world" feel)
//   image    — a photo scene shipped as WebP
//
// Photo scenes are portrait (they came from phone-wallpaper sources), which is
// the wrong shape for a desktop screen. Rather than upscale a 736px-wide image
// across 2560px and get mush, the renderer shows the photo sharp at its own
// aspect and fills the sides with a blurred, scaled copy of itself — the trick
// music and video players use for mismatched artwork. On a portrait screen the
// photo simply covers, because there the shape already matches.
//
// Each theme carries a scrim level measured from the brightness of its top
// third, which is where the clock sits. Bright scenes get a heavier veil so the
// timer stays readable instead of vanishing into a sunset.

export type ThemeCategory =
  | "cozy"
  | "sunset"
  | "sky"
  | "study"
  | "gradient";

export type ScrimLevel = "soft" | "medium" | "strong";

export interface Theme {
  id: string;
  name: string;
  category: ThemeCategory;
  kind: "gradient" | "animated" | "image";
  /** CSS background for gradients, or the asset path for images. */
  value: string;
  scrim: ScrimLevel;
  /** For animated themes: the CSS class carrying the keyframes. */
  animation?: string;
}

export const CATEGORY_LABELS: Record<ThemeCategory, string> = {
  cozy: "Cozy",
  sunset: "Sunset",
  sky: "Sky",
  study: "Study",
  gradient: "Gradients",
};

/** Order the picker shows categories in. */
export const CATEGORY_ORDER: ThemeCategory[] = [
  "cozy",
  "sunset",
  "sky",
  "study",
  "gradient",
];

const photo = (
  id: string,
  name: string,
  category: ThemeCategory,
  scrim: ScrimLevel,
): Theme => ({
  id,
  name,
  category,
  kind: "image",
  value: `/backgrounds/${id}.webp`,
  scrim,
});

export const THEMES: Theme[] = [
  // ---- Cozy rooms
  photo("cozy-night-in", "Cozy Night In", "cozy", "soft"),
  photo("dreamy-night", "Dreamy Night", "cozy", "soft"),
  photo("city-balcony", "City Balcony", "cozy", "medium"),
  photo("evening-balcony", "Evening Balcony", "cozy", "medium"),
  photo("sea-window", "Sea Window", "cozy", "medium"),
  photo("blossom-window", "Blossom Window", "cozy", "strong"),
  photo("balcony-morning", "Balcony Morning", "cozy", "strong"),

  // ---- Sunsets
  photo("cave-arch", "Cave Arch", "sunset", "soft"),
  photo("shore-reading", "Shore Reading", "sunset", "medium"),
  photo("beach-picnic", "Beach Picnic", "sunset", "medium"),
  photo("palm-shore", "Palm Shore", "sunset", "medium"),
  photo("tulip-path", "Tulip Path", "sunset", "strong"),

  // ---- Skies
  photo("lamp-and-roses", "Lamp & Roses", "sky", "soft"),
  photo("pastel-sky", "Pastel Sky", "sky", "medium"),
  photo("swan-lake", "Swan Lake", "sky", "medium"),
  photo("pink-promenade", "Pink Promenade", "sky", "strong"),

  // ---- Study
  photo("green-park", "Green Park", "study", "soft"),
  photo("moonrise-desk", "Moonrise Desk", "study", "soft"),
  photo("study-desk", "Study Desk", "study", "strong"),

  // ---- Original photo set
  photo("late-night-desk", "Late Desk", "study", "soft"),
  photo("quiet-writing-desk", "Quiet Writing", "study", "medium"),
  photo("window-lamp", "Window Lamp", "study", "medium"),
  photo("library-lamps", "Library Lamps", "cozy", "medium"),
  photo("plant-desk", "Plant Desk", "study", "strong"),
  photo("sunlit-bookshelf", "Sunlit Study", "study", "strong"),

  // ---- Animated ambient worlds (no assets, pure CSS)
  {
    id: "aurora-drift",
    name: "Aurora Drift",
    category: "gradient",
    kind: "animated",
    animation: "anim-drift",
    scrim: "soft",
    value:
      "radial-gradient(60% 50% at 20% 30%, rgba(111,227,200,0.34), transparent 70%), radial-gradient(55% 45% at 80% 25%, rgba(182,166,255,0.38), transparent 70%), radial-gradient(70% 60% at 50% 90%, rgba(251,122,142,0.28), transparent 70%), linear-gradient(160deg, #0b1020 0%, #1b2445 55%, #2b1f43 100%)",
  },
  {
    id: "sunset-drift",
    name: "Slow Sunset",
    category: "gradient",
    kind: "animated",
    animation: "anim-drift",
    scrim: "medium",
    value:
      "radial-gradient(60% 50% at 75% 25%, rgba(255,183,146,0.5), transparent 70%), radial-gradient(55% 50% at 20% 70%, rgba(182,166,255,0.32), transparent 70%), linear-gradient(150deg, #23122a 0%, #6e294f 50%, #ff9f8f 115%)",
  },
  {
    id: "night-tide",
    name: "Night Tide",
    category: "gradient",
    kind: "animated",
    animation: "anim-sway",
    scrim: "soft",
    value:
      "radial-gradient(65% 55% at 30% 80%, rgba(80,212,232,0.26), transparent 70%), radial-gradient(50% 45% at 70% 20%, rgba(123,92,255,0.34), transparent 70%), linear-gradient(175deg, #060a16 0%, #10203f 55%, #1d3a63 100%)",
  },
  {
    id: "candlelight",
    name: "Candlelight",
    category: "gradient",
    kind: "animated",
    animation: "anim-glow",
    scrim: "soft",
    value:
      "radial-gradient(50% 45% at 50% 62%, rgba(255,196,128,0.38), transparent 70%), radial-gradient(60% 50% at 18% 22%, rgba(255,138,110,0.2), transparent 70%), linear-gradient(165deg, #140d12 0%, #35202a 55%, #5a3430 100%)",
  },

  // ---- Static gradients (the original set)
  {
    id: "violet-dawn",
    name: "Violet Dawn",
    category: "gradient",
    kind: "gradient",
    scrim: "soft",
    value:
      "radial-gradient(circle at 72% 18%, rgba(255, 217, 194, 0.46) 0%, rgba(255, 217, 194, 0) 30%), radial-gradient(circle at 18% 78%, rgba(111, 227, 200, 0.28) 0%, rgba(111, 227, 200, 0) 32%), linear-gradient(135deg, #151128 0%, #423071 43%, #ff8fb1 100%)",
  },
  {
    id: "aurora-lock-in",
    name: "Aurora",
    category: "gradient",
    kind: "gradient",
    scrim: "soft",
    value:
      "radial-gradient(circle at 78% 28%, rgba(255, 209, 188, 0.52) 0%, rgba(255, 209, 188, 0) 26%), radial-gradient(circle at 12% 78%, rgba(111, 227, 200, 0.34) 0%, rgba(111, 227, 200, 0) 30%), linear-gradient(120deg, #0f172a 0%, #19446b 37%, #7b5cff 72%, #ffd1bc 122%)",
  },
  {
    id: "rose-hour",
    name: "Rose Hour",
    category: "gradient",
    kind: "gradient",
    scrim: "soft",
    value:
      "radial-gradient(circle at 80% 18%, rgba(255, 183, 146, 0.56) 0%, rgba(255, 183, 146, 0) 29%), radial-gradient(circle at 20% 70%, rgba(182, 166, 255, 0.28) 0%, rgba(182, 166, 255, 0) 33%), linear-gradient(145deg, #241226 0%, #6e294f 46%, #ff9f8f 110%)",
  },
  {
    id: "deep-meadow",
    name: "Deep Meadow",
    category: "gradient",
    kind: "gradient",
    scrim: "soft",
    value:
      "radial-gradient(circle at 78% 20%, rgba(244, 195, 124, 0.48) 0%, rgba(244, 195, 124, 0) 30%), radial-gradient(circle at 16% 78%, rgba(80, 212, 164, 0.28) 0%, rgba(80, 212, 164, 0) 33%), linear-gradient(145deg, #111b1d 0%, #1f5a58 50%, #f4c37c 118%)",
  },
  {
    id: "midnight-study",
    name: "Midnight",
    category: "gradient",
    kind: "gradient",
    scrim: "soft",
    value:
      "radial-gradient(circle at 78% 24%, rgba(111, 227, 200, 0.35) 0%, rgba(111, 227, 200, 0) 28%), radial-gradient(circle at 18% 74%, rgba(123, 92, 255, 0.34) 0%, rgba(123, 92, 255, 0) 30%), linear-gradient(160deg, #090d18 0%, #1b2755 50%, #6fe3c8 128%)",
  },
  {
    id: "soft-sky",
    name: "Soft Sky",
    category: "gradient",
    kind: "gradient",
    scrim: "medium",
    value:
      "radial-gradient(circle at 72% 18%, rgba(246, 211, 189, 0.58) 0%, rgba(246, 211, 189, 0) 29%), radial-gradient(circle at 15% 80%, rgba(149, 218, 255, 0.27) 0%, rgba(149, 218, 255, 0) 34%), linear-gradient(145deg, #1d2440 0%, #6d8dd7 54%, #f6d3bd 116%)",
  },
];

export const DEFAULT_BACKGROUND =
  THEMES.find((t) => t.id === "cozy-night-in")?.value ?? THEMES[0].value;

const BY_VALUE = new Map(THEMES.map((t) => [t.value, t]));

/** The theme a stored background value refers to, if it's one of ours. */
export function resolveTheme(value: string): Theme | undefined {
  return BY_VALUE.get(value);
}

/** Video themes are stored as `youtube:<id>` so one setting covers every kind. */
export const YOUTUBE_PREFIX = "youtube:";

export function isVideoValue(value: string): boolean {
  return value.startsWith(YOUTUBE_PREFIX);
}

export function youtubeIdOf(value: string): string | null {
  return isVideoValue(value) ? value.slice(YOUTUBE_PREFIX.length) : null;
}

/**
 * Pull a video id out of whatever the user pasted — a watch link, a share
 * link, an embed link, or the bare id.
 */
export function parseYouTube(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  if (/^[\w-]{11}$/.test(text)) return text;
  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1];
  }
  return null;
}

/** True when the value should render as a photo rather than a CSS background. */
export function isImageValue(value: string): boolean {
  if (isVideoValue(value)) return false;
  return (
    value.startsWith("/backgrounds/") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:image/")
  );
}

/** Scrim for a value — anything we didn't measure gets the safe middle setting. */
export function scrimFor(value: string): ScrimLevel {
  const known = resolveTheme(value);
  if (known) return known.scrim;
  return isImageValue(value) || isVideoValue(value) ? "medium" : "soft";
}

/** Keyframe class for animated themes, or undefined. */
export function animationFor(value: string): string | undefined {
  return resolveTheme(value)?.animation;
}

/**
 * CSS background for a value. Images are handled by the photo layers, so this
 * only ever returns a real CSS background for gradients — and falls back to the
 * default if a persisted theme was removed in a later release.
 */
export function toCss(value: string): string {
  const theme = resolveTheme(value);
  if (theme && theme.kind !== "image") return theme.value;
  // Photos are drawn by the image layers; anything unrecognised falls back to
  // the base colour rather than a broken url().
  return "transparent";
}
