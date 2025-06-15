import React from 'react';
import { useSelector } from 'react-redux';
import MainLayout from './components/layout/MainLayout';
import PreGameView from './components/views/PreGameView'; // Import PreGameView
import { RootState } from './store'; // Assuming store exports RootState
import { selectGamePhase } from './store/slices/gameSlice'; // Adjusted path to gameSlice

// Import Redux store and Provider if they exist and are needed here
// import { Provider } from 'react-redux';
// import store from './store'; // Adjust path to your store

const App: React.FC = () => {
  const gamePhase = useSelector((state: RootState) => selectGamePhase(state));

  return (
    <>
      {gamePhase === 'pregame' && <PreGameView />}
      {gamePhase === 'playing' && <MainLayout />}
      {gamePhase === 'paused' && <MainLayout />}
      {gamePhase === 'over' && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '2em' }}>
          Game Over
        </div>
      )}
    </>
  );
};

export default App;

