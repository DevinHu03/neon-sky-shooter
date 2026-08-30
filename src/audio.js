/**
 * Neon Sky Shooter - Procedural Web Audio Synthesis & BGM Controller
 * Zero external audio assets required. All sound effects and synthwave music
 * are synthesized in real-time via the Web Audio API.
 */

class SoundController {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.compressor = null;

    this.isMuted = false;
    this.masterVolume = 0.7;
    this.sfxVolume = 0.8;
    this.bgmVolume = 0.5;

    this.isInitialized = false;
    this.bgmPlaying = false;

    // BGM sequencer state
    this.bgmInterval = null;
    this.bgmStep = 0;
    this.bgmTempo = 126; // BPM
    this.nextNoteTime = 0;
    this.lookahead = 25.0; // ms
    this.scheduleAheadTime = 0.1; // seconds

    // Noise buffer cache for explosions, thrusters, snares
    this.noiseBuffer = null;
    this.pinkNoiseBuffer = null;

    // Bind auto-init to first user interaction
    this._bindUserGestures();
  }

  /**
   * Bind user interaction events to unlock Web Audio context.
   */
  _bindUserGestures() {
    const unlock = () => {
      this.init();
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
  }

  /**
   * Initialize or resume Web Audio Context.
   */
  init() {
    if (this.isInitialized && this.ctx && this.ctx.state === 'running') {
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('Web Audio API is not supported in this browser.');
        return;
      }

      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      // Master Compressor / Limiter (prevents digital clipping during heavy action)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.compressor);

      // SFX Gain Bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // BGM Gain Bus
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);

      // Generate reusable noise buffers
      this._generateNoiseBuffers();

      this.isInitialized = true;
    } catch (e) {
      console.warn('Failed to initialize AudioContext:', e);
    }
  }

  /**
   * Helper to ensure AudioContext is valid and active before playing sound.
   */
  _canPlay() {
    if (!this.isInitialized || !this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx && this.ctx.state === 'running' && !this.isMuted;
  }

  /**
   * Pre-generates white and pink noise buffers for performant audio synthesis.
   */
  _generateNoiseBuffers() {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 2; // 2 seconds

    // White Noise
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const whiteOutput = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      whiteOutput[i] = Math.random() * 2 - 1;
    }

    // Pink Noise (Paul Kellet's filtered white noise algorithm)
    this.pinkNoiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const pinkOutput = this.pinkNoiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      pinkOutput[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }

  /**
   * Generic play dispatcher method for compatibility.
   * @param {string} soundName 
   * @param {number} [volume] 
   */
  play(soundName, volume = 1.0) {
    switch (soundName) {
      case 'laser':
      case 'shoot':
      case 'drone_shoot':
      case 'player_shoot':
        this.playLaser();
        break;
      case 'heavy_laser':
      case 'beam':
        this.playHeavyLaser();
        break;
      case 'missile':
      case 'rocket':
        this.playMissile();
        break;
      case 'explosion':
      case 'enemy_death':
        this.playExplosion('medium');
        break;
      case 'small_explosion':
      case 'hit':
        this.playExplosion('small');
        break;
      case 'boss_explosion':
        this.playExplosion('boss');
        break;
      case 'shield_hit':
      case 'shield':
        this.playShieldHit();
        break;
      case 'powerup':
      case 'pickup':
      case 'upgrade':
        this.playPowerup();
        break;
      case 'boss_warning':
      case 'boss_alarm':
      case 'alarm':
        this.playBossAlarm();
        break;
      case 'bomb':
      case 'emp':
        this.playBomb();
        break;
      case 'gameover':
      case 'game_over':
      case 'player_death':
        this.playGameOver();
        break;
      case 'victory':
      case 'stage_clear':
        this.playVictory();
        break;
      default:
        this.playLaser();
    }
  }

  // =========================================================================
  // SOUND EFFECTS SYNTHESIS
  // =========================================================================

  /**
   * Crisp sci-fi laser shot (Frequency sweep oscillator + resonant bandpass).
   * @param {Object} [options]
   */
  playLaser(options = {}) {
    if (!this._canPlay()) return;

    const {
      startFreq = 880,
      endFreq = 120,
      duration = 0.12,
      type = 'sawtooth',
      detune = 0
    } = options;

    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    if (detune) osc.detune.setValueAtTime(detune, now);

    // Resonant bandpass filter sweep
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(4.0, now);
    filter.frequency.setValueAtTime(startFreq * 1.2, now);
    filter.frequency.exponentialRampToValueAtTime(endFreq * 0.8, now + duration);

    // Snappy envelope
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Deep pulsing high-energy beam sound.
   */
  playHeavyLaser() {
    if (!this._canPlay()) return;

    const now = this.ctx.currentTime;
    const duration = 0.28;

    // Dual detuned oscillators for fat chorused beam sound
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(240, now);
    osc1.frequency.exponentialRampToValueAtTime(60, now + duration);
    osc1.detune.setValueAtTime(-15, now);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(245, now);
    osc2.frequency.exponentialRampToValueAtTime(65, now + duration);
    osc2.detune.setValueAtTime(15, now);

    // Sub-bass layer
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(120, now);
    subOsc.frequency.exponentialRampToValueAtTime(40, now + duration);

    // Lowpass filter sweep with grit
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(6.0, now);
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.45, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    subOsc.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
    subOsc.stop(now + duration);
  }

  /**
   * Rocket thruster whoosh + mini launch pop.
   */
  playMissile() {
    if (!this._canPlay()) return;

    const now = this.ctx.currentTime;
    const duration = 0.35;

    // 1. Launch kick pop
    const popOsc = this.ctx.createOscillator();
    const popGain = this.ctx.createGain();
    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(180, now);
    popOsc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    popGain.gain.setValueAtTime(0.4, now);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    popOsc.connect(popGain);
    popGain.connect(this.sfxGain);
    popOsc.start(now);
    popOsc.stop(now + 0.08);

    // 2. Thruster whoosh noise
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.Q.setValueAtTime(2.5, now);
      bandpass.frequency.setValueAtTime(350, now);
      bandpass.frequency.exponentialRampToValueAtTime(1600, now + 0.15);
      bandpass.frequency.exponentialRampToValueAtTime(450, now + duration);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, now);
      noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + duration);
    }
  }

  /**
   * Procedural noise explosion ('small', 'medium', 'boss').
   * @param {string} type - 'small' | 'medium' | 'boss' | 'player_hit' | 'normal'
   */
  playExplosion(type = 'medium') {
    if (!this._canPlay()) return;

    const now = this.ctx.currentTime;

    if (type === 'small' || type === 'player_hit') {
      const duration = 0.25;

      // Punchy sub-drop
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + duration);
      oscGain.gain.setValueAtTime(0.3, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + duration);

      // Noise crack
      if (this.noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + duration);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.35, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + duration);
      }
    } else if (type === 'boss' || type === 'mothership') {
      const duration = 1.6;

      // Heavy Sub Bass Boom
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(130, now);
      sub.frequency.exponentialRampToValueAtTime(25, now + duration);

      subGain.gain.setValueAtTime(0.6, now);
      subGain.gain.linearRampToValueAtTime(0.5, now + 0.3);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      sub.connect(subGain);
      subGain.connect(this.sfxGain);
      sub.start(now);
      sub.stop(now + duration);

      // Deep rumble noise
      if (this.pinkNoiseBuffer || this.noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.pinkNoiseBuffer || this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.setValueAtTime(4.0, now);
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(50, now + duration);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.6, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + duration);
      }

      // Secondary staggered micro-blasts
      setTimeout(() => this.playExplosion('small'), 120);
      setTimeout(() => this.playExplosion('medium'), 240);
      setTimeout(() => this.playExplosion('small'), 400);
    } else {
      // Standard 'medium' or 'normal' explosion
      const duration = 0.55;

      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + duration);

      oscGain.gain.setValueAtTime(0.45, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + duration);

      if (this.noiseBuffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.setValueAtTime(3.0, now);
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(80, now + duration);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + duration);
      }
    }
  }

  /**
   * High resonance shield absorption ping / deflection.
   */
  playShieldHit() {
    if (!this._canPlay()) return;

    const now = this.ctx.currentTime;
    const duration = 0.26;

    // Dual ringing oscillators with fast FM vibrato
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1450, now);
    osc1.frequency.exponentialRampToValueAtTime(620, now + duration);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(2180, now);
    osc2.frequency.exponentialRampToValueAtTime(940, now + duration);

    // Resonant bandpass for crystalline shield shimmer
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(8.0, now);
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  }

  /**
   * Ascending arpeggio chord chime for item collection (C5, E5, G5, B5, C6).
   */
  playPowerup() {
    if (!this._canPlay()) return;

    const notes = [523.25, 659.25, 783.99, 987.77, 1046.50]; // C5, E5, G5, B5, C6
    const stepDuration = 0.045;
    const noteDuration = 0.12;

    notes.forEach((freq, idx) => {
      const noteStart = this.ctx.currentTime + idx * stepDuration;

      const osc = this.ctx.createOscillator();
      const oscHarmonic = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteStart);

      oscHarmonic.type = 'sine';
      oscHarmonic.frequency.setValueAtTime(freq * 2, noteStart);

      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.linearRampToValueAtTime(0.22, noteStart + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + noteDuration);

      osc.connect(gain);
      oscHarmonic.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(noteStart);
      oscHarmonic.start(noteStart);
      osc.stop(noteStart + noteDuration);
      oscHarmonic.stop(noteStart + noteDuration);
    });
  }

  /**
   * Alternating two-tone emergency siren for boss appearance.
   */
  playBossAlarm() {
    if (!this._canPlay()) return;

    const now = this.ctx.currentTime;
    const pulses = 4;
    const pulseDuration = 0.38;

    for (let i = 0; i < pulses; i++) {
      const pulseStart = now + i * pulseDuration;
      const isHigh = i % 2 === 0;
      const startFreq = isHigh ? 780 : 520;
      const endFreq = isHigh ? 880 : 440;

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(startFreq, pulseStart);
      osc.frequency.linearRampToValueAtTime(endFreq, pulseStart + pulseDuration * 0.9);

      filter.type = 'lowpass';
      filter.Q.setValueAtTime(5.0, pulseStart);
      filter.frequency.setValueAtTime(2400, pulseStart);

      gain.gain.setValueAtTime(0.001, pulseStart);
      gain.gain.linearRampToValueAtTime(0.35, pulseStart + 0.02);
      gain.gain.setValueAtTime(0.3, pulseStart + pulseDuration * 0.8);
      gain.gain.exponentialRampToValueAtTime(0.0001, pulseStart + pulseDuration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(pulseStart);
      osc.stop(pulseStart + pulseDuration);
    }
  }

  /**
   * Alias for level manager boss warning.
   */
  playBossWarning() {
    this.playBossAlarm();
  }

  /**
   * EMP shockwave boom with low-pass filter sweep.
   */
  playBomb() {
    if (!this._canPlay()) return;

    const now = this.ctx.currentTime;
    const duration = 2.2;

    // 1. Initial Massive Blast Transient
    const snap = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snap.type = 'sine';
    snap.frequency.setValueAtTime(400, now);
    snap.frequency.exponentialRampToValueAtTime(30, now + 0.1);
    snapGain.gain.setValueAtTime(0.7, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    snap.connect(snapGain);
    snapGain.connect(this.sfxGain);
    snap.start(now);
    snap.stop(now + 0.1);

    // 2. Sub-bass EMP Shockwave
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(90, now);
    sub.frequency.exponentialRampToValueAtTime(18, now + duration);

    subGain.gain.setValueAtTime(0.8, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + duration);

    // 3. Sweeping Resonant Noise
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(10.0, now);
      filter.frequency.setValueAtTime(8000, now);
      filter.frequency.exponentialRampToValueAtTime(60, now + duration);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.65, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + duration);
    }
  }

  /**
   * Descending sad synth chords for Game Over.
   */
  playGameOver() {
    if (!this._canPlay()) return;

    const chords = [
      [392.00, 311.13, 261.63], // G4, Eb4, C4 (Cm)
      [369.99, 293.66, 246.94], // F#4, D4, B3 (Bdim)
      [349.23, 277.18, 220.00], // F4, C#4, A3 (Am)
      [261.63, 196.00, 130.81]  // C4, G3, C3 (Low C)
    ];

    const chordDuration = 0.55;

    chords.forEach((chord, i) => {
      const chordStart = this.ctx.currentTime + i * chordDuration;

      chord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, chordStart);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, chordStart);
        filter.frequency.exponentialRampToValueAtTime(150, chordStart + chordDuration);

        gain.gain.setValueAtTime(0.001, chordStart);
        gain.gain.linearRampToValueAtTime(0.18, chordStart + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, chordStart + chordDuration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(chordStart);
        osc.stop(chordStart + chordDuration);
      });
    });
  }

  /**
   * Triumphant electronic fanfare for stage victory.
   */
  playVictory() {
    if (!this._canPlay()) return;

    const now = this.ctx.currentTime;
    const arpNotes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C
    const arpDuration = 0.08;

    arpNotes.forEach((freq, idx) => {
      const noteStart = now + idx * arpDuration;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.linearRampToValueAtTime(0.3, noteStart + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(noteStart);
      osc.stop(noteStart + 0.2);
    });

    // Sustained Victory Chord (C Major Power Chord)
    const chordStart = now + arpNotes.length * arpDuration;
    const victoryChord = [523.25, 659.25, 783.99, 1046.50, 1318.51];

    victoryChord.forEach(freq => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, chordStart);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3000, chordStart);
      filter.frequency.exponentialRampToValueAtTime(600, chordStart + 1.2);

      gain.gain.setValueAtTime(0.001, chordStart);
      gain.gain.linearRampToValueAtTime(0.25, chordStart + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, chordStart + 1.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(chordStart);
      osc.stop(chordStart + 1.2);
    });
  }

  /**
   * Short crisp bullet impact hit sound.
   */
  playHit() {
    if (!this._canPlay()) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.045);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.045);
  }

  // =========================================================================
  // PROCEDURAL SYNTHWAVE BGM GENERATOR
  // =========================================================================

  /**
   * Start 8-bar looping synthwave electronic BGM.
   * @param {string} [mode]
   */
  startBgm(mode = 'game') {
    if (this.bgmPlaying) return;
    this.init();
    this.bgmPlaying = true;
    this.bgmStep = 0;
    this.nextNoteTime = this.ctx ? this.ctx.currentTime + 0.05 : 0;

    // Run scheduler loop using precise Web Audio lookahead
    if (this.bgmInterval) clearInterval(this.bgmInterval);
    this.bgmInterval = setInterval(() => this._bgmScheduler(), this.lookahead);
  }

  /**
   * Alias for compatibility.
   */
  playBGM(mode = 'game') {
    this.startBgm(mode);
  }

  /**
   * Stop BGM playback.
   */
  stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  /**
   * Web Audio lookahead scheduler for precision timing.
   */
  _bgmScheduler() {
    if (!this.bgmPlaying || !this.ctx || this.ctx.state !== 'running') return;

    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this._scheduleBgmStep(this.bgmStep, this.nextNoteTime);
      this._advanceBgmStep();
    }
  }

  /**
   * Advance 16th-note step in 8-bar loop (128 steps total).
   */
  _advanceBgmStep() {
    const secondsPer16th = (60.0 / this.bgmTempo) / 4.0;
    this.nextNoteTime += secondsPer16th;
    this.bgmStep = (this.bgmStep + 1) % 128; // 8 bars * 16 steps = 128
  }

  /**
   * Schedule audio notes for current step.
   * @param {number} step - Current 16th note index (0-127)
   * @param {number} time - AudioContext timestamp
   */
  _scheduleBgmStep(step, time) {
    if (this.isMuted) return;

    // Chord progression across 8 bars (each bar is 16 steps):
    // Bars 1-2: Dm (D1/D2)
    // Bars 3-4: F  (F1/F2)
    // Bars 5-6: C  (C1/C2)
    // Bars 7-8: Bb (Bb0/Bb1) -> A (A0/A1)
    const bar = Math.floor(step / 16);
    let rootFreq = 73.42; // D2

    if (bar >= 0 && bar < 2) {
      rootFreq = 73.42; // D2
    } else if (bar >= 2 && bar < 4) {
      rootFreq = 87.31; // F2
    } else if (bar >= 4 && bar < 6) {
      rootFreq = 65.41; // C2
    } else if (bar === 6) {
      rootFreq = 58.27; // Bb1
    } else {
      rootFreq = 55.00; // A1
    }

    // 1. DRUMS
    const stepInBar = step % 16;

    // Kick: Four-on-the-floor (steps 0, 4, 8, 12)
    if (stepInBar % 4 === 0) {
      this._synthKick(time);
    }

    // Snare / Clap: On beats 2 & 4 (steps 4, 12)
    if (stepInBar === 4 || stepInBar === 12) {
      this._synthSnare(time);
    }

    // Hi-Hat: 16th note rolling hats (accents on offbeats)
    const isOffbeat = stepInBar % 2 !== 0;
    this._synthHiHat(time, isOffbeat);

    // 2. SYNTH BASS (Rolling 16th-note synthwave bassline)
    // Alternates octave pulse: Root - Octave - Root - Octave
    const isOctave = (step % 2 === 1);
    const bassFreq = isOctave ? rootFreq * 2 : rootFreq;
    this._synthBassNote(bassFreq, time, 0.08);

    // 3. ARPEGGIATED LEAD / PAD (Atmospheric Cyberpunk Chords)
    if (step % 2 === 0) {
      let arpScale;
      if (bar < 2) {
        arpScale = [293.66, 349.23, 440.00, 523.25]; // Dm (D4, F4, A4, C5)
      } else if (bar < 4) {
        arpScale = [349.23, 440.00, 523.25, 659.25]; // F (F4, A4, C5, E5)
      } else if (bar < 6) {
        arpScale = [261.63, 329.63, 392.00, 523.25]; // C (C4, E4, G4, C5)
      } else {
        arpScale = [233.08, 293.66, 349.23, 440.00]; // Bb / A
      }

      const arpNote = arpScale[(step / 2) % arpScale.length];
      this._synthArpNote(arpNote, time, 0.12);
    }
  }

  /**
   * Procedural Synth Kick Drum.
   */
  _synthKick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.09);

    gain.gain.setValueAtTime(0.55, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.12);
  }

  /**
   * Procedural Synth Snare / Clap.
   */
  _synthSnare(time) {
    // Body tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.08);

    oscGain.gain.setValueAtTime(0.25, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    osc.connect(oscGain);
    oscGain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + 0.08);

    // Snappy noise burst
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1000, time);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.22, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.bgmGain);

      noise.start(time);
      noise.stop(time + 0.16);
    }
  }

  /**
   * Procedural Hi-Hat.
   */
  _synthHiHat(time, isOffbeat) {
    if (!this.noiseBuffer) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, time);

    const gain = this.ctx.createGain();
    const duration = isOffbeat ? 0.06 : 0.03;
    const vol = isOffbeat ? 0.12 : 0.06;

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    noise.start(time);
    noise.stop(time + duration);
  }

  /**
   * Rolling Synthwave Bass Note.
   */
  _synthBassNote(freq, time, duration) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(4.0, time);
    filter.frequency.setValueAtTime(650, time);
    filter.frequency.exponentialRampToValueAtTime(160, time + duration);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.3, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  /**
   * Melodic Cyber Arpeggio Note.
   */
  _synthArpNote(freq, time, duration) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(2.0, time);
    filter.frequency.setValueAtTime(1800, time);
    filter.frequency.exponentialRampToValueAtTime(500, time + duration);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.12, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  // =========================================================================
  // VOLUME & MUTE CONTROLS
  // =========================================================================

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  setVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (!this.isMuted && this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  setSfxVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  setBgmVolume(vol) {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
    }
  }

  getVolume() {
    return this.masterVolume;
  }
}

// Attach to window and create global singleton instances
if (typeof window !== 'undefined') {
  window.SoundController = SoundController;
  window.soundController = new SoundController();
  window.soundManager = window.soundController; // alias for maximum compatibility
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SoundController };
}
