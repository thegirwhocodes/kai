// Real high-res background photos (downloaded from Unsplash into /public).
// The user can also paste any image URL, stored as-is.

export interface Background {
  id: string;
  name: string;
  src: string; // path under /public
}

export const BACKGROUNDS: Background[] = [
  { id: "sky-pastel", name: "Pastel Sky", src: "/backgrounds/sky-pastel.jpg" },
  { id: "clouds-sunset", name: "Sunset Clouds", src: "/backgrounds/clouds-sunset.jpg" },
  { id: "sakura", name: "Sakura", src: "/backgrounds/sakura.jpg" },
  { id: "sakura-path", name: "Blossom Path", src: "/backgrounds/sakura-path.jpg" },
  { id: "sky-lilac", name: "Lilac Sky", src: "/backgrounds/sky-lilac.jpg" },
  { id: "sunset-glow", name: "Golden Hour", src: "/backgrounds/sunset-glow.jpg" },
  { id: "mountains-fog", name: "Misty Peaks", src: "/backgrounds/mountains-fog.jpg" },
  { id: "peaks-cloud", name: "Cloud Peaks", src: "/backgrounds/peaks-cloud.jpg" },
];

export const DEFAULT_BACKGROUND = "/backgrounds/sky-pastel.jpg";

/** Turn a stored background value (path or pasted URL) into a CSS background. */
export function toCss(bg: string): string {
  const v = bg || DEFAULT_BACKGROUND;
  return `url("${v}") center / cover no-repeat fixed`;
}
