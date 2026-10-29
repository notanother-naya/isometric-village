// audio.js - Synthesized Web Audio API Engine for Desa Lembah Lumut
// Zero external assets or libraries. Pure procedural Web Audio synthesis.

class VillageAudioSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.ambientGain = null;
    this.sfxGain = null;
    this.isMuted = true;
    this.isNight = false;
    this.birdTimer = null;
    this.cricketTimer = null;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.ambientGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    this.createAmbientNodes();
  }

  createAmbientNodes() {
    if (!this.ctx) return;

    // 2-second white noise buffer for breeze and stream
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    // 1. Gentle Valley Wind Breeze
    const windSource = this.ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(280, this.ctx.currentTime);
    windFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.ambientGain);
    windSource.start(0);

    // Subtle wind swell LFO
    const windLfo = this.ctx.createOscillator();
    windLfo.frequency.setValueAtTime(0.12, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    windLfo.connect(lfoGain);
    lfoGain.connect(windGain.gain);
    windLfo.start(0);

    // 2. Gentle Flowing River Water
    const streamSource = this.ctx.createBufferSource();
    streamSource.buffer = noiseBuffer;
    streamSource.loop = true;

    const streamFilter = this.ctx.createBiquadFilter();
    streamFilter.type = 'lowpass';
    streamFilter.frequency.setValueAtTime(420, this.ctx.currentTime);

    const streamGain = this.ctx.createGain();
    streamGain.gain.setValueAtTime(0.09, this.ctx.currentTime);

    streamSource.connect(streamFilter);
    streamFilter.connect(streamGain);
    streamGain.connect(this.ambientGain);
    streamSource.start(0);

    this.startAmbientEvents();
  }

  startAmbientEvents() {
    const triggerBird = () => {
      if (!this.isMuted && !this.isNight && this.ctx && this.ctx.state === 'running') {
        this.synthesizeBirdChirp();
      }
      this.birdTimer = setTimeout(triggerBird, 2800 + Math.random() * 4500);
    };
    triggerBird();

    const triggerCricket = () => {
      if (!this.isMuted && this.isNight && this.ctx && this.ctx.state === 'running') {
        this.synthesizeCricketChirp();
      }
      this.cricketTimer = setTimeout(triggerCricket, 1400 + Math.random() * 2600);
    };
    triggerCricket();
  }

  synthesizeBirdChirp() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const startFreq = 2200 + Math.random() * 500;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(startFreq + 750, now + 0.07);
    osc.frequency.exponentialRampToValueAtTime(startFreq - 150, now + 0.16);

    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ambientGain);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  synthesizeCricketChirp() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(4600, now);

    gain.gain.setValueAtTime(0.035, now);
    gain.gain.setValueAtTime(0.0, now + 0.035);
    gain.gain.setValueAtTime(0.035, now + 0.07);
    gain.gain.setValueAtTime(0.0, now + 0.105);
    gain.gain.setValueAtTime(0.035, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ambientGain);

    osc.start(now);
    osc.stop(now + 0.24);
  }

  playClick() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  playChime() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.0, now + idx * 0.07);
      gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.7);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.75);
    });
  }

  playFootstep() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.05);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  playTalk() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [330, 392, 440, 523];
    const freq = notes[Math.floor(Math.random() * notes.length)];
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + 0.09);

    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  toggle() {
    this.init();
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isMuted = !this.isMuted;
    const targetGain = this.isMuted ? 0.0 : 0.6;
    this.masterGain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 0.15);
    return !this.isMuted;
  }

  setNight(isNight) {
    this.isNight = isNight;
  }
}

export const audioSystem = new VillageAudioSystem();
