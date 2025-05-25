```typescript
// src/main/ipc/preferencesHandlers.ts
import { app, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

// Define the preferences file path
const getPreferencesFilePath = () => {
  return path.join(app.getPath('userData'), 'preferences.json');
};

// Default preferences
const defaultPreferences = {
  graphics: {
    quality: 'high',
    vsync: true,
    fullscreen: false,
  },
  sound: {
    masterVolume: 0.8,
    musicVolume: 0.7,
    effectsVolume: 0.8,
    ambientVolume: 0.6,
  },
  gameplay: {
    gameSpeed: 'normal',
    defaultDifficulty: 'beginner',
    autosaveFrequency: 5, // turns
    confirmTurnEnd: true,
  },
  interface: {
    fontSize: 'medium',
    colorScheme: 'dark',
    showTutorialTips: true,
    enableNotifications: true,
  },
  accessibility: {
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    screenReaderSupport: false,
  },
  controller: {
    enabled: false,
    vibration: true,
    deadzone: 0.15,
    sensitivity: 0.5,
    buttonMapping: {
      // Default button mapping
    },
  }
};

export const setupPreferencesHandlers = () => {
  // Save preferences
  ipcMain.handle('save-preferences', async (_, preferences: any) => {
    try {
      const prefsPath = getPreferencesFilePath();
      
      // Merge with defaults to ensure all fields exist
      const currentPrefs = loadPreferencesSync();
      const mergedPrefs = { ...currentPrefs, ...preferences };
      
      fs.writeFileSync(prefsPath, JSON.stringify(mergedPrefs, null, 2), 'utf-8');
      
      return { success: true };
    } catch (error) {
      console.error('Error saving preferences:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Load preferences
  ipcMain.handle('load-preferences', async () => {
    try {
      const preferences = loadPreferencesSync();
      return { success: true, preferences };
    } catch (error) {
      console.error('Error loading preferences:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Reset preferences to default
  ipcMain.handle('reset-preferences', async () => {
    try {
      const prefsPath = getPreferencesFilePath();
      fs.writeFileSync(prefsPath, JSON.stringify(defaultPreferences, null, 2), 'utf-8');
      
      return { success: true, preferences: defaultPreferences };
    } catch (error) {
      console.error('Error resetting preferences:', error);
      return { success: false, error: (error as Error).message };
    }
  });
};

// Helper function to load preferences synchronously
const loadPreferencesSync = () => {
  const prefsPath = getPreferencesFilePath();
  
  if (!fs.existsSync(prefsPath)) {
    // If preferences file doesn't exist, create it with defaults
    fs.writeFileSync(prefsPath, JSON.stringify(defaultPreferences, null, 2), 'utf-8');
    return defaultPreferences;
  }
  
  try {
    const prefsData = fs.readFileSync(prefsPath, 'utf-8');
    const preferences = JSON.parse(prefsData);
    
    // Merge with defaults to ensure any new fields are included
    return { ...defaultPreferences, ...preferences };
  } catch (error) {
    console.error('Error parsing preferences file:', error);
    // If there's an error reading/parsing the file, return defaults
    return defaultPreferences;
  }
};
```