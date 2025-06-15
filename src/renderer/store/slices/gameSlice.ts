import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
// Note: Avoiding circular import, RootState will be available when this slice is integrated
import { prepareNextTurn as preparePlayerNextTurn } from './player-slice'; // Path to player-slice.ts in root
import { processWorldTurn } from './world-slice'; // Path to world-slice.ts in root
import { processAITurn } from './ai-player-slice'; // Import AI turn processing
import { PrestigeService } from '../../services/PrestigeService';

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
  victoryCondition: 'none' | 'prestige_victory' | 'diplomatic_victory' | 'defeat' | 'nuclear_war' | 'stalemate';
  victoryReason: string | null;
  prestigeTarget: number;
  aiPrestige: number;
  difficulty: 'easy' | 'normal' | 'hard' | 'realistic';
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
  victoryCondition: 'none',
  victoryReason: null,
  prestigeTarget: 50, // Will be calculated based on difficulty
  aiPrestige: 0,
  difficulty: 'normal',
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
    },
    setDifficulty: (state, action: PayloadAction<'easy' | 'normal' | 'hard' | 'realistic'>) => {
      state.difficulty = action.payload;
      // Recalculate prestige target based on difficulty
      const totalTurns = GAME_OVER_YEAR - 2025; // 5 years = 5 turns
      state.prestigeTarget = PrestigeService.calculateVictoryPrestigeTarget(totalTurns, action.payload);
    },
    adjustAIPrestige: (state, action: PayloadAction<number>) => {
      state.aiPrestige += action.payload;
    },
    setVictoryCondition: (state, action: PayloadAction<{ condition: GameState['victoryCondition']; reason: string }>) => {
      state.victoryCondition = action.payload.condition;
      state.victoryReason = action.payload.reason;
      if (action.payload.condition !== 'none') {
        state.gamePhase = 'over';
      }
    },
    loadGameState: (state, action: PayloadAction<{ currentTurn: number; currentYear: number; difficulty: 'easy' | 'normal' | 'hard' | 'realistic' }>) => {
      state.currentTurn = action.payload.currentTurn;
      state.currentYear = action.payload.currentYear;
      state.difficulty = action.payload.difficulty;
      state.gamePhase = 'playing';
      state.oneMoreTurnTaken = false;
      state.isLoadingNextTurn = false;
      state.error = null;
      state.victoryCondition = 'none';
      state.victoryReason = null;
      
      // Recalculate prestige target based on loaded difficulty
      const totalTurns = GAME_OVER_YEAR - 2025;
      state.prestigeTarget = PrestigeService.calculateVictoryPrestigeTarget(totalTurns, action.payload.difficulty);
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
export const advanceTurn = createAsyncThunk<void, void, { state: any }>(
  'game/advanceTurn',
  async (_, { dispatch, getState, rejectWithValue }) => { // Added getState
    try {
      // 1. Increment turn counter, year, etc.
      dispatch(gameSlice.actions.incrementTurn());

      // Check for game over condition and victory conditions
      const state = getState();
      const { currentYear, oneMoreTurnTaken: omtTaken, prestigeTarget, aiPrestige, difficulty } = state.game;
      const playerPrestige = state.player.prestige;

      // Check for early victory conditions
      const victoryStatus = PrestigeService.evaluateVictoryStatus(
        playerPrestige,
        aiPrestige,
        prestigeTarget,
        currentYear >= GAME_OVER_YEAR
      );

      if (victoryStatus !== 'ongoing') {
        let reason = '';
        switch (victoryStatus) {
          case 'victory':
            reason = currentYear >= GAME_OVER_YEAR 
              ? `Victory! Final prestige: ${playerPrestige} vs AI: ${aiPrestige}`
              : `Early Victory! Reached prestige target of ${prestigeTarget}`;
            break;
          case 'defeat':
            reason = `Defeat! Final prestige: ${playerPrestige} vs AI: ${aiPrestige}`;
            break;
          case 'stalemate':
            reason = `Stalemate! Final prestige: ${playerPrestige} vs AI: ${aiPrestige}`;
            break;
        }
        dispatch(gameSlice.actions.setVictoryCondition({ condition: victoryStatus, reason }));
        return; // End game immediately
      }

      // Check for time-based game over
      if (currentYear >= GAME_OVER_YEAR) {
        if (omtTaken) {
          // Already took one more turn, now evaluate final victory
          const finalVictoryStatus = PrestigeService.evaluateVictoryStatus(
            playerPrestige,
            aiPrestige,
            prestigeTarget,
            true
          );
          const finalReason = `Game ended ${currentYear}. Final prestige: ${playerPrestige} vs AI: ${aiPrestige}`;
          dispatch(gameSlice.actions.setVictoryCondition({ condition: finalVictoryStatus, reason: finalReason }));
          return;
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

export const { incrementTurn, setGamePhase, startGame, takeOneMoreTurn, setDifficulty, adjustAIPrestige, setVictoryCondition, loadGameState } = gameSlice.actions;
export default gameSlice.reducer;

// Selectors (optional, can also be defined in the component or a dedicated selectors file)
export const selectCurrentTurn = (state: any) => state.game.currentTurn;
export const selectCurrentYear = (state: any) => state.game.currentYear;
export const selectGamePhase = (state: any) => state.game.gamePhase;
export const selectOneMoreTurnTaken = (state: any) => state.game.oneMoreTurnTaken;
export const selectIsLoadingNextTurn = (state: any) => state.game.isLoadingNextTurn;
export const selectGameError = (state: any) => state.game.error;
export const selectVictoryCondition = (state: any) => state.game.victoryCondition;
export const selectVictoryReason = (state: any) => state.game.victoryReason;
export const selectPrestigeTarget = (state: any) => state.game.prestigeTarget;
export const selectAIPrestige = (state: any) => state.game.aiPrestige;
export const selectDifficulty = (state: any) => state.game.difficulty;

