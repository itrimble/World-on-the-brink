import React, { useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MapRenderer } from '../../features/map/map-renderer'; // Corrected path
import { Country } from '../../types';
import { selectCountry as setSelectedCountryAction } from '../../store/slices/uiSlice'; // Corrected path
import type { MapMode } from '../../store/slices/uiSlice'; // Corrected path
import { AppDispatch, RootState } from '../../../store'; // Corrected path

// Placeholder mock data for countries - replace with actual data loading later
// Ensure this mock data aligns with the placeholder Country type definition.
const mockCountriesData: Record<string, Country> = {
  'USA': { 
    id: 'USA', name: 'United States', 
    government: { alignment: 'western' }, 
    relations: { usa: 100, ussr: 0 }, 
    internal: { insurgencyLevel: 0, coupRisk: 0 }, 
    economy: { development: 'high' } 
  } as Country, // Cast to Country to satisfy the type, even if simplified
  'USSR': { 
    id: 'USSR', name: 'Soviet Union', 
    government: { alignment: 'eastern' }, 
    relations: { usa: 0, ussr: 100 }, 
    internal: { insurgencyLevel: 0, coupRisk: 0 }, 
    economy: { development: 'high' } 
  } as Country,
};


const MapView: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRendererRef = useRef<MapRenderer | null>(null);
  const dispatch: AppDispatch = useDispatch();

  // Select the current map mode from the Redux store
  const currentMapMode = useSelector((state: RootState) => state.ui.mapMode);

  // Effect for initializing and cleaning up the MapRenderer instance
  useEffect(() => {
    let rendererInstance: MapRenderer | null = null;
    if (mapContainerRef.current && !mapRendererRef.current) {
      // The MapRenderer constructor now expects the onCountrySelect callback.
      rendererInstance = new MapRenderer(mapContainerRef.current, (countryId: string | null) => {
        dispatch(setSelectedCountryAction(countryId));
      });
      mapRendererRef.current = rendererInstance;

      // loadMap no longer takes mockCountriesData directly, it uses getCountryProperties internally
      // rendererInstance.loadMap(); // This will be called internally after initializeMapData resolves

      // The call to setOnCountrySelect is removed as it's now passed in constructor.
    }

    // Cleanup function to dispose of the MapRenderer instance when the component unmounts.
    return () => {
      mapRendererRef.current?.dispose();
      mapRendererRef.current = null;
    };
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount

  return (
    <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}>
      {/* MapRenderer will attach its canvas here */}
      {/* Fallback text if canvas doesn't render */}
      {/* <p>Map View Area - Canvas should render here</p>  */}
    </div>
  );
};

export default MapView;
```
