```typescript
// src/renderer/components/common/LoadGameModal.tsx
import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { saveGameService } from '../../services/SaveGameService';
import { audioService } from '../../services/AudioService';
import { GameState } from '../../../shared/types/game';
import { Button } from './Button';
import { setLoading, setError } from '../../features/game/gameSlice';

// These action creators would be defined in their respective slices
// Importing them here for completeness
import { loadGameState } from '../../features/game/gameActions';

interface LoadGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadComplete?: (success: boolean) => void;
}

export const LoadGameModal: React.FC<LoadGameModalProps> = ({
  isOpen,
  onClose,
  onLoadComplete
}) => {
  const dispatch = useDispatch();
  const [savedGames, setSavedGames] = useState<Array<{
    fileName: string;
    saveName: string;
    timestamp: number;
    version: string;
    lastModified: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedSave, setSelectedSave] = useState<string | null>(null);
  const [saveDetails, setSaveDetails] = useState<{
    name: string;
    date: string;
    turn: number;
    faction: string;
    year: number;
  } | null>(null);
  
  // Load saved games when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSavedGames();
    }
  }, [isOpen]);
  
  // Load list of saved games
  const loadSavedGames = async () => {
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const result = await saveGameService.listSavedGames();
      
      if (result.success && result.savedGames) {
        // Sort by most recent first
        const sortedSaves = result.savedGames.sort((a, b) => b.timestamp - a.timestamp);
        setSavedGames(sortedSaves);
        
        // If there are saved games, select the first one
        if (sortedSaves.length > 0) {
          setSelectedSave(sortedSaves[0].fileName);
          loadSaveDetails(sortedSaves[0].fileName);
        }
      } else {
        setErrorMessage('Failed to load saved games');
        console.error('Error loading saved games:', result.error);
      }
    } catch (error) {
      setErrorMessage('An error occurred while loading saves');
      console.error('Error in loadSavedGames:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load details of a selected save
  const loadSaveDetails = async (fileName: string) => {
    try {
      const result = await saveGameService.loadGame(fileName);
      
      if (result.success && result.data) {
        const saveData = result.data;
        
        setSaveDetails({
          name: saveData.metadata.saveName,
          date: new Date(saveData.metadata.timestamp).toLocaleString(),
          turn: saveData.currentTurn,
          faction: saveData.player.faction.toUpperCase(),
          year: saveData.currentYear
        });
      } else {
        setSaveDetails(null);
        console.error('Error loading save details:', result.error);
      }
    } catch (error) {
      setSaveDetails(null);
      console.error('Error in loadSaveDetails:', error);
    }
  };
  
  // Handle load button click
  const handleLoad = async () => {
    if (!selectedSave) {
      setErrorMessage('Please select a save');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');
    dispatch(setLoading(true));
    
    try {
      const result = await saveGameService.loadGame(selectedSave);
      
      if (result.success && result.data) {
        // Load game state into Redux store
        dispatch(loadGameState(result.data));
        audioService.playSound('load_success');
        
        if (onLoadComplete) onLoadComplete(true);
        onClose();
      } else {
        setErrorMessage(`Failed to load game: ${result.error}`);
        dispatch(setError(result.error || 'Failed to load game'));
        audioService.playSound('error');
      }
    } catch (error) {
      const errorMsg = (error as Error).message;
      setErrorMessage(`An error occurred: ${errorMsg}`);
      dispatch(setError(errorMsg));
      audioService.playSound('error');
    } finally {
      setIsLoading(false);
      dispatch(setLoading(false));
    }
  };
  
  // Handle selecting a save
  const handleSelectSave = (fileName: string) => {
    setSelectedSave(fileName);
    loadSaveDetails(fileName);
  };
  
  // Handle delete save
  const handleDeleteSave = async (fileName: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the selection
    
    if (window.confirm('Are you sure you want to delete this save?')) {
      try {
        const result = await saveGameService.deleteSavedGame(fileName);
        
        if (result.success) {
          audioService.playSound('delete');
          
          // Refresh the list
          loadSavedGames();
          
          // Clear selected save if it was deleted
          if (selectedSave === fileName) {
            setSelectedSave(null);
            setSaveDetails(null);
          }
        } else {
          setErrorMessage(`Failed to delete save: ${result.error}`);
          audioService.playSound('error');
        }
      } catch (error) {
        setErrorMessage(`An error occurred: ${(error as Error).message}`);
        audioService.playSound('error');
      }
    }
  };
  
  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Load Game</h2>
          <button 
            className="text-gray-400 hover:text-white"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        
        <div className="flex gap-4">
          {/* Saved Games List */}
          <div className="w-1/2">
            <h3 className="text-lg font-semibold mb-2">Saved Games</h3>
            <div className="max-h-80 overflow-y-auto bg-gray-900 rounded border border-gray-700">
              {savedGames.length === 0 ? (
                <div className="p-3 text-gray-400">No saved games found</div>
              ) : (
                savedGames.map((save) => (
                  <div
                    key={save.fileName}
                    className={`
                      p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-800
                      ${selectedSave === save.fileName ? 'bg-blue-900' : ''}
                    `}
                    onClick={() => handleSelectSave(save.fileName)}
                  >
                    <div className="flex justify-between">
                      <div className="font-medium">{save.saveName}</div>
                      <button
                        className="text-red-400 hover:text-red-300"
                        onClick={(e) => handleDeleteSave(save.fileName, e)}
                        title="Delete save"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="text-sm text-gray-400">{formatDate(save.timestamp)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Save Details */}
          <div className="w-1/2">
            <h3 className="text-lg font-semibold mb-2">Save Details</h3>
            <div className="bg-gray-900 rounded border border-gray-700 p-4 h-80">
              {saveDetails ? (
                <div>
                  <div className="mb-4">
                    <h4 className="text-xl font-bold mb-1">{saveDetails.name}</h4>
                    <div className="text-gray-400">{saveDetails.date}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="font-semibold">Year:</span> {saveDetails.year}
                    </div>
                    <div>
                      <span className="font-semibold">Turn:</span> {saveDetails.turn}
                    </div>
                    <div>
                      <span className="font-semibold">Faction:</span> {saveDetails.faction}
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <img 
                      src={`/assets/images/${saveDetails.faction.toLowerCase()}_flag.png`} 
                      alt={`${saveDetails.faction} Flag`}
                      className="h-20 mx-auto opacity-60"
                      onError={(e) => {
                        // Fallback if image doesn't exist
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  {selectedSave ? 'Loading save details...' : 'Select a save to view details'}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {errorMessage && (
          <div className="mt-4 p-2 bg-red-900/50 text-red-200 rounded">
            {errorMessage}
          </div>
        )}
        
        <div className="flex justify-end mt-4 space-x-3">
          <Button
            onClick={onClose}
            variant="secondary"
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleLoad}
            variant="primary"
            disabled={isLoading || !selectedSave}
          >
            {isLoading ? 'Loading...' : 'Load Game'}
          </Button>
        </div>
      </div>
    </div>
  );
};
```