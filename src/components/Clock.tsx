"use client";

import { useEffect, useState } from "react";

// Big live clock, Flocus-style (12h, no leading zero — "1:12").
export function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const first = window.setTimeout(() => setNow(new Date()), 0);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  if (!now) return null;
  let h = now.getHours() % 12;
  if (h === 0) h = 12;
  const m = now.getMinutes().toString().padStart(2, "0");
  return (
    <span className="clock-num text-8xl sm:text-[9rem] lg:text-[11rem]">
      {h}:{m}
    </span>
  );
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function greeting(name = "Naomi"): string {
  const d = new Date();
  return `Hey ${name}, ${DAYS[d.getDay()]}'s looking good on you`;
}
