import React, { useState, useEffect } from 'react';
import { soundtrackService, Track } from '../../services/SoundtrackService';

const SoundtrackControls: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.5);

  useEffect(() => {
    // Initialize component state from the service
    setTracks(soundtrackService.getTrackList());
    setCurrentTrackId(soundtrackService.getCurrentTrackId());
    setIsMuted(soundtrackService.isCurrentlyMuted());
    setVolume(soundtrackService.getVolume());

    // Optional: Auto-play a default track on mount if desired
    // if (!soundtrackService.getCurrentTrackId() && soundtrackService.getTrackList().length > 0) {
    //   const defaultTrackId = soundtrackService.getTrackList()[0].id;
    //   soundtrackService.playTrack(defaultTrackId);
    //   setCurrentTrackId(defaultTrackId);
    // }
  }, []);

  const handleTrackChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const trackId = event.target.value;
    soundtrackService.playTrack(trackId);
    setCurrentTrackId(trackId); // Update local state to reflect the change
  };

  const handleToggleMute = () => {
    soundtrackService.toggleMute();
    setIsMuted(soundtrackService.isCurrentlyMuted()); // Update local state
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const volumeLevel = parseFloat(event.target.value);
    soundtrackService.setVolume(volumeLevel);
    setVolume(volumeLevel); // Update local state
  };

  const handleStopMusic = () => {
    soundtrackService.stop();
    setCurrentTrackId(null); // Update local state
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginTop: '20px' }}>
      <h3>Soundtrack Controls</h3>
      <div style={{ marginBottom: '10px' }}>
        <label htmlFor="track-select" style={{ marginRight: '10px' }}>Choose Track:</label>
        <select
          id="track-select"
          value={currentTrackId || ''}
          onChange={handleTrackChange}
          style={{ padding: '5px' }}
        >
          <option value="" disabled>Select a track</option>
          {tracks.map(track => (
            <option key={track.id} value={track.id}>
              {track.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label htmlFor="volume-slider" style={{ marginRight: '10px' }}>Volume:</label>
        <input
          type="range"
          id="volume-slider"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          style={{ verticalAlign: 'middle' }}
        />
        <span style={{ marginLeft: '10px' }}>{(volume * 100).toFixed(0)}%</span>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <button onClick={handleToggleMute} style={{ padding: '8px 12px', marginRight: '10px' }}>
          {isMuted ? 'Unmute' : 'Mute'}
        </button>
        <button onClick={handleStopMusic} style={{ padding: '8px 12px' }}>
          Stop Music
        </button>
      </div>

      {currentTrackId && (
        <p>Currently playing: {tracks.find(t => t.id === currentTrackId)?.name || 'None'}</p>
      )}
    </div>
  );
};

export default SoundtrackControls;
