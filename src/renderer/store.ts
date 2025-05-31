import { configureStore } from '@reduxjs/toolkit';
import playerReducer from '../../player-slice'; // Adjust path to root
import worldReducer from '../../world-slice';   // Adjust path to root
import uiReducer from '../../uislice-component'; // Adjust path to root (assuming uislice-component.ts is uiSlice.ts)
import gameReducer from '../../gameSlice';     // Adjust path to root
import aiPlayerReducer from '../../ai-player-slice'; // Adjust path to root

/**
 * The root Redux store for the application.
 * It combines reducers from different feature slices.
 */
const store = configureStore({
  reducer: {
    player: playerReducer,
    world: worldReducer,
    ui: uiReducer,
    game: gameReducer,
    aiPlayer: aiPlayerReducer, // Add AI player reducer
    // Add other reducers here as the application grows
  },
  // Middleware can be added here (e.g., for logging, thunks which are included by default)
  // devTools: process.env.NODE_ENV !== 'production', // Enable Redux DevTools in development
});

/**
 * Type definition for the root state of the Redux store.
 * This is inferred from the store itself to ensure it's always up-to-date.
 */
export type RootState = ReturnType<typeof store.getState>;

/**
 * Type definition for thunk actions within the application.
 * Specifies the root state type, no extra arguments, and allows any action type.
 */
// Note: createAsyncThunk is already imported in ai-player-slice.ts, ensure it's correctly used or removed if not needed here directly.
// For a generic AppThunk type, if not using createAsyncThunk directly here, it might look like:
// import { ThunkAction } from 'redux-thunk';
// import { Action } from '@reduxjs/toolkit';
// export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action<string>>;

// If createAsyncThunk is the primary way to define thunks, its types are handled by createAsyncThunk itself.
// The existing AppThunk type might be for a different pattern or can be re-evaluated.
// For now, I'll keep it as is, assuming it's used elsewhere or will be.
export type AppThunk<ReturnType = void> = import('@reduxjs/toolkit').AsyncThunk<
  ReturnType,
  void,
  { state: RootState }
>;


/**
 * Type definition for dispatching actions from the store, including thunks.
 */
export type AppDispatch = typeof store.dispatch;

export default store;
```
