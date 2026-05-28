// Sound engine. All sounds procedurally synthesized via Web Audio API.
// Initialized lazily on first user gesture (browser requirement).

import type { SpeciesId } from "../birds/species.ts";

export type FootSurface = "grass" | "path" | "plaza" | "court" | "water" | "tree";
export type UISound = "idCorrect" | "idWrong" | "shutter" | "callPlay" | "spot" | "tanagerAlert";

const SPATIAL_FALLOFF = 220;  // world units at which sound drops to half

export class SoundEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  ambient!: GainNode;
  sfx!: GainNode;
  bird!: GainNode;
  ui!: GainNode;

  // Ambient layers
  windGain: GainNode | null = null;
  waterGain: GainNode | null = null;
  cityGain: GainNode | null = null;

  // Listener (player) position
  listenerX = 0;
  listenerY = 0;

  // Target ambient gains lerped each tick
  windTarget = 0.18;
  waterTarget = 0;
  cityTarget = 0.03;

  ready = false;
  muted = false;

  init(): void {
    if (this.ctx) return;
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx: AudioContext = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(ctx.destination);
    this.ambient = ctx.createGain();
    this.ambient.gain.value = 1;
    this.ambient.connect(this.master);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = 1;
    this.sfx.connect(this.master);
    this.bird = ctx.createGain();
    this.bird.gain.value = 0.9;
    this.bird.connect(this.master);
    this.ui = ctx.createGain();
    this.ui.gain.value = 0.7;
    this.ui.connect(this.master);

    this.startAmbient();
    this.ready = true;
  }

  setListener(x: number, y: number): void {
    this.listenerX = x;
    this.listenerY = y;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master) this.master.gain.setValueAtTime(m ? 0 : 0.8, this.ctx?.currentTime ?? 0);
  }

  // Set ambient targets based on environment
  updateAmbient(dt: number, opts: { nearWater: boolean; inTrees: boolean }): void {
    if (!this.ctx) return;
    // Water rises when player is near pond
    this.waterTarget = opts.nearWater ? 0.35 : 0;
    // Wind dampens slightly in trees
    this.windTarget = opts.inTrees ? 0.14 : 0.22;

    const lerp = (n: GainNode | null, target: number) => {
      if (!n) return;
      const cur = n.gain.value;
      n.gain.setValueAtTime(cur + (target - cur) * Math.min(1, dt * 1.5), this.ctx!.currentTime);
    };
    lerp(this.windGain, this.windTarget);
    lerp(this.waterGain, this.waterTarget);
    lerp(this.cityGain, this.cityTarget);
  }

  // === Ambient generation ===
  private startAmbient(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // WIND: looping pink-noise filtered with slow modulation
    const windBuf = makeNoiseBuffer(ctx, 6, "pink");
    const wsrc = ctx.createBufferSource();
    wsrc.buffer = windBuf;
    wsrc.loop = true;
    const wlp = ctx.createBiquadFilter();
    wlp.type = "lowpass";
    wlp.frequency.value = 600;
    wlp.Q.value = 0.7;
    const wgain = ctx.createGain();
    wgain.gain.value = 0;
    // slow LFO on filter frequency for "gusting"
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 250;
    lfo.connect(lfoGain).connect(wlp.frequency);
    lfo.start();
    wsrc.connect(wlp).connect(wgain).connect(this.ambient);
    wsrc.start();
    this.windGain = wgain;

    // WATER: bandpass noise with multiple LFOs for lapping
    const waterBuf = makeNoiseBuffer(ctx, 4, "white");
    const wasrc = ctx.createBufferSource();
    wasrc.buffer = waterBuf;
    wasrc.loop = true;
    const wabp = ctx.createBiquadFilter();
    wabp.type = "bandpass";
    wabp.frequency.value = 1400;
    wabp.Q.value = 1.2;
    const wagain = ctx.createGain();
    wagain.gain.value = 0;
    // LFO modulating bandpass for lapping waves
    const wlfo = ctx.createOscillator();
    wlfo.frequency.value = 0.6;
    const wlfoG = ctx.createGain();
    wlfoG.gain.value = 400;
    wlfo.connect(wlfoG).connect(wabp.frequency);
    wlfo.start();
    wasrc.connect(wabp).connect(wagain).connect(this.ambient);
    wasrc.start();
    this.waterGain = wagain;

    // CITY: very low rumble + occasional traffic burst
    const cityBuf = makeNoiseBuffer(ctx, 8, "brown");
    const csrc = ctx.createBufferSource();
    csrc.buffer = cityBuf;
    csrc.loop = true;
    const clp = ctx.createBiquadFilter();
    clp.type = "lowpass";
    clp.frequency.value = 220;
    const cgain = ctx.createGain();
    cgain.gain.value = 0;
    csrc.connect(clp).connect(cgain).connect(this.ambient);
    csrc.start();
    this.cityGain = cgain;
  }

  // === Spatial helpers ===
  private spatialChain(worldX: number, worldY: number, gainBase: number): { gain: GainNode; pan: StereoPannerNode } | null {
    if (!this.ctx) return null;
    const dx = worldX - this.listenerX;
    const dy = worldY - this.listenerY;
    const dist = Math.hypot(dx, dy);
    const dGain = 1 / (1 + dist / SPATIAL_FALLOFF);
    const pan = Math.max(-1, Math.min(1, dx / 240));
    const g = this.ctx.createGain();
    g.gain.value = dGain * gainBase;
    const p = this.ctx.createStereoPanner();
    p.pan.value = pan;
    g.connect(p);
    return { gain: g, pan: p };
  }

  // === One-shots ===
  playFootstep(surface: FootSurface, worldX: number, worldY: number): void {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const spatial = this.spatialChain(worldX, worldY, 0.5);
    if (!spatial) return;
    spatial.pan.connect(this.sfx);

    let freq = 240, q = 0.8, dur = 0.06, vol = 1;
    if (surface === "grass") { freq = 480; q = 0.5; dur = 0.045; vol = 0.6; }
    if (surface === "path")  { freq = 320; q = 1.2; dur = 0.08;  vol = 1.0; }
    if (surface === "plaza") { freq = 380; q = 1.8; dur = 0.08;  vol = 1.1; }
    if (surface === "court") { freq = 360; q = 1.6; dur = 0.07;  vol = 1.0; }
    if (surface === "tree")  { freq = 520; q = 0.6; dur = 0.05;  vol = 0.55; }

    const noise = ctx.createBufferSource();
    noise.buffer = makeNoiseBuffer(ctx, dur + 0.05, "white");
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq + (Math.random() - 0.5) * 60;
    f.Q.value = q;
    const env = ctx.createGain();
    const t = ctx.currentTime;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vol * 0.7, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.connect(f).connect(env).connect(spatial.gain);
    noise.start(t);
    noise.stop(t + dur + 0.05);
  }

  playShotgun(worldX: number, worldY: number): void {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const spatial = this.spatialChain(worldX, worldY, 1.0);
    if (!spatial) return;
    spatial.pan.connect(this.sfx);

    // Three layered components: low boom, mid crack, high crackle
    const t = ctx.currentTime;
    // Low boom — sine sweep + filtered noise
    const boom = ctx.createOscillator();
    boom.type = "sine";
    boom.frequency.setValueAtTime(90, t);
    boom.frequency.exponentialRampToValueAtTime(35, t + 0.3);
    const boomG = ctx.createGain();
    boomG.gain.setValueAtTime(0, t);
    boomG.gain.linearRampToValueAtTime(1.4, t + 0.005);
    boomG.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    boom.connect(boomG).connect(spatial.gain);
    boom.start(t); boom.stop(t + 0.4);

    // Mid crack
    const crack = ctx.createBufferSource();
    crack.buffer = makeNoiseBuffer(ctx, 0.5, "white");
    const crackF = ctx.createBiquadFilter();
    crackF.type = "highpass";
    crackF.frequency.value = 400;
    const crackG = ctx.createGain();
    crackG.gain.setValueAtTime(0, t);
    crackG.gain.linearRampToValueAtTime(1.0, t + 0.002);
    crackG.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    crack.connect(crackF).connect(crackG).connect(spatial.gain);
    crack.start(t); crack.stop(t + 0.2);

    // Echo tail
    const tailGain = ctx.createGain();
    tailGain.gain.setValueAtTime(0.2, t);
    tailGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    const tailF = ctx.createBiquadFilter();
    tailF.type = "lowpass";
    tailF.frequency.value = 600;
    const tailN = ctx.createBufferSource();
    tailN.buffer = makeNoiseBuffer(ctx, 0.9, "white");
    tailN.connect(tailF).connect(tailGain).connect(spatial.gain);
    tailN.start(t); tailN.stop(t + 0.9);
  }

  playWingbeat(worldX: number, worldY: number): void {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const spatial = this.spatialChain(worldX, worldY, 0.35);
    if (!spatial) return;
    spatial.pan.connect(this.sfx);

    const t = ctx.currentTime;
    // Multiple soft thumps
    for (let i = 0; i < 5; i++) {
      const st = t + i * 0.09;
      const n = ctx.createBufferSource();
      n.buffer = makeNoiseBuffer(ctx, 0.06, "white");
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 380;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(0.5, st + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.07);
      n.connect(f).connect(g).connect(spatial.gain);
      n.start(st); n.stop(st + 0.1);
    }
  }

  playBirdCall(species: SpeciesId, worldX: number, worldY: number, gainScale = 1): void {
    if (!this.ctx || this.muted) return;
    const spatial = this.spatialChain(worldX, worldY, 0.65 * gainScale);
    if (!spatial) return;
    spatial.pan.connect(this.bird);
    callBySpecies(this.ctx, species, spatial.gain);
  }

  playUI(kind: UISound): void {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    switch (kind) {
      case "idCorrect": {
        const o = ctx.createOscillator(); o.type = "triangle";
        o.frequency.setValueAtTime(660, t);
        o.frequency.linearRampToValueAtTime(990, t + 0.15);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.25, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.connect(g).connect(this.ui);
        o.start(t); o.stop(t + 0.35);
        break;
      }
      case "idWrong": {
        const o = ctx.createOscillator(); o.type = "sawtooth";
        o.frequency.setValueAtTime(280, t);
        o.frequency.linearRampToValueAtTime(150, t + 0.18);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        o.connect(g).connect(this.ui);
        o.start(t); o.stop(t + 0.3);
        break;
      }
      case "shutter": {
        const n = ctx.createBufferSource();
        n.buffer = makeNoiseBuffer(ctx, 0.1, "white");
        const f = ctx.createBiquadFilter();
        f.type = "highpass"; f.frequency.value = 1500;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.45, t + 0.003);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        n.connect(f).connect(g).connect(this.ui);
        n.start(t); n.stop(t + 0.08);
        // mechanical click
        const o = ctx.createOscillator(); o.type = "square";
        o.frequency.value = 1800;
        const og = ctx.createGain();
        og.gain.setValueAtTime(0, t + 0.07);
        og.gain.linearRampToValueAtTime(0.1, t + 0.071);
        og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        o.connect(og).connect(this.ui);
        o.start(t + 0.07); o.stop(t + 0.11);
        break;
      }
      case "callPlay": {
        const o = ctx.createOscillator(); o.type = "sine";
        o.frequency.value = 1400;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.12, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        o.connect(g).connect(this.ui);
        o.start(t); o.stop(t + 0.15);
        break;
      }
      case "spot": {
        const o = ctx.createOscillator(); o.type = "sine";
        o.frequency.setValueAtTime(880, t);
        o.frequency.linearRampToValueAtTime(1320, t + 0.08);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.15, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        o.connect(g).connect(this.ui);
        o.start(t); o.stop(t + 0.15);
        break;
      }
      case "tanagerAlert": {
        // 3-note alert
        for (let i = 0; i < 3; i++) {
          const st = t + i * 0.18;
          const o = ctx.createOscillator(); o.type = "triangle";
          o.frequency.value = 700 + i * 200;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, st);
          g.gain.linearRampToValueAtTime(0.3, st + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, st + 0.16);
          o.connect(g).connect(this.ui);
          o.start(st); o.stop(st + 0.2);
        }
        break;
      }
    }
  }
}

// === Noise buffer factory ===
function makeNoiseBuffer(ctx: AudioContext, durationSec: number, kind: "white" | "pink" | "brown"): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * durationSec);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  if (kind === "white") {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } else if (kind === "pink") {
    // Voss-McCartney approximation
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const pink = b0+b1+b2+b3+b4+b5+b6+white*0.5362;
      b6 = white * 0.115926;
      d[i] = pink * 0.11;
    }
  } else { // brown
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.5;
    }
  }
  return buf;
}

// === Bird call synthesis per species ===
function callBySpecies(ctx: AudioContext, sp: SpeciesId, out: AudioNode): void {
  const t = ctx.currentTime;
  const jitter = (Math.random() - 0.5) * 0.1;
  switch (sp) {
    case "mallard": {
      // Two descending quacks
      for (let i = 0; i < 2; i++) {
        const st = t + i * (0.28 + jitter);
        bandNoiseBurst(ctx, out, {
          start: st, dur: 0.18, freq: 750, q: 4, freqEnd: 480, peak: 0.5,
        });
      }
      break;
    }
    case "robin": {
      // 3-5 warbled whistle phrases
      const phrases = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < phrases; i++) {
        const st = t + i * 0.16;
        const f1 = 2400 + Math.random() * 600;
        const f2 = 2200 + Math.random() * 800;
        whistle(ctx, out, { start: st, dur: 0.12, f0: f1, f1: f2, peak: 0.4 });
      }
      break;
    }
    case "chickadee": {
      // "fee-bee" two-note OR "chick-a-dee-dee-dee"
      if (Math.random() < 0.5) {
        whistle(ctx, out, { start: t, dur: 0.22, f0: 3700, f1: 3700, peak: 0.4 });
        whistle(ctx, out, { start: t + 0.28, dur: 0.3, f0: 3000, f1: 3000, peak: 0.4 });
      } else {
        // 'chick' burst then 4 dees
        bandNoiseBurst(ctx, out, { start: t, dur: 0.08, freq: 3500, q: 3, freqEnd: 3500, peak: 0.5 });
        for (let i = 0; i < 4; i++) {
          const st = t + 0.15 + i * 0.14;
          whistle(ctx, out, { start: st, dur: 0.1, f0: 1600, f1: 1500, peak: 0.35 });
        }
      }
      break;
    }
    case "canadaGoose": {
      // Low honk — two notes, second higher (classic Canada goose call)
      sawHonk(ctx, out, { start: t, dur: 0.32, f0: 180, f1: 160, peak: 0.6 });
      sawHonk(ctx, out, { start: t + 0.36, dur: 0.28, f0: 260, f1: 240, peak: 0.55 });
      break;
    }
    case "woodDuck": {
      // 3-5 ascending high squeals
      const n = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const st = t + i * 0.16;
        whistle(ctx, out, { start: st, dur: 0.12, f0: 3800 + i * 200, f1: 4200 + i * 200, peak: 0.35 });
      }
      break;
    }
    case "waxwing": {
      // Thin "see see see" — very high, quiet
      for (let i = 0; i < 3; i++) {
        const st = t + i * 0.18;
        whistle(ctx, out, { start: st, dur: 0.14, f0: 7800, f1: 7400, peak: 0.18 });
      }
      break;
    }
    case "cardinal": {
      // "wha-cheer cheer cheer" — clear ringing whistles, descending glide each
      for (let i = 0; i < 3; i++) {
        const st = t + i * 0.32;
        whistle(ctx, out, { start: st, dur: 0.26, f0: 2400, f1: 1500, peak: 0.5 });
      }
      break;
    }
    case "downy": {
      // sharp 'pik' or descending whinny
      if (Math.random() < 0.5) {
        bandNoiseBurst(ctx, out, { start: t, dur: 0.06, freq: 2400, q: 6, freqEnd: 2400, peak: 0.45 });
      } else {
        // descending whinny
        for (let i = 0; i < 10; i++) {
          const st = t + i * 0.05;
          whistle(ctx, out, { start: st, dur: 0.04, f0: 2200 - i * 80, f1: 2150 - i * 80, peak: 0.28 });
        }
      }
      break;
    }
    case "heron": {
      // Harsh croak — single short call
      const o = ctx.createOscillator(); o.type = "sawtooth";
      o.frequency.setValueAtTime(180, t);
      o.frequency.linearRampToValueAtTime(110, t + 0.4);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.45, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 1400;
      o.connect(lp).connect(g).connect(out);
      o.start(t); o.stop(t + 0.55);
      // gravelly noise atop
      const n = ctx.createBufferSource();
      n.buffer = makeNoiseBuffer(ctx, 0.5, "white");
      const nf = ctx.createBiquadFilter();
      nf.type = "bandpass"; nf.frequency.value = 600; nf.Q.value = 2;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0, t);
      ng.gain.linearRampToValueAtTime(0.25, t + 0.02);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      n.connect(nf).connect(ng).connect(out);
      n.start(t); n.stop(t + 0.5);
      break;
    }
    case "pileated": {
      // Loud "kuk-kuk-kuk-kuk" descending series
      for (let i = 0; i < 6; i++) {
        const st = t + i * 0.13;
        bandNoiseBurst(ctx, out, { start: st, dur: 0.08, freq: 900 - i * 30, q: 5, freqEnd: 700, peak: 0.55 });
      }
      break;
    }
    case "redtail": {
      // Iconic "kee-yarr" descending scream — long, ~1 sec
      const o = ctx.createOscillator(); o.type = "sawtooth";
      o.frequency.setValueAtTime(2400, t);
      o.frequency.exponentialRampToValueAtTime(900, t + 0.85);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.35, t + 0.05);
      g.gain.setValueAtTime(0.35, t + 0.6);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 3800; lp.Q.value = 4;
      o.connect(lp).connect(g).connect(out);
      o.start(t); o.stop(t + 1.05);
      // hoarse noise component
      const n = ctx.createBufferSource();
      n.buffer = makeNoiseBuffer(ctx, 1.0, "white");
      const nf = ctx.createBiquadFilter();
      nf.type = "bandpass";
      nf.frequency.setValueAtTime(2400, t);
      nf.frequency.exponentialRampToValueAtTime(900, t + 0.85);
      nf.Q.value = 8;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0, t);
      ng.gain.linearRampToValueAtTime(0.32, t + 0.05);
      ng.gain.setValueAtTime(0.32, t + 0.6);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
      n.connect(nf).connect(ng).connect(out);
      n.start(t); n.stop(t + 1.05);
      break;
    }
    case "tanager": {
      // Hoarse robin-like song — 4-5 burry phrases
      for (let i = 0; i < 5; i++) {
        const st = t + i * 0.18;
        const f0 = 2200 + (Math.random() - 0.5) * 600;
        const f1 = f0 - 300;
        // saw + slight noise for burr
        const o = ctx.createOscillator(); o.type = "sawtooth";
        o.frequency.setValueAtTime(f0, st);
        o.frequency.linearRampToValueAtTime(f1, st + 0.14);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, st);
        g.gain.linearRampToValueAtTime(0.3, st + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, st + 0.16);
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass"; lp.frequency.value = 3000;
        o.connect(lp).connect(g).connect(out);
        o.start(st); o.stop(st + 0.2);
      }
      break;
    }
  }
}

// === Synthesis primitives ===
function bandNoiseBurst(ctx: AudioContext, out: AudioNode, p: { start: number; dur: number; freq: number; freqEnd: number; q: number; peak: number }): void {
  const n = ctx.createBufferSource();
  n.buffer = makeNoiseBuffer(ctx, p.dur + 0.05, "white");
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = p.q;
  f.frequency.setValueAtTime(p.freq, p.start);
  f.frequency.exponentialRampToValueAtTime(Math.max(50, p.freqEnd), p.start + p.dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, p.start);
  g.gain.linearRampToValueAtTime(p.peak, p.start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, p.start + p.dur);
  n.connect(f).connect(g).connect(out);
  n.start(p.start); n.stop(p.start + p.dur + 0.05);
}

function whistle(ctx: AudioContext, out: AudioNode, p: { start: number; dur: number; f0: number; f1: number; peak: number }): void {
  const o = ctx.createOscillator(); o.type = "sine";
  o.frequency.setValueAtTime(p.f0, p.start);
  o.frequency.linearRampToValueAtTime(p.f1, p.start + p.dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, p.start);
  g.gain.linearRampToValueAtTime(p.peak, p.start + 0.015);
  g.gain.setValueAtTime(p.peak, p.start + p.dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.001, p.start + p.dur);
  // slight vibrato
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 7;
  const lfoG = ctx.createGain();
  lfoG.gain.value = p.f0 * 0.015;
  lfo.connect(lfoG).connect(o.frequency);
  lfo.start(p.start); lfo.stop(p.start + p.dur + 0.05);
  o.connect(g).connect(out);
  o.start(p.start); o.stop(p.start + p.dur + 0.05);
}

function sawHonk(ctx: AudioContext, out: AudioNode, p: { start: number; dur: number; f0: number; f1: number; peak: number }): void {
  const o = ctx.createOscillator(); o.type = "sawtooth";
  o.frequency.setValueAtTime(p.f0, p.start);
  o.frequency.linearRampToValueAtTime(p.f1, p.start + p.dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, p.start);
  g.gain.linearRampToValueAtTime(p.peak, p.start + 0.02);
  g.gain.setValueAtTime(p.peak * 0.9, p.start + p.dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.001, p.start + p.dur);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 900;
  o.connect(lp).connect(g).connect(out);
  o.start(p.start); o.stop(p.start + p.dur + 0.05);
}

// Singleton
export const sound = new SoundEngine();
