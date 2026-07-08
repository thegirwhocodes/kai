// Ambient background presets. Layered gradients come first because they feel
// closer to Flocus: polished, legible, and calm without depending on busy
// photos. The user can also paste any image URL, stored as-is.

export interface Background {
  id: string;
  name: string;
  value: string;
  kind: "gradient" | "image";
}

export const BACKGROUNDS: Background[] = [
  {
    id: "violet-dawn",
    name: "Violet Dawn",
    kind: "gradient",
    value:
      "radial-gradient(circle at 72% 18%, rgba(255, 217, 194, 0.46) 0%, rgba(255, 217, 194, 0) 30%), radial-gradient(circle at 18% 78%, rgba(111, 227, 200, 0.28) 0%, rgba(111, 227, 200, 0) 32%), linear-gradient(135deg, #151128 0%, #423071 43%, #ff8fb1 100%)",
  },
  {
    id: "aurora-lock-in",
    name: "Aurora",
    kind: "gradient",
    value:
      "radial-gradient(circle at 78% 28%, rgba(255, 209, 188, 0.52) 0%, rgba(255, 209, 188, 0) 26%), radial-gradient(circle at 12% 78%, rgba(111, 227, 200, 0.34) 0%, rgba(111, 227, 200, 0) 30%), linear-gradient(120deg, #0f172a 0%, #19446b 37%, #7b5cff 72%, #ffd1bc 122%)",
  },
  {
    id: "rose-hour",
    name: "Rose Hour",
    kind: "gradient",
    value:
      "radial-gradient(circle at 80% 18%, rgba(255, 183, 146, 0.56) 0%, rgba(255, 183, 146, 0) 29%), radial-gradient(circle at 20% 70%, rgba(182, 166, 255, 0.28) 0%, rgba(182, 166, 255, 0) 33%), linear-gradient(145deg, #241226 0%, #6e294f 46%, #ff9f8f 110%)",
  },
  {
    id: "deep-meadow",
    name: "Deep Meadow",
    kind: "gradient",
    value:
      "radial-gradient(circle at 78% 20%, rgba(244, 195, 124, 0.48) 0%, rgba(244, 195, 124, 0) 30%), radial-gradient(circle at 16% 78%, rgba(80, 212, 164, 0.28) 0%, rgba(80, 212, 164, 0) 33%), linear-gradient(145deg, #111b1d 0%, #1f5a58 50%, #f4c37c 118%)",
  },
  {
    id: "midnight-study",
    name: "Midnight",
    kind: "gradient",
    value:
      "radial-gradient(circle at 78% 24%, rgba(111, 227, 200, 0.35) 0%, rgba(111, 227, 200, 0) 28%), radial-gradient(circle at 18% 74%, rgba(123, 92, 255, 0.34) 0%, rgba(123, 92, 255, 0) 30%), linear-gradient(160deg, #090d18 0%, #1b2755 50%, #6fe3c8 128%)",
  },
  {
    id: "soft-sky",
    name: "Soft Sky",
    kind: "gradient",
    value:
      "radial-gradient(circle at 72% 18%, rgba(246, 211, 189, 0.58) 0%, rgba(246, 211, 189, 0) 29%), radial-gradient(circle at 15% 80%, rgba(149, 218, 255, 0.27) 0%, rgba(149, 218, 255, 0) 34%), linear-gradient(145deg, #1d2440 0%, #6d8dd7 54%, #f6d3bd 116%)",
  },
  {
    id: "late-night-desk",
    name: "Late Desk",
    kind: "image",
    value: "/backgrounds/late-night-desk.jpg",
  },
  {
    id: "sunlit-bookshelf",
    name: "Sunlit Study",
    kind: "image",
    value: "/backgrounds/sunlit-bookshelf.jpg",
  },
  { id: "library-lamps", name: "Library Lamps", kind: "image", value: "/backgrounds/library-lamps.jpg" },
  { id: "window-lamp", name: "Window Lamp", kind: "image", value: "/backgrounds/window-lamp.jpg" },
  {
    id: "quiet-writing-desk",
    name: "Quiet Writing",
    kind: "image",
    value: "/backgrounds/quiet-writing-desk.jpg",
  },
  { id: "plant-desk", name: "Plant Desk", kind: "image", value: "/backgrounds/plant-desk.jpg" },
];

export const DEFAULT_BACKGROUND = BACKGROUNDS[0].value;

const KNOWN_IMAGES = new Set(
  BACKGROUNDS.filter((b) => b.kind === "image").map((b) => b.value),
);
const KNOWN_PRESETS = new Set(BACKGROUNDS.map((b) => b.value));

/** Turn a stored background value (path or pasted URL) into a CSS background. */
export function toCss(bg: string): string {
  let v = bg || DEFAULT_BACKGROUND;
  if (KNOWN_PRESETS.has(v) && !v.startsWith("/")) return v;
  // A persisted /backgrounds/* path that no longer exists (an old preset we
  // removed) would 404 — fall back to the current default. Pasted http(s)
  // URLs are always honored.
  if (v.startsWith("/backgrounds/") && !KNOWN_IMAGES.has(v)) v = DEFAULT_BACKGROUND;
  if (!v.startsWith("/") && !v.startsWith("http")) return v;
  return `url("${v}") center / cover no-repeat fixed`;
}
