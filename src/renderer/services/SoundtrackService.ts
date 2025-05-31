export interface Track {
  id: string;
  name: string;
  filePath: string; // Placeholder, as actual audio files are not available
}

class SoundtrackService {
  private audioPlayer: HTMLAudioElement;
  private tracks: Track[] = [
    { id: 'track1', name: 'Anthem of Nations', filePath: '/audio/anthem.mp3' },
    { id: 'track2', name: 'Cold War Echoes', filePath: '/audio/coldwar.mp3' },
    { id: 'track3', name: 'Dawn of Strategy', filePath: '/audio/strategy.mp3' },
  ];

  private currentTrackId: string | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.5;

  constructor() {
    this.audioPlayer = new Audio();
    this.audioPlayer.loop = true;

    // Initialize volume and mute state (e.g., from localStorage or defaults)
    // For now, using defaults. Persistence can be added later.
    this.audioPlayer.volume = this.volume;
    this.audioPlayer.muted = this.isMuted;

    console.log("SoundtrackService initialized.");
  }

  getTrackList(): Track[] {
    return this.tracks;
  }

  playTrack(trackId: string): void {
    const track = this.tracks.find(t => t.id === trackId);
    if (track) {
      this.audioPlayer.src = track.filePath;
      this.audioPlayer.play().catch(error => {
        // Autoplay can be blocked by browsers, especially if user hasn't interacted with the page yet.
        // This is expected if actual audio files were playing.
        console.warn(`Could not play track ${track.name}: ${error.message}`);
      });
      this.currentTrackId = trackId;
      this.audioPlayer.muted = this.isMuted; // Apply mute status when playing a new track
      console.log(`Playing track: ${track.name} (File: ${track.filePath})`);
    } else {
      console.warn(`Track with ID ${trackId} not found.`);
    }
  }

  stop(): void {
    this.audioPlayer.pause();
    this.audioPlayer.currentTime = 0;
    this.currentTrackId = null; // Clear current track when stopped
    console.log("Soundtrack stopped.");
  }

  mute(): void {
    this.isMuted = true;
    this.audioPlayer.muted = true;
    console.log("Soundtrack muted.");
  }

  unmute(): void {
    this.isMuted = false;
    this.audioPlayer.muted = false;
    console.log("Soundtrack unmuted.");
  }

  toggleMute(): void {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
  }

  setVolume(volumeLevel: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volumeLevel));
    this.volume = clampedVolume;
    this.audioPlayer.volume = clampedVolume;
    console.log(`Volume set to ${clampedVolume}`);
  }

  getCurrentTrackId(): string | null {
    return this.currentTrackId;
  }

  isCurrentlyMuted(): boolean {
    return this.isMuted;
  }

  getVolume(): number {
    return this.volume;
  }
}

export const soundtrackService = new SoundtrackService();
