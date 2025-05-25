```typescript
// src/renderer/services/SaveGameService.ts
import { store } from '../store';
import { GameState } from '../../shared/types/game';

/**
 * Service for saving and loading game state
 */
export class SaveGameService {
  /**
   * Save the current game state
   * @param saveName Name to use for the save
   * @returns Promise resolving to success status and path
   */
  public async saveGame(saveName: string): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      // Get current game state from Redux store
      const state = store.getState();
      
      // Create save data object
      const saveData: GameState = {
        // Basic game state
        currentTurn: state.game.currentTurn,
        startYear: state.game.startYear,
        currentYear: state.game.currentYear,
        endYear: state.game.endYear,
        gameDifficulty: state.game.gameDifficulty,
        gameMode: state.game.gameMode,
        
        // World state
        world: {
          countries: state.world.countries,
          tensionLevel: state.world.tensionLevel,
          climateStabilityIndex: state.world.climateStabilityIndex,
          currentCrises: state.world.currentCrises,
          historicalEvents: state.world.historicalEvents
        },
        
        // Player state
        player: {
          faction: state.player.faction,
          politicalCapital: state.player.politicalCapital,
          prestige: state.player.prestige,
          militaryReserves: state.player.militaryReserves,
          economicReserves: state.player.economicReserves,
          defcon: state.player.defcon,
          activePolicies: state.player.activePolicies,
          diplomaticInfluence: state.player.diplomaticInfluence
        },
        
        // Save metadata
        metadata: {
          version: '0.1.0', // Game version
          timestamp: Date.now(),
          saveName,
          createdAt: new Date().toISOString()
        }
      };
      
      // Use Electron IPC to save the file
      const result = await window.electronAPI.saveGame(saveName, saveData);
      
      if (result.success) {
        console.log(`Game saved successfully to ${result.path}`);
        return { success: true, path: result.path };
      } else {
        console.error('Failed to save game:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error saving game:', error);
      return { success: false, error: (error as Error).message };
    }
  }
  
  /**
   * Load a saved game
   * @param saveName Name of the save to load
   * @returns Promise resolving to the game state
   */
  public async loadGame(saveName: string): Promise<{ success: boolean; data?: GameState; error?: string }> {
    try {
      // Use Electron IPC to load the file
      const result = await window.electronAPI.loadGame(saveName);
      
      if (result.success) {
        // Validate the loaded data
        if (!this.isValidSaveData(result.data)) {
          return { success: false, error: 'Invalid save data format' };
        }
        
        console.log(`Game loaded successfully from ${saveName}`);
        return { success: true, data: result.data };
      } else {
        console.error('Failed to load game:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error loading game:', error);
      return { success: false, error: (error as Error).message };
    }
  }
  
  /**
   * List all saved games
   * @returns Promise resolving to a list of save game metadata
   */
  public async listSavedGames(): Promise<{ 
    success: boolean; 
    savedGames?: Array<{
      fileName: string;
      saveName: string;
      timestamp: number;
      version: string;
      lastModified: string;
    }>;
    error?: string;
  }> {
    try {
      // Use Electron IPC to list saved games
      const result = await window.electronAPI.listSavedGames();
      
      if (result.success) {
        console.log(`Found ${result.savedGames.length} saved games`);
        return { success: true, savedGames: result.savedGames };
      } else {
        console.error('Failed to list saved games:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error listing saved games:', error);
      return { success: false, error: (error as Error).message };
    }
  }
  
  /**
   * Delete a saved game
   * @param saveName Name of the save to delete
   * @returns Promise resolving to success status
   */
  public async deleteSavedGame(saveName: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Use Electron IPC to delete the file
      const result = await window.electronAPI.deleteSavedGame(saveName);
      
      if (result.success) {
        console.log(`Save game ${saveName} deleted successfully`);
        return { success: true };
      } else {
        console.error('Failed to delete saved game:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error deleting saved game:', error);
      return { success: false, error: (error as Error).message };
    }
  }
  
  /**
   * Validate save data structure
   * @param data Data to validate
   * @returns Whether the data is valid
   */
  private isValidSaveData(data: any): data is GameState {
    // Check if basic structure exists
    if (!data || typeof data !== 'object') return false;
    if (!data.world || !data.player || !data.metadata) return false;
    
    // Check for critical fields
    if (typeof data.currentTurn !== 'number') return false;
    if (typeof data.currentYear !== 'number') return false;
    if (!data.world.countries || typeof data.world.countries !== 'object') return false;
    
    // If passes basic validation, assume it's valid
    // A more thorough validation would check all fields and types
    return true;
  }
  
  /**
   * Create a quick save
   * @returns Promise resolving to success status and path
   */
  public async quickSave(): Promise<{ success: boolean; path?: string; error?: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return this.saveGame(`QuickSave_${timestamp}`);
  }
  
  /**
   * Load the most recent quick save
   * @returns Promise resolving to the game state
   */
  public async quickLoad(): Promise<{ success: boolean; data?: GameState; error?: string }> {
    try {
      // List all saved games
      const result = await this.listSavedGames();
      
      if (!result.success || !result.savedGames || result.savedGames.length === 0) {
        return { success: false, error: 'No saved games found' };
      }
      
      // Find the most recent quick save
      const quickSaves = result.savedGames
        .filter(save => save.saveName.startsWith('QuickSave_'))
        .sort((a, b) => b.timestamp - a.timestamp);
      
      if (quickSaves.length === 0) {
        return { success: false, error: 'No quick saves found' };
      }
      
      // Load the most recent quick save
      return this.loadGame(quickSaves[0].fileName);
    } catch (error) {
      console.error('Error loading quick save:', error);
      return { success: false, error: (error as Error).message };
    }
  }
  
  /**
   * Create an autosave
   * @returns Promise resolving to success status and path
   */
  public async autoSave(): Promise<{ success: boolean; path?: string; error?: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return this.saveGame(`AutoSave_${timestamp}`);
  }
  
  /**
   * Check if an autosave setting is enabled and should trigger on this turn
   * @param currentTurn Current game turn
   * @param autosaveFrequency How often to autosave (in turns)
   * @returns Whether an autosave should be triggered
   */
  public shouldAutosave(currentTurn: number, autosaveFrequency: number): boolean {
    // Don't autosave on turn 0
    if (currentTurn === 0) return false;
    
    // Autosave based on frequency
    return currentTurn % autosaveFrequency === 0;
  }
}

// Export singleton instance
export const saveGameService = new SaveGameService();
```