import { describe, expect, it } from "vitest";
import {
  DEFAULT_BACKGROUND,
  THEMES,
  isImageValue,
  isVideoValue,
  parseYouTube,
  resolveTheme,
  scrimFor,
  toCss,
  youtubeIdOf,
} from "../backgrounds";

describe("theme library", () => {
  it("has unique ids and unique values", () => {
    const ids = THEMES.map((t) => t.id);
    const values = THEMES.map((t) => t.value);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(values).size).toBe(values.length);
  });

  it("points every photo theme at a webp under /backgrounds", () => {
    for (const t of THEMES.filter((t) => t.kind === "image")) {
      expect(t.value).toMatch(/^\/backgrounds\/[a-z0-9-]+\.webp$/);
    }
  });

  it("only marks animated themes with an animation class", () => {
    for (const t of THEMES) {
      if (t.kind === "animated") expect(t.animation).toBeTruthy();
      else expect(t.animation).toBeUndefined();
    }
  });

  it("ships a resolvable default", () => {
    expect(resolveTheme(DEFAULT_BACKGROUND)).toBeDefined();
  });
});

describe("value classification", () => {
  it("recognises photos, including a user's own", () => {
    expect(isImageValue("/backgrounds/cozy-night-in.webp")).toBe(true);
    expect(isImageValue("https://example.com/a.jpg")).toBe(true);
    expect(isImageValue("data:image/png;base64,AAAA")).toBe(true);
    expect(isImageValue("linear-gradient(#000,#fff)")).toBe(false);
  });

  it("never treats a video as an image", () => {
    expect(isVideoValue("youtube:dQw4w9WgXcQ")).toBe(true);
    expect(isImageValue("youtube:dQw4w9WgXcQ")).toBe(false);
    expect(youtubeIdOf("youtube:dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeIdOf("/backgrounds/x.webp")).toBeNull();
  });

  it("returns a CSS background only for CSS themes", () => {
    const gradient = THEMES.find((t) => t.kind === "gradient")!;
    expect(toCss(gradient.value)).toBe(gradient.value);
    expect(toCss("/backgrounds/cozy-night-in.webp")).toBe("transparent");
    expect(toCss("youtube:dQw4w9WgXcQ")).toBe("transparent");
  });

  it("gives unmeasured backgrounds the safe middle scrim", () => {
    expect(scrimFor("/backgrounds/cozy-night-in.webp")).toBe("soft");
    expect(scrimFor("https://example.com/unknown.jpg")).toBe("medium");
    expect(scrimFor("youtube:dQw4w9WgXcQ")).toBe("medium");
  });
});

describe("parseYouTube", () => {
  it("accepts every link shape YouTube hands out", () => {
    const id = "dQw4w9WgXcQ";
    expect(parseYouTube(id)).toBe(id);
    expect(parseYouTube(`https://www.youtube.com/watch?v=${id}`)).toBe(id);
    expect(parseYouTube(`https://www.youtube.com/watch?v=${id}&t=42s`)).toBe(id);
    expect(parseYouTube(`https://youtu.be/${id}`)).toBe(id);
    expect(parseYouTube(`https://youtu.be/${id}?si=abc`)).toBe(id);
    expect(parseYouTube(`https://www.youtube.com/embed/${id}`)).toBe(id);
    expect(parseYouTube(`https://www.youtube.com/live/${id}`)).toBe(id);
    expect(parseYouTube(`  https://m.youtube.com/watch?v=${id}  `)).toBe(id);
  });

  it("rejects anything that isn't a video link", () => {
    expect(parseYouTube("")).toBeNull();
    expect(parseYouTube("https://example.com")).toBeNull();
    expect(parseYouTube("https://www.youtube.com/@somechannel")).toBeNull();
    expect(parseYouTube("not a url")).toBeNull();
  });
});
