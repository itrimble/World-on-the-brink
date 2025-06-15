// src/renderer/components/modals/LoadGameModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { webSaveGameService } from '../../services/WebSaveGameService';
import { audioService } from '../../services/AudioService';
import Modal from '../common/Modal';
import Button from '../common/Button';
import ErrorMessage from '../common/ErrorMessage';
import { createLogger } from '../../utils/logger';
import type { SavedGameMetadata, SaveGameState } from '../../../shared/types/game';
import { AppDispatch } from '../../store';
import GameStateService from '../../services/GameStateService';

const logger = createLogger('LoadGameModal');

/**
 * Props for the LoadGameModal component.
 */
interface LoadGameModalProps {
  /** Indicates whether the modal is currently open. */
  isOpen: boolean;
  /** Callback function to close the modal. */
  onClose: () => void;
  /** Optional callback function invoked after a game load attempt (successful or not). */
  onLoadComplete?: (success: boolean, gameData?: SaveGameState) => void;
}

/**
 * Represents the display-friendly information for a saved game entry.
 */
interface SaveInfoDisplay extends SavedGameMetadata {
  /** Formatted string of the save's timestamp. */
  formattedTimestamp: string;
  /** Size of the save file in bytes (estimated). */
  estimatedSize?: number;
}

/**
 * LoadGameModal allows users to load previously saved games.
 * Features include:
 * - List of all saved games sorted by date
 * - Save file information (name, date, size)
 * - Confirmation dialog for loading
 * - Error handling and validation
 */
export const LoadGameModal: React.FC<LoadGameModalProps> = ({
  isOpen,
  onClose,
  onLoadComplete,
}) => {
  // --- State Variables ---
  /** List of available saved games for display. */
  const [savedGames, setSavedGames] = useState<SaveInfoDisplay[]>([]);
  /** Currently selected save file for loading. */
  const [selectedSave, setSelectedSave] = useState<SaveInfoDisplay | null>(null);
  /** Loading state during fetch or load operations. */
  const [isLoading, setIsLoading] = useState(false);
  /** Error message to display to the user. */
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  /** Confirmation state for loading a game. */
  const [showConfirmation, setShowConfirmation] = useState(false);

  const dispatch = useDispatch<AppDispatch>();

  /**
   * Fetches the list of saved games from storage.
   */
  const fetchSavedGames = useCallback(async () => {
    logger.info('Fetching saved games list.');
    setIsLoading(true);
    setErrorMsg(null);
    
    try {
      const result = await webSaveGameService.listSavedGames();
      if (result.success && result.savedGames) {
        logger.info(`Successfully fetched ${result.savedGames.length} saved games.`);
        
        const formattedSaves: SaveInfoDisplay[] = result.savedGames
          .sort((a, b) => b.timestamp - a.timestamp) // Most recent first
          .map(save => ({
            ...save,
            formattedTimestamp: new Date(save.timestamp).toLocaleString(),
            estimatedSize: save.saveName.length * 100, // Rough estimate
          }));
        
        setSavedGames(formattedSaves);
        
        // Auto-select the most recent save if any exist
        if (formattedSaves.length > 0) {
          setSelectedSave(formattedSaves[0]);
        }
      } else {
        logger.warn('Failed to fetch saved games list.', { error: result.error });
        setErrorMsg(result.error || 'Could not retrieve saved games.');
        setSavedGames([]);
      }
    } catch (error: any) {
      logger.error('Exception occurred while fetching saved games.', error);
      setErrorMsg('An unexpected error occurred while fetching saved games.');
      setSavedGames([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effect to load saved games when modal opens
  useEffect(() => {
    if (isOpen) {
      logger.info('LoadGameModal opened.');
      fetchSavedGames();
      setErrorMsg(null);
      setSelectedSave(null);
      setShowConfirmation(false);
    } else {
      logger.info('LoadGameModal closed, resetting state.');
      setSavedGames([]);
      setSelectedSave(null);
      setIsLoading(false);
      setErrorMsg(null);
      setShowConfirmation(false);
    }
  }, [isOpen, fetchSavedGames]);

  /**
   * Handles the load game action.
   */
  const handleLoadGame = async () => {
    if (!selectedSave) {
      setErrorMsg('Please select a saved game to load.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    logger.info(`Attempting to load game: "${selectedSave.saveName}" (${selectedSave.fileName})`);

    try {
      const result = await webSaveGameService.loadGame(selectedSave.fileName);
      
      if (result.success && result.data) {
        logger.info(`Game loaded successfully: "${selectedSave.saveName}"`);
        
        // Load the game state into Redux
        const loadResult = await GameStateService.loadCompleteGameState(result.data, dispatch);
        
        if (loadResult.success) {
          audioService.playSound('load_success');
          
          // Call completion callback with loaded data
          if (onLoadComplete) {
            onLoadComplete(true, result.data);
          }
          
          onClose();
        } else {
          logger.error(`Failed to apply loaded game state: ${loadResult.error}`);
          setErrorMsg(loadResult.error || 'Failed to apply the loaded game state.');
          audioService.playSound('error');
          
          if (onLoadComplete) {
            onLoadComplete(false);
          }
        }
      } else {
        logger.error(`Failed to load game: "${selectedSave.saveName}"`, { error: result.error });
        setErrorMsg(result.error || 'Failed to load the selected game.');
        audioService.playSound('error');
        
        if (onLoadComplete) {
          onLoadComplete(false);
        }
      }
    } catch (error: any) {
      logger.error(`Exception during load game operation for: "${selectedSave.saveName}"`, error);
      setErrorMsg(`An unexpected error occurred while loading "${selectedSave.saveName}": ${error.message}`);
      audioService.playSound('error');
      
      if (onLoadComplete) {
        onLoadComplete(false);
      }
    } finally {
      setIsLoading(false);
      setShowConfirmation(false);
    }
  };

  /**
   * Handles save file selection.
   */
  const handleSelectSave = (save: SaveInfoDisplay) => {
    logger.debug(`Selected save: "${save.saveName}" (${save.fileName})`);
    setSelectedSave(save);
    setShowConfirmation(false);
  };

  /**
   * Handles delete save action.
   */
  const handleDeleteSave = async (save: SaveInfoDisplay) => {
    if (!window.confirm(`Are you sure you want to delete "${save.saveName}"? This action cannot be undone.`)) {
      return;
    }

    setIsLoading(true);
    logger.info(`Deleting save: "${save.saveName}" (${save.fileName})`);

    try {
      const result = await webSaveGameService.deleteSavedGame(save.fileName);
      
      if (result.success) {
        logger.info(`Save deleted successfully: "${save.saveName}"`);
        audioService.playSound('ui_success');
        
        // Refresh the list
        await fetchSavedGames();
        
        // Clear selection if deleted save was selected
        if (selectedSave?.fileName === save.fileName) {
          setSelectedSave(null);
        }
      } else {
        logger.error(`Failed to delete save: "${save.saveName}"`, { error: result.error });
        setErrorMsg(result.error || 'Failed to delete the saved game.');
        audioService.playSound('error');
      }
    } catch (error: any) {
      logger.error(`Exception during delete operation for: "${save.saveName}"`, error);
      setErrorMsg(`An unexpected error occurred while deleting "${save.saveName}": ${error.message}`);
      audioService.playSound('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Modal footer content
  const modalFooter = (
    <>
      <Button onClick={onClose} variant="secondary" disabled={isLoading}>
        Cancel
      </Button>
      {showConfirmation ? (
        <>
          <Button
            onClick={() => setShowConfirmation(false)}
            variant="ghost"
            disabled={isLoading}
          >
            Back
          </Button>
          <Button
            onClick={handleLoadGame}
            variant="danger"
            disabled={isLoading || !selectedSave}
            isLoading={isLoading}
          >
            {isLoading ? 'Loading...' : 'Confirm Load'}
          </Button>
        </>
      ) : (
        <Button
          onClick={() => setShowConfirmation(true)}
          variant="primary"
          disabled={isLoading || !selectedSave}
        >
          Load Game
        </Button>
      )}
    </>
  );

  return (
    <Modal 
      title={showConfirmation ? 'Confirm Load Game' : 'Load Game'} 
      isOpen={isOpen} 
      onClose={onClose} 
      footer={modalFooter} 
      maxWidth="max-w-2xl"
    >
      <ErrorMessage message={errorMsg} />
      
      {showConfirmation && selectedSave ? (
        // Confirmation screen
        <div className="space-y-4">
          <div className="p-4 bg-yellow-900/30 border border-yellow-700 rounded">
            <h3 className="text-yellow-400 font-medium mb-2">⚠️ Load Game Confirmation</h3>
            <p className="text-gray-300">
              Loading "{selectedSave.saveName}" will replace your current game progress. 
              Any unsaved changes will be lost.
            </p>
          </div>
          
          <div className="bg-gray-750 p-4 rounded border border-gray-600">
            <h4 className="font-medium text-white mb-2">Selected Save:</h4>
            <div className="text-gray-300">
              <div><strong>Name:</strong> {selectedSave.saveName}</div>
              <div><strong>Saved:</strong> {selectedSave.formattedTimestamp}</div>
              <div><strong>Version:</strong> {selectedSave.version}</div>
            </div>
          </div>
        </div>
      ) : (
        // Save selection screen
        <div className="space-y-4">
          {isLoading && savedGames.length === 0 && (
            <div className="p-4 text-gray-400 text-center">Loading saved games...</div>
          )}
          
          {!isLoading && savedGames.length === 0 && (
            <div className="p-4 text-gray-400 bg-gray-700 rounded text-center">
              No saved games found. Save a game first to load it here.
            </div>
          )}
          
          {savedGames.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select a saved game to load:
              </label>
              
              <div className="max-h-96 overflow-y-auto bg-gray-750 rounded border border-gray-600 custom-scrollbar">
                {savedGames.map((save) => (
                  <div
                    key={save.fileName}
                    className={`
                      p-4 border-b border-gray-500 group transition-colors duration-150
                      ${selectedSave?.fileName === save.fileName 
                        ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                        : 'hover:bg-gray-650 bg-gray-750 text-gray-300'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => handleSelectSave(save)}
                        role="button"
                        tabIndex={0}
                        onKeyPress={(e) => { 
                          if (e.key === 'Enter' || e.key === ' ') handleSelectSave(save); 
                        }}
                      >
                        <div className="font-medium truncate mb-1" title={save.saveName}>
                          {save.saveName}
                        </div>
                        <div className="text-xs text-gray-400 group-hover:text-gray-300">
                          Saved: {save.formattedTimestamp}
                        </div>
                        <div className="text-xs text-gray-500">
                          Version: {save.version}
                        </div>
                      </div>
                      
                      <div className="ml-4 flex space-x-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSave(save);
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                          disabled={isLoading}
                          title={`Delete "${save.saveName}"`}
                        >
                          🗑️
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedSave && (
                <div className="mt-4 p-3 bg-gray-700 rounded border border-gray-600">
                  <div className="text-sm text-gray-300">
                    <strong>Selected:</strong> {selectedSave.saveName} • {selectedSave.formattedTimestamp}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};