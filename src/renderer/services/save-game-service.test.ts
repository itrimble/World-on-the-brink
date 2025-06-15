import { saveGameService, SaveGameService } from './save-game-service'; // Adjust path if necessary
import { store } from './src/renderer/store'; // Adjust path to your store
import { GameState, SavedGameMetadata } from './src/shared/types/game'; // Adjust path
import { initialPlayerState } from './src/renderer/features/player/playerSlice'; // Example, adjust path
import { initialGameState } from './src/renderer/features/game/gameSlice'; // Example, adjust path
import { initialWorldState } from './src/renderer/features/world/worldSlice'; // Example, adjust path

// Mock the store
jest.mock('./src/renderer/store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

// Mock window.electronAPI (already in jest.setup.js, but we can override implementations per test)
const mockElectronAPI = global.window.electronAPI;

describe('SaveGameService', () => {
  let mockFullGameState: any; // Using 'any' for simplicity in mock, define properly if needed

  beforeEach(() => {
    // Reset all Electron API mocks
    (mockElectronAPI.saveGame as jest.Mock).mockReset();
    (mockElectronAPI.loadGame as jest.Mock).mockReset();
    (mockElectronAPI.listSavedGames as jest.Mock).mockReset();
    (mockElectronAPI.deleteSavedGame as jest.Mock).mockReset();

    // Setup a mock game state for saving
    mockFullGameState = {
      game: { ...initialGameState, currentTurn: 10, currentYear: 1995 },
      player: { ...initialPlayerState, faction: 'USA', politicalCapital: 100 },
      world: { ...initialWorldState, tensionLevel: 2 },
      // Add other necessary slice states
    };
    (store.getState as jest.Mock).mockReturnValue(mockFullGameState);
  });

  describe('saveGame', () => {
    it('should successfully save a game', async () => {
      const saveName = 'TestSave1';
      const expectedPath = `/saves/${saveName}.sav`;
      (mockElectronAPI.saveGame as jest.Mock).mockResolvedValue({ success: true, path: expectedPath });

      const result = await saveGameService.saveGame(saveName, 'User Friendly Save Name');
      
      expect(mockElectronAPI.saveGame).toHaveBeenCalledTimes(1);
      const ipcArgs = (mockElectronAPI.saveGame as jest.Mock).mock.calls[0];
      expect(ipcArgs[0]).toBe(saveName); // fileName
      expect(ipcArgs[1].metadata.saveName).toBe('User Friendly Save Name');
      expect(ipcArgs[1].currentTurn).toBe(mockFullGameState.game.currentTurn);
      expect(result).toEqual({ success: true, path: expectedPath });
    });

    it('should handle save game failure from IPC', async () => {
      const saveName = 'TestSaveFail';
      (mockElectronAPI.saveGame as jest.Mock).mockResolvedValue({ success: false, error: 'Disk full' });

      const result = await saveGameService.saveGame(saveName, 'Save Fail Test');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to save game "Save Fail Test": Disk full');
    });

    it('should handle exception during save game', async () => {
      const saveName = 'TestSaveException';
      (mockElectronAPI.saveGame as jest.Mock).mockRejectedValue(new Error('Unexpected IPC error'));
      
      const result = await saveGameService.saveGame(saveName, 'Exception Test');
      expect(result.success).toBe(false);
      expect(result.error).toContain('An unexpected error occurred while saving "Exception Test": Unexpected IPC error');
    });
  });

  describe('loadGame', () => {
    const validGameState: GameState = {
      currentTurn: 1, currentYear: 1990, startYear: 1990, endYear: 2020, gameDifficulty: 'normal', gameMode: 'standard',
      world: { countries: {}, tensionLevel: 1, climateStabilityIndex: 100, currentCrises: [], historicalEvents: [] },
      player: { faction: 'USA', politicalCapital: 10, prestige: 10, militaryReserves:10, economicReserves:10, defcon:5, activePolicies:[], diplomaticInfluence:{} },
      metadata: { version: '0.1.0', timestamp: Date.now(), saveName: 'Valid Save', createdAt: new Date().toISOString() },
    };

    it('should successfully load and validate a game', async () => {
      const saveName = 'ValidGame.sav';
      (mockElectronAPI.loadGame as jest.Mock).mockResolvedValue({ success: true, data: validGameState });
      
      const result = await saveGameService.loadGame(saveName);
      expect(mockElectronAPI.loadGame).toHaveBeenCalledWith(saveName);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validGameState);
    });

    it('should fail to load if data is invalid', async () => {
      const saveName = 'InvalidGame.sav';
      const invalidData = { ...validGameState, currentTurn: 'not-a-number' }; // Invalid data
      (mockElectronAPI.loadGame as jest.Mock).mockResolvedValue({ success: true, data: invalidData });
      
      const result = await saveGameService.loadGame(saveName);
      expect(result.success).toBe(false);
      expect(result.error).toBe(`Save file "${saveName}" contains invalid or corrupted data.`);
    });

    it('should handle load game failure from IPC', async () => {
      const saveName = 'LoadFailIPC.sav';
      (mockElectronAPI.loadGame as jest.Mock).mockResolvedValue({ success: false, error: 'File not found' });
      
      const result = await saveGameService.loadGame(saveName);
      expect(result.success).toBe(false);
      expect(result.error).toBe(`Failed to load game "${saveName}": File not found`);
    });
  });

  describe('listSavedGames', () => {
    it('should return a list of saved games', async () => {
      const mockSavedGames: SavedGameMetadata[] = [
        { fileName: 's1.sav', saveName: 'Save 1', timestamp: Date.now(), version: '0.1.0', lastModified: new Date().toISOString(), createdAt: new Date().toISOString() },
        { fileName: 's2.sav', saveName: 'Save 2', timestamp: Date.now() - 1000, version: '0.1.0', lastModified: new Date().toISOString(), createdAt: new Date().toISOString() },
      ];
      (mockElectronAPI.listSavedGames as jest.Mock).mockResolvedValue({ success: true, savedGames: mockSavedGames });
      
      const result = await saveGameService.listSavedGames();
      expect(result.success).toBe(true);
      expect(result.savedGames).toEqual(mockSavedGames);
    });

    it('should handle list saved games failure from IPC', async () => {
      (mockElectronAPI.listSavedGames as jest.Mock).mockResolvedValue({ success: false, error: 'Read error' });
      const result = await saveGameService.listSavedGames();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to retrieve list of saved games: Read error');
    });
  });

  describe('deleteSavedGame', () => {
    it('should successfully delete a game', async () => {
      const saveName = 'ToDelete.sav';
      (mockElectronAPI.deleteSavedGame as jest.Mock).mockResolvedValue({ success: true });
      
      const result = await saveGameService.deleteSavedGame(saveName);
      expect(mockElectronAPI.deleteSavedGame).toHaveBeenCalledWith(saveName);
      expect(result.success).toBe(true);
    });

    it('should handle delete game failure from IPC', async () => {
      const saveName = 'DeleteFail.sav';
      (mockElectronAPI.deleteSavedGame as jest.Mock).mockResolvedValue({ success: false, error: 'Permission denied' });
      
      const result = await saveGameService.deleteSavedGame(saveName);
      expect(result.success).toBe(false);
      expect(result.error).toBe(`Failed to delete saved game "${saveName}": Permission denied`);
    });
  });

  describe('isValidSaveData', () => {
    const serviceInstance = new SaveGameService(); // Need instance for private method
    // @ts-ignore Accessing private method for testing
    const isValidSaveData = serviceInstance.isValidSaveData.bind(serviceInstance);

    const baseValidData: GameState = {
        currentTurn: 1, currentYear: 1990, startYear: 1990, endYear: 2020, gameDifficulty:"normal", gameMode:"standard",
        world: { countries: {}, tensionLevel: 1, climateStabilityIndex: 100, currentCrises:[], historicalEvents:[] },
        player: { faction: 'USA', politicalCapital: 10, prestige: 10, militaryReserves:10, economicReserves:10, defcon:5, activePolicies:[], diplomaticInfluence:{} },
        metadata: { version: '0.1.0', timestamp: Date.now(), saveName: 'Test', createdAt: new Date().toISOString() },
    };

    test('should return true for valid data', () => {
      expect(isValidSaveData(baseValidData)).toBe(true);
    });

    test('should return false if data is null or not an object', () => {
      expect(isValidSaveData(null)).toBe(false);
      expect(isValidSaveData(undefined)).toBe(false);
      expect(isValidSaveData("not an object")).toBe(false);
    });

    test('should return false if missing top-level keys', () => {
      const dataMissingWorld = { ...baseValidData, world: undefined } as any;
      expect(isValidSaveData(dataMissingWorld)).toBe(false);
      const dataMissingPlayer = { ...baseValidData, player: undefined } as any;
      expect(isValidSaveData(dataMissingPlayer)).toBe(false);
      const dataMissingMetadata = { ...baseValidData, metadata: undefined } as any;
      expect(isValidSaveData(dataMissingMetadata)).toBe(false);
    });
    
    test('should return false if critical fields have wrong types', () => {
      const dataInvalidTurn = { ...baseValidData, currentTurn: "1" } as any; // Turn as string
      expect(isValidSaveData(dataInvalidTurn)).toBe(false);
      const dataInvalidCountries = { ...baseValidData, world: { ...baseValidData.world, countries: "not-object" } } as any;
      expect(isValidSaveData(dataInvalidCountries)).toBe(false);
    });
  });

  describe('Quick Saves and Auto Saves', () => {
    it('quickSave should call saveGame with generated name', async () => {
      (mockElectronAPI.saveGame as jest.Mock).mockResolvedValue({ success: true, path: '/saves/QuickSave_XYZ.sav' });
      jest.spyOn(saveGameService, 'saveGame'); // Spy on the public method of the instance
      await saveGameService.quickSave();
      expect(saveGameService.saveGame).toHaveBeenCalledTimes(1);
      const callArgs = (saveGameService.saveGame as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toMatch(/^QuickSave_/); // Filename
      expect(callArgs[1]).toMatch(/^Quick Save/); // Display name
    });

    it('quickLoad should load the most recent quicksave', async () => {
      const quickSaves: SavedGameMetadata[] = [
        { fileName: 'QuickSave_Old.sav', saveName: 'QS Old', timestamp: Date.now() - 10000, version: '0.1.0', lastModified: '', createdAt: '' },
        { fileName: 'QuickSave_New.sav', saveName: 'QS New', timestamp: Date.now(), version: '0.1.0', lastModified: '', createdAt: '' },
      ];
      (mockElectronAPI.listSavedGames as jest.Mock).mockResolvedValue({ success: true, savedGames: quickSaves });
      (mockElectronAPI.loadGame as jest.Mock).mockResolvedValue({ success: true, data: {} as GameState }); // Mock actual load
      
      jest.spyOn(saveGameService, 'loadGame');
      await saveGameService.quickLoad();
      expect(saveGameService.loadGame).toHaveBeenCalledWith('QuickSave_New.sav');
    });
    
    it('quickLoad should fail if no quicksaves found', async () => {
      const nonQuickSaves: SavedGameMetadata[] = [
        { fileName: 'MySave.sav', saveName: 'My Save', timestamp: Date.now(), version: '0.1.0', lastModified: '', createdAt: '' },
      ];
      (mockElectronAPI.listSavedGames as jest.Mock).mockResolvedValue({ success: true, savedGames: nonQuickSaves });
      const result = await saveGameService.quickLoad();
      expect(result.success).toBe(false);
      expect(result.error).toBe('No quick saves found.');
    });

    it('autoSave should call saveGame with generated name', async () => {
      (mockElectronAPI.saveGame as jest.Mock).mockResolvedValue({ success: true, path: '/saves/AutoSave_XYZ.sav' });
      jest.spyOn(saveGameService, 'saveGame');
      await saveGameService.autoSave();
      expect(saveGameService.saveGame).toHaveBeenCalledTimes(1);
      const callArgs = (saveGameService.saveGame as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toMatch(/^AutoSave_/);
      expect(callArgs[1]).toMatch(/^AutoSave/);
    });

    test('shouldAutosave logic', () => {
      expect(saveGameService.shouldAutosave(0, 5)).toBe(false); // Turn 0
      expect(saveGameService.shouldAutosave(5, 5)).toBe(true);
      expect(saveGameService.shouldAutosave(6, 5)).toBe(false);
      expect(saveGameService.shouldAutosave(10, 5)).toBe(true);
      expect(saveGameService.shouldAutosave(10, 0)).toBe(false); // Frequency 0
      expect(saveGameService.shouldAutosave(10, -1)).toBe(false); // Negative frequency
    });
  });
});
```
