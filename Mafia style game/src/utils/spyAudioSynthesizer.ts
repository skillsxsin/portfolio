'use client';

// Web Audio API Pure Code-Synthesized Mission Impossible Inspired Spy BGM with Saxophone
// 100% Copyright-Free & Code Generated (No audio files used).
// Extended 4-Bar (80-step) 5/4 Espionage Thriller Sequence with Smooth Seamless Looping.

class SpyAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private volume: number = 0.65; // Rich audible volume
  private intervalId: any = null;
  private step: number = 0;

  // Extended 4-Bar 5/4 Spy Thriller Bass & Brass Frequencies (80 steps)
  private bassFreqs: Record<number, number> = {
    // Bar 1: Classic 5/4 G Minor Motif
    0: 49.0,   3: 49.0,   6: 58.27,  8: 65.41,  10: 49.0,  13: 49.0,  16: 43.65, 18: 46.25,
    // Bar 2: Deep Sub-Bass Variation
    20: 49.0,  23: 49.0,  26: 58.27, 28: 65.41, 30: 49.0,  33: 49.0,  36: 43.65, 38: 46.25,
    // Bar 3: Chromatic Suspense Climb
    40: 36.71, 43: 38.89, 46: 41.20, 48: 43.65, 50: 46.25, 53: 49.0,  56: 58.27, 58: 65.41,
    // Bar 4: Turnaround Resolution Bridge (seamless loop into Step 0)
    60: 49.0,  63: 58.27, 66: 65.41, 68: 73.42, 70: 49.0,  73: 58.27, 76: 51.91, 78: 46.25, 79: 47.65,
  };

  private brassFreqs: Record<number, number> = {
    // Bar 1: Low Brass Accent
    0: 196.0,  3: 196.0,  6: 233.08, 8: 261.63, 10: 196.0, 13: 196.0, 16: 174.61, 18: 185.0,
    // Bar 2: High Horn Response Fanfare
    20: 392.0, 23: 392.0, 26: 466.16, 28: 523.25, 30: 392.0, 33: 392.0, 36: 349.23, 38: 369.99,
    // Bar 3: Ascending Tension Stabs
    40: 293.66, 43: 311.13, 46: 329.63, 48: 349.23, 50: 369.99, 53: 392.0, 56: 466.16, 58: 523.25,
    // Bar 4: Dramatic Spy Climax & Turnaround Cadence
    60: 392.0, 63: 466.16, 66: 587.33, 68: 523.25, 70: 392.0, 73: 466.16, 76: 349.23, 78: 369.99, 79: 380.0,
  };

  // Premium Spy Saxophone Solo Notes & Licks
  private saxNotes: Record<number, { freq: number; duration: number }> = {
    // Bar 2: Warm Jazzy Counter-Lick
    24: { freq: 293.66, duration: 0.35 }, // D4
    29: { freq: 349.23, duration: 0.35 }, // F4
    34: { freq: 392.00, duration: 0.40 }, // G4
    38: { freq: 466.16, duration: 0.45 }, // Bb4
    // Bar 3: Ascending Espionage Sax Solos
    44: { freq: 466.16, duration: 0.35 }, // Bb4
    49: { freq: 523.25, duration: 0.35 }, // C5
    54: { freq: 554.37, duration: 0.35 }, // Db5
    59: { freq: 587.33, duration: 0.45 }, // D5
    // Bar 4: Climax Saxophone Lick & Seamless Turnaround Glide
    64: { freq: 587.33, duration: 0.40 }, // D5
    69: { freq: 523.25, duration: 0.40 }, // C5
    74: { freq: 466.16, duration: 0.40 }, // Bb4
    78: { freq: 369.99, duration: 0.50 }, // F#4 (Glides smoothly into G4 on loop start)
  };

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : this.volume * 0.5;

        // Subtle Delay / Reverb Feedback Loop for Smooth Seamless Looping
        this.delayNode = this.ctx.createDelay();
        this.delayFeedback = this.ctx.createGain();

        this.delayNode.delayTime.value = 0.248; // Timed delay matching 16th step
        this.delayFeedback.gain.value = 0.18; // Soft decay tail

        this.delayNode.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delayNode);
        this.delayNode.connect(this.masterGain);

        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public start() {
    this.initCtx();
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.step = 0;

    // Slower, tense espionage tempo -> 124ms per 16th step (~120 BPM in 5/4)
    this.intervalId = setInterval(() => {
      this.tick();
    }, 124);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPlaying = false;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (vol > 0 && this.isMuted) {
      this.isMuted = false;
    } else if (vol === 0) {
      this.isMuted = true;
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume * 0.5, this.ctx.currentTime);
    }
    if (!this.isPlaying && !this.isMuted) {
      this.start();
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public toggleMute(): boolean {
    this.initCtx();
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume * 0.5, this.ctx.currentTime);
    }
    if (!this.isPlaying && !this.isMuted) {
      this.start();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  // Synthesize Premium Spy Saxophone Voice (Dual Sawtooth/Square + Vibrato LFO + Envelope Filter)
  private playSaxNote(freq: number, duration: number, now: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 1.002, now);

    // Warm Pitch Vibrato (5.5 Hz LFO)
    vibrato.frequency.setValueAtTime(5.5, now);
    vibratoGain.gain.setValueAtTime(4.5, now); // Vibrato depth in Hz
    vibrato.connect(osc1.frequency);
    vibrato.connect(osc2.frequency);

    // Expressive Saxophone Envelope Filter
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.08);
    filter.frequency.exponentialRampToValueAtTime(1200, now + duration);

    // Smooth Saxophone Attack & Decay Envelope
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);

    // Send part of signal to delay feedback loop for seamless ambient tail
    gain.connect(this.masterGain);
    if (this.delayNode) gain.connect(this.delayNode);

    vibrato.start(now);
    osc1.start(now);
    osc2.start(now);

    vibrato.stop(now + duration + 0.05);
    osc1.stop(now + duration + 0.05);
    osc2.stop(now + duration + 0.05);
  }

  private tick() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const currentStep = this.step % 80; // Extended 4-bar 5/4 sequence (80 steps)
    const stepInBar = currentStep % 20;

    // 1. Mission Impossible 5/4 Bass Pulse
    if (this.bassFreqs[currentStep]) {
      const freq = this.bassFreqs[currentStep];
      const isLongNote = stepInBar === 0 || stepInBar === 3 || stepInBar === 10 || stepInBar === 13;

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + (isLongNote ? 0.28 : 0.16));

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isLongNote ? 0.28 : 0.16));

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + (isLongNote ? 0.30 : 0.18));
    }

    // 2. Iconic Brass Spy Horn Stab
    if (this.brassFreqs[currentStep]) {
      const freq = this.brassFreqs[currentStep];
      const isShortStab = stepInBar === 6 || stepInBar === 8 || stepInBar === 16 || stepInBar === 18;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 1.006, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.exponentialRampToValueAtTime(350, now + (isShortStab ? 0.14 : 0.26));

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isShortStab ? 0.14 : 0.26));

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + (isShortStab ? 0.15 : 0.27));
      osc2.stop(now + (isShortStab ? 0.15 : 0.27));
    }

    // 3. Premium Spy Saxophone Solo Notes
    if (this.saxNotes[currentStep]) {
      const sax = this.saxNotes[currentStep];
      this.playSaxNote(sax.freq, sax.duration, now);
    }

    // 4. Espionage 16th Note Hi-Hat / Percussive Thriller Clicktrain
    const hatGain = this.ctx.createGain();
    const hatOsc = this.ctx.createOscillator();
    const hatFilter = this.ctx.createBiquadFilter();

    hatOsc.type = 'square';
    hatOsc.frequency.setValueAtTime(3800 + (stepInBar % 4) * 600, now);

    hatFilter.type = 'highpass';
    hatFilter.frequency.setValueAtTime(4500, now);

    const isAccentedHat = stepInBar % 2 === 0;
    hatGain.gain.setValueAtTime(isAccentedHat ? 0.045 : 0.018, now);
    hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    hatOsc.connect(hatFilter);
    hatFilter.connect(hatGain);
    hatGain.connect(this.masterGain);

    hatOsc.start(now);
    hatOsc.stop(now + 0.055);

    this.step++;
  }
}

export const spyBgm = new SpyAudioSynthesizer();



