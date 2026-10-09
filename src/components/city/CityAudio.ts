export interface CityAudio {
  start(): void;
  stop(): void;
  setNight(night: number): void;
  dispose(): void;
}

const MASTER_LEVEL = 0.55;
const BEAT_MS = 469;
const HORN_MIN_MS = 18_000;
const HORN_MAX_MS = 42_000;

function noiseSource(ctx: AudioContext, seconds: number, brown: boolean) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else {
      data[i] = white;
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

export function createCityAudio(): CityAudio {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let bass: GainNode | null = null;
  let night = 0;
  let beatTimer: ReturnType<typeof setInterval> | null = null;
  let hornTimer: ReturnType<typeof setTimeout> | null = null;
  let suspendTimer: ReturnType<typeof setTimeout> | null = null;

  const build = () => {
    const c = new AudioContext();
    const out = c.createGain();
    out.gain.value = 0;
    out.connect(c.destination);

    const wind = noiseSource(c, 3, false);
    const windFilter = c.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 380;
    const windGain = c.createGain();
    windGain.gain.value = 0.12;
    wind.connect(windFilter).connect(windGain).connect(out);
    const gust = c.createOscillator();
    gust.frequency.value = 0.06;
    const gustDepth = c.createGain();
    gustDepth.gain.value = 240;
    gust.connect(gustDepth).connect(windFilter.frequency);
    gust.start();
    wind.start();

    const traffic = noiseSource(c, 4, true);
    const trafficFilter = c.createBiquadFilter();
    trafficFilter.type = "lowpass";
    trafficFilter.frequency.value = 150;
    const trafficGain = c.createGain();
    trafficGain.gain.value = 0.5;
    traffic.connect(trafficFilter).connect(trafficGain).connect(out);
    traffic.start();

    const kick = c.createOscillator();
    kick.type = "sine";
    kick.frequency.value = 52;
    const kickGain = c.createGain();
    kickGain.gain.value = 0;
    const kickFilter = c.createBiquadFilter();
    kickFilter.type = "lowpass";
    kickFilter.frequency.value = 110;
    kick.connect(kickGain).connect(kickFilter).connect(out);
    kick.start();

    ctx = c;
    master = out;
    bass = kickGain;
  };

  const beat = () => {
    if (!ctx || !bass) return;
    const t = ctx.currentTime;
    const level = (0.45 * Math.max(0, night - 0.4)) / 0.6;
    bass.gain.cancelScheduledValues(t);
    bass.gain.setTargetAtTime(level, t, 0.008);
    bass.gain.setTargetAtTime(0, t + 0.11, 0.07);
  };

  const horn = () => {
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 196 + Math.random() * 60;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 520;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(0.05, t, 0.08);
    gain.gain.setTargetAtTime(0, t + 0.7, 0.25);
    osc.connect(filter).connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + 1.8);
    hornTimer = setTimeout(horn, HORN_MIN_MS + Math.random() * (HORN_MAX_MS - HORN_MIN_MS));
  };

  return {
    start() {
      if (!ctx) build();
      if (!ctx || !master) return;
      if (suspendTimer) clearTimeout(suspendTimer);
      suspendTimer = null;
      void ctx.resume();
      master.gain.setTargetAtTime(MASTER_LEVEL, ctx.currentTime, 0.9);
      if (!beatTimer) beatTimer = setInterval(beat, BEAT_MS);
      if (!hornTimer) hornTimer = setTimeout(horn, 6000);
    },
    stop() {
      if (!ctx || !master) return;
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      if (beatTimer) clearInterval(beatTimer);
      if (hornTimer) clearTimeout(hornTimer);
      beatTimer = null;
      hornTimer = null;
      const c = ctx;
      suspendTimer = setTimeout(() => void c.suspend(), 1500);
    },
    setNight(n) {
      night = n;
    },
    dispose() {
      if (beatTimer) clearInterval(beatTimer);
      if (hornTimer) clearTimeout(hornTimer);
      if (suspendTimer) clearTimeout(suspendTimer);
      beatTimer = null;
      hornTimer = null;
      void ctx?.close();
      ctx = null;
      master = null;
      bass = null;
    },
  };
}
