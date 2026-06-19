export interface MusicMode {
  id: string;
  name: string;
  prompt: string;
  description: string;
  query: string;
  allowCatalog: boolean;
}

export const MUSIC_MODES: MusicMode[] = [
  {
    id: "ali-lock-in",
    name: "Lock-in waves",
    prompt: "Ali-style deep focus",
    description: "Instrumental study music with brainwave, binaural, and deep-work cues.",
    query: "deep focus binaural beats instrumental study music 40Hz",
    allowCatalog: true,
  },
  {
    id: "christian-lofi",
    name: "Christian lofi",
    prompt: "Your Christian lofi playlist",
    description: "Searches your Spotify playlists first, then Spotify if needed.",
    query: "Christian lofi instrumental",
    allowCatalog: true,
  },
  {
    id: "quiet-lofi",
    name: "Quiet lofi",
    prompt: "Low-friction study beats",
    description: "Soft, lyric-free beats for ordinary focus blocks.",
    query: "lofi instrumental study beats",
    allowCatalog: true,
  },
];

export function resolveMusicMode(input: string): MusicMode | null {
  const q = input.toLowerCase();
  if (/\b(ali|abdaal|brain\s?wave|binaural|40\s?hz|gamma|instant lock|lock in|deep focus)\b/.test(q)) {
    return MUSIC_MODES[0];
  }
  if (/\b(christian|worship|faith).*\b(lofi|lo-fi|instrumental|beats|playlist)\b/.test(q)) {
    return MUSIC_MODES[1];
  }
  return null;
}
