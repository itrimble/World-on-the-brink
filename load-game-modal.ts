// src/renderer/components/LoadGameModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { saveGameService } from '../../services/SaveGameService';
import { audioService } from '../../services/AudioService';
import Modal from './common/Modal';
import Button from './common/Button';
import ErrorMessage from './common/ErrorMessage';
import { setLoading, setError } from '../../features/game/gameSlice';
import { loadGameState } from '../../features/game/gameActions';
import { createLogger } from '../utils/logger';
import type { SavedGameMetadata } from '../../shared/types/game'; // Assuming this type is available

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
  onLoadComplete?: (success: boolean) => void;
}

/**
 * Represents the display-friendly information for a saved game entry in the list.
 * Derived from `SavedGameMetadata`.
 */
interface SavedGameDisplayInfo extends SavedGameMetadata {
  /** Formatted string of the last modified timestamp. */
  lastModifiedFormatted: string; 
}

/**
 * Represents the display-friendly details of a selected saved game.
 */
interface SaveDetailsDisplay {
  name: string;
  date: string;
  turn: number;
  faction: string;
  year: number;
}

/**
 * `LoadGameModal` is a React component that provides a user interface for loading previously saved games.
 * It lists available save files, allows selection, displays details of the selected save,
 * and handles the process of loading the game state into the application.
 * It also supports deleting saved games.
 */
export const LoadGameModal: React.FC<LoadGameModalProps> = ({
  isOpen,
  onClose,
  onLoadComplete,
}) => {
  const dispatch = useDispatch();

  // --- State Variables ---
  /** List of saved games fetched from the service, adapted for display. */
  const [savedGames, setSavedGames] = useState<SavedGameDisplayInfo[]>([]);
  /** Loading state for fetching the list of saved games. */
  const [isLoadingList, setIsLoadingList] = useState(false);
  /** Loading state for actions like loading a selected game or deleting a save. */
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  /** Error message string to display to the user within the modal. */
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  /** The filename of the currently selected saved game. */
  const [selectedSaveFileName, setSelectedSaveFileName] = useState<string | null>(null);
  /** Detailed information of the `selectedSaveFileName` for display. */
  const [saveDetails, setSaveDetails] = useState<SaveDetailsDisplay | null>(null);

  /**
   * Fetches details for a given save file name.
   * This is a useCallback to memoize the function if it were passed as a prop,
   * though here it's primarily for consistency.
   */
  const fetchSaveDetails = useCallback(async (fileName: string) => {
    logger.info(`Fetching details for save file: "${fileName}"`);
    setSaveDetails(null); // Clear previous details immediately
    // setErrorMsg(null); // Decide if general errors should be cleared here or only detail-specific ones

    try {
      // `saveGameService.loadGame` also loads the full game data, which is used here for details.
      // If save files are very large, a separate lightweight metadata fetch might be preferable.
      const result = await saveGameService.loadGame(fileName);
      if (result.success && result.data) {
        logger.info(`Successfully fetched details for "${fileName}".`);
        const { metadata, currentTurn, player, currentYear } = result.data;
        setSaveDetails({
          name: metadata.saveName,
          date: new Date(metadata.timestamp).toLocaleString(),
          turn: currentTurn,
          faction: player.faction.toUpperCase(), // Assuming faction is a string
          year: currentYear,
        });
      } else {
        logger.warn(`Failed to load details for "${fileName}".`, { error: result.error });
        setErrorMsg(result.error || `Could not load details for "${fileName}". The file might be corrupted or inaccessible.`);
        setSaveDetails(null); // Ensure details are cleared on error
      }
    } catch (error: any) {
      logger.error(`An unexpected error occurred while loading details for "${fileName}".`, error);
      setErrorMsg(`An unexpected error occurred while fetching details for "${fileName}". Please try again or check logs.`);
      setSaveDetails(null);
    }
  }, []); // No dependencies, as logger and setErrorMsg/setSaveDetails are stable from useState/module scope.

  /**
   * Fetches the list of saved games from the `saveGameService`.
   * Sorts them by timestamp and updates the component's state.
   * Automatically selects the most recent save if available.
   */
  const fetchSavedGamesList = useCallback(async () => {
    logger.info('Attempting to fetch saved games list.');
    setIsLoadingList(true);
    setErrorMsg(null);
    try {
      const result = await saveGameService.listSavedGames();
      if (result.success && result.savedGames) {
        logger.info(`Successfully fetched ${result.savedGames.length} saved games.`);
        const sortedSaves = result.savedGames
          .sort((a, b) => b.timestamp - a.timestamp) // Most recent first
          .map(sg => ({ ...sg, lastModifiedFormatted: new Date(sg.timestamp).toLocaleString() }));
        
        setSavedGames(sortedSaves);

        if (sortedSaves.length > 0) {
          logger.debug('Auto-selecting first save in the list.', { fileName: sortedSaves[0].fileName });
          setSelectedSaveFileName(sortedSaves[0].fileName);
          fetchSaveDetails(sortedSaves[0].fileName); // Fetch details for the auto-selected save
        } else {
          logger.info('No saved games found.');
          setSelectedSaveFileName(null);
          setSaveDetails(null);
        }
      } else {
        logger.warn('Failed to fetch saved games list from service.', { error: result.error });
        setErrorMsg(result.error || 'Could not retrieve the list of saved games. The saves directory might be inaccessible or empty.');
      }
    } catch (error: any) {
      logger.error('An unexpected error occurred directly within fetchSavedGamesList.', error);
      setErrorMsg('An unexpected error occurred while fetching saved games. Please try again or check application logs.');
    } finally {
      setIsLoadingList(false);
    }
  }, [fetchSaveDetails]); // fetchSaveDetails is a dependency

  // Effect to fetch saved games when the modal is opened.
  useEffect(() => {
    if (isOpen) {
      logger.info('LoadGameModal opened.');
      fetchSavedGamesList();
    } else {
      // Reset component state when modal is closed to ensure fresh state on next open.
      logger.info('LoadGameModal closed, resetting state.');
      setErrorMsg(null);
      setSelectedSaveFileName(null);
      setSaveDetails(null);
      setSavedGames([]);
      setIsLoadingList(false); // Ensure loading indicators are reset
      setIsProcessingAction(false);
    }
  }, [isOpen, fetchSavedGamesList]);


  /**
   * Handles the action of loading the currently selected saved game.
   * Dispatches actions to update game state and handles success/failure UI updates.
   */
  const handleLoadGameAction = async () => {
    if (!selectedSaveFileName) {
      logger.warn('Load game action attempted without a selected save file.');
      setErrorMsg('Please select a game to load before proceeding.');
      return;
    }
    logger.info(`Initiating load for game file: "${selectedSaveFileName}"`);
    setIsProcessingAction(true);
    setErrorMsg(null);
    dispatch(setLoading(true)); // Global loading state for the application.

    try {
      const result = await saveGameService.loadGame(selectedSaveFileName);
      if (result.success && result.data) {
        logger.info(`Game "${selectedSaveFileName}" loaded successfully from service. Dispatching to game state.`);
        dispatch(loadGameState(result.data));
        audioService.playSound('load_success');
        if (onLoadComplete) onLoadComplete(true);
        onClose(); // Close modal on successful load.
      } else {
        logger.error(`Failed to load game "${selectedSaveFileName}" from service.`, { error: result.error });
        setErrorMsg(result.error || `Failed to load "${selectedSaveFileName}". The file may be corrupt or an unknown error occurred.`);
        dispatch(setError(result.error || `Failed to load game "${selectedSaveFileName}"`));
        audioService.playSound('error');
        if (onLoadComplete) onLoadComplete(false);
      }
    } catch (error: any) {
      logger.error(`An unexpected error occurred directly within handleLoadGameAction for "${selectedSaveFileName}".`, error);
      const message = (error instanceof Error) ? error.message : 'An unknown error occurred during the load process.';
      setErrorMsg(`An unexpected error occurred: ${message}. Please try again or check application logs.`);
      dispatch(setError(message));
      audioService.playSound('error');
      if (onLoadComplete) onLoadComplete(false);
    } finally {
      setIsProcessingAction(false);
      dispatch(setLoading(false)); // Reset global loading state.
    }
  };

  /**
   * Handles the selection of a saved game entry from the list.
   * Updates the `selectedSaveFileName` state and triggers fetching details for the selected save.
   * @param fileName - The filename of the save entry that was clicked.
   */
  const handleSelectSaveEntry = (fileName: string) => {
    logger.debug(`Save entry selected: "${fileName}"`);
    setSelectedSaveFileName(fileName);
    fetchSaveDetails(fileName);
  };

  /**
   * Handles the deletion of a saved game entry.
   * Prompts for confirmation before proceeding with deletion via `saveGameService`.
   * @param fileName - The filename of the save to be deleted.
   * @param event - The React mouse event, used to stop propagation to prevent re-selecting the item.
   */
  const handleDeleteSaveEntry = async (fileName: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent the click from also selecting the save entry.
    logger.info(`Attempting to delete save file: "${fileName}"`);
    
    // User confirmation for destructive action.
    if (window.confirm(`Are you sure you want to delete the saved game "${fileName}"? This action cannot be undone.`)) {
      setIsProcessingAction(true);
      setErrorMsg(null);
      try {
        const result = await saveGameService.deleteSavedGame(fileName);
        if (result.success) {
          logger.info(`Successfully deleted "${fileName}". Refreshing saved games list.`);
          audioService.playSound('delete');
          fetchSavedGamesList(); // Refresh the list of saves.
          // If the deleted save was the one currently selected, clear its details.
          if (selectedSaveFileName === fileName) {
            logger.debug(`Cleared selection and details for just-deleted save: "${fileName}"`);
            setSelectedSaveFileName(null);
            setSaveDetails(null);
          }
        } else {
          logger.error(`Failed to delete "${fileName}" via service.`, { error: result.error });
          setErrorMsg(result.error || `Could not delete "${fileName}". Please check file permissions or try again.`);
          audioService.playSound('error');
        }
      } catch (error: any) {
        logger.error(`An unexpected error occurred directly within handleDeleteSaveEntry for "${fileName}".`, error);
        setErrorMsg(`An error occurred while deleting "${fileName}". Please try again or check application logs.`);
        audioService.playSound('error');
      } finally {
        setIsProcessingAction(false);
      }
    } else {
      logger.debug(`Deletion of "${fileName}" cancelled by user.`);
    }
  };

  // Defines the footer content for the Modal, typically action buttons.
  const modalFooter = (
    <>
      <Button onClick={onClose} variant="secondary" disabled={isProcessingAction || isLoadingList}>
        Cancel
      </Button>
      <Button
        onClick={handleLoadGameAction}
        variant="primary"
        disabled={isProcessingAction || isLoadingList || !selectedSaveFileName}
        isLoading={isProcessingAction && !!selectedSaveFileName} // Show spinner only when processing a selected save.
      >
        {isProcessingAction && selectedSaveFileName ? 'Loading...' : 'Load Game'}
      </Button>
    </>
  );

  return (
    <Modal title="Load Game" isOpen={isOpen} onClose={onClose} footer={modalFooter} maxWidth="max-w-4xl">
      <ErrorMessage message={errorMsg} />
      <div className="flex flex-col md:flex-row gap-4 max-h-[60vh] md:max-h-[calc(100vh-20rem)]"> {/* Responsive layout */}
        {/* Saved Games List Section */}
        <div className="w-full md:w-1/2">
          <h3 className="text-lg font-semibold mb-2 text-gray-200">Saved Games</h3>
          {isLoadingList && <div className="p-3 text-gray-400 text-center">Loading saved games...</div>}
          {!isLoadingList && savedGames.length === 0 && !errorMsg && (
            <div className="p-3 text-gray-400 bg-gray-700 rounded text-center">No saved games found.</div>
          )}
          {!isLoadingList && savedGames.length > 0 && (
            <div className="overflow-y-auto h-64 md:h-80 bg-gray-750 rounded border border-gray-700 custom-scrollbar">
              {savedGames.map((save) => (
                <div
                  key={save.fileName}
                  className={`
                    p-3 border-b border-gray-600 cursor-pointer group
                    transition-colors duration-150 ease-in-out
                    ${selectedSaveFileName === save.fileName ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'hover:bg-gray-650 bg-gray-750 text-gray-300'}
                  `}
                  onClick={() => handleSelectSaveEntry(save.fileName)}
                  role="button" // Accessibility
                  tabIndex={0} // Make it focusable
                  onKeyPress={(e) => e.key === 'Enter' && handleSelectSaveEntry(save.fileName)} // Keyboard navigable
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium truncate" title={save.saveName}>{save.saveName}</span>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={(e) => handleDeleteSaveEntry(save.fileName, e)}
                      title={`Delete ${save.saveName}`}
                      disabled={isProcessingAction} // Disable delete while another action is in progress.
                      className="flex-shrink-0 ml-2"
                    >
                      Delete
                    </Button>
                  </div>
                  <div className="text-xs text-gray-400 group-hover:text-gray-300">{save.lastModifiedFormatted}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Save Details Section */}
        <div className="w-full md:w-1/2">
          <h3 className="text-lg font-semibold mb-2 text-gray-200">Save Details</h3>
          <div className="bg-gray-750 rounded border border-gray-700 p-4 h-64 md:h-80 flex flex-col justify-between">
            {/* Conditional rendering based on whether details are available or being loaded */}
            {!selectedSaveFileName && !errorMsg && (
              <div className="h-full flex items-center justify-center text-gray-500">Select a saved game to view details.</div>
            )}
            {selectedSaveFileName && !saveDetails && !errorMsg && ( 
                 <div className="h-full flex items-center justify-center text-gray-400">Loading details for "{selectedSaveFileName}"...</div>
            )}
            {saveDetails && (
              <>
                <div>
                  <h4 className="text-xl font-bold mb-1 text-blue-300 truncate" title={saveDetails.name}>{saveDetails.name}</h4>
                  <div className="text-sm text-gray-400 mb-3">{saveDetails.date}</div>
                  <div className="space-y-1 text-gray-300">
                    <div><span className="font-semibold text-gray-200">Year:</span> {saveDetails.year}</div>
                    <div><span className="font-semibold text-gray-200">Turn:</span> {saveDetails.turn}</div>
                    <div><span className="font-semibold text-gray-200">Faction:</span> {saveDetails.faction}</div>
                  </div>
                </div>
                <div className="mt-auto pt-4 flex justify-center"> {/* Centering the image */}
                  <img
                    src={`./assets/images/${saveDetails.faction.toLowerCase()}_flag.png`} // Path relative to public/ or build output
                    alt={`${saveDetails.faction} Flag`}
                    className="h-20 w-auto object-contain opacity-70" // Ensure image scales nicely
                    onError={(e) => { 
                      (e.target as HTMLImageElement).style.display = 'none'; 
                      // Optionally, show a placeholder or log error
                      logger.warn(`Flag image not found for faction: ${saveDetails.faction}`);
                    }}
                  />
                </div>
              </>
            )}
            {/* Display error specific to details loading, or if a general error occurred while a save was selected */}
            {errorMsg && selectedSaveFileName && !saveDetails && (
                <div className="h-full flex items-center justify-center text-red-400 p-2 text-center">
                    {`Could not load details for "${selectedSaveFileName}". ${errorMsg.includes(selectedSaveFileName) ? '' : errorMsg}`}
                </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
```