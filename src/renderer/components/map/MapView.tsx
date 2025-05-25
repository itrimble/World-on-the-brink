import React, { useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MapRenderer } from '../../../../map-renderer'; // Path to map-renderer.ts in root
import { Country } from '../../types'; // Path to placeholder Country type in src/renderer/types.ts
import { selectCountry as setSelectedCountryAction } from '../../../../uislice-component'; // Path to uiSlice actions
import type { MapMode } from '../../../../uislice-component'; // Import MapMode type
import { AppDispatch, RootState } from '../../store'; // Path to store for types

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
    let renderer: MapRenderer | null = null; // Variable to hold the instance within the effect scope
    if (mapContainerRef.current && !mapRendererRef.current) {
      renderer = new MapRenderer(mapContainerRef.current);
      mapRendererRef.current = renderer; // Store instance in ref for access in other effects/callbacks
      
      // Set up the onCountrySelect callback for MapRenderer
      renderer.setOnCountrySelect((countryId: string | null) => {
        dispatch(setSelectedCountryAction(countryId)); 
      });

      // Load initial map data
      // In a real application, this data would likely come from a Redux state or be fetched.
      renderer.loadMap(mockCountriesData); 
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
