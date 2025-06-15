import React, { useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MapRenderer } from '../../features/map/map-renderer';
import { Country } from '../../types';
import { selectCountry as setSelectedCountryAction } from '../../store/slices/uiSlice'; // Corrected path
import type { MapMode } from '../../store/slices/uiSlice'; // Corrected path
import { AppDispatch, RootState } from '../../store'; // Corrected path

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
  const mapRendererRef = useRef<any | null>(null);
  const dispatch: AppDispatch = useDispatch();

  // Select the current map mode from the Redux store
  const currentMapMode = useSelector((state: RootState) => state.ui.mapMode);

  // Effect for initializing and cleaning up the MapRenderer instance
  useEffect(() => {
    let rendererInstance: MapRenderer | null = null;
    console.log('MapView useEffect triggered, container ref:', mapContainerRef.current);
    
    if (mapContainerRef.current && !mapRendererRef.current) {
      console.log('Attempting to initialize MapRenderer...');
      try {
        rendererInstance = new MapRenderer(
          mapContainerRef.current,
          (countryId: string | null) => {
            console.log('Country selected:', countryId);
            if (countryId) {
              dispatch(setSelectedCountryAction(countryId));
            }
          }
        );
        mapRendererRef.current = rendererInstance;
        console.log('MapRenderer initialized successfully');
      } catch (error) {
        console.error('Failed to initialize MapRenderer:', error);
        console.error('Error details:', error);
      }
    } else {
      console.log('MapRenderer not initialized - container:', !!mapContainerRef.current, 'existing renderer:', !!mapRendererRef.current);
    }

    // Cleanup function to dispose of the MapRenderer instance when the component unmounts.
    return () => {
      mapRendererRef.current?.dispose();
      mapRendererRef.current = null;
    };
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount

  // Effect for handling map mode changes
  useEffect(() => {
    if (mapRendererRef.current && currentMapMode) {
      mapRendererRef.current.setMapMode(currentMapMode);
    }
  }, [currentMapMode]);

  return (
    <div ref={mapContainerRef} style={{ 
      width: '100%', 
      height: '100%', 
      backgroundColor: '#001122',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      position: 'relative'
    }}>
      {/* MapRenderer will attach its canvas here */}
      {!mapRendererRef.current && (
        <div style={{ 
          position: 'absolute',
          zIndex: 1,
          textAlign: 'center',
          background: 'rgba(0,0,0,0.7)',
          padding: '20px',
          borderRadius: '8px'
        }}>
          <p>Loading World Map...</p>
          <p style={{ fontSize: '0.8em', opacity: 0.7 }}>Three.js Map Renderer</p>
        </div>
      )}
    </div>
  );
};

export default MapView;

