import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kai Focus",
    short_name: "Kai",
    description:
      "Adaptive AI focus coach for Pomodoro sessions, calendar planning, voice, Spotify music, and productivity trends.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#120f1f",
    theme_color: "#fb7a8e",
    icons: [
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
