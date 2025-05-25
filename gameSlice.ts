import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { AppThunk, RootState } from './src/renderer/store'; // Assuming store is at src/renderer/store.ts
import { prepareNextTurn as preparePlayerNextTurn } from './player-slice'; // Path to player-slice.ts in root
import { processWorldTurn } from './world-slice'; // Path to world-slice.ts in root

/**
 * Defines the structure for game-specific state like turn count and year.
 */
export interface GameState {
  currentTurn: number;
  currentYear: number;
  // Potentially add other game-wide states: game phase, game over status, etc.
  isLoadingNextTurn: boolean; // To provide feedback during turn advancement
  error: string | null;
}

/**
 * Initial state for the game slice.
 * Game starts in 2025, Turn 1, as per PRD.
 */
const initialState: GameState = {
  currentTurn: 1,
  currentYear: 2025,
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
  async (_, { dispatch, rejectWithValue }) => {
    try {
      // Simulate some delay for turn processing if needed, or remove if actions are quick
      // await new Promise(resolve => setTimeout(resolve, 250)); 

      dispatch(gameSlice.actions.incrementTurn());
      dispatch(preparePlayerNextTurn()); // Ensure this is the correct action from playerSlice
      dispatch(processWorldTurn());
      
      // Potentially dispatch other actions like event processing, AI turns, etc.
      // Example: dispatch(processGameEvents());

      return; // Indicates success
    } catch (error: any) {
      const errorMessage = error.message || 'An unknown error occurred during turn advancement.';
      // console.error is fine for thunks if logger isn't easily accessible or for critical errors
      console.error('Error advancing turn:', error); 
      return rejectWithValue(errorMessage);
    }
  }
);

export const { incrementTurn } = gameSlice.actions;
export default gameSlice.reducer;

// Selectors (optional, can also be defined in the component or a dedicated selectors file)
export const selectCurrentTurn = (state: RootState) => state.game.currentTurn;
export const selectCurrentYear = (state: RootState) => state.game.currentYear;
export const selectIsLoadingNextTurn = (state: RootState) => state.game.isLoadingNextTurn;
export const selectGameError = (state: RootState) => state.game.error;
```
