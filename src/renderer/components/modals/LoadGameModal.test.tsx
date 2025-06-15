import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit'; // For creating a mock store
import { LoadGameModal } from './load-game-modal'; // Adjust path
import { saveGameService } from './services/SaveGameService'; // Adjust path
import { audioService } from './services/AudioService'; // Adjust path
import gameReducer from './src/renderer/features/game/gameSlice'; // Adjust path for a real reducer
import { SavedGameMetadata } from './src/shared/types/game';
import { GameState } from './src/shared/types/game';

// Mock services (already globally mocked in jest.setup.js, but can be further customized here)
jest.mock('./services/SaveGameService');
jest.mock('./services/AudioService');

// Minimal Redux store setup for the modal
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      // We need a game slice because LoadGameModal dispatches setLoading and setError
      game: gameReducer, 
      // Add other reducers if LoadGameModal interacts with them
    },
    preloadedState: initialState,
  });
};

const mockSavedGamesList: SavedGameMetadata[] = [
  { fileName: 'save1.sav', saveName: 'First Save', timestamp: Date.now() - 100000, version: '1.0', lastModified: new Date().toISOString(), createdAt: new Date().toISOString() },
  { fileName: 'save2.sav', saveName: 'Second Save', timestamp: Date.now() - 50000, version: '1.0', lastModified: new Date().toISOString(), createdAt: new Date().toISOString() },
  { fileName: 'save3.sav', saveName: 'Latest Save', timestamp: Date.now(), version: '1.0', lastModified: new Date().toISOString(), createdAt: new Date().toISOString() },
];

const mockGameState: GameState = {
  currentTurn: 10, currentYear: 1995, startYear: 1990, endYear: 2050, gameDifficulty: 'normal', gameMode: 'standard',
  world: { countries: { 'USA': {} as any }, tensionLevel: 1, climateStabilityIndex: 90, currentCrises: [], historicalEvents: [] },
  player: { faction: 'USA', politicalCapital: 50, prestige: 20, militaryReserves: 100, economicReserves: 200, defcon: 5, activePolicies: [], diplomaticInfluence: {} },
  metadata: { saveName: 'Latest Save', timestamp: Date.now(), version: '1.0', createdAt: new Date().toISOString() },
};


describe('LoadGameModal', () => {
  let mockStore: ReturnType<typeof createMockStore>;
  const mockOnClose = jest.fn();
  const mockOnLoadComplete = jest.fn();

  beforeEach(() => {
    mockStore = createMockStore();
    mockOnClose.mockClear();
    mockOnLoadComplete.mockClear();
    (saveGameService.listSavedGames as jest.Mock).mockClear();
    (saveGameService.loadGame as jest.Mock).mockClear();
    (saveGameService.deleteSavedGame as jest.Mock).mockClear();
    (audioService.playSound as jest.Mock).mockClear();
  });

  const renderModal = (isOpen = true) => {
    return render(
      <Provider store={mockStore}>
        <LoadGameModal isOpen={isOpen} onClose={mockOnClose} onLoadComplete={mockOnLoadComplete} />
      </Provider>
    );
  };

  test('renders nothing when isOpen is false', () => {
    renderModal(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders modal with title when isOpen is true', () => {
    (saveGameService.listSavedGames as jest.Mock).mockResolvedValue({ success: true, savedGames: [] });
    renderModal();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Load Game')).toBeInTheDocument();
  });

  test('fetches and displays saved games on open, selecting the most recent', async () => {
    (saveGameService.listSavedGames as jest.Mock).mockResolvedValue({ success: true, savedGames: mockSavedGamesList });
    (saveGameService.loadGame as jest.Mock).mockImplementation(fileName => {
        const game = mockSavedGamesList.find(g => g.fileName === fileName);
        return Promise.resolve({success: true, data: {...mockGameState, metadata: {...mockGameState.metadata, saveName: game?.saveName || ''}}});
    });
    
    renderModal();

    await waitFor(() => {
      expect(saveGameService.listSavedGames).toHaveBeenCalledTimes(1);
      // Should display the save names (most recent is "Latest Save")
      expect(screen.getByText('First Save')).toBeInTheDocument();
      expect(screen.getByText('Second Save')).toBeInTheDocument();
      expect(screen.getByText('Latest Save')).toBeInTheDocument();
    });
    
    // Check if the latest save's details are shown (auto-selected)
    await waitFor(() => {
        expect(screen.getByText(mockSavedGamesList[2].saveName)).toHaveClass('text-blue-300'); // Check details header
    });
  });

  test('displays "No saved games found" message when list is empty', async () => {
    (saveGameService.listSavedGames as jest.Mock).mockResolvedValue({ success: true, savedGames: [] });
    renderModal();
    await waitFor(() => {
      expect(screen.getByText('No saved games found.')).toBeInTheDocument();
    });
  });

  test('displays error message if fetching saved games fails', async () => {
    (saveGameService.listSavedGames as jest.Mock).mockResolvedValue({ success: false, error: 'Failed to fetch' });
    renderModal();
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch/)).toBeInTheDocument();
    });
  });

  test('allows selecting a save and displays its details', async () => {
    (saveGameService.listSavedGames as jest.Mock).mockResolvedValue({ success: true, savedGames: mockSavedGamesList });
    (saveGameService.loadGame as jest.Mock).mockImplementation(fileName => {
      const game = mockSavedGamesList.find(g => g.fileName === fileName);
      const details = game ? { ...mockGameState, metadata: { ...mockGameState.metadata, saveName: game.saveName, timestamp: game.timestamp } } : mockGameState;
      return Promise.resolve({ success: true, data: details });
    });

    renderModal();
    await waitFor(() => expect(screen.getByText('First Save')).toBeInTheDocument());
    
    // Initially, latest save (save3) should be selected and its details shown
    await waitFor(() => {
        expect(screen.getByText(mockSavedGamesList[2].saveName)).toHaveClass('text-blue-300');
    });

    // Click on the "First Save"
    fireEvent.click(screen.getByText('First Save'));
    
    await waitFor(() => {
      // Verify loadGame was called for "save1.sav" to fetch details
      expect(saveGameService.loadGame).toHaveBeenCalledWith('save1.sav');
      // Check if "First Save" details are now displayed
      expect(screen.getByText(mockSavedGamesList[0].saveName)).toHaveClass('text-blue-300'); 
    });
  });

  test('handles "Load Game" button click successfully', async () => {
    (saveGameService.listSavedGames as jest.Mock).mockResolvedValue({ success: true, savedGames: mockSavedGamesList });
    (saveGameService.loadGame as jest.Mock).mockImplementation(fileName => {
      const game = mockSavedGamesList.find(g => g.fileName === fileName);
      const details = game ? { ...mockGameState, metadata: { ...mockGameState.metadata, saveName: game.saveName, timestamp: game.timestamp } } : mockGameState;
      return Promise.resolve({ success: true, data: details });
    });
    
    renderModal();
    await waitFor(() => expect(screen.getByText('Latest Save')).toBeInTheDocument()); // Ensure list is loaded

    // "Latest Save" is auto-selected
    fireEvent.click(screen.getByRole('button', { name: 'Load Game' }));

    await waitFor(() => {
      expect(saveGameService.loadGame).toHaveBeenCalledWith('save3.sav'); // Called again for actual load
      expect(audioService.playSound).toHaveBeenCalledWith('load_success');
      expect(mockOnLoadComplete).toHaveBeenCalledWith(true);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  test('handles "Load Game" button failure', async () => {
    (saveGameService.listSavedGames as jest.Mock).mockResolvedValue({ success: true, savedGames: mockSavedGamesList });
    // First call for details (auto-selection)
    (saveGameService.loadGame as jest.Mock).mockImplementationOnce(fileName => {
        const game = mockSavedGamesList.find(g => g.fileName === fileName);
        return Promise.resolve({success: true, data: {...mockGameState, metadata: {...mockGameState.metadata, saveName: game?.saveName || ''}}});
    });
    // Second call for actual load fails
    (saveGameService.loadGame as jest.Mock).mockImplementationOnce(() => Promise.resolve({ success: false, error: 'Corrupted file' }));

    renderModal();
    await waitFor(() => screen.getByText('Latest Save')); 

    fireEvent.click(screen.getByRole('button', { name: 'Load Game' }));

    await waitFor(() => {
      expect(screen.getByText(/Corrupted file/)).toBeInTheDocument();
      expect(audioService.playSound).toHaveBeenCalledWith('error');
      expect(mockOnLoadComplete).toHaveBeenCalledWith(false);
      expect(mockOnClose).not.toHaveBeenCalled(); // Modal should stay open on error
    });
  });

  test('handles deleting a save successfully', async () => {
    (saveGameService.listSavedGames as jest.Mock)
        .mockResolvedValueOnce({ success: true, savedGames: mockSavedGamesList }) // Initial load
        .mockResolvedValueOnce({ success: true, savedGames: mockSavedGamesList.slice(0,2) }); // After delete
    (saveGameService.loadGame as jest.Mock).mockImplementation(fileName => { // For details loading
        const game = mockSavedGamesList.find(g => g.fileName === fileName);
        return Promise.resolve({success: true, data: {...mockGameState, metadata: {...mockGameState.metadata, saveName: game?.saveName || ''}}});
    });
    (saveGameService.deleteSavedGame as jest.Mock).mockResolvedValue({ success: true });
    
    // Mock window.confirm
    jest.spyOn(window, 'confirm').mockImplementation(() => true);

    renderModal();
    await waitFor(() => screen.getByText('First Save'));
    
    // Delete "First Save"
    // The delete button is not directly named, so we find it relative to the save entry
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    // Assuming order of deleteButtons matches order of mockSavedGamesList after sorting (newest first)
    // 'First Save' is mockSavedGamesList[0], which is last in sorted list.
    // 'Latest Save' (mockSavedGamesList[2]) is first.
    // 'Second Save' (mockSavedGamesList[1]) is second.
    // 'First Save' (mockSavedGamesList[0]) is third.
    fireEvent.click(deleteButtons[2]); 

    await waitFor(() => {
      expect(saveGameService.deleteSavedGame).toHaveBeenCalledWith('save1.sav');
      expect(audioService.playSound).toHaveBeenCalledWith('delete');
      // List should refresh, and "First Save" should be gone
      expect(screen.queryByText('First Save')).not.toBeInTheDocument();
      expect(screen.getByText('Latest Save')).toBeInTheDocument(); // Still there
    });
    (window.confirm as jest.Mock).mockRestore();
  });
  
  test('handles deleting a save with failure', async () => {
    (saveGameService.listSavedGames as jest.Mock).mockResolvedValue({ success: true, savedGames: mockSavedGamesList });
    (saveGameService.loadGame as jest.Mock).mockImplementation(fileName => {
        const game = mockSavedGamesList.find(g => g.fileName === fileName);
        return Promise.resolve({success: true, data: {...mockGameState, metadata: {...mockGameState.metadata, saveName: game?.saveName || ''}}});
    });
    (saveGameService.deleteSavedGame as jest.Mock).mockResolvedValue({ success: false, error: 'Deletion failed' });
    jest.spyOn(window, 'confirm').mockImplementation(() => true);

    renderModal();
    await waitFor(() => screen.getByText('First Save'));
    
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButtons[2]); // Attempt to delete "First Save"

    await waitFor(() => {
      expect(screen.getByText(/Deletion failed/)).toBeInTheDocument();
      expect(audioService.playSound).toHaveBeenCalledWith('error');
    });
    (window.confirm as jest.Mock).mockRestore();
  });

});
```
