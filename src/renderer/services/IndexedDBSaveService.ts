// src/renderer/services/IndexedDBSaveService.ts
import Dexie, { Table } from 'dexie';
import 'dexie-export-import';
import { SaveGameState, SavedGameMetadata } from '../../shared/types/game';
import { createLogger } from '../utils/logger';

const logger = createLogger('IndexedDBSaveService');

interface SaveGameRecord {
  id?: number;
  fileName: string;
  displayName: string;
  saveData: SaveGameState;
  timestamp: number;
  createdAt: string;
  version: string;
  size: number; // Size in bytes of the serialized save data
}

interface QuickSaveRecord {
  id?: number;
  fileName: string;
  displayName: string;
  saveData: SaveGameState;
  timestamp: number;
  createdAt: string;
  version: string;
  size: number;
}

interface AutoSaveRecord {
  id?: number;
  fileName: string;
  displayName: string;
  saveData: SaveGameState;
  timestamp: number;
  createdAt: string;
  version: string;
  size: number;
}

/**
 * IndexedDB-based save service using Dexie.js for larger capacity and better browser compatibility.
 * Provides enhanced features like chunked import/export, compression, and structured storage.
 */
class SaveGameDatabase extends Dexie {
  saveGames!: Table<SaveGameRecord>;
  quickSaves!: Table<QuickSaveRecord>;
  autoSaves!: Table<AutoSaveRecord>;

  constructor() {
    super('OnTheBrinkSaveDatabase');
    
    this.version(1).stores({
      saveGames: '++id, fileName, displayName, timestamp, createdAt, version, size',
      quickSaves: '++id, fileName, displayName, timestamp, createdAt, version, size',
      autoSaves: '++id, fileName, displayName, timestamp, createdAt, version, size'
    });

    // Add hooks for automatic size calculation
    this.saveGames.hook('creating', (primKey, obj, trans) => {
      obj.size = this.calculateSaveSize(obj.saveData);
    });

    this.quickSaves.hook('creating', (primKey, obj, trans) => {
      obj.size = this.calculateSaveSize(obj.saveData);
    });

    this.autoSaves.hook('creating', (primKey, obj, trans) => {
      obj.size = this.calculateSaveSize(obj.saveData);
    });
  }

  private calculateSaveSize(saveData: SaveGameState): number {
    return new Blob([JSON.stringify(saveData)]).size;
  }
}

/**
 * Enhanced save service using IndexedDB for larger capacity and better performance.
 * Supports chunked operations, compression, and works entirely in the browser.
 */
export class IndexedDBSaveService {
  private db: SaveGameDatabase;
  private maxAutoSaves = 10; // Keep last 10 autosaves
  private maxQuickSaves = 20; // Keep last 20 quicksaves

  constructor() {
    this.db = new SaveGameDatabase();
  }

  /**
   * Initialize the database connection.
   */
  public async initialize(): Promise<void> {
    try {
      await this.db.open();
      logger.info('IndexedDBSaveService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize IndexedDBSaveService', error);
      throw error;
    }
  }

  /**
   * Save game state to IndexedDB with enhanced storage capacity.
   */
  public async saveGame(fileName: string, displayName?: string): Promise<{ success: boolean; path?: string; error?: string }> {
    const operationDescription = displayName 
      ? `Save new game as "${displayName}" (file: ${fileName})` 
      : `Overwrite game "${fileName}"`;
    logger.info(`Attempting to ${operationDescription}.`);

    try {
      const state = (window as any).store?.getState();
      if (!state) {
        return { success: false, error: 'Game state not available' };
      }

      const saveData: SaveGameState = {
        currentTurn: state.game.currentTurn,
        startYear: 2025,
        currentYear: state.game.currentYear,
        endYear: 2030,
        gameDifficulty: 'normal',
        gameMode: 'standard',
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
          version: '0.1.0',
          timestamp: Date.now(),
          saveName: displayName || fileName,
          createdAt: new Date().toISOString(),
        },
      };

      // Check if save already exists
      const existingSave = await this.db.saveGames.where('fileName').equals(fileName).first();
      
      const saveRecord: SaveGameRecord = {
        fileName,
        displayName: displayName || fileName,
        saveData,
        timestamp: Date.now(),
        createdAt: new Date().toISOString(),
        version: '0.1.0',
        size: 0, // Will be calculated by the hook
      };

      if (existingSave) {
        // Update existing save
        await this.db.saveGames.where('fileName').equals(fileName).modify(saveRecord);
        logger.info(`${operationDescription} successful (updated existing).`);
      } else {
        // Create new save
        await this.db.saveGames.add(saveRecord);
        logger.info(`${operationDescription} successful (created new).`);
      }

      return { 
        success: true, 
        path: `indexeddb://saveGames/${fileName}` 
      };

    } catch (error: any) {
      logger.error(`Exception during ${operationDescription}.`, error, { fileName });
      return { 
        success: false, 
        error: `An unexpected error occurred while saving "${displayName || fileName}": ${error.message}` 
      };
    }
  }

  /**
   * Load game state from IndexedDB.
   */
  public async loadGame(fileName: string): Promise<{ success: boolean; data?: SaveGameState; error?: string }> {
    logger.info(`Attempting to load game: "${fileName}"`);
    
    try {
      const saveRecord = await this.db.saveGames.where('fileName').equals(fileName).first();
      
      if (!saveRecord) {
        logger.warn(`Save file not found: "${fileName}"`);
        return { success: false, error: `Save file "${fileName}" not found.` };
      }

      if (!this.isValidSaveData(saveRecord.saveData)) {
        logger.warn(`Invalid save data format for: "${fileName}"`, { receivedData: saveRecord.saveData });
        return { success: false, error: `Save file "${fileName}" contains invalid or corrupted data.` };
      }

      logger.info(`Game "${fileName}" loaded and validated successfully.`);
      return { success: true, data: saveRecord.saveData };

    } catch (error: any) {
      logger.error(`Exception loading game "${fileName}".`, error);
      return { 
        success: false, 
        error: `An unexpected error occurred while loading "${fileName}": ${error.message}` 
      };
    }
  }

  /**
   * List all saved games with enhanced metadata.
   */
  public async listSavedGames(): Promise<{
    success: boolean;
    savedGames?: SavedGameMetadata[];
    error?: string;
  }> {
    logger.info('Attempting to list saved games.');
    
    try {
      const saveRecords = await this.db.saveGames.orderBy('timestamp').reverse().toArray();
      
      const savedGames: SavedGameMetadata[] = saveRecords.map(record => ({
        fileName: record.fileName,
        saveName: record.displayName,
        timestamp: record.timestamp,
        version: record.version,
        lastModified: record.createdAt,
        size: record.size,
      }));

      logger.info(`Found ${savedGames.length} saved games.`);
      return { success: true, savedGames };

    } catch (error: any) {
      logger.error('Exception listing saved games.', error);
      return { 
        success: false, 
        error: `An unexpected error occurred while listing saved games: ${error.message}` 
      };
    }
  }

  /**
   * Delete a saved game.
   */
  public async deleteSavedGame(fileName: string): Promise<{ success: boolean; error?: string }> {
    logger.info(`Attempting to delete saved game: "${fileName}"`);
    
    try {
      const deleted = await this.db.saveGames.where('fileName').equals(fileName).delete();
      
      if (deleted === 0) {
        return { success: false, error: `Save file "${fileName}" not found.` };
      }

      logger.info(`Saved game "${fileName}" deleted successfully.`);
      return { success: true };

    } catch (error: any) {
      logger.error(`Exception deleting saved game "${fileName}".`, error);
      return { 
        success: false, 
        error: `An unexpected error occurred while deleting "${fileName}": ${error.message}` 
      };
    }
  }

  /**
   * Quick save with automatic management.
   */
  public async quickSave(): Promise<{ success: boolean; path?: string; error?: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const quickSaveFileName = `QuickSave_${timestamp}`;
    const quickSaveDisplayName = `Quick Save (${new Date().toLocaleTimeString()})`;
    
    logger.info(`Attempting Quick Save: "${quickSaveDisplayName}"`);

    try {
      const state = (window as any).store?.getState();
      if (!state) {
        return { success: false, error: 'Game state not available' };
      }

      const saveData: SaveGameState = this.createSaveData(state);
      
      const quickSaveRecord: QuickSaveRecord = {
        fileName: quickSaveFileName,
        displayName: quickSaveDisplayName,
        saveData,
        timestamp: Date.now(),
        createdAt: new Date().toISOString(),
        version: '0.1.0',
        size: 0,
      };

      await this.db.quickSaves.add(quickSaveRecord);

      // Clean up old quick saves
      await this.cleanupQuickSaves();

      logger.info(`Quick save successful: "${quickSaveDisplayName}"`);
      return { 
        success: true, 
        path: `indexeddb://quickSaves/${quickSaveFileName}` 
      };

    } catch (error: any) {
      logger.error('Exception during Quick Save.', error);
      return { 
        success: false, 
        error: `Quick save failed: ${error.message}` 
      };
    }
  }

  /**
   * Quick load most recent quick save.
   */
  public async quickLoad(): Promise<{ success: boolean; data?: SaveGameState; error?: string }> {
    logger.info('Attempting to Quick Load.');
    
    try {
      const mostRecentQuickSave = await this.db.quickSaves
        .orderBy('timestamp')
        .reverse()
        .first();

      if (!mostRecentQuickSave) {
        return { success: false, error: 'No quick saves found.' };
      }

      logger.info(`Loading most recent quick save: "${mostRecentQuickSave.fileName}"`);
      return { success: true, data: mostRecentQuickSave.saveData };

    } catch (error: any) {
      logger.error('Exception during Quick Load.', error);
      return { 
        success: false, 
        error: `Quick load failed: ${error.message}` 
      };
    }
  }

  /**
   * Auto save with automatic cleanup.
   */
  public async autoSave(): Promise<{ success: boolean; path?: string; error?: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const autoSaveFileName = `AutoSave_${timestamp}`;
    const autoSaveDisplayName = `AutoSave (${new Date().toLocaleTimeString()})`;

    logger.info(`Attempting AutoSave: "${autoSaveDisplayName}"`);

    try {
      const state = (window as any).store?.getState();
      if (!state) {
        return { success: false, error: 'Game state not available' };
      }

      const saveData: SaveGameState = this.createSaveData(state);
      
      const autoSaveRecord: AutoSaveRecord = {
        fileName: autoSaveFileName,
        displayName: autoSaveDisplayName,
        saveData,
        timestamp: Date.now(),
        createdAt: new Date().toISOString(),
        version: '0.1.0',
        size: 0,
      };

      await this.db.autoSaves.add(autoSaveRecord);

      // Clean up old auto saves
      await this.cleanupAutoSaves();

      logger.info(`Auto save successful: "${autoSaveDisplayName}"`);
      return { 
        success: true, 
        path: `indexeddb://autoSaves/${autoSaveFileName}` 
      };

    } catch (error: any) {
      logger.error('Exception during AutoSave.', error);
      return { 
        success: false, 
        error: `Auto save failed: ${error.message}` 
      };
    }
  }

  /**
   * Export entire save database to a blob for backup.
   */
  public async exportDatabase(): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    logger.info('Exporting save database...');
    
    try {
      const blob = await this.db.export({
        prettyJson: false,
        numRowsPerChunk: 1000, // Process in chunks for large saves
        progressCallback: (progress) => {
          logger.debug(`Export progress: ${progress.completedRows}/${progress.totalRows} rows`);
          return true; // Continue export
        }
      });

      const sizeInMB = (blob.size / 1024 / 1024).toFixed(2);
      logger.info(`Database exported successfully. Size: ${sizeInMB} MB`);
      
      return { success: true, blob };

    } catch (error: any) {
      logger.error('Exception during database export.', error);
      return { 
        success: false, 
        error: `Database export failed: ${error.message}` 
      };
    }
  }

  /**
   * Import save database from a blob.
   */
  public async importDatabase(blob: Blob): Promise<{ success: boolean; error?: string }> {
    logger.info('Importing save database...');
    
    try {
      await this.db.import(blob, {
        acceptVersionDiff: true,
        acceptNameDiff: false,
        clearTablesBeforeImport: true,
        chunkSizeBytes: 1024 * 1024, // 1MB chunks
        progressCallback: (progress) => {
          logger.debug(`Import progress: ${progress.completedRows}/${progress.totalRows} rows`);
          return true; // Continue import
        }
      });

      logger.info('Database imported successfully');
      return { success: true };

    } catch (error: any) {
      logger.error('Exception during database import.', error);
      return { 
        success: false, 
        error: `Database import failed: ${error.message}` 
      };
    }
  }

  /**
   * Get storage usage statistics.
   */
  public async getStorageStats(): Promise<{
    totalSaves: number;
    totalQuickSaves: number;
    totalAutoSaves: number;
    totalSize: number;
    largestSave: number;
  }> {
    try {
      const [saveGames, quickSaves, autoSaves] = await Promise.all([
        this.db.saveGames.toArray(),
        this.db.quickSaves.toArray(),
        this.db.autoSaves.toArray()
      ]);

      const allSaves = [...saveGames, ...quickSaves, ...autoSaves];
      const totalSize = allSaves.reduce((sum, save) => sum + save.size, 0);
      const largestSave = allSaves.reduce((max, save) => Math.max(max, save.size), 0);

      return {
        totalSaves: saveGames.length,
        totalQuickSaves: quickSaves.length,
        totalAutoSaves: autoSaves.length,
        totalSize,
        largestSave
      };

    } catch (error) {
      logger.error('Failed to get storage stats', error);
      return {
        totalSaves: 0,
        totalQuickSaves: 0,
        totalAutoSaves: 0,
        totalSize: 0,
        largestSave: 0
      };
    }
  }

  public shouldAutosave(currentTurn: number, autosaveFrequency: number): boolean {
    if (autosaveFrequency <= 0) return false;
    if (currentTurn === 0) return false;
    return currentTurn % autosaveFrequency === 0;
  }

  // Private helper methods

  private createSaveData(state: any): SaveGameState {
    return {
      currentTurn: state.game.currentTurn,
      startYear: 2025,
      currentYear: state.game.currentYear,
      endYear: 2030,
      gameDifficulty: 'normal',
      gameMode: 'standard',
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
        version: '0.1.0',
        timestamp: Date.now(),
        saveName: 'Auto Generated',
        createdAt: new Date().toISOString(),
      },
    };
  }

  private async cleanupQuickSaves(): Promise<void> {
    const quickSaveCount = await this.db.quickSaves.count();
    if (quickSaveCount > this.maxQuickSaves) {
      const oldestQuickSaves = await this.db.quickSaves
        .orderBy('timestamp')
        .limit(quickSaveCount - this.maxQuickSaves)
        .toArray();
      
      const idsToDelete = oldestQuickSaves.map(save => save.id!);
      await this.db.quickSaves.bulkDelete(idsToDelete);
      
      logger.info(`Cleaned up ${idsToDelete.length} old quick saves`);
    }
  }

  private async cleanupAutoSaves(): Promise<void> {
    const autoSaveCount = await this.db.autoSaves.count();
    if (autoSaveCount > this.maxAutoSaves) {
      const oldestAutoSaves = await this.db.autoSaves
        .orderBy('timestamp')
        .limit(autoSaveCount - this.maxAutoSaves)
        .toArray();
      
      const idsToDelete = oldestAutoSaves.map(save => save.id!);
      await this.db.autoSaves.bulkDelete(idsToDelete);
      
      logger.info(`Cleaned up ${idsToDelete.length} old auto saves`);
    }
  }

  private isValidSaveData(data: any): data is SaveGameState {
    logger.debug('Validating save data structure.');
    if (!data || typeof data !== 'object') {
      logger.warn('Validation failed: Data is null or not an object.', { data });
      return false;
    }

    const requiredTopLevelKeys: Array<keyof SaveGameState> = ['world', 'player', 'metadata', 'currentTurn', 'currentYear'];
    for (const key of requiredTopLevelKeys) {
      if (!(key in data)) {
        logger.warn(`Validation failed: Missing top-level key: "${key}".`, { data });
        return false;
      }
    }

    if (typeof data.world !== 'object' || data.world === null || typeof data.world.countries !== 'object' || data.world.countries === null) {
      logger.warn('Validation failed: Invalid or missing world or countries data.', { worldData: data.world });
      return false;
    }

    if (typeof data.metadata.saveName !== 'string' || typeof data.metadata.timestamp !== 'number') {
      logger.warn('Validation failed: Invalid metadata fields (saveName or timestamp).', { metadata: data.metadata });
      return false;
    }

    logger.debug('Save data validation successful.');
    return true;
  }
}

// Export singleton instance
export const indexedDBSaveService = new IndexedDBSaveService();