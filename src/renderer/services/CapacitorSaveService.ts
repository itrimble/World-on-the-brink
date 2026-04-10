/**
 * CapacitorSaveService - Save game service that works on both web and native iOS.
 *
 * On native (iOS/Android): Uses @capacitor/preferences for persistent key-value storage.
 * On web: Delegates to the existing IndexedDBSaveService.
 *
 * This provides a unified interface so the rest of the app doesn't need to know
 * which platform it's running on.
 */
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { SaveGameState, SavedGameMetadata } from '../../shared/types/game';
import { indexedDBSaveService } from './IndexedDBSaveService';
import { createLogger } from '../utils/logger';

const logger = createLogger('CapacitorSaveService');

const SAVE_PREFIX = 'save_';
const QUICK_SAVE_PREFIX = 'quicksave_';
const AUTO_SAVE_PREFIX = 'autosave_';
const SAVE_INDEX_KEY = 'save_index';

interface SaveIndex {
  saves: SavedGameMetadata[];
  quickSaves: SavedGameMetadata[];
  autoSaves: SavedGameMetadata[];
}

class CapacitorSaveServiceImpl {
  private maxAutoSaves = 10;
  private maxQuickSaves = 20;

  private get useNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  async initialize(): Promise<void> {
    if (this.useNative) {
      logger.info('CapacitorSaveService initialized (native Preferences backend)');
      // Ensure save index exists
      const existing = await Preferences.get({ key: SAVE_INDEX_KEY });
      if (!existing.value) {
        await this.writeSaveIndex({ saves: [], quickSaves: [], autoSaves: [] });
      }
    } else {
      logger.info('CapacitorSaveService initialized (IndexedDB fallback)');
      await indexedDBSaveService.initialize();
    }
  }

  async saveGame(
    fileName: string,
    displayName?: string
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    if (!this.useNative) {
      return indexedDBSaveService.saveGame(fileName, displayName);
    }

    try {
      const state = (window as any).store?.getState();
      if (!state) {
        return { success: false, error: 'Game state not available' };
      }

      const saveData = this.createSaveData(state);
      const key = SAVE_PREFIX + fileName;

      await Preferences.set({ key, value: JSON.stringify(saveData) });

      // Update save index
      const index = await this.readSaveIndex();
      const meta: SavedGameMetadata = {
        fileName,
        saveName: displayName || fileName,
        timestamp: Date.now(),
        version: '0.1.0',
        lastModified: new Date().toISOString(),
        size: JSON.stringify(saveData).length,
      };

      const existingIdx = index.saves.findIndex((s) => s.fileName === fileName);
      if (existingIdx >= 0) {
        index.saves[existingIdx] = meta;
      } else {
        index.saves.push(meta);
      }
      await this.writeSaveIndex(index);

      logger.info(`Game saved: ${displayName || fileName}`);
      return { success: true, path: `preferences://${key}` };
    } catch (error: any) {
      logger.error('Save failed', error);
      return { success: false, error: error.message };
    }
  }

  async loadGame(
    fileName: string
  ): Promise<{ success: boolean; data?: SaveGameState; error?: string }> {
    if (!this.useNative) {
      return indexedDBSaveService.loadGame(fileName);
    }

    try {
      const key = SAVE_PREFIX + fileName;
      const result = await Preferences.get({ key });

      if (!result.value) {
        return { success: false, error: `Save file "${fileName}" not found.` };
      }

      const saveData = JSON.parse(result.value) as SaveGameState;
      logger.info(`Game loaded: ${fileName}`);
      return { success: true, data: saveData };
    } catch (error: any) {
      logger.error('Load failed', error);
      return { success: false, error: error.message };
    }
  }

  async listSavedGames(): Promise<{
    success: boolean;
    savedGames?: SavedGameMetadata[];
    error?: string;
  }> {
    if (!this.useNative) {
      return indexedDBSaveService.listSavedGames();
    }

    try {
      const index = await this.readSaveIndex();
      const sorted = [...index.saves].sort((a, b) => b.timestamp - a.timestamp);
      return { success: true, savedGames: sorted };
    } catch (error: any) {
      logger.error('List saves failed', error);
      return { success: false, error: error.message };
    }
  }

  async deleteSavedGame(
    fileName: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.useNative) {
      return indexedDBSaveService.deleteSavedGame(fileName);
    }

    try {
      const key = SAVE_PREFIX + fileName;
      await Preferences.remove({ key });

      const index = await this.readSaveIndex();
      index.saves = index.saves.filter((s) => s.fileName !== fileName);
      await this.writeSaveIndex(index);

      logger.info(`Game deleted: ${fileName}`);
      return { success: true };
    } catch (error: any) {
      logger.error('Delete failed', error);
      return { success: false, error: error.message };
    }
  }

  async quickSave(): Promise<{ success: boolean; path?: string; error?: string }> {
    if (!this.useNative) {
      return indexedDBSaveService.quickSave();
    }

    try {
      const state = (window as any).store?.getState();
      if (!state) return { success: false, error: 'Game state not available' };

      const timestamp = Date.now();
      const fileName = `quick_${timestamp}`;
      const saveData = this.createSaveData(state);
      const key = QUICK_SAVE_PREFIX + fileName;

      await Preferences.set({ key, value: JSON.stringify(saveData) });

      const index = await this.readSaveIndex();
      index.quickSaves.push({
        fileName,
        saveName: `Quick Save (${new Date().toLocaleTimeString()})`,
        timestamp,
        version: '0.1.0',
        lastModified: new Date().toISOString(),
        size: JSON.stringify(saveData).length,
      });

      // Cleanup old quick saves
      if (index.quickSaves.length > this.maxQuickSaves) {
        const toRemove = index.quickSaves
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(0, index.quickSaves.length - this.maxQuickSaves);
        for (const old of toRemove) {
          await Preferences.remove({ key: QUICK_SAVE_PREFIX + old.fileName });
        }
        index.quickSaves = index.quickSaves.slice(toRemove.length);
      }

      await this.writeSaveIndex(index);
      return { success: true, path: `preferences://${key}` };
    } catch (error: any) {
      logger.error('Quick save failed', error);
      return { success: false, error: error.message };
    }
  }

  async quickLoad(): Promise<{ success: boolean; data?: SaveGameState; error?: string }> {
    if (!this.useNative) {
      return indexedDBSaveService.quickLoad();
    }

    try {
      const index = await this.readSaveIndex();
      if (index.quickSaves.length === 0) {
        return { success: false, error: 'No quick saves found.' };
      }

      const mostRecent = index.quickSaves.sort((a, b) => b.timestamp - a.timestamp)[0];
      const key = QUICK_SAVE_PREFIX + mostRecent.fileName;
      const result = await Preferences.get({ key });

      if (!result.value) {
        return { success: false, error: 'Quick save data not found.' };
      }

      return { success: true, data: JSON.parse(result.value) };
    } catch (error: any) {
      logger.error('Quick load failed', error);
      return { success: false, error: error.message };
    }
  }

  async autoSave(): Promise<{ success: boolean; path?: string; error?: string }> {
    if (!this.useNative) {
      return indexedDBSaveService.autoSave();
    }

    try {
      const state = (window as any).store?.getState();
      if (!state) return { success: false, error: 'Game state not available' };

      const timestamp = Date.now();
      const fileName = `auto_${timestamp}`;
      const saveData = this.createSaveData(state);
      const key = AUTO_SAVE_PREFIX + fileName;

      await Preferences.set({ key, value: JSON.stringify(saveData) });

      const index = await this.readSaveIndex();
      index.autoSaves.push({
        fileName,
        saveName: `Auto Save (${new Date().toLocaleTimeString()})`,
        timestamp,
        version: '0.1.0',
        lastModified: new Date().toISOString(),
        size: JSON.stringify(saveData).length,
      });

      // Cleanup old auto saves
      if (index.autoSaves.length > this.maxAutoSaves) {
        const toRemove = index.autoSaves
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(0, index.autoSaves.length - this.maxAutoSaves);
        for (const old of toRemove) {
          await Preferences.remove({ key: AUTO_SAVE_PREFIX + old.fileName });
        }
        index.autoSaves = index.autoSaves.slice(toRemove.length);
      }

      await this.writeSaveIndex(index);
      return { success: true, path: `preferences://${key}` };
    } catch (error: any) {
      logger.error('Auto save failed', error);
      return { success: false, error: error.message };
    }
  }

  shouldAutosave(currentTurn: number, autosaveFrequency: number): boolean {
    if (autosaveFrequency <= 0 || currentTurn === 0) return false;
    return currentTurn % autosaveFrequency === 0;
  }

  // --- Private helpers ---

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

  private async readSaveIndex(): Promise<SaveIndex> {
    const result = await Preferences.get({ key: SAVE_INDEX_KEY });
    if (!result.value) {
      return { saves: [], quickSaves: [], autoSaves: [] };
    }
    return JSON.parse(result.value);
  }

  private async writeSaveIndex(index: SaveIndex): Promise<void> {
    await Preferences.set({ key: SAVE_INDEX_KEY, value: JSON.stringify(index) });
  }
}

export const capacitorSaveService = new CapacitorSaveServiceImpl();
