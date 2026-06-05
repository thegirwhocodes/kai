export function mmss(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export const KIND_LABEL: Record<string, string> = {
  focus: "Focus",
  short_break: "Short break",
  long_break: "Long break",
};
