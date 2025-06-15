// src/renderer/services/AudioService.ts
import { createLogger } from '../utils/logger';
import { audioAssetLoader } from './AudioAssetLoader';

const logger = createLogger('AudioService');

/**
 * AudioService provides game audio management using Web Audio API.
 * Supports background music, sound effects, and dynamic audio based on game state.
 * 
 * Features:
 * - Tension-based background music (peaceful to intense)
 * - UI sound effects for user interactions
 * - Crisis and event audio cues
 * - Volume controls and muting
 * - Audio loading and caching
 */
export class AudioService {
  private static instance: AudioService;
  private audioContext: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private activeSources: Map<string, AudioBufferSourceNode> = new Map();
  private isEnabled: boolean = true;
  private musicVolume: number = 0.3;
  private effectsVolume: number = 0.7;
  private currentMusic: string | null = null;

  // Audio file URLs organized by category
  private readonly AUDIO_ASSETS = {
    // Background Music
    music_peaceful: '/audio/music/peaceful_theme.ogg',
    music_tension_low: '/audio/music/tension_low.ogg',
    music_tension_medium: '/audio/music/tension_medium.ogg',
    music_tension_high: '/audio/music/tension_high.ogg',
    music_crisis: '/audio/music/crisis_theme.ogg',
    music_victory: '/audio/music/victory_theme.ogg',
    music_defeat: '/audio/music/defeat_theme.ogg',
    
    // UI Sound Effects
    ui_click: '/audio/effects/ui/ui_click.ogg',
    ui_hover: '/audio/effects/ui/ui_hover.ogg',
    ui_error: '/audio/effects/ui/ui_error.ogg',
    ui_success: '/audio/effects/ui/ui_success.ogg',
    ui_notification: '/audio/effects/ui/ui_notification.ogg',
    
    // Game Sound Effects
    save_success: '/audio/effects/game/save_success.ogg',
    load_success: '/audio/effects/game/load_success.ogg',
    turn_advance: '/audio/effects/game/turn_advance.ogg',
    policy_enacted: '/audio/effects/game/policy_enacted.ogg',
    crisis_escalate: '/audio/effects/game/crisis_escalate.ogg',
    crisis_deescalate: '/audio/effects/game/crisis_deescalate.ogg',
    defcon_change: '/audio/effects/game/defcon_change.ogg',
    nuclear_warning: '/audio/effects/game/nuclear_warning.ogg',
    
    // Victory/Defeat
    prestige_victory: '/audio/music/prestige_victory.ogg',
    diplomatic_victory: '/audio/music/diplomatic_victory.ogg',
    nuclear_defeat: '/audio/music/nuclear_defeat.ogg',
    
    // Error sounds
    error: '/audio/effects/game/error.ogg',
  };

  public static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  private constructor() {
    this.initializeAudioContext();
  }

  /**
   * Initialize Web Audio API context and gain nodes.
   */
  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create gain nodes for volume control
      this.musicGain = this.audioContext.createGain();
      this.effectsGain = this.audioContext.createGain();
      
      this.musicGain.connect(this.audioContext.destination);
      this.effectsGain.connect(this.audioContext.destination);
      
      this.musicGain.gain.value = this.musicVolume;
      this.effectsGain.gain.value = this.effectsVolume;

      // Handle audio context suspension (Chrome auto-play policy)
      if (this.audioContext.state === 'suspended') {
        logger.info('Audio context suspended. Will resume on user interaction.');
      }

      logger.info('AudioService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AudioService', error);
      this.isEnabled = false;
    }
  }

  /**
   * Resume audio context if suspended (for auto-play policy compliance).
   */
  private async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        logger.info('Audio context resumed');
      } catch (error) {
        logger.error('Failed to resume audio context', error);
      }
    }
  }

  /**
   * Load an audio file and return the audio buffer.
   * Uses AudioAssetLoader for dynamic loading with fallbacks.
   */
  private async loadAudioBuffer(url: string, soundId?: string): Promise<AudioBuffer | null> {
    if (!this.audioContext || !this.isEnabled) return null;

    try {
      // Check cache first
      if (this.audioBuffers.has(url)) {
        return this.audioBuffers.get(url)!;
      }

      // Try to load using AudioAssetLoader if we have a soundId
      if (soundId) {
        const assetUrl = await audioAssetLoader.loadAsset(soundId);
        if (assetUrl) {
          url = assetUrl;
        }
      }

      const response = await fetch(url);
      if (!response.ok) {
        logger.warn(`Audio file not found: ${url}, attempting fallback generation`);
        
        // If soundId is available, try to generate fallback
        if (soundId) {
          const fallbackUrl = await audioAssetLoader.loadAsset(soundId);
          if (fallbackUrl && fallbackUrl !== url) {
            return this.loadAudioBuffer(fallbackUrl);
          }
        }
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.audioBuffers.set(url, audioBuffer);
      logger.debug(`Audio loaded: ${url}`);
      return audioBuffer;
    } catch (error) {
      logger.warn(`Failed to load audio: ${url}`, error);
      
      // Try fallback generation if soundId is available
      if (soundId) {
        try {
          const fallbackUrl = await audioAssetLoader.loadAsset(soundId);
          if (fallbackUrl && fallbackUrl !== url) {
            return this.loadAudioBuffer(fallbackUrl);
          }
        } catch (fallbackError) {
          logger.error(`Fallback generation also failed for ${soundId}`, fallbackError);
        }
      }
      
      return null;
    }
  }

  /**
   * Play a sound effect.
   */
  public async playSound(soundId: string): Promise<void> {
    if (!this.isEnabled || !this.audioContext || !this.effectsGain) {
      logger.debug(`Sound disabled or context unavailable: ${soundId}`);
      return;
    }

    await this.resumeAudioContext();

    const audioUrl = this.AUDIO_ASSETS[soundId as keyof typeof this.AUDIO_ASSETS];
    if (!audioUrl) {
      logger.warn(`Sound not found: ${soundId}`);
      return;
    }

    try {
      const audioBuffer = await this.loadAudioBuffer(audioUrl, soundId);
      if (!audioBuffer) return;

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.effectsGain);
      
      source.start();
      logger.debug(`Playing sound: ${soundId}`);

      // Clean up after sound finishes
      source.onended = () => {
        this.activeSources.delete(soundId);
      };

      this.activeSources.set(soundId, source);
    } catch (error) {
      logger.error(`Error playing sound: ${soundId}`, error);
    }
  }

  /**
   * Play background music with looping.
   */
  public async playMusic(musicId: string, loop: boolean = true): Promise<void> {
    if (!this.isEnabled || !this.audioContext || !this.musicGain) {
      logger.debug(`Music disabled or context unavailable: ${musicId}`);
      return;
    }

    // Stop current music if playing
    if (this.currentMusic) {
      this.stopMusic();
    }

    await this.resumeAudioContext();

    const audioUrl = this.AUDIO_ASSETS[musicId as keyof typeof this.AUDIO_ASSETS];
    if (!audioUrl) {
      logger.warn(`Music not found: ${musicId}`);
      return;
    }

    try {
      const audioBuffer = await this.loadAudioBuffer(audioUrl, musicId);
      if (!audioBuffer) return;

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = loop;
      source.connect(this.musicGain);
      
      source.start();
      this.currentMusic = musicId;
      
      logger.info(`Playing music: ${musicId} (loop: ${loop})`);

      source.onended = () => {
        if (this.currentMusic === musicId) {
          this.currentMusic = null;
        }
        this.activeSources.delete(`music_${musicId}`);
      };

      this.activeSources.set(`music_${musicId}`, source);
    } catch (error) {
      logger.error(`Error playing music: ${musicId}`, error);
    }
  }

  /**
   * Stop currently playing music.
   */
  public stopMusic(): void {
    if (this.currentMusic) {
      const musicKey = `music_${this.currentMusic}`;
      const source = this.activeSources.get(musicKey);
      if (source) {
        source.stop();
        this.activeSources.delete(musicKey);
      }
      this.currentMusic = null;
      logger.info('Music stopped');
    }
  }

  /**
   * Stop a specific sound effect.
   */
  public stopSound(soundId: string): void {
    const source = this.activeSources.get(soundId);
    if (source) {
      source.stop();
      this.activeSources.delete(soundId);
      logger.debug(`Stopped sound: ${soundId}`);
    }
  }

  /**
   * Set master volume (0.0 to 1.0).
   */
  public setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.musicVolume = clampedVolume * 0.3; // Music is quieter
    this.effectsVolume = clampedVolume * 0.7; // Effects are louder
    
    if (this.musicGain) {
      this.musicGain.gain.value = this.musicVolume;
    }
    if (this.effectsGain) {
      this.effectsGain.gain.value = this.effectsVolume;
    }
    
    logger.info(`Volume set to: ${clampedVolume} (Music: ${this.musicVolume}, Effects: ${this.effectsVolume})`);
  }

  /**
   * Set music volume specifically (0.0 to 1.0).
   */
  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume * 0.3));
    if (this.musicGain) {
      this.musicGain.gain.value = this.musicVolume;
    }
    logger.info(`Music volume set to: ${this.musicVolume}`);
  }

  /**
   * Set effects volume specifically (0.0 to 1.0).
   */
  public setEffectsVolume(volume: number): void {
    this.effectsVolume = Math.max(0, Math.min(1, volume * 0.7));
    if (this.effectsGain) {
      this.effectsGain.gain.value = this.effectsVolume;
    }
    logger.info(`Effects volume set to: ${this.effectsVolume}`);
  }

  /**
   * Mute or unmute all audio.
   */
  public setMuted(muted: boolean): void {
    this.isEnabled = !muted;
    
    if (muted) {
      this.stopMusic();
      // Stop all active sounds
      this.activeSources.forEach((source, key) => {
        source.stop();
      });
      this.activeSources.clear();
    }
    
    logger.info(`Audio ${muted ? 'muted' : 'unmuted'}`);
  }

  /**
   * Check if audio is currently muted.
   */
  public isMuted(): boolean {
    return !this.isEnabled;
  }

  /**
   * Play music based on game tension level (0-100).
   */
  public playTensionMusic(tensionLevel: number): void {
    let musicId: string;
    
    if (tensionLevel < 20) {
      musicId = 'music_peaceful';
    } else if (tensionLevel < 40) {
      musicId = 'music_tension_low';
    } else if (tensionLevel < 70) {
      musicId = 'music_tension_medium';
    } else if (tensionLevel < 90) {
      musicId = 'music_tension_high';
    } else {
      musicId = 'music_crisis';
    }
    
    // Only change music if it's different
    if (this.currentMusic !== musicId) {
      this.playMusic(musicId);
    }
  }

  /**
   * Play crisis escalation sound based on DefCon level.
   */
  public playCrisisSound(defconLevel: number, escalating: boolean): void {
    if (defconLevel <= 2) {
      this.playSound('nuclear_warning');
    } else if (escalating) {
      this.playSound('crisis_escalate');
    } else {
      this.playSound('crisis_deescalate');
    }
  }

  /**
   * Play victory or defeat music.
   */
  public playEndGameMusic(victoryType: 'prestige' | 'diplomatic' | 'nuclear_defeat' | 'defeat'): void {
    this.playMusic(`${victoryType}_victory` in this.AUDIO_ASSETS ? `${victoryType}_victory` : 'music_victory', false);
  }

  /**
   * Get current audio status.
   */
  public getStatus(): {
    enabled: boolean;
    currentMusic: string | null;
    musicVolume: number;
    effectsVolume: number;
    contextState: string;
  } {
    return {
      enabled: this.isEnabled,
      currentMusic: this.currentMusic,
      musicVolume: this.musicVolume,
      effectsVolume: this.effectsVolume,
      contextState: this.audioContext?.state || 'none',
    };
  }
}

export const audioService = AudioService.getInstance();