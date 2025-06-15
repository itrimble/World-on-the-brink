import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState, AppThunk } from './src/renderer/store'; // Assuming store is at src/renderer/store.ts

export type AIDifficulty = 'easy' | 'normal' | 'hard';

interface AIPlayerState {
  difficulty: AIDifficulty | null;
  isThinking: boolean;
  // Future AI-specific state markers (e.g., current goals, personality traits)
}

const initialState: AIPlayerState = {
  difficulty: null,
  isThinking: false,
};

const aiPlayerSlice = createSlice({
  name: 'aiPlayer',
  initialState,
  reducers: {
    setAIDifficulty: (state, action: PayloadAction<AIDifficulty>) => {
      state.difficulty = action.payload;
    },
    setAIIsThinking: (state, action: PayloadAction<boolean>) => {
      state.isThinking = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(processAITurn.pending, (state) => {
        state.isThinking = true;
      })
      .addCase(processAITurn.fulfilled, (state) => {
        state.isThinking = false;
      })
      .addCase(processAITurn.rejected, (state) => {
        state.isThinking = false;
        // Optionally handle errors, e.g., log them or set an error state
        console.error("AI turn processing failed.");
      });
  },
});

export const processAITurn = createAsyncThunk<void, void, { state: RootState }>(
  'aiPlayer/processAITurn',
  async (_, { dispatch, getState }) => {
    const difficulty = getState().aiPlayer.difficulty;
    console.log(`AI (${difficulty || 'Not set'}) is thinking...`);

    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log("AI has finished its turn.");
    // In the future, AI will dispatch actions here to affect the game state
  }
);

export const { setAIDifficulty, setAIIsThinking } = aiPlayerSlice.actions;

// Selectors
export const selectAIDifficulty = (state: RootState) => state.aiPlayer.difficulty;
export const selectAIIsThinking = (state: RootState) => state.aiPlayer.isThinking;

export default aiPlayerSlice.reducer;
