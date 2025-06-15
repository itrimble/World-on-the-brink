import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { AppThunk, RootState } from './src/renderer/store'; // Assuming store is at src/renderer/store.ts
import { prepareNextTurn as preparePlayerNextTurn } from './player-slice'; // Path to player-slice.ts in root
import { processWorldTurn } from './world-slice'; // Path to world-slice.ts in root
import { processAITurn } from './ai-player-slice'; // Import AI turn processing

const GAME_OVER_YEAR = 2030; // Define game over year

/**
 * Defines the structure for game-specific state like turn count and year.
 */
export interface GameState {
  currentTurn: number;
  currentYear: number;
  gamePhase: 'pregame' | 'playing' | 'paused' | 'over';
  oneMoreTurnTaken: boolean; // Flag for "One More Turn" feature
  isLoadingNextTurn: boolean;
  error: string | null;
}

/**
 * Initial state for the game slice.
 * Game starts in 2025, Turn 1, as per PRD.
 */
const initialState: GameState = {
  currentTurn: 1,
  currentYear: 2025,
  gamePhase: 'pregame',
  oneMoreTurnTaken: false, // Initialize flag
  isLoadingNextTurn: false,
  error: null,
};

/**
 * `gameSlice` manages core game progression state like turns and years.
 * It includes reducers for incrementing turns and an async thunk (`advanceTurn`)
 * to orchestrate the sequence of actions required to advance to the next turn,
 * including updates to player and world states.
 */
const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    /**
     * Increments the current turn and year.
     * For simplicity, each turn advances the year by one. This can be adjusted later.
     * @param state - The current `GameState`.
     */
    incrementTurn: (state) => {
      state.currentTurn += 1;
      state.currentYear += 1; // Simple: 1 turn = 1 year. Adjust if different calendar logic is needed.
      // TODO: Implement logic for game end based on year or turn count if applicable (e.g., PRD mentioned end year 1997 - likely a typo for a future year).
    },
    // Could add reducers for setting specific turn/year, game over, etc.
    setGamePhase: (state, action: PayloadAction<'pregame' | 'playing' | 'paused' | 'over'>) => {
      state.gamePhase = action.payload;
      if (action.payload === 'over') {
        // Reset oneMoreTurnTaken when game initially enters 'over' phase
        // This ensures the "One More Turn" option is available unless it has been used for *this specific* game over instance.
        // However, the primary reset of oneMoreTurnTaken should happen when a NEW game starts, or game loads.
        // For now, this handles the immediate game over scenario.
        // If a game is loaded that was already "truly over", this might unintentionally offer one more turn.
        // A more robust solution would be to ensure oneMoreTurnTaken is part of saved game state and reset on new game.
        // For this subtask, we'll assume this reset is for the first time 'over' is hit.
        // The advanceTurn logic will handle the definitive game over after oneMoreTurnTaken is true.
      }
    },
    startGame: (state) => { // Action to transition from pregame to playing
      state.gamePhase = 'playing';
      state.oneMoreTurnTaken = false; // Reset on new game start
    },
    takeOneMoreTurn: (state) => {
      if (state.gamePhase === 'over' && !state.oneMoreTurnTaken) {
        state.oneMoreTurnTaken = true;
        state.gamePhase = 'playing'; // Allow one more turn
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(advanceTurn.pending, (state) => {
        state.isLoadingNextTurn = true;
        state.error = null;
      })
      .addCase(advanceTurn.fulfilled, (state) => {
        state.isLoadingNextTurn = false;
      })
      .addCase(advanceTurn.rejected, (state, action) => {
        state.isLoadingNextTurn = false;
        state.error = action.payload as string || 'Failed to advance turn due to an unspecified error.';
      });
  },
});

/**
 * Async thunk action to advance the game to the next turn.
 * This orchestrates several actions:
 * 1. Dispatches `incrementTurn` to update the turn and year.
 * 2. Dispatches `prepareNextTurn` from `playerSlice` for player-specific turn updates.
 * 3. Dispatches `processWorldTurn` from `worldSlice` for world-specific turn updates.
 * It also handles loading and error states for the turn advancement process.
 */
export const advanceTurn = createAsyncThunk<void, void, { state: RootState }>(
  'game/advanceTurn',
  async (_, { dispatch, getState, rejectWithValue }) => { // Added getState
    try {
      // 1. Increment turn counter, year, etc.
      dispatch(gameSlice.actions.incrementTurn());

      // Check for game over condition
      const { currentYear, oneMoreTurnTaken: omtTaken } = getState().game; // Destructure for clarity

      if (currentYear >= GAME_OVER_YEAR) {
        if (omtTaken) {
          // Already took one more turn, now it's definitively over.
          dispatch(gameSlice.actions.setGamePhase('over'));
          console.log(`Game Over: Year ${currentYear} reached. One more turn was taken.`);
          // Do not proceed with further player/world/AI actions if it's truly over.
          // However, the thunk needs to complete. Player/World/AI actions below will run for this final "over" turn.
          // The UI will prevent further "Next Turn" clicks because gamePhase is 'over' and oneMoreTurnTaken is true.
        } else {
          // First time hitting game over year.
          dispatch(gameSlice.actions.setGamePhase('over'));
          console.log(`Game Over: Year ${currentYear} reached. "One More Turn" is available.`);
        }
      }

      // 2. Player-specific end-of-turn / preparation for next turn
      // These actions will run for the turn that leads to 'over', and for the "one more turn"
      // (Only if game is not already over, or if we want final actions to process)
      // For now, let's assume player/world/AI still process on the turn game becomes 'over'.
      dispatch(preparePlayerNextTurn());

      // 3. World state updates based on player actions and general turn progression
      // Assuming processWorldTurn is synchronous or its async nature is handled within it
      dispatch(processWorldTurn());
      
      // 4. AI player's turn
      // This will set aiPlayer.isThinking to true via its own slice's extraReducers
      // The isLoadingNextTurn in gameSlice will remain true for the duration of AI processing
      await dispatch(processAITurn());

      // If game became 'over' this turn, subsequent UI updates will reflect that.
      // No more turns should be initiated by the player if gamePhase is 'over'.

      return; // Indicates success, all parts of the turn are complete
    } catch (error: any) {
      // If processAITurn (or any other awaited dispatch) rejects, it will be caught here.
      const errorMessage = error.message || 'An unknown error occurred during turn advancement.';
      console.error('Error advancing turn:', error); 
      return rejectWithValue(errorMessage); // This will trigger advanceTurn.rejected
    }
  }
);

export const { incrementTurn, setGamePhase, startGame, takeOneMoreTurn } = gameSlice.actions; // Added takeOneMoreTurn
export default gameSlice.reducer;

// Selectors (optional, can also be defined in the component or a dedicated selectors file)
export const selectCurrentTurn = (state: RootState) => state.game.currentTurn;
export const selectCurrentYear = (state: RootState) => state.game.currentYear;
export const selectGamePhase = (state: RootState) => state.game.gamePhase;
export const selectOneMoreTurnTaken = (state: RootState) => state.game.oneMoreTurnTaken; // Selector for oneMoreTurnTaken
export const selectIsLoadingNextTurn = (state: RootState) => state.game.isLoadingNextTurn;
export const selectGameError = (state: RootState) => state.game.error;
```
