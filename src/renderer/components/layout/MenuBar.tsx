import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store'; // Adjusted path
import { setMapMode } from '../../../uislice-component'; // Adjusted path to uislice-component.ts in root
import type { MapMode } from '../../../uislice-component'; // Import type from the same source
import Button from '../common/Button'; // Adjusted path

/**
 * `MenuBar` component provides top-level navigation and controls,
 * including buttons to switch the map's display mode.
 */
const MenuBar: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const currentMapMode = useSelector((state: RootState) => state.ui.mapMode);

  // Available global map modes as defined in PRD section 7.2 (or their equivalents)
  // Note: 'diplomatic' and 'military' might require further context (e.g., selected country)
  // and are omitted for this initial global map mode switcher.
  const availableMapModes: { key: MapMode; label: string }[] = [
    { key: 'political', label: 'Political' },
    { key: 'influence', label: 'Influence' }, // 'Spheres of Influence' in PRD
    { key: 'insurgency', label: 'Insurgency' }, // 'Insurgency Levels' in PRD
    { key: 'coup', label: 'Stability' },      // 'Coup Likelihood' in PRD, maps to 'coup' in MapRenderer
    { key: 'economy', label: 'Economy' },      // 'Economic Status' in PRD
  ];

  /**
   * Handles the click event for a map mode button.
   * Dispatches the `setMapMode` action with the selected mode's key.
   * @param modeKey - The key of the map mode to switch to.
   */
  const handleModeChange = (modeKey: MapMode) => {
    dispatch(setMapMode(modeKey));
  };

  return (
    <div className="menu-bar flex items-center space-x-2 p-2 bg-gray-700 shadow-md">
      <span className="text-sm font-semibold text-gray-300 mr-2">Map Modes:</span>
      {availableMapModes.map((mode) => (
        <Button
          key={mode.key}
          variant={currentMapMode === mode.key ? 'primary' : 'secondary'}
          onClick={() => handleModeChange(mode.key)}
          size="sm"
          className={`transition-all duration-150 ease-in-out ${
            currentMapMode === mode.key 
              ? 'ring-2 ring-offset-2 ring-offset-gray-700 ring-blue-400' 
              : 'hover:bg-gray-600'
          }`}
        >
          {mode.label}
        </Button>
      ))}
      {/* Other menu items like "Game", "Options", "Save", "Load" can be added here later */}
    </div>
  );
};

export default MenuBar;
```
