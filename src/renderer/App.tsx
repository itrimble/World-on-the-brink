import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import MainLayout from './components/layout/MainLayout';
import PreGameView from './components/views/PreGameView';
import { SystemicCollapseView } from './components/views/SystemicCollapseView';
import { RootState } from './store';
import { selectGamePhase, resetGame } from './store/slices/gameSlice';
import { AppDispatch } from './store';

const App: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const gamePhase = useSelector((state: RootState) => selectGamePhase(state));

  const handleRestart = () => {
    dispatch(resetGame());
  };

  return (
    <>
      {gamePhase === 'pregame' && <PreGameView />}
      {gamePhase === 'playing' && <MainLayout />}
      {gamePhase === 'paused' && <MainLayout />}
      {gamePhase === 'over' && (
        <SystemicCollapseView onRestart={handleRestart} />
      )}
    </>
  );
};

export default App;

