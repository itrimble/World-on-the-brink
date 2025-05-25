// src/renderer/components/SaveGameModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { saveGameService } from '../../services/SaveGameService';
import { audioService } from '../../services/AudioService';
import Modal from './common/Modal';
import Button from './common/Button';
import ErrorMessage from './common/ErrorMessage';
import { createLogger } from '../utils/logger'; // Assuming logger is available
import type { SavedGameMetadata } from '../../shared/types/game'; // Consistent type import

const logger = createLogger('SaveGameModal');

/**
 * Props for the SaveGameModal component.
 */
interface SaveGameModalProps {
  /** Indicates whether the modal is currently open. */
  isOpen: boolean;
  /** Callback function to close the modal. */
  onClose: () => void;
  /** Optional callback function invoked after a game save attempt (successful or not). */
  onSaveComplete?: (success: boolean) => void;
}

/**
 * Represents the display-friendly information for an existing saved game entry in the list.
 * Derived from `SavedGameMetadata`.
 */
interface ExistingSaveInfoDisplay extends SavedGameMetadata {
  /** Formatted string of the save's timestamp. */
  formattedTimestamp: string;
}

/**
 * `SaveGameModal` is a React component that allows users to save their current game progress.
 * It supports saving as a new file or overwriting an existing save.
 * It lists existing saves and provides an input field for the save name.
 */
export const SaveGameModal: React.FC<SaveGameModalProps> = ({
  isOpen,
  onClose,
  onSaveComplete,
}) => {
  // --- State Variables ---
  /** Current value of the save name input field. */
  const [saveNameInput, setSaveNameInput] = useState('');
  /** List of existing saved games, adapted for display. */
  const [existingSaves, setExistingSaves] = useState<ExistingSaveInfoDisplay[]>([]);
  /** Loading state, active when fetching existing saves or performing a save operation. */
  const [isLoading, setIsLoading] = useState(false);
  /** Error message string to display to the user within the modal. */
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  /** Current save mode: 'new' for a new save file, 'overwrite' to replace an existing one. */
  const [saveMode, setSaveMode] = useState<'new' | 'overwrite'>('new');
  /** The filename of the existing save selected for overwriting. Null if not in overwrite mode or no save selected. */
  const [selectedFileToOverwrite, setSelectedFileToOverwrite] = useState<string | null>(null);

  // --- Redux State ---
  /** Current in-game year, used for generating a default save name. */
  const currentYear = useSelector((state: RootState) => state.game.currentYear);
  /** Player's faction, used for generating a default save name. */
  const playerFaction = useSelector((state: RootState) => state.player.faction);

  /**
   * Generates a default save name based on player faction and current year.
   * Memoized with useCallback to prevent re-computation on every render unless dependencies change.
   */
  const generateDefaultSaveName = useCallback(() => {
    const factionName = playerFaction?.toUpperCase() || 'GAME';
    const year = currentYear || new Date().getFullYear();
    return `${factionName}_${year}`;
  }, [playerFaction, currentYear]);

  /**
   * Fetches the list of existing saved games.
   * This is memoized as it's part of a useEffect dependency array.
   */
  const fetchExistingSavesList = useCallback(async () => {
    logger.info('Fetching existing saved games list.');
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await saveGameService.listSavedGames();
      if (result.success && result.savedGames) {
        logger.info(`Successfully fetched ${result.savedGames.length} existing saves.`);
        const sortedSaves = result.savedGames
          .sort((a, b) => b.timestamp - a.timestamp) // Most recent first
          .map(s => ({ ...s, formattedTimestamp: new Date(s.timestamp).toLocaleString() }));
        setExistingSaves(sortedSaves);
        
        // If initially set to overwrite and list is populated, select the first item.
        // This handles the case where `existingSaves` was empty when `saveMode` was set.
        if (saveMode === 'overwrite' && sortedSaves.length > 0) {
            if (!selectedFileToOverwrite || !sortedSaves.find(s => s.fileName === selectedFileToOverwrite)) {
                setSelectedFileToOverwrite(sortedSaves[0].fileName);
                setSaveNameInput(sortedSaves[0].saveName); // Also update input field
            }
        } else if (sortedSaves.length === 0 && saveMode === 'overwrite') {
            // If no saves exist, switch to 'new' save mode.
            setSaveMode('new');
            setErrorMsg("No existing games to overwrite. Switched to 'New Save' mode.");
            setSaveNameInput(generateDefaultSaveName()); // Set default name for new save
        }

      } else {
        logger.warn('Failed to fetch existing saves list from service.', { error: result.error });
        setErrorMsg(result.error || 'Could not retrieve the list of existing saved games.');
        setExistingSaves([]); // Ensure list is empty on error
      }
    } catch (error: any) {
      logger.error('An unexpected error occurred directly within fetchExistingSavesList.', error);
      setErrorMsg('An unexpected error occurred while fetching existing saves. Please try again.');
      setExistingSaves([]);
    } finally {
      setIsLoading(false);
    }
  }, [saveMode, selectedFileToOverwrite, generateDefaultSaveName]); // Dependencies for useCallback

  // Effect to manage state when the modal opens or closes.
  useEffect(() => {
    if (isOpen) {
      logger.info('SaveGameModal opened.');
      fetchExistingSavesList(); // Fetch existing saves.
      const defaultName = generateDefaultSaveName();
      setSaveNameInput(defaultName); // Set default save name.
      setErrorMsg(null);
      setSelectedFileToOverwrite(null);
      // Determine initial save mode: 'overwrite' if saves exist, otherwise 'new'.
      // Note: fetchExistingSavesList is async, so existingSaves might not be populated yet.
      // The logic inside fetchExistingSavesList and the follow-up useEffect handles this.
      setSaveMode(existingSaves.length > 0 ? 'overwrite' : 'new'); 
    } else {
      logger.info('SaveGameModal closed, resetting state.');
      // Reset state when modal is closed.
      setSaveNameInput('');
      setExistingSaves([]);
      setIsLoading(false);
      setErrorMsg(null);
      setSaveMode('new');
      setSelectedFileToOverwrite(null);
    }
  }, [isOpen, generateDefaultSaveName, fetchExistingSavesList]); // existingSaves.length removed

  // Effect to adjust save mode or selection if 'overwrite' mode becomes invalid (e.g., all saves deleted).
  useEffect(() => {
    if (isOpen && saveMode === 'overwrite') {
      if (existingSaves.length > 0) {
        // If no file is selected for overwrite, or the selected one is no longer valid, select the first available.
        if (!selectedFileToOverwrite || !existingSaves.find(s => s.fileName === selectedFileToOverwrite)) {
          handleSelectExistingSaveEntry(existingSaves[0].fileName, existingSaves[0].saveName);
        }
      } else {
        // No saves available to overwrite; switch to 'new' save mode.
        logger.info("No existing saves to overwrite. Switching to 'New Save' mode.");
        setSaveMode('new');
        setErrorMsg("No games available to overwrite. Switched to 'New Save' mode.");
        setSaveNameInput(generateDefaultSaveName()); // Ensure default name is set for 'new' mode.
      }
    }
  }, [isOpen, saveMode, existingSaves, selectedFileToOverwrite, generateDefaultSaveName]); // Added generateDefaultSaveName

  /**
   * Handles the primary save action (new save or overwrite).
   * Validates input, calls `saveGameService`, and manages UI feedback.
   */
  const handleSaveGameAction = async () => {
    if (saveMode === 'new' && !saveNameInput.trim()) {
      setErrorMsg('Please enter a name for the new save file.');
      logger.warn('Save attempt failed: New save name is empty.');
      return;
    }
    if (saveMode === 'overwrite' && !selectedFileToOverwrite) {
      setErrorMsg('Please select an existing game to overwrite.');
      logger.warn('Save attempt failed: No file selected for overwrite.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    logger.info(`Attempting to save game. Mode: ${saveMode}. Name/File: ${saveMode === 'new' ? saveNameInput : selectedFileToOverwrite}`);

    try {
      // `fileIdentifier` is the actual filename used by the service (e.g., "save_1.dat").
      // `displayNameForSave` is the user-friendly name stored in metadata (e.g., "My Awesome Game").
      const fileIdentifier = saveMode === 'overwrite' ? selectedFileToOverwrite! : saveNameInput.trim();
      const displayNameForSave = saveNameInput.trim(); // Always use current input for display name.
      
      // Pass both to saveGameService. It uses `fileIdentifier` for FS ops, `displayNameForSave` for metadata.
      // If it's a new save, `fileIdentifier` (from input) might be used by service to generate actual filename.
      // If overwriting, `selectedFileToOverwrite` is the key, `displayNameForSave` updates metadata.
      const result = await saveGameService.saveGame(fileIdentifier, displayNameForSave);

      if (result.success) {
        logger.info(`Game saved successfully. Path: ${result.path}`);
        audioService.playSound('save_success');
        if (onSaveComplete) onSaveComplete(true);
        onClose();
      } else {
        logger.error('Failed to save game via service.', { error: result.error });
        setErrorMsg(result.error || 'An error occurred while saving the game. Please try again.');
        audioService.playSound('error');
        if (onSaveComplete) onSaveComplete(false);
      }
    } catch (error: any) {
      logger.error('An unexpected error occurred directly in handleSaveGameAction.', error);
      setErrorMsg(`An unexpected error occurred: ${error.message}. Please check logs.`);
      audioService.playSound('error');
      if (onSaveComplete) onSaveComplete(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles selection of an existing save entry from the list for overwriting.
   * Updates state to reflect the selected save.
   * @param fileName - The filename (identifier) of the selected save.
   * @param displayName - The user-friendly display name of the selected save.
   */
  const handleSelectExistingSaveEntry = (fileName: string, displayName: string) => {
    logger.debug(`Existing save selected for overwrite: "${displayName}" (File: "${fileName}")`);
    setSelectedFileToOverwrite(fileName);
    setSaveNameInput(displayName); // Update input field to show the name of the save being considered for overwrite.
  };
  
  // Defines the footer content for the Modal, typically action buttons.
  const modalFooter = (
    <>
      <Button onClick={onClose} variant="secondary" disabled={isLoading}>
        Cancel
      </Button>
      <Button
        onClick={handleSaveGameAction}
        variant="primary"
        // Disable save if loading, or if trying to overwrite without selection, or new save without name.
        disabled={isLoading || 
                  (saveMode === 'overwrite' && !selectedFileToOverwrite) || 
                  (saveMode === 'new' && !saveNameInput.trim())}
        isLoading={isLoading}
      >
        {isLoading ? 'Saving...' : (saveMode === 'overwrite' ? 'Overwrite Game' : 'Save Game')}
      </Button>
    </>
  );

  return (
    <Modal title="Save Game" isOpen={isOpen} onClose={onClose} footer={modalFooter} maxWidth="max-w-lg">
      <ErrorMessage message={errorMsg} />
      <div className="space-y-4"> {/* Consistent spacing for modal content */}
        {/* Save Mode Toggle Buttons */}
        <div className="flex space-x-2">
          <Button
            variant={saveMode === 'new' ? 'primary' : 'ghost'}
            onClick={() => {
              logger.debug("Switched to 'New Save' mode.");
              setSaveMode('new');
              setSaveNameInput(generateDefaultSaveName()); // Set default name for new save.
              setSelectedFileToOverwrite(null); // Clear overwrite selection.
            }}
            size="sm"
            className="flex-grow justify-center" // Ensure buttons take equal width
          >
            New Save
          </Button>
          <Button
            variant={saveMode === 'overwrite' ? 'primary' : 'ghost'}
            onClick={() => {
              logger.debug("Switched to 'Overwrite Existing' mode.");
              setSaveMode('overwrite');
              // If saves exist and none are selected for overwrite, auto-select the first one.
              if (existingSaves.length > 0) {
                if (!selectedFileToOverwrite || !existingSaves.find(s => s.fileName === selectedFileToOverwrite)) {
                    handleSelectExistingSaveEntry(existingSaves[0].fileName, existingSaves[0].saveName);
                }
              } else {
                 // This case should ideally be handled by disabling the button or effects,
                 // but as a fallback, inform user and switch back if no saves to overwrite.
                 setErrorMsg("No existing games to overwrite.");
                 setSaveMode('new'); 
                 setSaveNameInput(generateDefaultSaveName());
              }
            }}
            disabled={existingSaves.length === 0 && saveMode !== 'overwrite'} // Disable if no saves to overwrite, unless already in overwrite (e.g. mid-load)
            size="sm"
            className="flex-grow justify-center"
          >
            Overwrite Existing
          </Button>
        </div>

        {/* Input for New Save Name */}
        {saveMode === 'new' && (
          <div>
            <label htmlFor="saveGameNameInput" className="block text-sm font-medium text-gray-300 mb-1">
              Save As:
            </label>
            <input
              id="saveGameNameInput"
              type="text"
              value={saveNameInput}
              onChange={(e) => setSaveNameInput(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter save name"
              autoFocus
            />
          </div>
        )}

        {/* List of Existing Saves for Overwrite Mode */}
        {saveMode === 'overwrite' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Select Game to Overwrite:</label>
            {isLoading && existingSaves.length === 0 && <div className="p-3 text-gray-400 text-center">Loading existing saves...</div>}
            {!isLoading && existingSaves.length === 0 && (
              <div className="p-3 text-gray-400 bg-gray-700 rounded text-center">No saved games available to overwrite.</div>
            )}
            {!isLoading && existingSaves.length > 0 && (
              <>
                <div className="max-h-60 overflow-y-auto bg-gray-750 rounded border border-gray-600 custom-scrollbar">
                  {existingSaves.map((save) => (
                    <div
                      key={save.fileName}
                      className={`
                        p-3 border-b border-gray-500 cursor-pointer group
                        transition-colors duration-150 ease-in-out
 comprehensive-refactor
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-600  // Focus styles

 main
                        ${selectedFileToOverwrite === save.fileName ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'hover:bg-gray-650 bg-gray-750 text-gray-300'}
                      `}
                      onClick={() => handleSelectExistingSaveEntry(save.fileName, save.saveName)}
                      role="button"
                      tabIndex={0}
 comprehensive-refactor
                      onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectExistingSaveEntry(save.fileName, save.saveName); }}
                      aria-label={`Select to overwrite saved game: ${save.saveName}`} // ARIA label
                      title={`Select to overwrite: ${save.saveName}`} // Tooltip
                    >
                      <div className="font-medium truncate" title={save.saveName}>{save.saveName}</div> {/* title attribute for tooltip on truncate */}

                      onKeyPress={(e) => e.key === 'Enter' && handleSelectExistingSaveEntry(save.fileName, save.saveName)}
                      title={`Select to overwrite: ${save.saveName}`}
                    >
                      <div className="font-medium truncate">{save.saveName}</div>
 main
                      <div className="text-xs text-gray-400 group-hover:text-gray-300">{save.formattedTimestamp}</div>
                    </div>
                  ))}
                </div>
                {/* Display name of the file to be overwritten for clarity, and allow editing it */}
                 <label htmlFor="overwriteSaveNameInput" className="block text-sm font-medium text-gray-300 mb-1 mt-3">
                    Overwrite with name:
                </label>
                <input
                  id="overwriteSaveNameInput"
                  type="text"
                  value={saveNameInput} // This is the name that will be saved in metadata
                  onChange={(e) => setSaveNameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter name for the overwritten save"
                  disabled={!selectedFileToOverwrite} // Only enable if a file is chosen to overwrite
                />
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
```