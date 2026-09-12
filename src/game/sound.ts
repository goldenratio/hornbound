export interface ToneConfig {
  type?: OscillatorType;
  startFreq: number;
  endFreq?: number;
  delay?: number;
  duration: number;
  gain: number;
}

export interface NoiseConfig {
  type?: BiquadFilterType;
  freq: number;
  sweepFreq?: number;
  duration: number;
  gain: number;
}

export interface SoundEffect {
  tones?: ToneConfig[];
  noise?: NoiseConfig;
}

type SoundType =
  | "walk"
  | "attack"
  | "die"
  | "collectHealth"
  | "levelUpAttack"
  | "finishLevel"
  | "hitWall"
  | "click"
  | "receiveDamage";

export const SFX: Record<SoundType, SoundEffect> = {
  walk: {
    noise: { type: "lowpass", freq: 350, duration: 0.08, gain: 0.3 },
  },
  attack: {
    tones: [
      { type: "sawtooth", startFreq: 400, endFreq: 80, duration: 0.12, gain: 0.3 }
    ],
    noise: { type: "bandpass", freq: 1200, duration: 0.1, gain: 0.4 }
  },
  die: {
    tones: [
      { type: "square", startFreq: 300, endFreq: 300, delay: 0.00, duration: 0.08, gain: 0.2 },
      { type: "square", startFreq: 240, endFreq: 240, delay: 0.08, duration: 0.08, gain: 0.2 },
      { type: "square", startFreq: 180, endFreq: 180, delay: 0.16, duration: 0.08, gain: 0.2 },
      { type: "square", startFreq: 120, endFreq: 120, delay: 0.24, duration: 0.08, gain: 0.2 },
      { type: "square", startFreq: 80, endFreq: 80, delay: 0.32, duration: 0.08, gain: 0.2 }
    ],
    noise: { type: "lowpass", freq: 500, sweepFreq: 50, duration: 0.6, gain: 0.5 }
  },
  collectHealth: {
    tones: [
      { type: "sine", startFreq: 523.25, endFreq: 659.25, delay: 0.00, duration: 0.12, gain: 0.25 }, // C5 -> E5
      { type: "sine", startFreq: 659.25, endFreq: 1046.5, delay: 0.08, duration: 0.20, gain: 0.30 }  // E5 -> C6
    ],
    noise: { type: "highpass", freq: 2000, sweepFreq: 4000, duration: 0.15, gain: 0.15 }
  },
  levelUpAttack: {
    tones: [
      { type: "triangle", startFreq: 150, endFreq: 40, delay: 0.00, duration: 0.12, gain: 0.5 },
      { type: "sawtooth", startFreq: 164.81, endFreq: 659.25, delay: 0.04, duration: 0.22, gain: 0.35 }, // E3 -> E5
      { type: "sawtooth", startFreq: 246.94, endFreq: 987.77, delay: 0.04, duration: 0.22, gain: 0.25 }, // B3 -> B5
      { type: "sine", startFreq: 1318.51, endFreq: 1318.51, delay: 0.22, duration: 0.30, gain: 0.3 }    // E6
    ],
    noise: { type: "bandpass", freq: 400, sweepFreq: 4500, duration: 0.28, gain: 0.45 }
  },
  finishLevel: {
    tones: [
      { type: "triangle", startFreq: 523.25, endFreq: 523.25, delay: 0.00, duration: 0.10, gain: 0.25 }, // C5
      { type: "triangle", startFreq: 659.25, endFreq: 659.25, delay: 0.09, duration: 0.10, gain: 0.25 }, // E5
      { type: "triangle", startFreq: 783.99, endFreq: 783.99, delay: 0.18, duration: 0.10, gain: 0.25 }, // G5
      { type: "sine", startFreq: 1046.50, endFreq: 1046.50, delay: 0.27, duration: 0.45, gain: 0.35 }    // C6 (Final sustain)
    ],
    noise: { type: "bandpass", freq: 1500, sweepFreq: 5000, duration: 0.50, gain: 0.20 }
  },
  receiveDamage: {
    tones: [
      { type: "sawtooth", startFreq: 180, endFreq: 40, delay: 0.00, duration: 0.15, gain: 0.4 },
      { type: "square", startFreq: 120, endFreq: 30, delay: 0.02, duration: 0.12, gain: 0.3 }
    ],
    noise: { type: "lowpass", freq: 800, sweepFreq: 100, duration: 0.18, gain: 0.5 }
  },
  hitWall: {
    tones: [
      { type: "triangle", startFreq: 160, endFreq: 40, delay: 0.00, duration: 0.06, gain: 0.45 }
    ],
    noise: { type: "lowpass", freq: 450, sweepFreq: 80, duration: 0.07, gain: 0.4 }
  },
  click: {
    tones: [
      { type: "sine", startFreq: 1200, endFreq: 400, delay: 0.00, duration: 0.02, gain: 0.25 }
    ],
    noise: { type: "highpass", freq: 3500, sweepFreq: 1000, duration: 0.015, gain: 0.2 }
  }
} as const;

let audioCtx: AudioContext | undefined = undefined;

export function play_sound(config: SoundEffect): void {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
  } catch (err) {
    //
  }
  if (!audioCtx) {
    return;
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const ctx = audioCtx;
  const now = ctx.currentTime;

  if (config.tones) {
    config.tones.forEach(t => {
      const startTime = now + (t.delay || 0);
      const endTime = startTime + t.duration;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = t.type || 'sine';
      osc.frequency.setValueAtTime(t.startFreq, startTime);
      if (t.endFreq && t.endFreq !== t.startFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(t.endFreq, 0.01), endTime);
      }

      gain.gain.setValueAtTime(t.gain, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, endTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(endTime);
    });
  }

  if (config.noise) {
    const n = config.noise;
    const endTime = now + n.duration;

    // Generate Noise Buffer
    const bufferSize = ctx.sampleRate * n.duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    // Filter
    const filter = ctx.createBiquadFilter();
    filter.type = n.type || "lowpass";
    filter.frequency.setValueAtTime(n.freq, now);
    if (n.sweepFreq) {
      filter.frequency.linearRampToValueAtTime(n.sweepFreq, endTime);
    }

    // Envelope
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(n.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, endTime);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseSource.start(now);
  }
}
