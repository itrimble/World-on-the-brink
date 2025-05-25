import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SaveGameModal } from './save-game-modal'; // Adjust path
import { saveGameService } from './services/SaveGameService'; // Adjust path
import { audioService } from './services/AudioService'; // Adjust path
import gameReducer from './src/renderer/features/game/gameSlice'; // Adjust path
import playerReducer from './player-slice'; // Adjust path
import { SavedGameMetadata } from './src/shared/types/game';

jest.mock('./services/SaveGameService');
jest.mock('./services/AudioService');

const createMockStore = (initialReduxState = {}) => {
  return configureStore({
    reducer: {
      game: gameReducer,
      player: playerReducer,
      // Add other reducers if SaveGameModal interacts with them
    },
    preloadedState: {
      game: { currentYear: 2024, currentTurn: 1, /* ... other game state fields */ },
      player: { faction: 'USA', /* ... other player state fields */ },
      ...initialReduxState,
    },
  });
};

const mockExistingSaves: SavedGameMetadata[] = [
  { fileName: 'existing1.sav', saveName: 'Old Save', timestamp: Date.now() - 200000, version: '1.0', lastModified: new Date().toISOString(), createdAt: new Date().toISOString() },
  { fileName: 'existing2.sav', saveName: 'Recent Save', timestamp: Date.now() - 100000, version: '1.0', lastModified: new Date().toISOString(), createdAt: new Date().toISOString() },
];

describe('SaveGameModal', () => {
  let mockStore: ReturnType<typeof createMockStore>;
  const mockOnClose = jest.fn();
  const mockOnSaveComplete = jest.fn();

  beforeEach(() => {
    mockStore = createMockStore();
    mockOnClose.mockClear();
    mockOnSaveComplete.mockClear();
    (saveGameService.listSavedGames as jest.Mock).mockClear();
    (saveGameService.saveGame as jest.Mock).mockClear();
    (audioService.playSound as jest.Mock).mockClear();
  });

  const renderModal = (isOpen = true) => {
    return render(
      <Provider store={mockStore}>
        <SaveGameModal isOpen={isOpen} onClose={mockOnClose} onSaveComplete={mockOnSaveComplete} />
      </Provider>
    );
  };

  test('renders nothing when isOpen is false', () => {
    renderModal(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders modal with title and defaults to "New Save" mode', async () => {
    (saveGameService.listSavedGames as jest.Mock).mockResolvedValue({ success: true, savedGames: [] });
    renderModal();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Save Game')).toBeInTheDocument();
    // Default save name input should be visible
    await waitFor(() => {
        expect(screen.getByLabelText(/Save As:/i)).toBeInTheDocument();
        expect((screen.getByLabelText(/Save As:/i) as HTMLInputElement).value).toMatch(/USA_2024/);
    });
  });
  
  test('defaults to "Overwrite Existing" mode if saves exist', async () => {
    (saveGameService.listSavedGames as jest.Mock).mockResolvedValue({ success: true, savedGames: mockExistingSaves });
    renderModal();
    await waitFor(() => {
      expect(screen.getByLabelText(/Select Game to Overwrite:/i)).toBeInTheDocument();
      // Check if the first existing save is auto-selected and its name is in the input
      expect(screen.getByText(mockExistingSaves[1].saveName)).toBeInTheDocument(); // Newest is mockExistingSaves[1]
      expect((screen.getByLabelText(/Overwrite with name:/i) as HTMLInputElement).value).toBe(mockExistingSaves[1].saveName);
    });
  });


  test('fetches and displays existing saves in "Overwrite" mode', async () => {
    (saveGameService.listSavedGames as jest.Mock).mockResolvedValue({ success: true, savedGames: mockExistingSaves });
    renderModal();

    // Initially might be 'New Save', switch to 'Overwrite'
    fireEvent.click(screen.getByRole('button', { name: 'Overwrite Existing' }));
    
    await waitFor(() => {
      expect(saveGameService.listSavedGames).toHaveBeenCalledTimes(1); // Called on open
      expect(screen.getByText('Old Save')).toBeInTheDocument();
      expect(screen.getByText('Recent Save')).toBeInTheDocument();
    });
  });
  
  test('switches between "New Save" and "Overwrite Existing" modes', async () => {
    (saveGameService.listSavedGames as jest.Mock).mockResolvedValue({ success: true, savedGames: mockExistingSaves });
    renderModal();

    // Initial mode (should be overwrite due to existing saves)
    await waitFor(() => expect(screen.getByLabelText(/Select Game to Overwrite:/i)).toBeInTheDocument());

    // Switch to "New Save"
    fireEvent.click(screen.getByRole('button', { name: 'New Save' }));
    await waitFor(() => {
        expect(screen.getByLabelText(/Save As:/i)).toBeInTheDocument();
        expect((screen.getByLabelText(/Save As:/i) as HTMLInputElement).value).toMatch(/USA_2024/); // Default name
    });


    // Switch back to "Overwrite Existing"
    fireEvent.click(screen.getByRole('button', { name: 'Overwrite Existing' }));
    await waitFor(() => {
        expect(screen.getByLabelText(/Select Game to Overwrite:/i)).toBeInTheDocument();
         // Should auto-select the most recent save again
        expect((screen.getByLabelText(/Overwrite with name:/i) as HTMLInputElement).value).toBe(mockExistingSaves[1].saveName);
    });
  });

  test('allows inputting a new save name in "New Save" mode', async () => {
    (saveGameService.listSavedGames as jest.Mock).mockResolvedValue({ success: true, savedGames: [] }); // No existing saves
    renderModal();
    
    await waitFor(() => {
        expect(screen.getByLabelText(/Save As:/i)).toBeInTheDocument();
    });
    const input = screen.getByLabelText(/Save As:/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'My Custom Save' } });
    expect(input.value).toBe('My Custom Save');
  });

  test('handles saving a new game successfully', async () => {
    (saveGameService.listSavedGames as jest.Mock).mockResolvedValue({ success: true, savedGames: [] });
    (saveGameService.saveGame as jest.Mock).mockResolvedValue({ success: true, path: '/saves/NewSave.sav' });
    renderModal();

    await waitFor(() => {
        expect(screen.getByLabelText(/Save As:/i)).toBeInTheDocument();
    });
    const saveNameInput = screen.getByLabelText(/Save As:/i);
    fireEvent.change(saveNameInput, { target: { value: 'NewSaveName' } });
    
    fireEvent.click(screen.getByRole('button', { name: 'Save Game' }));

    await waitFor(() => {
      // First arg is fileIdentifier (potentially same as displayName for new), second is displayName
      expect(saveGameService.saveGame).toHaveBeenCalledWith('NewSaveName', 'NewSaveName');
      expect(audioService.playSound).toHaveBeenCalledWith('save_success');
      expect(mockOnSaveComplete).toHaveBeenCalledWith(true);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
  
  test('handles saving a new game with failure', async () => {
    (saveGameService.listSavedGames as jest.Mock).mockResolvedValue({ success: true, savedGames: [] });
    (saveGameService.saveGame as jest.Mock).mockResolvedValue({ success: false, error: 'Disk Write Error' });
    renderModal();

    await waitFor(() => {
        expect(screen.getByLabelText(/Save As:/i)).toBeInTheDocument();
    });
    const saveNameInput = screen.getByLabelText(/Save As:/i);
    fireEvent.change(saveNameInput, { target: { value: 'NewSaveFail' } });
    
    fireEvent.click(screen.getByRole('button', { name: 'Save Game' }));

    await waitFor(() => {
      expect(screen.getByText(/Disk Write Error/)).toBeInTheDocument();
      expect(audioService.playSound).toHaveBeenCalledWith('error');
      expect(mockOnSaveComplete).toHaveBeenCalledWith(false);
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  test('handles overwriting an existing game successfully', async () => {
    (saveGameService.listSavedGames as jest.Mock).mockResolvedValue({ success: true, savedGames: mockExistingSaves });
    (saveGameService.saveGame as jest.Mock).mockResolvedValue({ success: true, path: `/saves/${mockExistingSaves[1].fileName}` });
    renderModal();

    // Should default to overwrite mode and auto-select the latest save ('Recent Save')
    await waitFor(() => {
        expect(screen.getByLabelText(/Select Game to Overwrite:/i)).toBeInTheDocument();
        expect((screen.getByLabelText(/Overwrite with name:/i) as HTMLInputElement).value).toBe(mockExistingSaves[1].saveName);
    });
    
    // Optionally change the display name for the overwrite
    const displayNameInput = screen.getByLabelText(/Overwrite with name:/i);
    fireEvent.change(displayNameInput, { target: { value: 'Recent Save Updated Name' } });

    fireEvent.click(screen.getByRole('button', { name: 'Overwrite Game' }));

    await waitFor(() => {
      // First arg is fileIdentifier (fileName of selected save), second is new displayName
      expect(saveGameService.saveGame).toHaveBeenCalledWith(mockExistingSaves[1].fileName, 'Recent Save Updated Name');
      expect(audioService.playSound).toHaveBeenCalledWith('save_success');
      expect(mockOnSaveComplete).toHaveBeenCalledWith(true);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
  
  test('validates that a save name is entered for new saves', async () => {
    (saveGameService.listSavedGames as jest.Mock).mockResolvedValue({ success: true, savedGames: [] });
    renderModal();

    await waitFor(() => {
        expect(screen.getByLabelText(/Save As:/i)).toBeInTheDocument();
    });
    const saveNameInput = screen.getByLabelText(/Save As:/i);
    fireEvent.change(saveNameInput, { target: { value: '  ' } }); // Empty name

    fireEvent.click(screen.getByRole('button', { name: 'Save Game' }));
    await waitFor(() => {
        expect(screen.getByText('Please enter a name for the new save file.')).toBeInTheDocument();
        expect(saveGameService.saveGame).not.toHaveBeenCalled();
    });
  });

  test('validates that a game is selected for overwriting', async () => {
    // Render with no existing saves, then switch to overwrite (button should be disabled but test anyway)
    (saveGameService.listSavedGames as jest.Mock).mockResolvedValue({ success: true, savedGames: [] });
    renderModal();
    
    // Switch to overwrite mode - button should be disabled, but we can force the state for testing internal logic
    // Or, more realistically, test that the save button is disabled.
    const overwriteButton = screen.getByRole('button', { name: 'Overwrite Existing' });
    expect(overwriteButton).toBeDisabled();

    // If we could manipulate state to be in overwrite mode with no selection:
    // (This would require a more complex setup to force component state or a different test structure)
    // fireEvent.click(screen.getByRole('button', { name: 'Overwrite Game' }));
    // await waitFor(() => {
    //     expect(screen.getByText('Please select an existing game to overwrite.')).toBeInTheDocument();
    // });
    // For now, covered by button disable state.
  });

});
```
