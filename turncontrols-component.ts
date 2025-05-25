```typescript
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { advanceTurn, setGameStatus } from '../../features/game/gameSlice';
import { Button } from '../common/Button';

export const TurnControls: React.FC = () => {
  const dispatch = useDispatch();
  const gameStatus = useSelector((state: RootState) => state.game.gameStatus);
  const processingTurn = useSelector((state: RootState) => state.game.loading);
  
  const handleAdvanceTurn = () => {
    dispatch(advanceTurn());
  };
  
  const handlePause = () => {
    dispatch(setGameStatus('paused'));
  };
  
  return (
    <div className="flex space-x-2">
      <Button 
        onClick={handleAdvanceTurn} 
        variant="primary"
        disabled={processingTurn || gameStatus !== 'playing'}
      >
        {processingTurn ? 'Processing...' : 'Next Turn'}
      </Button>
      
      <Button 
        onClick={handlePause} 
        variant="secondary"
        disabled={gameStatus !== 'playing'}
      >
        Pause
      </Button>
    </div>
  );
};
```