// Tiny WebAudio synth for Nova Harvest: every sound is generated, no audio
// files. The context is created lazily on the first user gesture so browsers
// allow it; all calls are safe before that (they no-op).
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
      return true;
    } catch (err) {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, low) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low || 900;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },
    // Pickup pitch climbs with the combo, so a streak sounds like a streak.
    pickup(combo) {
      const base = 520 * Math.pow(1.059, Math.min(combo, 12));
      tone(base, 0.12, 'sine', 0.5, base * 1.6);
      tone(base * 2, 0.08, 'triangle', 0.18);
    },
    hit() { noise(0.28, 0.7, 700); tone(160, 0.3, 'sawtooth', 0.4, 55); },
    shieldBreak() { tone(880, 0.15, 'square', 0.25, 220); noise(0.12, 0.3, 2400); },
    shieldGet() { tone(660, 0.1, 'sine', 0.4); tone(990, 0.16, 'sine', 0.4); },
    waveClear(wave) {
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => setTimeout(() => tone(f, 0.14, 'triangle', 0.35), i * 70));
      void wave;
    },
    gameOver() {
      [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.3), i * 160));
    },
    start() { tone(262, 0.1, 'triangle', 0.4); tone(523, 0.16, 'triangle', 0.4); },
  };
}
