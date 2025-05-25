```typescript
// src/renderer/components/common/SaveGameModal.tsx
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { saveGameService } from '../../services/SaveGameService';
import { audioService } from '../../services/AudioService';
import { Button } from './Button';

interface SaveGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveComplete?: (success: boolean) => void;
}

export const SaveGameModal: React.FC<SaveGameModalProps> = ({
  isOpen,
  onClose,
  onSaveComplete
}) => {
  const [saveName, setSaveName] = useState('');
  const [existingSaves, setExistingSaves] = useState<Array<{
    fileName: string;
    saveName: string;
    timestamp: number;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveMode, setSaveMode] = useState<'new' | 'overwrite'>('new');
  const [selectedSaveToOverwrite, setSelectedSaveToOverwrite] = useState<string | null>(null);
  
  const currentYear = useSelector((state: RootState) => state.game.currentYear);
  const playerFaction = useSelector((state: RootState) => state.player.faction);
  
  // Load existing saves when modal opens
  useEffect(() => {
    if (isOpen) {
      loadExistingSaves();
      
      // Generate default save name
      const defaultSaveName = `${playerFaction.toUpperCase()}_${currentYear}`;
      setSaveName(defaultSaveName);
    }
  }, [isOpen, currentYear, playerFaction]);
  
  // Load existing saved games
  const loadExistingSaves = async () => {
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const result = await saveGameService.listSavedGames();
      
      if (result.success && result.savedGames) {
        // Sort by most recent first
        const sortedSaves = result.savedGames.sort((a, b) => b.timestamp - a.timestamp);
        setExistingSaves(sortedSaves);
      } else {
        setErrorMessage('Failed to load existing saves');
        console.error('Error loading saved games:', result.error);
      }
    } catch (error) {
      setErrorMessage('An error occurred while loading saves');
      console.error('Error in loadExistingSaves:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle save button click
  const handleSave = async () => {
    if (!saveName.trim()) {
      setErrorMessage('Please enter a save name');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      // If overwriting, use the selected file name
      const saveFileName = saveMode === 'overwrite' && selectedSaveToOverwrite
        ? selectedSaveToOverwrite
        : saveName;
      
      const result = await saveGameService.saveGame(saveFileName);
      
      if (result.success) {
        audioService.playSound('save_success');
        if (onSaveComplete) onSaveComplete(true);
        onClose();
      } else {
        setErrorMessage(`Failed to save game: ${result.error}`);
        audioService.playSound('error');
      }
    } catch (error) {
      setErrorMessage(`An error occurred: ${(error as Error).message}`);
      audioService.playSound('error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle clicking on an existing save
  const handleSelectExistingSave = (fileName: string, displayName: string) => {
    setSelectedSaveToOverwrite(fileName);
    setSaveName(displayName);
    setSaveMode('overwrite');
  };
  
  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Save Game</h2>
          <button 
            className="text-gray-400 hover:text-white"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        
        <div className="mb-4">
          <div className="flex space-x-2 mb-2">
            <button
              className={`px-4 py-2 rounded ${saveMode === 'new' ? 'bg-blue-600' : 'bg-gray-700'}`}
              onClick={() => setSaveMode('new')}
            >
              New Save
            </button>
            <button
              className={`px-4 py-2 rounded ${saveMode === 'overwrite' ? 'bg-blue-600' : 'bg-gray-700'}`}
              onClick={() => setSaveMode('overwrite')}
              disabled={existingSaves.length === 0}
            >
              Overwrite
            </button>
          </div>
          
          {saveMode === 'new' && (
            <div>
              <label className="block text-sm font-medium mb-1">Save Name</label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter save name"
                autoFocus
              />
            </div>
          )}
          
          {saveMode === 'overwrite' && (
            <div>
              <label className="block text-sm font-medium mb-1">Select Save to Overwrite</label>
              <div className="max-h-60 overflow-y-auto bg-gray-900 rounded border border-gray-700">
                {existingSaves.length === 0 ? (
                  <div className="p-3 text-gray-400">No saved games found</div>
                ) : (
                  existingSaves.map((save) => (
                    <div
                      key={save.fileName}
                      className={`
                        p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-800
                        ${selectedSaveToOverwrite === save.fileName ? 'bg-blue-900' : ''}
                      `}
                      onClick={() => handleSelectExistingSave(save.fileName, save.saveName)}
                    >
                      <div className="font-medium">{save.saveName}</div>
                      <div className="text-sm text-gray-400">{formatDate(save.timestamp)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        {errorMessage && (
          <div className="mb-4 p-2 bg-red-900/50 text-red-200 rounded">
            {errorMessage}
          </div>
        )}
        
        <div className="flex justify-end space-x-3">
          <Button
            onClick={onClose}
            variant="secondary"
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleSave}
            variant="primary"
            disabled={isLoading || (saveMode === 'overwrite' && !selectedSaveToOverwrite)}
          >
            {isLoading ? 'Saving...' : 'Save Game'}
          </Button>
        </div>
      </div>
    </div>
  );
};
```