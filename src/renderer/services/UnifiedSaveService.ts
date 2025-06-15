// src/renderer/services/UnifiedSaveService.ts
import { SaveGameState, SavedGameMetadata } from '../../shared/types/game';
import { createLogger } from '../utils/logger';
import { saveGameService } from './save-game-service';
import { indexedDBSaveService } from './IndexedDBSaveService';

const logger = createLogger('UnifiedSaveService');

/**
 * Environment detection for choosing save backend
 */
interface SaveEnvironment {
  isElectron: boolean;
  isWeb: boolean;
  hasIndexedDB: boolean;
  hasElectronAPI: boolean;
}

/**
 * Unified save service that automatically chooses the best storage backend
 * based on the environment (Electron vs Web) and available features.
 */
export class UnifiedSaveService {
  private static instance: UnifiedSaveService;
  private environment: SaveEnvironment;
  private initialized = false;

  constructor() {
    this.environment = this.detectEnvironment();
  }

  public static getInstance(): UnifiedSaveService {
    if (!UnifiedSaveService.instance) {
      UnifiedSaveService.instance = new UnifiedSaveService();
    }
    return UnifiedSaveService.instance;
  }

  /**
   * Initialize the save service and its backends.
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.info('Initializing UnifiedSaveService', { environment: this.environment });

    try {
      // Always initialize IndexedDB for web compatibility and backup
      if (this.environment.hasIndexedDB) {
        await indexedDBSaveService.initialize();
        logger.info('IndexedDB save service initialized');
      }

      // Electron IPC is initialized automatically when available
      if (this.environment.hasElectronAPI) {
        logger.info('Electron save service available');
      }

      this.initialized = true;
      logger.info('UnifiedSaveService initialization complete');

    } catch (error) {
      logger.error('Failed to initialize UnifiedSaveService', error);
      throw error;
    }
  }

  /**
   * Save game with automatic backend selection.
   */
  public async saveGame(fileName: string, displayName?: string): Promise<{ success: boolean; path?: string; error?: string }> {
    await this.ensureInitialized();

    const primaryBackend = this.getPrimaryBackend();
    const fallbackBackend = this.getFallbackBackend();

    logger.info(`Saving game "${fileName}" using ${primaryBackend} backend`);

    try {
      // Try primary backend first
      const result = await this.saveWithBackend(primaryBackend, fileName, displayName);
      
      if (result.success) {
        // Also save to fallback backend for redundancy (if different)
        if (fallbackBackend && fallbackBackend !== primaryBackend) {
          this.saveWithBackend(fallbackBackend, fileName, displayName).catch(error => {
            logger.warn(`Fallback save failed for ${fileName}`, error);
          });
        }
        return result;
      }

      // If primary fails, try fallback
      if (fallbackBackend && fallbackBackend !== primaryBackend) {
        logger.warn(`Primary backend failed, trying fallback: ${fallbackBackend}`);
        return await this.saveWithBackend(fallbackBackend, fileName, displayName);
      }

      return result;

    } catch (error: any) {
      logger.error(`Save operation failed for ${fileName}`, error);
      return { 
        success: false, 
        error: `Save failed: ${error.message}` 
      };
    }
  }

  /**
   * Load game with automatic backend selection.
   */
  public async loadGame(fileName: string): Promise<{ success: boolean; data?: SaveGameState; error?: string }> {
    await this.ensureInitialized();

    const primaryBackend = this.getPrimaryBackend();
    const fallbackBackend = this.getFallbackBackend();

    logger.info(`Loading game "${fileName}" using ${primaryBackend} backend`);

    try {
      // Try primary backend first
      const result = await this.loadWithBackend(primaryBackend, fileName);
      
      if (result.success) {
        return result;
      }

      // If primary fails, try fallback
      if (fallbackBackend && fallbackBackend !== primaryBackend) {
        logger.warn(`Primary backend failed, trying fallback: ${fallbackBackend}`);
        return await this.loadWithBackend(fallbackBackend, fileName);
      }

      return result;

    } catch (error: any) {
      logger.error(`Load operation failed for ${fileName}`, error);
      return { 
        success: false, 
        error: `Load failed: ${error.message}` 
      };
    }
  }

  /**
   * List saved games from all available backends.
   */
  public async listSavedGames(): Promise<{
    success: boolean;
    savedGames?: SavedGameMetadata[];
    error?: string;
  }> {
    await this.ensureInitialized();

    try {
      const results: SavedGameMetadata[] = [];
      const seenFiles = new Set<string>();

      // Collect from primary backend
      const primaryBackend = this.getPrimaryBackend();
      const primaryResult = await this.listWithBackend(primaryBackend);
      
      if (primaryResult.success && primaryResult.savedGames) {
        primaryResult.savedGames.forEach(save => {
          if (!seenFiles.has(save.fileName)) {
            results.push({ ...save, source: primaryBackend as any });
            seenFiles.add(save.fileName);
          }
        });
      }

      // Collect from fallback backend (avoiding duplicates)
      const fallbackBackend = this.getFallbackBackend();
      if (fallbackBackend && fallbackBackend !== primaryBackend) {
        const fallbackResult = await this.listWithBackend(fallbackBackend);
        
        if (fallbackResult.success && fallbackResult.savedGames) {
          fallbackResult.savedGames.forEach(save => {
            if (!seenFiles.has(save.fileName)) {
              results.push({ ...save, source: fallbackBackend as any });
              seenFiles.add(save.fileName);
            }
          });
        }
      }

      // Sort by timestamp (newest first)
      results.sort((a, b) => b.timestamp - a.timestamp);

      logger.info(`Listed ${results.length} saved games from all backends`);
      return { success: true, savedGames: results };

    } catch (error: any) {
      logger.error('Failed to list saved games', error);
      return { 
        success: false, 
        error: `Failed to list saves: ${error.message}` 
      };
    }
  }

  /**
   * Delete saved game from all backends.
   */
  public async deleteSavedGame(fileName: string): Promise<{ success: boolean; error?: string }> {
    await this.ensureInitialized();

    logger.info(`Deleting game "${fileName}" from all backends`);

    let anySuccess = false;
    const errors: string[] = [];

    // Delete from primary backend
    const primaryBackend = this.getPrimaryBackend();
    try {
      const result = await this.deleteWithBackend(primaryBackend, fileName);
      if (result.success) {
        anySuccess = true;
      } else if (result.error) {
        errors.push(`${primaryBackend}: ${result.error}`);
      }
    } catch (error: any) {
      errors.push(`${primaryBackend}: ${error.message}`);
    }

    // Delete from fallback backend
    const fallbackBackend = this.getFallbackBackend();
    if (fallbackBackend && fallbackBackend !== primaryBackend) {
      try {
        const result = await this.deleteWithBackend(fallbackBackend, fileName);
        if (result.success) {
          anySuccess = true;
        } else if (result.error) {
          errors.push(`${fallbackBackend}: ${result.error}`);
        }
      } catch (error: any) {
        errors.push(`${fallbackBackend}: ${error.message}`);
      }
    }

    if (anySuccess) {
      logger.info(`Successfully deleted "${fileName}" from at least one backend`);
      return { success: true };
    } else {
      const errorMessage = `Failed to delete from all backends: ${errors.join(', ')}`;
      logger.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Quick save using the best available backend.
   */
  public async quickSave(): Promise<{ success: boolean; path?: string; error?: string }> {
    await this.ensureInitialized();

    const backend = this.getPrimaryBackend();
    
    if (backend === 'indexeddb') {
      return await indexedDBSaveService.quickSave();
    } else {
      return await saveGameService.quickSave();
    }
  }

  /**
   * Quick load using the best available backend.
   */
  public async quickLoad(): Promise<{ success: boolean; data?: SaveGameState; error?: string }> {
    await this.ensureInitialized();

    const primary = this.getPrimaryBackend();
    const fallback = this.getFallbackBackend();

    // Try primary first
    let result: { success: boolean; data?: SaveGameState; error?: string };
    
    if (primary === 'indexeddb') {
      result = await indexedDBSaveService.quickLoad();
    } else {
      result = await saveGameService.quickLoad();
    }

    // If primary fails and we have a fallback, try it
    if (!result.success && fallback && fallback !== primary) {
      if (fallback === 'indexeddb') {
        result = await indexedDBSaveService.quickLoad();
      } else {
        result = await saveGameService.quickLoad();
      }
    }

    return result;
  }

  /**
   * Auto save using the best available backend.
   */
  public async autoSave(): Promise<{ success: boolean; path?: string; error?: string }> {
    await this.ensureInitialized();

    const backend = this.getPrimaryBackend();
    
    if (backend === 'indexeddb') {
      return await indexedDBSaveService.autoSave();
    } else {
      return await saveGameService.autoSave();
    }
  }

  /**
   * Check if autosave should be performed.
   */
  public shouldAutosave(currentTurn: number, autosaveFrequency: number): boolean {
    return saveGameService.shouldAutosave(currentTurn, autosaveFrequency);
  }

  /**
   * Get storage statistics from all backends.
   */
  public async getStorageStats(): Promise<{
    electron?: any;
    indexeddb?: any;
    totalSaves: number;
    primaryBackend: string;
  }> {
    await this.ensureInitialized();

    const stats: any = {
      primaryBackend: this.getPrimaryBackend(),
      totalSaves: 0
    };

    // Get IndexedDB stats
    if (this.environment.hasIndexedDB) {
      try {
        stats.indexeddb = await indexedDBSaveService.getStorageStats();
        stats.totalSaves += stats.indexeddb.totalSaves;
      } catch (error) {
        logger.warn('Failed to get IndexedDB stats', error);
      }
    }

    // Get Electron stats (if available)
    if (this.environment.hasElectronAPI) {
      try {
        const electronSaves = await saveGameService.listSavedGames();
        stats.electron = {
          totalSaves: electronSaves.savedGames?.length || 0
        };
        stats.totalSaves += stats.electron.totalSaves;
      } catch (error) {
        logger.warn('Failed to get Electron stats', error);
      }
    }

    return stats;
  }

  /**
   * Export saves for backup (uses IndexedDB export if available).
   */
  public async exportSaves(): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    await this.ensureInitialized();

    if (this.environment.hasIndexedDB) {
      return await indexedDBSaveService.exportDatabase();
    } else {
      return { 
        success: false, 
        error: 'Export not available in current environment' 
      };
    }
  }

  /**
   * Import saves from backup (uses IndexedDB import if available).
   */
  public async importSaves(blob: Blob): Promise<{ success: boolean; error?: string }> {
    await this.ensureInitialized();

    if (this.environment.hasIndexedDB) {
      return await indexedDBSaveService.importDatabase(blob);
    } else {
      return { 
        success: false, 
        error: 'Import not available in current environment' 
      };
    }
  }

  // Private helper methods

  private detectEnvironment(): SaveEnvironment {
    const isElectron = !!(window as any).electronAPI;
    const isWeb = !isElectron;
    const hasIndexedDB = 'indexedDB' in window;
    const hasElectronAPI = !!(window as any).electronAPI;

    return {
      isElectron,
      isWeb,
      hasIndexedDB,
      hasElectronAPI
    };
  }

  private getPrimaryBackend(): 'electron' | 'indexeddb' {
    // Prefer Electron IPC when available for better performance and file system integration
    if (this.environment.hasElectronAPI) {
      return 'electron';
    }
    // Fall back to IndexedDB for web environments
    if (this.environment.hasIndexedDB) {
      return 'indexeddb';
    }
    // Default to electron (will handle errors gracefully)
    return 'electron';
  }

  private getFallbackBackend(): 'electron' | 'indexeddb' | null {
    const primary = this.getPrimaryBackend();
    
    if (primary === 'electron' && this.environment.hasIndexedDB) {
      return 'indexeddb';
    }
    if (primary === 'indexeddb' && this.environment.hasElectronAPI) {
      return 'electron';
    }
    
    return null;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async saveWithBackend(backend: 'electron' | 'indexeddb', fileName: string, displayName?: string) {
    if (backend === 'indexeddb') {
      return await indexedDBSaveService.saveGame(fileName, displayName);
    } else {
      return await saveGameService.saveGame(fileName, displayName);
    }
  }

  private async loadWithBackend(backend: 'electron' | 'indexeddb', fileName: string) {
    if (backend === 'indexeddb') {
      return await indexedDBSaveService.loadGame(fileName);
    } else {
      return await saveGameService.loadGame(fileName);
    }
  }

  private async listWithBackend(backend: 'electron' | 'indexeddb') {
    if (backend === 'indexeddb') {
      return await indexedDBSaveService.listSavedGames();
    } else {
      return await saveGameService.listSavedGames();
    }
  }

  private async deleteWithBackend(backend: 'electron' | 'indexeddb', fileName: string) {
    if (backend === 'indexeddb') {
      return await indexedDBSaveService.deleteSavedGame(fileName);
    } else {
      return await saveGameService.deleteSavedGame(fileName);
    }
  }
}

// Export singleton instance
export const unifiedSaveService = UnifiedSaveService.getInstance();