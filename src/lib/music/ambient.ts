// Client-side ambient focus sounds, generated with the Web Audio API.
// No files, no network, no account — works offline and instantly. Honest
// labels: these are generated noise textures (filtered brown/pink noise),
// not field recordings, so we never claim they're a real cafe or rainstorm.

export type AmbientKind = "rain" | "brown" | "pink";

export interface AmbientPreset {
  id: AmbientKind;
  name: string;
  description: string;
}

export const AMBIENT_PRESETS: AmbientPreset[] = [
  { id: "rain", name: "Rainfall", description: "Soft, low rain-like wash." },
  { id: "brown", name: "Brown noise", description: "Deep, steady focus hum." },
  { id: "pink", name: "Soft static", description: "Gentle pink-noise blanket." },
];

function makeNoiseBuffer(
  ctx: AudioContext,
  kind: AmbientKind,
  seconds = 4,
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
    // Brown noise — also the base for "rain", which adds a heavier lowpass.
    let last = 0;
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return buffer;
}

/** A tiny looping ambient-noise player. One instance per panel. */
export class AmbientEngine {
  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private gain: GainNode | null = null;
  current: AmbientKind | null = null;
  private volume = 0.4;

  start(kind: AmbientKind) {
    if (typeof window === "undefined") return;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    if (!this.ctx) this.ctx = new Ctor();
    void this.ctx.resume();
    this.stopSource();

    const source = this.ctx.createBufferSource();
    source.buffer = makeNoiseBuffer(this.ctx, kind === "rain" ? "brown" : kind);
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = kind === "rain" ? 520 : kind === "brown" ? 1200 : 5200;

    const gain = this.ctx.createGain();
    gain.gain.value = this.scaledGain(kind);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();

    this.source = source;
    this.filter = filter;
    this.gain = gain;
    this.current = kind;
  }

  private scaledGain(kind: AmbientKind) {
    return this.volume * (kind === "pink" ? 0.7 : 1);
  }

  private stopSource() {
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        // already stopped
      }
      this.source.disconnect();
      this.source = null;
    }
    this.filter?.disconnect();
    this.gain?.disconnect();
    this.filter = null;
    this.gain = null;
  }

  stop() {
    this.stopSource();
    this.current = null;
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.gain && this.current) this.gain.gain.value = this.scaledGain(this.current);
  }

  dispose() {
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
  }
}
