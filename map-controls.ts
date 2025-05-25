```typescript
// src/renderer/components/map/MapControls.tsx
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setMapMode } from '../../features/ui/uiSlice';
import { Button } from '../common/Button';

export const MapControls: React.FC = () => {
  const dispatch = useDispatch();
  const currentMapMode = useSelector((state: RootState) => state.ui.mapMode);
  const [showControls, setShowControls] = useState(true);
  
  const mapModes = [
    { id: 'political', name: 'Political', icon: '🌎' },
    { id: 'influence', name: 'Influence', icon: '🔵' },
    { id: 'insurgency', name: 'Insurgency', icon: '⚔️' },
    { id: 'coup', name: 'Stability', icon: '🏛️' },
    { id: 'economy', name: 'Economy', icon: '💰' }
  ] as const;
  
  return (
    <div className="absolute left-4 bottom-20 z-10">
      {showControls ? (
        <div className="bg-gray-800/80 backdrop-blur-sm p-2 rounded-lg shadow-lg">
          <div className="flex flex-col space-y-2">
            {mapModes.map(mode => (
              <button
                key={mode.id}
                className={`
                  flex items-center px-3 py-2 rounded text-sm
                  ${currentMapMode === mode.id ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}
                `}
                onClick={() => dispatch(setMapMode(mode.id))}
              >
                <span className="mr-2">{mode.icon}</span>
                <span>{mode.name}</span>
              </button>
            ))}
            
            <button
              className="flex items-center justify-center px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm"
              onClick={() => setShowControls(false)}
            >
              <span>Hide Controls</span>
            </button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setShowControls(true)}
          variant="secondary"
        >
          Show Map Controls
        </Button>
      )}
    </div>
  );
};
```