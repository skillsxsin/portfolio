'use client';

// Web Audio API Pure Code-Synthesized 8-Second Retro Espionage Chiptune
// 100% Copyright-Free & Code Generated (No audio files, no samples).
// Authentic 8-Bit / 16-Bit Vintage Retro Synth Instrument (Square & Pulse Waveforms).
// Exactly 8.00 Seconds per loop (64 steps * 125ms = 8000ms).

interface RetroNote {
  freq: number;
  duration: number;
  arp?: number[]; // Retro arpeggiation offsets in semitones
}

class SpyAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private volume: number = 0.65;
  private intervalId: any = null;
  private step: number = 0;

  // 64-step (8.0-second) Copyright-Free Retro Espionage Lead Melody in A Minor
  private leadScore: Record<number, RetroNote> = {
    // Bar 1 (0.0s - 2.0s): Tense 8-Bit Stealth Motif
    0:  { freq: 440.00, duration: 0.20, arp: [0, 7] },       // A4
    3:  { freq: 440.00, duration: 0.16 },                     // A4
    6:  { freq: 523.25, duration: 0.18, arp: [0, 12] },      // C5
    8:  { freq: 493.88, duration: 0.18 },                     // B4
    11: { freq: 415.30, duration: 0.22, arp: [0, 7] },       // G#4
    14: { freq: 440.00, duration: 0.18 },                     // A4

    // Bar 2 (2.0s - 4.0s): Chromatic Suspense Climb
    16: { freq: 440.00, duration: 0.18 },                     // A4
    19: { freq: 523.25, duration: 0.18 },                     // C5
    22: { freq: 587.33, duration: 0.18 },                     // D5
    24: { freq: 622.25, duration: 0.16, arp: [0, 12] },      // D#5 (Chromatic tension)
    27: { freq: 659.25, duration: 0.28, arp: [0, 7, 12] },   // E5 (Held tension)

    // Bar 3 (4.0s - 6.0s): Retro Espionage High Flourish
    32: { freq: 659.25, duration: 0.22, arp: [0, 12] },      // E5
    35: { freq: 783.99, duration: 0.22, arp: [0, 7] },       // G5
    38: { freq: 739.99, duration: 0.18 },                     // F#5
    40: { freq: 698.46, duration: 0.18 },                     // F5
    43: { freq: 659.25, duration: 0.24, arp: [0, 7] },       // E5
    46: { freq: 587.33, duration: 0.18 },                     // D5

    // Bar 4 (6.0s - 8.0s): Retro Turnaround Cadence (Resolves into 0)
    48: { freq: 523.25, duration: 0.20 },                     // C5
    51: { freq: 493.88, duration: 0.18 },                     // B4
    54: { freq: 415.30, duration: 0.20, arp: [0, 7] },       // G#4
    57: { freq: 493.88, duration: 0.18 },                     // B4
    60: { freq: 466.16, duration: 0.14 },                     // Bb4
    62: { freq: 415.30, duration: 0.16 },                     // G#4 (Glide into step 0)
  };

  // Retro 8-Bit Bassline Notes (64 steps)
  private bassScore: Record<number, number> = {
    0: 110.00,  4: 110.00,  8: 110.00,  12: 103.83,
    16: 110.00, 20: 130.81, 24: 146.83, 28: 164.81,
    32: 164.81, 36: 164.81, 40: 146.83, 44: 130.81,
    48: 130.81, 52: 123.47, 56: 103.83, 60: 103.83,
  };

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : this.volume * 0.40;

        // Subtle vintage echo/delay
        this.delayNode = this.ctx.createDelay();
        this.delayFeedback = this.ctx.createGain();

        this.delayNode.delayTime.value = 0.125; // 1/16th delay tempo sync
        this.delayFeedback.gain.value = 0.18;

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

    // 125ms per step = 64 steps in exactly 8.00 seconds (120 BPM)
    this.intervalId = setInterval(() => {
      this.tick();
    }, 125);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPlaying = false;
  }

  public toggleMute(): boolean {
    this.initCtx();
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume * 0.40, this.ctx.currentTime);
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

  // Synthesize Vintage Retro 8-Bit Lead Instrument
  private playRetroLead(note: RetroNote, now: number) {
    if (!this.ctx || !this.masterGain) return;

    const { freq, duration, arp } = note;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'square'; // Classic retro chiptune pulse wave
    osc.frequency.setValueAtTime(freq, now);

    // Fast vintage arpeggio blip if present
    if (arp && arp.length > 0) {
      const stepTime = Math.min(0.04, duration / (arp.length + 1));
      arp.forEach((semitones, idx) => {
        const arpFreq = freq * Math.pow(2, semitones / 12);
        osc.frequency.setValueAtTime(arpFreq, now + (idx + 1) * stepTime);
      });
      osc.frequency.setValueAtTime(freq, now + (arp.length + 1) * stepTime);
    }

    // Vintage retro lowpass filtering
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.exponentialRampToValueAtTime(700, now + duration);

    // Punchy 8-bit envelope
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    if (this.delayNode) gain.connect(this.delayNode);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // Synthesize Retro Triangle Bass Note
  private playRetroBass(freq: number, now: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle'; // Classic NES/GameBoy triangle bass
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.24);
  }

  private tick() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const currentStep = this.step % 64; // Exactly 64 steps (8.00 seconds)

    // 1. Retro Lead Instrument Note
    if (this.leadScore[currentStep]) {
      this.playRetroLead(this.leadScore[currentStep], now);
    }

    // 2. Retro Bass Pulse Note
    if (this.bassScore[currentStep]) {
      this.playRetroBass(this.bassScore[currentStep], now);
    }

    this.step++;
  }
}

export const spyBgm = new SpyAudioSynthesizer();





