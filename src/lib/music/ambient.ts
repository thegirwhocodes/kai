// Client-side ambient focus sounds, generated with the Web Audio API.
// No files, no network, no account — works offline and instantly. Honest
// labels: these are generated noise textures (filtered brown/pink noise),
// not field recordings, so we never claim they're a real cafe or rainstorm.
//
// The mixer is a module-level singleton so sound keeps playing when the panel
// closes, and several textures can layer at once with their own levels.

export type AmbientKind = "rain" | "brown" | "pink" | "waves" | "wind";

export interface AmbientPreset {
  id: AmbientKind;
  name: string;
  description: string;
}

export const AMBIENT_PRESETS: AmbientPreset[] = [
  { id: "rain", name: "Rainfall", description: "Soft, low rain-like wash." },
  { id: "brown", name: "Brown noise", description: "Deep, steady focus hum." },
  { id: "pink", name: "Soft static", description: "Gentle pink-noise blanket." },
  { id: "waves", name: "Slow waves", description: "Low swell that rises and falls." },
  { id: "wind", name: "Night wind", description: "Airy, drifting high texture." },
];

/** Per-texture voicing: filter shape plus an optional slow movement. */
const VOICES: Record<
  AmbientKind,
  {
    noise: "brown" | "pink";
    filter: BiquadFilterType;
    frequency: number;
    q?: number;
    gainScale: number;
    /** Slow LFO so a texture breathes instead of sitting flat. */
    sway?: { target: "gain" | "frequency"; hz: number; depth: number };
  }
> = {
  rain: { noise: "brown", filter: "lowpass", frequency: 520, gainScale: 1 },
  brown: { noise: "brown", filter: "lowpass", frequency: 1200, gainScale: 1 },
  pink: { noise: "pink", filter: "lowpass", frequency: 5200, gainScale: 0.7 },
  waves: {
    noise: "brown",
    filter: "lowpass",
    frequency: 420,
    gainScale: 1.1,
    sway: { target: "gain", hz: 0.08, depth: 0.55 },
  },
  wind: {
    noise: "pink",
    filter: "bandpass",
    frequency: 900,
    q: 0.7,
    gainScale: 1.4,
    sway: { target: "frequency", hz: 0.05, depth: 420 },
  },
};

function makeNoiseBuffer(
  ctx: AudioContext,
  kind: "brown" | "pink",
  seconds = 6,
): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (kind === "pink") {
    // Paul Kellet's pink-noise approximation.
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else {
    let last = 0;
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return buffer;
}

interface Channel {
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  lfo?: OscillatorNode;
  lfoGain?: GainNode;
  level: number;
}

/** A layered ambient-noise player. One per page, created lazily. */
class AmbientMixer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private channels = new Map<AmbientKind, Channel>();
  private masterVolume = 1;

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.masterVolume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  /** Set a texture's level, 0–1. Zero stops and frees it. */
  set(kind: AmbientKind, level: number) {
    const clamped = Math.max(0, Math.min(1, level));
    if (clamped <= 0) return this.stop(kind);

    const existing = this.channels.get(kind);
    if (existing) {
      existing.level = clamped;
      existing.gain.gain.value = clamped * VOICES[kind].gainScale;
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const voice = VOICES[kind];

    const source = ctx.createBufferSource();
    source.buffer = makeNoiseBuffer(ctx, voice.noise);
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = voice.filter;
    filter.frequency.value = voice.frequency;
    if (voice.q != null) filter.Q.value = voice.q;

    const gain = ctx.createGain();
    gain.gain.value = clamped * voice.gainScale;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start();

    const channel: Channel = { source, filter, gain, level: clamped };

    if (voice.sway) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = voice.sway.hz;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = voice.sway.depth;
      lfo.connect(lfoGain);
      lfoGain.connect(
        voice.sway.target === "gain" ? gain.gain : filter.frequency,
      );
      lfo.start();
      channel.lfo = lfo;
      channel.lfoGain = lfoGain;
    }

    this.channels.set(kind, channel);
  }

  stop(kind: AmbientKind) {
    const channel = this.channels.get(kind);
    if (!channel) return;
    try {
      channel.source.stop();
      channel.lfo?.stop();
    } catch {
      // already stopped
    }
    channel.source.disconnect();
    channel.filter.disconnect();
    channel.gain.disconnect();
    channel.lfo?.disconnect();
    channel.lfoGain?.disconnect();
    this.channels.delete(kind);
  }

  stopAll() {
    for (const kind of [...this.channels.keys()]) this.stop(kind);
  }

  /** Apply a whole level map at once (e.g. restoring persisted settings). */
  apply(levels: Record<string, number>) {
    for (const preset of AMBIENT_PRESETS) {
      this.set(preset.id, levels[preset.id] ?? 0);
    }
  }

  setMasterVolume(v: number) {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.masterVolume;
  }

  isPlaying(kind: AmbientKind): boolean {
    return this.channels.has(kind);
  }

  get playingCount(): number {
    return this.channels.size;
  }
}

export const ambientMixer = new AmbientMixer();
