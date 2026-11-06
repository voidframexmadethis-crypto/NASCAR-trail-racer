// Web Audio API Sound Generator for NASCAR Trail Racer 500
// Realistic 1950s High-Displacement American V8 Synthesis

class SoundManager {
  private ctx: AudioContext | null = null;
  // Multi-oscillator V8 engine
  private subOsc: OscillatorNode | null = null;
  private midOsc: OscillatorNode | null = null;
  private raspOsc: OscillatorNode | null = null;
  private idleLFO: OscillatorNode | null = null;
  private engineMasterGain: GainNode | null = null;
  private subGain: GainNode | null = null;
  private midGain: GainNode | null = null;
  private raspGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  
  // Drift screech / dirt slide noise
  private driftNoiseNode: AudioBufferSourceNode | null = null;
  private driftGain: GainNode | null = null;

  private isMuted: boolean = false;
  private isEngineRunning: boolean = false;

  constructor() {
    // AudioContext initialized on user gesture
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.engineMasterGain && this.ctx) {
      this.engineMasterGain.gain.setValueAtTime(muted ? 0 : 0.22, this.ctx.currentTime);
    }
    if (this.driftGain && this.ctx) {
      this.driftGain.gain.setValueAtTime(muted ? 0 : 0.12, this.ctx.currentTime);
    }
  }

  public startEngine() {
    if (this.isMuted || this.isEngineRunning) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      this.isEngineRunning = true;
      const t = this.ctx.currentTime;

      // 1. Master Engine Output
      this.engineMasterGain = this.ctx.createGain();
      this.engineMasterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.22, t);

      // Lowpass tone shaper
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(320, t);
      this.engineFilter.Q.setValueAtTime(3.0, t);

      // 2. Sub-Bass Fundamental Rumble (Dual Cylinder Firing)
      this.subOsc = this.ctx.createOscillator();
      this.subOsc.type = 'sawtooth';
      this.subOsc.frequency.setValueAtTime(38, t);

      this.subGain = this.ctx.createGain();
      this.subGain.gain.setValueAtTime(0.5, t);
      this.subOsc.connect(this.subGain);
      this.subGain.connect(this.engineFilter);

      // 3. Mid Exhaust Growl (Throaty American V8 Tone)
      this.midOsc = this.ctx.createOscillator();
      this.midOsc.type = 'triangle';
      this.midOsc.frequency.setValueAtTime(76, t);

      this.midGain = this.ctx.createGain();
      this.midGain.gain.setValueAtTime(0.35, t);
      this.midOsc.connect(this.midGain);
      this.midGain.connect(this.engineFilter);

      // 4. High-RPM Mechanical Rasp / Header Bark
      this.raspOsc = this.ctx.createOscillator();
      this.raspOsc.type = 'square';
      this.raspOsc.frequency.setValueAtTime(114, t);

      this.raspGain = this.ctx.createGain();
      this.raspGain.gain.setValueAtTime(0.12, t);
      this.raspOsc.connect(this.raspGain);
      this.raspGain.connect(this.engineFilter);

      // 5. Vintage Hot Camshaft Idle Lope (Low-frequency wobble on idle)
      this.idleLFO = this.ctx.createOscillator();
      this.idleLFO.frequency.setValueAtTime(6.5, t); // 6.5 Hz cam lope
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(8.0, t);
      this.idleLFO.connect(lfoGain);
      lfoGain.connect(this.subOsc.frequency);

      this.engineFilter.connect(this.engineMasterGain);
      this.engineMasterGain.connect(this.ctx.destination);

      this.subOsc.start(t);
      this.midOsc.start(t);
      this.raspOsc.start(t);
      this.idleLFO.start(t);

      // Initialize Dirt Drift sliding channel
      this.initDriftChannel();
    } catch (e) {
      console.error('Realistic engine sound init error:', e);
    }
  }

  private initDriftChannel() {
    if (!this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // Gravel / clay crunch texture
        data[i] = (Math.random() * 2 - 1) * 0.7;
      }

      this.driftNoiseNode = this.ctx.createBufferSource();
      this.driftNoiseNode.buffer = buffer;
      this.driftNoiseNode.loop = true;

      const driftFilter = this.ctx.createBiquadFilter();
      driftFilter.type = 'bandpass';
      driftFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
      driftFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

      this.driftGain = this.ctx.createGain();
      this.driftGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.driftNoiseNode.connect(driftFilter);
      driftFilter.connect(this.driftGain);
      this.driftGain.connect(this.ctx.destination);

      this.driftNoiseNode.start();
    } catch (e) {}
  }

  public updateEngine(speedRatio: number) {
    if (this.isMuted || !this.ctx || !this.isEngineRunning || !this.subOsc || !this.midOsc || !this.raspOsc || !this.engineFilter) return;

    const t = this.ctx.currentTime;
    const clampedRatio = Math.max(0, Math.min(1.2, speedRatio));

    // Dynamic V8 RPM scaling
    const baseFreq = 38 + clampedRatio * 110; // 38 Hz idle up to 148 Hz redline
    this.subOsc.frequency.setTargetAtTime(baseFreq, t, 0.08);
    this.midOsc.frequency.setTargetAtTime(baseFreq * 2.02, t, 0.08);
    this.raspOsc.frequency.setTargetAtTime(baseFreq * 3.01, t, 0.08);

    // Open filter cutoff on throttle for intense roaring bark
    const targetCutoff = 320 + clampedRatio * 1150;
    this.engineFilter.frequency.setTargetAtTime(targetCutoff, t, 0.09);

    // Scale rasp harmonic with throttle
    if (this.raspGain) {
      this.raspGain.gain.setTargetAtTime(0.08 + clampedRatio * 0.22, t, 0.08);
    }
  }

  public playDriftSound(intensity: number) {
    if (this.isMuted || !this.ctx || !this.driftGain) return;
    const targetVol = Math.max(0, Math.min(0.28, intensity * 0.28));
    this.driftGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.05);
  }

  public playDriftReturnBoost() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      // Powerful pneumatic chirp & horsepower surge
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const t = this.ctx.currentTime;

      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(380, t + 0.12);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.35);

      gain.gain.setValueAtTime(0.32, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    } catch (e) {}
  }

  public playOvertakeBlip() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const t = this.ctx.currentTime;

      osc.frequency.setValueAtTime(587.33, t); // D5
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.09); // A5

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.11);
    } catch (e) {}
  }

  public playPneumaticWrench() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Burst of 5 rapid impact hammer pulses
      for (let i = 0; i < 5; i++) {
        const pulseTime = now + i * 0.045;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(420 + Math.random() * 80, pulseTime);
        osc.frequency.exponentialRampToValueAtTime(140, pulseTime + 0.035);

        gain.gain.setValueAtTime(0.28, pulseTime);
        gain.gain.exponentialRampToValueAtTime(0.005, pulseTime + 0.038);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(pulseTime);
        osc.stop(pulseTime + 0.04);
      }
    } catch (e) {}
  }

  public playJackDrop() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      // Low metallic thud + rebound ping
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(32, t + 0.22);

      gain.gain.setValueAtTime(0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    } catch (e) {}
  }

  public playBackfire() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * 0.12;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.02));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    } catch (e) {}
  }

  public stopEngine() {
    if (this.isEngineRunning) {
      this.isEngineRunning = false;
      try {
        if (this.subOsc) { this.subOsc.stop(); this.subOsc.disconnect(); }
        if (this.midOsc) { this.midOsc.stop(); this.midOsc.disconnect(); }
        if (this.raspOsc) { this.raspOsc.stop(); this.raspOsc.disconnect(); }
        if (this.idleLFO) { this.idleLFO.stop(); this.idleLFO.disconnect(); }
        if (this.driftNoiseNode) { this.driftNoiseNode.stop(); this.driftNoiseNode.disconnect(); }
      } catch (e) {}
      this.subOsc = null;
      this.midOsc = null;
      this.raspOsc = null;
      this.idleLFO = null;
      this.driftNoiseNode = null;
      this.driftGain = null;
      this.engineMasterGain = null;
    }
  }

  public playGearShift() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.16);

      gain.gain.setValueAtTime(0.24, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch (e) {}
  }

  public playCrash() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * 0.35;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.45, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
    } catch (e) {}
  }

  public playCountdownBeep(isGo: boolean = false) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = isGo ? 'square' : 'sine';
      const freq = isGo ? 920 : 460;
      const duration = isGo ? 0.38 : 0.18;

      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  public playSpotterRadio() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      // Dual-tone radio static burst & Roger beep
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.setValueAtTime(2400, t + 0.04);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    } catch (e) {}
  }

  public playCrowdCheer() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * 1.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.2, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.5);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    } catch (e) {}
  }
}

export const soundManager = new SoundManager();
