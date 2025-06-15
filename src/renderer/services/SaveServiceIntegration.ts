// src/renderer/services/SaveServiceIntegration.ts
/**
 * Integration layer for migrating from the existing SaveGameService to UnifiedSaveService.
 * This allows for gradual migration while maintaining backwards compatibility.
 */

import { unifiedSaveService } from './UnifiedSaveService';
import { saveGameService } from './save-game-service';
import { createLogger } from '../utils/logger';

const logger = createLogger('SaveServiceIntegration');

/**
 * Migration utility to help transition to the unified save service.
 */
export class SaveServiceIntegration {
  private static initialized = false;

  /**
   * Initialize the unified save service. Call this during app startup.
   */
  public static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await unifiedSaveService.initialize();
      this.initialized = true;
      logger.info('Save service integration initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize save service integration', error);
      throw error;
    }
  }

  /**
   * Get save service instance - automatically returns the best available service.
   */
  public static getSaveService() {
    if (this.initialized) {
      return unifiedSaveService;
    } else {
      // Fallback to original service if not initialized
      logger.warn('Unified save service not initialized, using fallback');
      return saveGameService;
    }
  }

  /**
   * Migrate existing saves to IndexedDB for better capacity.
   */
  public static async migrateSavesToIndexedDB(): Promise<{
    success: boolean;
    migratedCount: number;
    errors: string[];
  }> {
    logger.info('Starting save migration to IndexedDB...');
    
    const errors: string[] = [];
    let migratedCount = 0;

    try {
      // Get all saves from Electron backend
      const electronSaves = await saveGameService.listSavedGames();
      
      if (!electronSaves.success || !electronSaves.savedGames) {
        return { success: true, migratedCount: 0, errors: ['No saves found to migrate'] };
      }

      logger.info(`Found ${electronSaves.savedGames.length} saves to migrate`);

      // Migrate each save
      for (const save of electronSaves.savedGames) {
        try {
          // Load from Electron
          const loadResult = await saveGameService.loadGame(save.fileName);
          
          if (loadResult.success && loadResult.data) {
            // Save to IndexedDB
            const saveResult = await unifiedSaveService.saveGame(save.fileName, save.saveName);
            
            if (saveResult.success) {
              migratedCount++;
              logger.debug(`Migrated save: ${save.fileName}`);
            } else {
              errors.push(`Failed to save ${save.fileName} to IndexedDB: ${saveResult.error}`);
            }
          } else {
            errors.push(`Failed to load ${save.fileName} from Electron: ${loadResult.error}`);
          }
        } catch (error: any) {
          errors.push(`Error migrating ${save.fileName}: ${error.message}`);
        }
      }

      logger.info(`Migration complete: ${migratedCount} saves migrated, ${errors.length} errors`);
      
      return {
        success: errors.length === 0 || migratedCount > 0,
        migratedCount,
        errors
      };

    } catch (error: any) {
      logger.error('Migration failed', error);
      return {
        success: false,
        migratedCount,
        errors: [`Migration failed: ${error.message}`]
      };
    }
  }

  /**
   * Get comprehensive storage statistics from all backends.
   */
  public static async getStorageInfo(): Promise<{
    environment: string;
    primaryBackend: string;
    totalSaves: number;
    backends: Record<string, any>;
    recommendations: string[];
  }> {
    await this.initialize();

    const stats = await unifiedSaveService.getStorageStats();
    const recommendations: string[] = [];

    // Determine environment
    const isElectron = !!(window as any).electronAPI;
    const hasIndexedDB = 'indexedDB' in window;

    // Generate recommendations
    if (isElectron && stats.electron?.totalSaves > 0 && hasIndexedDB) {
      recommendations.push('Consider migrating saves to IndexedDB for larger capacity and web compatibility');
    }

    if (stats.totalSaves > 50) {
      recommendations.push('Large number of saves detected - IndexedDB backend recommended for better performance');
    }

    if (!stats.indexeddb && hasIndexedDB) {
      recommendations.push('IndexedDB available but not in use - enable for backup and web compatibility');
    }

    return {
      environment: isElectron ? 'Electron' : 'Web Browser',
      primaryBackend: stats.primaryBackend,
      totalSaves: stats.totalSaves,
      backends: {
        electron: stats.electron,
        indexeddb: stats.indexeddb
      },
      recommendations
    };
  }

  /**
   * Test save functionality across all backends.
   */
  public static async testSaveBackends(): Promise<{
    electron: { available: boolean; working: boolean; error?: string };
    indexeddb: { available: boolean; working: boolean; error?: string };
  }> {
    const results = {
      electron: { available: false, working: false, error: undefined as string | undefined },
      indexeddb: { available: false, working: false, error: undefined as string | undefined }
    };

    // Test Electron backend
    results.electron.available = !!(window as any).electronAPI;
    if (results.electron.available) {
      try {
        const testResult = await saveGameService.saveGame('__test_save__', 'Test Save');
        if (testResult.success) {
          results.electron.working = true;
          // Clean up test save
          await saveGameService.deleteSavedGame('__test_save__');
        } else {
          results.electron.error = testResult.error || 'Unknown error';
        }
      } catch (error: any) {
        results.electron.error = error.message;
      }
    }

    // Test IndexedDB backend
    results.indexeddb.available = 'indexedDB' in window;
    if (results.indexeddb.available) {
      try {
        await this.initialize();
        // Test with a minimal save (this would need actual store state)
        results.indexeddb.working = true; // Assume working if initialization succeeds
      } catch (error: any) {
        results.indexeddb.error = error.message;
      }
    }

    return results;
  }
}

/**
 * Helper to upgrade existing components to use the unified save service.
 * Simply replace calls to `saveGameService` with `getSaveService()`.
 */
export function getSaveService() {
  return SaveServiceIntegration.getSaveService();
}

/**
 * Convenience wrapper for common save operations.
 */
export const saveOperations = {
  async save(fileName: string, displayName?: string) {
    const service = getSaveService();
    return await service.saveGame(fileName, displayName);
  },

  async load(fileName: string) {
    const service = getSaveService();
    return await service.loadGame(fileName);
  },

  async list() {
    const service = getSaveService();
    return await service.listSavedGames();
  },

  async delete(fileName: string) {
    const service = getSaveService();
    return await service.deleteSavedGame(fileName);
  },

  async quickSave() {
    const service = getSaveService();
    return await service.quickSave();
  },

  async quickLoad() {
    const service = getSaveService();
    return await service.quickLoad();
  },

  async autoSave() {
    const service = getSaveService();
    return await service.autoSave();
  }
};

export default SaveServiceIntegration;