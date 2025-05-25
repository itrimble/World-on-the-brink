import { configureStore } from '@reduxjs/toolkit';
import playerReducer from '../../player-slice'; // Adjust path to root
import worldReducer from '../../world-slice';   // Adjust path to root
import uiReducer from '../../uislice-component'; // Adjust path to root (assuming uislice-component.ts is uiSlice.ts)
import gameReducer from '../../gameSlice';     // Adjust path to root

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
export type AppThunk<ReturnType = void> = createAsyncThunk<
  ReturnType,
  void, // Argument type for the thunk payload creator
  { state: RootState } // Types for thunkAPI
>;


/**
 * Type definition for dispatching actions from the store, including thunks.
 */
export type AppDispatch = typeof store.dispatch;

export default store;
```
