// src/renderer/services/SaveGameService.ts
import { store } from '../store';
import { GameState } from '../../shared/types/game';
import { createLogger } from '../utils/logger'; // Import the logger

const logger = createLogger('SaveGameService');

/**
 * Provides services for saving, loading, listing, and deleting game states.
 * It interacts with the main process via Electron's IPC (Inter-Process Communication)
 * to perform file system operations.
 * This class is designed as a singleton, with `saveGameService` being the exported instance.
 */
export class SaveGameService {
  /**
   * Saves the current game state to a file.
   * The actual file system operation is handled by the main process via `window.electronAPI.saveGame`.
   *
   * @param fileName - The identifier for the save file (e.g., "my_save.sav" or a unique ID).
   *                   This is used by the main process to determine the actual file path.
   * @param displayName - Optional. The user-friendly name for the save (e.g., "Chapter 5 - The Final Stand").
   *                      If provided, this is stored in the save file's metadata. Otherwise, `fileName` is used.
   * @returns A promise that resolves to an object indicating success or failure,
   *          including the file path if successful, or an error message if not.
   */
  public async saveGame(fileName: string, displayName?: string): Promise<{ success: boolean; path?: string; error?: string }> {
    const operationDescription = displayName 
      ? `Save new game as "${displayName}" (file: ${fileName})` 
      : `Overwrite game "${fileName}"`;
    logger.info(`Attempting to ${operationDescription}.`);

    try {
      const state = store.getState();
      // Construct the GameState object from the current Redux store state.
      // This object represents the complete data to be saved.
      const saveData: GameState = {
        currentTurn: state.game.currentTurn,
        startYear: state.game.startYear,
        currentYear: state.game.currentYear,
        endYear: state.game.endYear,
        gameDifficulty: state.game.gameDifficulty,
        gameMode: state.game.gameMode,
        world: {
          countries: state.world.countries,
          tensionLevel: state.world.tensionLevel,
          climateStabilityIndex: state.world.climateStabilityIndex,
          currentCrises: state.world.currentCrises,
          historicalEvents: state.world.historicalEvents,
        },
        player: {
          faction: state.player.faction,
          politicalCapital: state.player.politicalCapital,
          prestige: state.player.prestige,
          militaryReserves: state.player.militaryReserves,
          economicReserves: state.player.economicReserves,
          defcon: state.player.defcon,
          activePolicies: state.player.activePolicies,
          diplomaticInfluence: state.player.diplomaticInfluence,
        },
        metadata: {
          version: '0.1.0', // Application/game version. Consider making this dynamic.
          timestamp: Date.now(), // Unix timestamp of when the save occurred.
          saveName: displayName || fileName, // User-facing name for the save.
          createdAt: new Date().toISOString(), // ISO 8601 timestamp.
        },
      };

      logger.debug(`Calling IPC 'saveGame' for file: ${fileName}`, { dataSize: JSON.stringify(saveData).length });
      // Delegate file saving to the main process.
      const result = await window.electronAPI.saveGame(fileName, saveData);

      if (result.success) {
        logger.info(`${operationDescription} successful. Path: ${result.path}`);
        return { success: true, path: result.path };
      } else {
        logger.error(`IPC 'saveGame' failed for file: ${fileName}. Error: ${result.error}`);
        return { success: false, error: `Failed to save game "${displayName || fileName}": ${result.error}` };
      }
    } catch (error: any) {
      logger.error(`Exception during ${operationDescription}.`, error, { fileName });
      return { 
        success: false, 
        error: `An unexpected error occurred while saving "${displayName || fileName}": ${error.message}` 
      };
    }
  }

  /**
   * Loads a game state from a specified save file.
   * The file reading is handled by the main process via `window.electronAPI.loadGame`.
   * Includes validation of the loaded data structure.
   *
   * @param fileName - The identifier of the save file to load.
   * @returns A promise that resolves to an object containing the loaded `GameState` if successful,
   *          or an error message if loading or validation fails.
   */
  public async loadGame(fileName: string): Promise<{ success: boolean; data?: GameState; error?: string }> {
    logger.info(`Attempting to load game: "${fileName}"`);
    try {
      logger.debug(`Calling IPC 'loadGame' for file: ${fileName}`);
      // Delegate file loading to the main process.
      const result = await window.electronAPI.loadGame(fileName);

      if (result.success && result.data) {
        logger.debug(`IPC 'loadGame' successful for: ${fileName}. Validating data structure...`);
        // Validate the structure of the loaded data.
        if (!this.isValidSaveData(result.data)) {
          logger.warn(`Invalid save data format for: "${fileName}"`, { receivedData: result.data });
          return { success: false, error: `Save file "${fileName}" contains invalid or corrupted data. It may be from an incompatible version or tampered.` };
        }
        logger.info(`Game "${fileName}" loaded and validated successfully.`);
        return { success: true, data: result.data as GameState }; // Cast after validation.
      } else {
        logger.error(`IPC 'loadGame' failed for "${fileName}". Error: ${result.error}`);
        return { success: false, error: `Failed to load game "${fileName}": ${result.error}` };
      }
    } catch (error: any) {
      logger.error(`Exception loading game "${fileName}".`, error);
      return { 
        success: false, 
        error: `An unexpected error occurred while loading "${fileName}": ${error.message}` 
      };
    }
  }

  /**
   * Retrieves a list of all available saved games.
   * Fetches metadata about each save file from the main process via `window.electronAPI.listSavedGames`.
   *
   * @returns A promise that resolves to an object containing an array of `SavedGameMetadata` objects
   *          if successful, or an error message if the operation fails.
   *          `SavedGameMetadata` should include `fileName`, `saveName`, `timestamp`, `version`, and `lastModified`.
   */
  public async listSavedGames(): Promise<{
    success: boolean;
    savedGames?: SavedGameMetadata[]; // Use the specific type from shared types
    error?: string;
  }> {
    logger.info('Attempting to list saved games.');
    try {
      logger.debug("Calling IPC 'listSavedGames'");
      // Delegate listing to the main process.
      const result = await window.electronAPI.listSavedGames();

      if (result.success && result.savedGames) {
        logger.info(`Found ${result.savedGames.length} saved games.`);
        logger.debug('Saved games list retrieved:', result.savedGames.map(sg => sg.fileName));
        return { success: true, savedGames: result.savedGames };
      } else {
        logger.error(`IPC 'listSavedGames' failed. Error: ${result.error}`);
        return { success: false, error: `Failed to retrieve list of saved games: ${result.error}` };
      }
    } catch (error: any) {
      logger.error('Exception listing saved games.', error);
      return { 
        success: false, 
        error: `An unexpected error occurred while listing saved games: ${error.message}` 
      };
    }
  }

  /**
   * Deletes a specified saved game file.
   * The file deletion is handled by the main process via `window.electronAPI.deleteSavedGame`.
   *
   * @param fileName - The identifier of the save file to delete.
   * @returns A promise that resolves to an object indicating success or failure,
   *          with an error message if deletion fails.
   */
  public async deleteSavedGame(fileName: string): Promise<{ success: boolean; error?: string }> {
    logger.info(`Attempting to delete saved game: "${fileName}"`);
    try {
      logger.debug(`Calling IPC 'deleteSavedGame' for file: ${fileName}`);
      // Delegate file deletion to the main process.
      const result = await window.electronAPI.deleteSavedGame(fileName);

      if (result.success) {
        logger.info(`Saved game "${fileName}" deleted successfully.`);
        return { success: true };
      } else {
        logger.error(`IPC 'deleteSavedGame' failed for "${fileName}". Error: ${result.error}`);
        return { success: false, error: `Failed to delete saved game "${fileName}": ${result.error}` };
      }
    } catch (error: any) {
      logger.error(`Exception deleting saved game "${fileName}".`, error);
      return { 
        success: false, 
        error: `An unexpected error occurred while deleting "${fileName}": ${error.message}` 
      };
    }
  }

  /**
   * Validates the basic structure and critical fields of loaded save game data.
   * This is a crucial step to ensure data integrity and prevent errors when loading a game.
   *
   * @param data - The game state data loaded from a file.
   * @returns `true` if the data passes basic validation checks, `false` otherwise.
   * @private
   */
  private isValidSaveData(data: any): data is GameState {
    logger.debug('Validating save data structure.');
    if (!data || typeof data !== 'object') {
      logger.warn('Validation failed: Data is null or not an object.', { data });
      return false;
    }
    // Check for presence of top-level state keys.
    const requiredTopLevelKeys: Array<keyof GameState> = ['world', 'player', 'metadata', 'currentTurn', 'currentYear'];
    for (const key of requiredTopLevelKeys) {
      if (!(key in data)) {
        logger.warn(`Validation failed: Missing top-level key: "${key}".`, { data });
        return false;
      }
    }
    // Example of checking nested properties and their types.
    if (typeof data.world !== 'object' || data.world === null || typeof data.world.countries !== 'object' || data.world.countries === null) {
      logger.warn('Validation failed: Invalid or missing world or countries data.', { worldData: data.world });
      return false;
    }
    if (typeof data.metadata.saveName !== 'string' || typeof data.metadata.timestamp !== 'number') {
        logger.warn('Validation failed: Invalid metadata fields (saveName or timestamp).', { metadata: data.metadata });
      return false;
    }
    // Add more specific checks for critical data points as the GameState evolves.
    // For example, check player faction, resources, etc.
    logger.debug('Save data validation successful.');
    return true;
  }

  /**
   * Creates a "quick save" with a timestamped name.
   * Useful for automatic saving or user-initiated quick saves without prompting for a name.
   * @returns A promise resolving to the save operation's result.
   */
  public async quickSave(): Promise<{ success: boolean; path?: string; error?: string }> {
    // Generate a unique name for the quick save, typically including a timestamp.
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Sanitize timestamp for filename.
    const quickSaveFileName = `QuickSave_${timestamp}`; // This will be used as the actual file identifier.
    const quickSaveDisplayName = `Quick Save (${new Date().toLocaleTimeString()})`; // User-friendly display name.
    
    logger.info(`Attempting Quick Save: Display Name "${quickSaveDisplayName}", File ID "${quickSaveFileName}"`);
    return this.saveGame(quickSaveFileName, quickSaveDisplayName);
  }

  /**
   * Loads the most recent "quick save" file.
   * It lists all saves, filters for those starting with "QuickSave_", sorts them by timestamp,
   * and attempts to load the newest one.
   * @returns A promise resolving to the loaded game state or an error if no quick saves are found or loading fails.
   */
  public async quickLoad(): Promise<{ success: boolean; data?: GameState; error?: string }> {
    logger.info('Attempting to Quick Load.');
    try {
      const listResult = await this.listSavedGames();
      if (!listResult.success || !listResult.savedGames || listResult.savedGames.length === 0) {
        logger.warn('Quick Load failed: No saved games found in the directory.');
        return { success: false, error: 'No saved games found. Cannot perform quick load.' };
      }

      // Filter for quick saves and sort by timestamp (descending) to find the most recent.
      const quickSaves = listResult.savedGames
        .filter(save => save.fileName.startsWith('QuickSave_')) // Assuming fileName is the identifier
        .sort((a, b) => b.timestamp - a.timestamp);

      if (quickSaves.length === 0) {
        logger.warn('Quick Load failed: No files matching the "QuickSave_" pattern found.');
        return { success: false, error: 'No quick saves found.' };
      }

      const mostRecentQuickSave = quickSaves[0];
      logger.info(`Found most recent quick save: "${mostRecentQuickSave.fileName}". Proceeding to load.`);
      return this.loadGame(mostRecentQuickSave.fileName);
    } catch (error: any) {
      logger.error('Exception during Quick Load operation.', error);
      return { 
        success: false, 
        error: `An unexpected error occurred during quick load: ${error.message}` 
      };
    }
  }

  /**
   * Creates an "autosave" with a timestamped name.
   * Similar to quick save, but typically used for automatic background saving.
   * @returns A promise resolving to the save operation's result.
   */
  public async autoSave(): Promise<{ success: boolean; path?: string; error?: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const autoSaveFileName = `AutoSave_${timestamp}`;
    const autoSaveDisplayName = `AutoSave (${new Date().toLocaleTimeString()})`;

    logger.info(`Attempting AutoSave: Display Name "${autoSaveDisplayName}", File ID "${autoSaveFileName}"`);
    return this.saveGame(autoSaveFileName, autoSaveDisplayName);
  }

  /**
   * Determines if an autosave should be performed based on the current turn and frequency settings.
   *
   * @param currentTurn - The current game turn number.
   * @param autosaveFrequency - The configured frequency (in turns) for autosaving.
   *                            A value of 0 or less typically means autosave is disabled.
   * @returns `true` if an autosave should be triggered on the current turn, `false` otherwise.
   */
  public shouldAutosave(currentTurn: number, autosaveFrequency: number): boolean {
    if (autosaveFrequency <= 0) {
      // logger.debug('Autosave check: Autosave disabled (frequency <= 0).');
      return false; 
    }
    // Don't autosave on the very first turn (turn 0 or 1, depending on game logic).
    if (currentTurn === 0) { 
      logger.debug('Autosave check: Turn 0, skipping autosave.');
      return false;
    }
    const should = currentTurn % autosaveFrequency === 0;
    logger.debug(`Autosave check: Turn ${currentTurn}, Frequency ${autosaveFrequency}. Should autosave: ${should}`);
    return should;
  }
}

/**
 * Singleton instance of the `SaveGameService`.
 * This instance is used throughout the application to interact with save game functionalities.
 */
export const saveGameService = new SaveGameService();
```