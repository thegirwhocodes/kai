"use client";

import { useEffect, useState } from "react";

const QUOTES = [
  "Embrace the pace of your own journey",
  "Small steps, every day",
  "You can do hard things, gently",
  "Progress over perfection",
  "One focused block at a time",
  "Rest is part of the work",
  "Begin where you are",
  "Your attention is a gift — spend it kindly",
];

// A soft rotating quote, top-right (Flocus-style). Picks by the hour so it's
// stable within a session but changes through the day.
export function Quote() {
  const [q, setQ] = useState("");
  useEffect(() => {
    const id = window.setTimeout(
      () => setQ(QUOTES[new Date().getHours() % QUOTES.length]),
      0,
    );
    return () => window.clearTimeout(id);
  }, []);
  if (!q) return null;
  return (
    <p
      className="max-w-[15rem] text-right text-base font-light italic leading-snug sm:text-lg"
      style={{ color: "var(--foreground)" }}
    >
      &ldquo;{q}&rdquo;
    </p>
  );
}
