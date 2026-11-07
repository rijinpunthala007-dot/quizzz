// Web Audio API Synthesizer - pure procedural audio, no external audio files
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play procedural party popper pop sound + soft celebratory chime (Web Audio API)
 */
export function playPartyPopperPop() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Crisp "pop" transient
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.05);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);

    // 2. Soft chime harmonics trailing the pop
    setTimeout(() => {
      playSoftChime(880, 1.2);
      setTimeout(() => playSoftChime(1174.66, 1.5), 120);
    }, 60);
  } catch {
    // ignore
  }
}
export function playSoftChime(freq = 659.25, duration = 1.2) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Warm sine wave with subtle triangle overtone
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    // Subtle downward pitch inflection for metallic bell bell-like warmth
    osc.frequency.exponentialRampToValueAtTime(freq * 0.98, now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    // Filter to soften any harsh high frequencies
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Ignore audio failures if browser blocks autoplay
  }
}

/**
 * Play countdown tick (3, 2, 1)
 */
export function playCountdownTick(count: number) {
  if (count > 0) {
    playSoftChime(523.25 + (3 - count) * 80, 0.6); // Rising pitch per second
  } else {
    // Final zero impact
    playSoftChime(880, 1.4);
  }
}

/**
 * Play a warm, majestic chord swell when the winner card & celebration bloom
 */
export function playWinnerSwell() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Harmonic celebratory triad in D major / royal chord: D3, A3, D4, F#4, A4
    const notes = [146.83, 220.0, 293.66, 369.99, 440.0];
    const duration = 4.5;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      // Filter sweep for warm cinematic swell
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(2800, now + 1.2);
      filter.frequency.exponentialRampToValueAtTime(800, now + duration);

      // Volume envelope: gentle attack, sustain, soft release
      const maxVol = 0.07 / notes.length;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(maxVol, now + 1.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    });
  } catch {
    // Ignore audio context failures
  }
}

