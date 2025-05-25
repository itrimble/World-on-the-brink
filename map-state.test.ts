import * as THREE from 'three';
import {
  createInitialMapState,
  setMapMode,
  setCurrentColorData,
  setZoomLevel,
  setIsDragging,
  setDragStart,
  setTargetCenter,
  setCurrentCenter,
  getCountryBaseColor,
  clearColorCache, // Import for testing cache behavior
  MapState,
  MapMode,
} from './map-state'; // Adjust path if necessary
import { Country } from './src/shared/types/country'; // Adjust path if necessary

// Mock the clearColorCache function to spy on it
jest.mock('./map-state', () => {
  const originalModule = jest.requireActual('./map-state');
  return {
    ...originalModule,
    clearColorCache: jest.fn(originalModule.clearColorCache), // Spy on the original implementation
  };
});

describe('MapState', () => {
  let initialState: MapState;

  beforeEach(() => {
    initialState = createInitialMapState();
    // It's important to clear the mock's call history before each test for spied functions
    (clearColorCache as jest.Mock).mockClear(); 
    // Also clear the actual cache implementation if it's not reset by the mock itself.
    // This depends on how you've set up the mock. If clearColorCache above calls the original, this is good.
    // If the mock *replaces* clearColorCache, then you need to call the original clear directly here too.
    // For this setup, the spied function calls the original, so the cache should be cleared by setMapMode.
    // However, to be absolutely sure for getCountryBaseColor tests, we can also clear it manually.
    const actualClearColorCache = jest.requireActual('./map-state').clearColorCache;
    actualClearColorCache();
  });

  test('createInitialMapState should return correct initial state', () => {
    expect(initialState).toEqual({
      currentMapMode: 'political',
      currentColorData: {},
      zoomLevel: 1,
      isDragging: false,
      dragStart: new THREE.Vector2(),
      targetCenter: new THREE.Vector2(0, 0),
      currentCenter: new THREE.Vector2(0, 0),
    });
  });

  describe('State Modifier Functions', () => {
    test('setMapMode should update currentMapMode and clear color cache', () => {
      const newMode: MapMode = 'economy';
      const newState = setMapMode(initialState, newMode);
      expect(newState.currentMapMode).toBe(newMode);
      expect(newState).not.toBe(initialState); // Immutability check
      expect(clearColorCache).toHaveBeenCalledTimes(1);
    });

    test('setCurrentColorData should update currentColorData', () => {
      const colorData = { country1: 0xff0000 };
      const newState = setCurrentColorData(initialState, colorData);
      expect(newState.currentColorData).toEqual(colorData);
      expect(newState).not.toBe(initialState);
    });

    test('setZoomLevel should update zoomLevel and clamp values', () => {
      let newState = setZoomLevel(initialState, 2);
      expect(newState.zoomLevel).toBe(2);
      expect(newState).not.toBe(initialState);

      newState = setZoomLevel(initialState, 0.1); // Below min
      expect(newState.zoomLevel).toBe(0.5);

      newState = setZoomLevel(initialState, 10); // Above max
      expect(newState.zoomLevel).toBe(4);
    });

    test('setIsDragging should update isDragging', () => {
      const newState = setIsDragging(initialState, true);
      expect(newState.isDragging).toBe(true);
      expect(newState).not.toBe(initialState);
    });

    test('setDragStart should update dragStart', () => {
      const newPosition = new THREE.Vector2(10, 20);
      const newState = setDragStart(initialState, newPosition);
      expect(newState.dragStart).toEqual(newPosition);
      expect(newState).not.toBe(initialState);
    });

    test('setTargetCenter should update targetCenter', () => {
      const newPosition = new THREE.Vector2(100, 200);
      const newState = setTargetCenter(initialState, newPosition);
      expect(newState.targetCenter).toEqual(newPosition);
      expect(newState).not.toBe(initialState);
    });

    test('setCurrentCenter should update currentCenter', () => {
      const newPosition = new THREE.Vector2(50, 150);
      const newState = setCurrentCenter(initialState, newPosition);
      expect(newState.currentCenter).toEqual(newPosition);
      expect(newState).not.toBe(initialState);
    });
  });

  describe('getCountryBaseColor', () => {
    // Mock country data - ensure the Country type matches what's expected by getCountryBaseColor
    const mockCountryWestern: Country = { 
      id: 'USA', name: 'USA', government: { type: 'democracy', alignment: 'western' }, 
      relations: { usa: 100, ussr: 0 }, internal: { insurgencyLevel: 5, coupRisk: 5 }, 
      economy: { development: 'high', gdp: 20000 } 
      // Add other required fields as per your Country type definition
    } as Country; // Cast if some optional fields are missing but not relevant for test
    const mockCountryEastern: Country = { 
      id: 'USSR', name: 'USSR', government: { type: 'communism', alignment: 'eastern' },
      relations: { usa: 0, ussr: 100 }, internal: { insurgencyLevel: 5, coupRisk: 5 },
      economy: { development: 'medium', gdp: 10000 }
    } as Country;
    const mockCountryNeutral: Country = {
      id: 'NEU', name: 'Neutralia', government: { alignment: 'neutral' },
      relations: { usa: 50, ussr: 50 }, internal: { insurgencyLevel: 20, coupRisk: 20 },
      economy: { development: 'low', gdp: 1000 }
    } as Country;


    test('should return correct color for political mode', () => {
      expect(getCountryBaseColor(mockCountryWestern, 'political')).toBe(0x3b82f6); // Western blue
      expect(getCountryBaseColor(mockCountryEastern, 'political')).toBe(0xef4444); // Eastern red
      expect(getCountryBaseColor(mockCountryNeutral, 'political')).toBe(0x10b981); // Neutral green
    });

    test('should return correct color for influence mode', () => {
      expect(getCountryBaseColor(mockCountryWestern, 'influence')).toBe(0x3b82f6); // USA influence
      expect(getCountryBaseColor(mockCountryEastern, 'influence')).toBe(0xef4444); // USSR influence
      // A country with balanced relations for 'contested'
      const contestedCountry: Country = { ...mockCountryNeutral, id: 'CON', relations: { usa: 50, ussr: 40 } } as Country;
      expect(getCountryBaseColor(contestedCountry, 'influence')).toBe(0xd97706); // Contested orange
    });
    
    test('should return correct color for insurgency mode', () => {
        expect(getCountryBaseColor({ ...mockCountryWestern, internal: { ...mockCountryWestern.internal, insurgencyLevel: 5 } } as Country, 'insurgency')).toBe(0x10b981); // Peaceful
        expect(getCountryBaseColor({ ...mockCountryWestern, internal: { ...mockCountryWestern.internal, insurgencyLevel: 25 } } as Country, 'insurgency')).toBe(0xf59e0b); // Unrest
        expect(getCountryBaseColor({ ...mockCountryWestern, internal: { ...mockCountryWestern.internal, insurgencyLevel: 55 } } as Country, 'insurgency')).toBe(0xd97706); // Guerilla
        expect(getCountryBaseColor({ ...mockCountryWestern, internal: { ...mockCountryWestern.internal, insurgencyLevel: 75 } } as Country, 'insurgency')).toBe(0xef4444); // Civil War
    });

    test('should return correct color for coup mode', () => {
        expect(getCountryBaseColor({ ...mockCountryWestern, internal: { ...mockCountryWestern.internal, coupRisk: 5 } } as Country, 'coup')).toBe(0x10b981); // Stable
        expect(getCountryBaseColor({ ...mockCountryWestern, internal: { ...mockCountryWestern.internal, coupRisk: 25 } } as Country, 'coup')).toBe(0xf59e0b); // Some Risk
        expect(getCountryBaseColor({ ...mockCountryWestern, internal: { ...mockCountryWestern.internal, coupRisk: 55 } } as Country, 'coup')).toBe(0xd97706); // High Risk
        expect(getCountryBaseColor({ ...mockCountryWestern, internal: { ...mockCountryWestern.internal, coupRisk: 75 } } as Country, 'coup')).toBe(0xef4444); // Imminent Coup
    });
    
    test('should return correct color for economy mode', () => {
        expect(getCountryBaseColor({ ...mockCountryWestern, economy: { ...mockCountryWestern.economy, development: 'high' } } as Country, 'economy')).toBe(0x10b981); // High dev
        expect(getCountryBaseColor({ ...mockCountryWestern, economy: { ...mockCountryWestern.economy, development: 'medium' } } as Country, 'economy')).toBe(0xf59e0b); // Medium dev
        expect(getCountryBaseColor({ ...mockCountryWestern, economy: { ...mockCountryWestern.economy, development: 'low' } } as Country, 'economy')).toBe(0xef4444); // Low dev
    });

    test('should use cache for repeated calls with same country and mode', () => {
      // First call - should calculate and cache
      getCountryBaseColor(mockCountryWestern, 'political');
      
      // Mock the inner calculation function to see if it's called again
      // This is tricky because calculateCountryBaseColor is not exported and is internal.
      // An alternative way: check performance or spy on Map.prototype.set if possible, but that's also complex.
      // For simplicity, we'll rely on the logic that if the value is returned, and it's correct,
      // and then clearColorCache is called and we get a different value (or same if logic dictates), it implies caching.
      // This test primarily verifies that the caching logic doesn't break the color output.
      
      const color1 = getCountryBaseColor(mockCountryWestern, 'political'); // Should be from cache
      
      // To properly test if calculateCountryBaseColor was *not* called the second time,
      // we would need to spy on it. Since it's not exported, this is harder.
      // We assume the caching mechanism works if colors are consistent and change after cache clear.
      expect(color1).toBe(0x3b82f6);
    });

    test('should recalculate color after cache is cleared', () => {
      const colorBeforeClear = getCountryBaseColor(mockCountryEastern, 'economy'); // Low dev for Eastern if not specified
      expect(colorBeforeClear).toBe(0xf59e0b); // Medium dev based on mock

      // Manually call the actual clearColorCache, not the mock/spy itself, to ensure cache is empty
      const actualClearColorCache = jest.requireActual('./map-state').clearColorCache;
      actualClearColorCache();
      
      // This call should re-calculate and re-populate the cache.
      const colorAfterClear = getCountryBaseColor(mockCountryEastern, 'economy');
      expect(colorAfterClear).toBe(0xf59e0b); // Still same color, but calculation was re-run.
      
      // If we could spy on calculateCountryBaseColor, we'd check it was called twice.
    });
    
    test('setMapMode should clear cache, leading to re-calculation', () => {
        getCountryBaseColor(mockCountryWestern, 'political'); // Initial call, populates cache
        expect(clearColorCache).toHaveBeenCalledTimes(0); // Cache not cleared yet by setMapMode

        // Change map mode, which should trigger clearColorCache
        const newState = setMapMode(initialState, 'economy');
        expect(clearColorCache).toHaveBeenCalledTimes(1);

        // Now, getCountryBaseColor should re-calculate for the new mode
        // (and also for the old mode if it were called again, due to full cache clear)
        getCountryBaseColor(mockCountryWestern, 'economy'); // This will be a fresh calculation
        
        // If we could spy on calculateCountryBaseColor, we would verify it's called after mode change.
        // For now, this test ensures setMapMode does call clearColorCache.
    });

     test('should handle countries without an id by not caching', () => {
      const countryWithoutId = { name: 'NoIDLand', government: { alignment: 'neutral' } } as unknown as Country;
      // We can't directly check if it wasn't cached without modifying the source or complex spies.
      // But we can check it returns a value.
      // If `calculateCountryBaseColor` was mocked/spied, we'd check it's always called for this object.
      const color1 = getCountryBaseColor(countryWithoutId, 'political');
      const color2 = getCountryBaseColor(countryWithoutId, 'political');
      expect(color1).toBe(0x10b981); // Neutral green
      expect(color2).toBe(0x10b981);
      // This doesn't prove it wasn't cached, but shows consistent results.
      // The actual non-caching path is an internal detail of getCountryBaseColor.
    });

  });
});
```
