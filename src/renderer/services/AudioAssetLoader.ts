// src/renderer/services/AudioAssetLoader.ts
import { createLogger } from '../utils/logger';

const logger = createLogger('AudioAssetLoader');

/**
 * AudioAssetLoader handles dynamic loading and fallback for audio assets.
 * Provides professional asset acquisition from various free sources.
 */
export class AudioAssetLoader {
  private static instance: AudioAssetLoader;
  private loadedAssets: Map<string, string> = new Map(); // soundId -> blob URL
  private failedAssets: Set<string> = new Set();

  // Professional audio sources with direct download capabilities
  private readonly PROFESSIONAL_SOURCES = {
    // Pixabay - High quality, royalty-free
    pixabay: {
      nuclear_warning: 'https://pixabay.com/sound-effects/air-raid-siren-3-46815/',
      crisis_escalate: 'https://pixabay.com/sound-effects/tension-rising-150-116878/',
      ui_click: 'https://pixabay.com/sound-effects/button-click-6-185488/',
      peaceful_music: 'https://pixabay.com/music/ambient-piano-solace-149839/',
    },
    
    // Freesound.org - Creative Commons
    freesound: {
      nuclear_siren: 'https://freesound.org/people/metrostock99/sounds/203553/',
      ambient_tension: 'https://freesound.org/people/ERH/sounds/30306/',
      defcon_alert: 'https://freesound.org/people/jobro/sounds/60443/',
    },
    
    // OpenGameArt - Game-focused audio
    opengameart: {
      strategy_music: 'https://opengameart.org/content/dark-ambient-loop',
      victory_fanfare: 'https://opengameart.org/content/fanfare',
    },
  };

  // Fallback generated audio for when downloads fail
  private readonly GENERATED_FALLBACKS = {
    // UI Sound Effects
    ui_click: { frequency: 800, duration: 0.1, type: 'sine' as OscillatorType },
    ui_hover: { frequency: 600, duration: 0.05, type: 'sine' as OscillatorType },
    ui_success: { frequencies: [523, 659, 784], duration: 0.4, type: 'triangle' as OscillatorType },
    ui_error: { frequency: 220, duration: 0.5, type: 'sawtooth' as OscillatorType },
    ui_notification: { frequencies: [600, 800], duration: 0.6, type: 'sine' as OscillatorType, pattern: 'sequence' },
    
    // Game Sound Effects
    save_success: { frequencies: [523, 659, 784], duration: 0.5, type: 'sine' as OscillatorType },
    load_success: { frequencies: [392, 523, 659], duration: 0.7, type: 'sine' as OscillatorType, pattern: 'sequence' },
    turn_advance: { frequency: 440, duration: 0.3, type: 'triangle' as OscillatorType },
    policy_enacted: { frequencies: [440, 554, 659], duration: 0.6, type: 'sine' as OscillatorType },
    nuclear_warning: { frequency: 300, duration: 3.0, type: 'square' as OscillatorType, pattern: 'siren' },
    crisis_escalate: { frequencies: [200, 180, 160, 140], duration: 1.5, type: 'sawtooth' as OscillatorType, pattern: 'sequence' },
    crisis_deescalate: { frequencies: [300, 400, 500, 600], duration: 0.8, type: 'sine' as OscillatorType, pattern: 'sequence' },
    defcon_change: { frequency: 880, duration: 0.4, type: 'square' as OscillatorType },
    
    // Background Music (tension-based)
    music_peaceful: { tension: 10, duration: 30, type: 'composed' as any },
    music_tension_low: { tension: 30, duration: 25, type: 'composed' as any },
    music_tension_medium: { tension: 50, duration: 20, type: 'composed' as any },
    music_tension_high: { tension: 75, duration: 15, type: 'composed' as any },
    music_crisis: { tension: 95, duration: 10, type: 'composed' as any },
    
    // Victory/Defeat Music
    music_victory: { frequencies: [523, 659, 784, 1047], duration: 3.0, type: 'sine' as OscillatorType, pattern: 'sequence' },
    music_defeat: { frequencies: [262, 233, 208, 196], duration: 4.0, type: 'sawtooth' as OscillatorType, pattern: 'sequence' },
    prestige_victory: { frequencies: [523, 659, 784, 1047], duration: 2.5, type: 'sine' as OscillatorType },
    diplomatic_victory: { frequencies: [349, 392, 440, 523], duration: 3.0, type: 'sine' as OscillatorType, pattern: 'sequence' },
    nuclear_defeat: { duration: 5.0, type: 'noise' as any, noiseType: 'brown' },
    
    // Error sounds
    error: { duration: 0.2, type: 'noise' as any, noiseType: 'white' },
  };

  public static getInstance(): AudioAssetLoader {
    if (!AudioAssetLoader.instance) {
      AudioAssetLoader.instance = new AudioAssetLoader();
    }
    return AudioAssetLoader.instance;
  }

  /**
   * Load an audio asset with fallback to generated audio.
   */
  public async loadAsset(soundId: string): Promise<string | null> {
    // Check if already loaded
    if (this.loadedAssets.has(soundId)) {
      return this.loadedAssets.get(soundId)!;
    }

    // Check if previously failed
    if (this.failedAssets.has(soundId)) {
      return this.generateFallbackAudio(soundId);
    }

    try {
      // Try to load from professional sources first
      const audioUrl = await this.tryProfessionalSources(soundId);
      if (audioUrl) {
        this.loadedAssets.set(soundId, audioUrl);
        return audioUrl;
      }

      // Fall back to generated audio
      return this.generateFallbackAudio(soundId);

    } catch (error) {
      logger.error(`Failed to load asset ${soundId}`, error);
      this.failedAssets.add(soundId);
      return this.generateFallbackAudio(soundId);
    }
  }

  /**
   * Try to load from professional audio sources.
   */
  private async tryProfessionalSources(soundId: string): Promise<string | null> {
    // For now, we'll use generated audio as professional sources require
    // API keys or complex download processes
    logger.debug(`Professional source loading not implemented for ${soundId}, using fallback`);
    return null;
  }

  /**
   * Generate fallback audio using Web Audio API.
   */
  private generateFallbackAudio(soundId: string): string | null {
    try {
      const config = this.GENERATED_FALLBACKS[soundId as keyof typeof this.GENERATED_FALLBACKS];
      if (!config) {
        logger.warn(`No fallback configuration for ${soundId}`);
        return null;
      }

      const audioBuffer = this.generateAudioBuffer(config);
      const blob = this.audioBufferToBlob(audioBuffer);
      const url = URL.createObjectURL(blob);
      
      this.loadedAssets.set(soundId, url);
      logger.info(`Generated fallback audio for ${soundId}`);
      return url;

    } catch (error) {
      logger.error(`Failed to generate fallback audio for ${soundId}`, error);
      return null;
    }
  }

  /**
   * Generate audio buffer from configuration.
   */
  private generateAudioBuffer(config: any): AudioBuffer {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = config.duration || 1.0;
    const length = Math.floor(sampleRate * duration);
    
    const audioBuffer = audioContext.createBuffer(1, length, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    if (config.type === 'composed') {
      // Dynamic music composition based on tension
      this.generateComposedMusic(channelData, config.tension || 50, sampleRate);
    } else if (config.type === 'noise') {
      // Noise generation for special effects
      this.generateNoise(channelData, config.noiseType || 'white');
    } else if (config.pattern === 'sequence') {
      // Sequence of notes
      this.generateSequence(channelData, config.frequencies, sampleRate, config.type);
    } else if (config.frequencies) {
      // Multiple frequencies (chord)
      this.generateChord(channelData, config.frequencies, sampleRate, config.type);
    } else if (config.pattern === 'siren') {
      // Special siren pattern
      this.generateSiren(channelData, config.frequency, sampleRate);
    } else {
      // Single frequency
      this.generateTone(channelData, config.frequency, sampleRate, config.type);
    }

    // Apply envelope
    this.applyEnvelope(channelData, 0.1, 0.1);
    
    return audioBuffer;
  }

  /**
   * Generate a simple tone.
   */
  private generateTone(
    buffer: Float32Array,
    frequency: number,
    sampleRate: number,
    type: OscillatorType
  ): void {
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      switch (type) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * frequency * t);
          break;
        case 'square':
          sample = Math.sign(Math.sin(2 * Math.PI * frequency * t));
          break;
        case 'sawtooth':
          sample = 2 * (t * frequency - Math.floor(t * frequency + 0.5));
          break;
        case 'triangle':
          sample = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) - 1;
          break;
      }

      buffer[i] = sample * 0.3; // Keep volume reasonable
    }
  }

  /**
   * Generate a chord (multiple frequencies).
   */
  private generateChord(
    buffer: Float32Array,
    frequencies: number[],
    sampleRate: number,
    type: OscillatorType
  ): void {
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      frequencies.forEach(freq => {
        switch (type) {
          case 'sine':
            sample += Math.sin(2 * Math.PI * freq * t);
            break;
          case 'triangle':
            sample += 2 * Math.abs(2 * (t * freq - Math.floor(t * freq + 0.5))) - 1;
            break;
          default:
            sample += Math.sin(2 * Math.PI * freq * t);
        }
      });

      buffer[i] = (sample / frequencies.length) * 0.3;
    }
  }

  /**
   * Generate a siren pattern.
   */
  private generateSiren(
    buffer: Float32Array,
    baseFrequency: number,
    sampleRate: number
  ): void {
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      // Oscillate between baseFrequency and baseFrequency * 1.5
      const frequency = baseFrequency + (baseFrequency * 0.5) * Math.sin(2 * Math.PI * 2 * t);
      buffer[i] = Math.sin(2 * Math.PI * frequency * t) * 0.4;
    }
  }

  /**
   * Generate a sequence of notes.
   */
  private generateSequence(
    buffer: Float32Array,
    frequencies: number[],
    sampleRate: number,
    type: OscillatorType
  ): void {
    const noteLength = buffer.length / frequencies.length;
    
    frequencies.forEach((freq, index) => {
      const startSample = Math.floor(index * noteLength);
      const endSample = Math.floor((index + 1) * noteLength);
      
      for (let i = startSample; i < endSample && i < buffer.length; i++) {
        const t = (i - startSample) / sampleRate;
        let sample = 0;

        switch (type) {
          case 'sine':
            sample = Math.sin(2 * Math.PI * freq * t);
            break;
          case 'triangle':
            sample = 2 * Math.abs(2 * (t * freq - Math.floor(t * freq + 0.5))) - 1;
            break;
          case 'sawtooth':
            sample = 2 * (t * freq - Math.floor(t * freq + 0.5));
            break;
          default:
            sample = Math.sin(2 * Math.PI * freq * t);
        }

        buffer[i] = sample * 0.3;
      }
    });
  }

  /**
   * Generate composed music based on tension level.
   */
  private generateComposedMusic(buffer: Float32Array, tension: number, sampleRate: number): void {
    // Choose scale and tempo based on tension
    const scales = {
      peaceful: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88], // C major
      moderate: [220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00], // A minor
      tense: [207.65, 233.08, 246.94, 277.18, 311.13, 329.63, 369.99], // G# minor
      crisis: [138.59, 155.56, 164.81, 184.99, 207.65, 220.00, 246.94] // Low, ominous tones
    };

    let scale: number[];
    if (tension < 25) scale = scales.peaceful;
    else if (tension < 50) scale = scales.moderate;
    else if (tension < 75) scale = scales.tense;
    else scale = scales.crisis;

    const beatsPerSecond = tension < 50 ? 0.5 : 1.0;
    const beatLength = sampleRate / beatsPerSecond;
    const totalBeats = Math.floor(buffer.length / beatLength);

    for (let beat = 0; beat < totalBeats; beat++) {
      const startSample = Math.floor(beat * beatLength);
      const endSample = Math.min(Math.floor((beat + 1) * beatLength), buffer.length);
      
      const noteIndex = Math.floor(Math.random() * scale.length);
      const frequency = scale[noteIndex];
      const chordFreq = scale[Math.max(0, noteIndex - 2)];
      
      for (let i = startSample; i < endSample; i++) {
        const t = (i - startSample) / sampleRate;
        const progress = (i - startSample) / (endSample - startSample);
        
        let sample = Math.sin(2 * Math.PI * frequency * t) * 0.15;
        sample += Math.sin(2 * Math.PI * chordFreq * t) * 0.1;
        
        if (tension > 60) {
          sample += Math.sin(2 * Math.PI * (frequency * 1.06) * t) * 0.05;
        }
        
        const envelope = Math.sin(Math.PI * progress);
        buffer[i] = sample * envelope;
      }
    }
  }

  /**
   * Generate noise (white, pink, brown).
   */
  private generateNoise(buffer: Float32Array, noiseType: string): void {
    const volume = 0.3;

    switch (noiseType) {
      case 'white':
        for (let i = 0; i < buffer.length; i++) {
          buffer[i] = (Math.random() * 2 - 1) * volume;
        }
        break;
      case 'pink':
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < buffer.length; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          buffer[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * volume * 0.11;
          b6 = white * 0.115926;
        }
        break;
      case 'brown':
        let lastOut = 0;
        for (let i = 0; i < buffer.length; i++) {
          const white = Math.random() * 2 - 1;
          buffer[i] = lastOut = (lastOut + white * 0.02) * volume;
        }
        break;
    }
  }

  /**
   * Apply fade in/out envelope.
   */
  private applyEnvelope(buffer: Float32Array, fadeInTime: number, fadeOutTime: number): void {
    const length = buffer.length;
    const fadeInSamples = Math.floor(44100 * fadeInTime);
    const fadeOutSamples = Math.floor(44100 * fadeOutTime);

    // Fade in
    for (let i = 0; i < Math.min(fadeInSamples, length); i++) {
      buffer[i] *= i / fadeInSamples;
    }

    // Fade out
    for (let i = 0; i < Math.min(fadeOutSamples, length); i++) {
      const idx = length - 1 - i;
      if (idx >= 0) {
        buffer[idx] *= i / fadeOutSamples;
      }
    }
  }

  /**
   * Convert AudioBuffer to Blob.
   */
  private audioBufferToBlob(audioBuffer: AudioBuffer): Blob {
    const length = audioBuffer.length;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;

    // Create WAV file
    const buffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);

    // Convert samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = audioBuffer.getChannelData(channel)[i];
        const intSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Get comprehensive asset acquisition plan.
   */
  public getAcquisitionPlan(): {
    immediate: string[];
    professional: Array<{ name: string; source: string; url: string; license: string }>;
    generated: string[];
  } {
    return {
      immediate: [
        'ui_click', 'ui_success', 'ui_error', 'nuclear_warning', 
        'crisis_escalate', 'save_success', 'defcon_change'
      ],
      professional: [
        {
          name: 'Nuclear Warning Siren',
          source: 'Pixabay',
          url: 'https://pixabay.com/sound-effects/search/nuclear%20siren/',
          license: 'Pixabay License (Royalty-free)'
        },
        {
          name: 'Tension Building Music',
          source: 'Freesound.org',
          url: 'https://freesound.org/search/?q=tension+ambient',
          license: 'Creative Commons'
        },
        {
          name: 'UI Click Sounds',
          source: 'ZapSplat',
          url: 'https://www.zapsplat.com/sound-effect-category/user-interface/',
          license: 'ZapSplat License (Free account)'
        },
        {
          name: 'Orchestral Victory Music',
          source: 'Free Music Archive',
          url: 'https://freemusicarchive.org/genre/Classical/',
          license: 'Creative Commons'
        },
        {
          name: 'Cold War Ambient',
          source: 'OpenGameArt',
          url: 'https://opengameart.org/art-search-advanced?keys=ambient+music',
          license: 'CC0 / Creative Commons'
        },
      ],
      generated: [
        'ui_hover', 'ui_notification', 'turn_advance', 'policy_enacted',
        'crisis_deescalate', 'load_success', 'error'
      ],
    };
  }

  /**
   * Cleanup blob URLs to prevent memory leaks.
   */
  public cleanup(): void {
    this.loadedAssets.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    this.loadedAssets.clear();
    this.failedAssets.clear();
  }
}

export const audioAssetLoader = AudioAssetLoader.getInstance();