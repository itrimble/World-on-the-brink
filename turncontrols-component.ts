```typescript
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './src/renderer/store'; // Adjusted path for RootState
import {
  advanceTurn,
  selectIsLoadingNextTurn,
  selectGamePhase,
  setGamePhase,
  takeOneMoreTurn, // Import new action
  selectOneMoreTurnTaken // Import new selector
} from './gameSlice'; // Adjusted path and imports
import { selectAIIsThinking } from './ai-player-slice'; // Import selector from AI slice
import { Button } from './src/renderer/components/common/Button'; // Adjusted path for Button

export const TurnControls: React.FC = () => {
  const dispatch = useDispatch();
  const gamePhase = useSelector((state: RootState) => selectGamePhase(state));
  const isLoadingNextTurn = useSelector((state: RootState) => selectIsLoadingNextTurn(state));
  const aiIsThinking = useSelector((state: RootState) => selectAIIsThinking(state));
  const oneMoreTurnTaken = useSelector((state: RootState) => selectOneMoreTurnTaken(state));
  
  const handleAdvanceTurn = () => {
    if (gamePhase === 'playing' && !isLoadingNextTurn && !aiIsThinking) {
      dispatch(advanceTurn());
    }
  };
  
  const handlePause = () => {
    if (gamePhase === 'playing') {
      dispatch(setGamePhase('paused')); // Assuming setGamePhase can handle 'paused'
    }
  };

  const handleResume = () => {
    if (gamePhase === 'paused') {
      dispatch(setGamePhase('playing')); // Resume game
    }
  }
  
  // Combine isLoadingNextTurn and aiIsThinking for the button's processing state text
  const isProcessing = isLoadingNextTurn || aiIsThinking;

  const handleOneMoreTurn = () => {
    dispatch(takeOneMoreTurn());
    dispatch(advanceTurn()); // Immediately process the one more turn
  };

  if (gamePhase === 'over') {
    if (!oneMoreTurnTaken) {
      return (
        <div className="flex space-x-2">
          <Button
            onClick={handleOneMoreTurn}
            variant="primary"
            disabled={isProcessing} // Should not be processing if game is over and OMT not taken
          >
            One More Turn
          </Button>
        </div>
      );
    }
    return null; // Game is definitively over, hide all controls
  }

  return (
    <div className="flex space-x-2">
      {/* Only show Next Turn button if game is actively playing */}
      {gamePhase === 'playing' && (
        <Button
          onClick={handleAdvanceTurn}
          variant="primary"
          // Disable if processing or if it's the turn AFTER "One More Turn" was clicked but before it fully resolves to 'over'
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Next Turn'}
        </Button>
      )}
      
      {gamePhase === 'playing' && (
        <Button
          onClick={handlePause}
          variant="secondary"
          disabled={isProcessing} // Disable pause if already processing turn
        >
          Pause
        </Button>
      )}
      {gamePhase === 'paused' && (
        <Button
          onClick={handleResume}
          variant="secondary"
        >
          Resume
        </Button>
      )}
    </div>
  );
};
```