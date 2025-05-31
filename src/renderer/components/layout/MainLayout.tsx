import React from 'react';
import MenuBar from './MenuBar';
import TurnDashboard from './TurnDashboard';
import NewsTicker from './NewsTicker';
import ActionPanel from './ActionPanel';
import MapView from '../map/MapView';
import SoundtrackControls from '../settings/SoundtrackControls'; // Import SoundtrackControls
import { soundtrackService } from '../../services/SoundtrackService'; // Import soundtrackService for auto-play

const MainLayout: React.FC = () => {
  // Optional: Auto-play a default track on layout mount
  React.useEffect(() => {
    const tracks = soundtrackService.getTrackList();
    if (tracks.length > 0 && !soundtrackService.getCurrentTrackId()) {
      // Play the first track if no track is currently playing
      soundtrackService.playTrack(tracks[0].id);
    }

    // Optional: Cleanup when MainLayout unmounts
    // This might be useful if music should only play when this layout is active.
    // return () => {
    //   if (!soundtrackService.isCurrentlyMuted()) { // Example: Only stop if not muted, or always stop
    //     soundtrackService.stop();
    //   }
    // };
  }, []); // Empty dependency array ensures this runs only on mount and unmount

  return (
    <div className="main-game-screen">
      {/* Menu Bar as a navigation element */}
      <nav className="menu-bar-container" aria-label="Main Menu">
        <MenuBar />
      </nav>

      {/* Main content area for map and primary interaction panel */}
      {/* The map-view-container and action-panel-container are direct grid children,
          so a <main> wrapper around them needs careful CSS grid adjustment if we want that.
          For now, the grid areas themselves define these roles.
          The .map-view-container could be considered <main> conceptually.
      */}
      <main className="map-view-container" aria-label="Game Map Area">
        <MapView />
      </main>

      {/* Action Panel as a complementary aside section */}
      <aside className="action-panel-container" aria-label="Contextual Action Panel">
        <ActionPanel />
        <div style={{ marginTop: '20px', padding: '10px' }}> {/* Wrapper for spacing */}
          <SoundtrackControls />
        </div>
      </aside>

      {/* Turn Dashboard - can be a section within a footer or a distinct region */}
      <section className="turn-dashboard-container" aria-label="Turn Dashboard and Game Stats">
        <TurnDashboard />
      </section>

      {/* News Ticker - can be a section, potentially with ARIA live region attributes later */}
      <section className="news-ticker-container" aria-label="News Ticker">
        <NewsTicker />
      </section>
    </div>
  );
};

export default MainLayout;
```
