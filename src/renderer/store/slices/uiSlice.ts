```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  selectedCountryId: string | null;
  activePanelId: string | null;
  mapMode: 'political' | 'influence' | 'insurgency' | 'coup' | 'economy';
  notifications: {
    id: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    timestamp: number;
  }[];
}

const initialState: UIState = {
  selectedCountryId: null,
  activePanelId: null,
  mapMode: 'political',
  notifications: [],
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Country selection
    selectCountry: (state, action: PayloadAction<string>) => {
      state.selectedCountryId = action.payload;
    },
    
    closeCountryPanel: (state) => {
      state.selectedCountryId = null;
    },
    
    // Panel management
    openPanel: (state, action: PayloadAction<string>) => {
      state.activePanelId = action.payload;
    },
    
    closePanel: (state) => {
      state.activePanelId = null;
    },
    
    // Map mode
    setMapMode: (state, action: PayloadAction<UIState['mapMode']>) => {
      state.mapMode = action.payload;
    },
    
    // Notifications
    addNotification: (state, action: PayloadAction<{
      message: string;
      type: 'info' | 'warning' | 'error' | 'success';
    }>) => {
      state.notifications.push({
        id: Date.now().toString(),
        message: action.payload.message,
        type: action.payload.type,
        timestamp: Date.now(),
      });
      
      // Keep only the latest 5 notifications
      if (state.notifications.length > 5) {
        state.notifications.shift();
      }
    },
    
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    
    clearAllNotifications: (state) => {
      state.notifications = [];
    },
  },
});

export const {
  selectCountry,
  closeCountryPanel,
  openPanel,
  closePanel,
  setMapMode,
  addNotification,
  removeNotification,
  clearAllNotifications,
} = uiSlice.actions;

export default uiSlice.reducer;
```