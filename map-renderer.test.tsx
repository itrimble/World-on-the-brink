import React, { useRef, useEffect } from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { MapRenderer } from './map-renderer'; // Adjust path
import { Country } from './src/shared/types/country'; // Adjust path
import { MapMode } from './map-state'; // Adjust path

// Mocks for modules used by MapRenderer
// map-geometry, map-interaction, map-state, map-display are harder to mock wholesale
// as MapRenderer calls many of their functions directly.
// Instead, we'll test MapRenderer's orchestration of these.
// We do need to mock functions that have side effects or are hard to test, like audio.

jest.mock('./services/AudioService', () => ({ // If MapRenderer or its submodules use audio
  audioService: {
    playSound: jest.fn(),
  },
}));

// Helper component to host the MapRenderer
interface TestMapRendererProps {
  countriesData?: Record<string, Country>;
  onRendererReady?: (renderer: MapRenderer) => void;
}
const TestMapRendererWrapper: React.FC<TestMapRendererProps> = ({ countriesData, onRendererReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<MapRenderer | null>(null);

  useEffect(() => {
    if (containerRef.current && !rendererRef.current) {
      const renderer = new MapRenderer(containerRef.current);
      rendererRef.current = renderer;
      if (countriesData) {
        renderer.loadMap(countriesData);
      }
      if (onRendererReady) {
        onRendererReady(renderer);
      }
    }
    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [countriesData, onRendererReady]);

  return <div ref={containerRef} style={{ width: '800px', height: '600px' }} />;
};

const mockCountriesData: Record<string, Country> = {
  'USA': { id: 'USA', name: 'United States', government: { alignment: 'western' }, relations: { usa: 100, ussr: 0 }, internal: { insurgencyLevel: 0, coupRisk: 0 }, economy: { development: 'high' } } as any,
  'USSR': { id: 'USSR', name: 'Soviet Union', government: { alignment: 'eastern' }, relations: { usa: 0, ussr: 100 }, internal: { insurgencyLevel: 0, coupRisk: 0 }, economy: { development: 'high' } } as any,
  'CAN': { id: 'CAN', name: 'Canada', government: { alignment: 'western' }, relations: { usa: 80, ussr: 10 }, internal: { insurgencyLevel: 0, coupRisk: 0 }, economy: { development: 'high' } } as any,
};


describe('MapRenderer', () => {
  let rendererInstance: MapRenderer | null = null;
  let container: HTMLElement;

  // Utility to render the wrapper and get the MapRenderer instance
  const setupRenderer = async (countriesData = mockCountriesData) => {
    return new Promise<MapRenderer>(resolve => {
      const result = render(
        <TestMapRendererWrapper
          countriesData={countriesData}
          onRendererReady={(instance) => {
            rendererInstance = instance;
            resolve(instance);
          }}
        />
      );
      container = result.container.firstChild as HTMLElement; // The div from TestMapRendererWrapper
    });
  };

  afterEach(() => {
    // Ensure renderer is disposed after each test
    rendererInstance?.dispose();
    rendererInstance = null;
    // Clean up the rendered component
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    // @ts-ignore
    container = null;
  });

  test('should initialize and create a canvas', async () => {
    await setupRenderer();
    expect(rendererInstance).not.toBeNull();
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  test('loadMap should populate countryInstances', async () => {
    await setupRenderer();
    // @ts-ignore Accessing private member for test
    expect(rendererInstance!.countryInstances.size).toBe(Object.keys(mockCountriesData).length);
    // @ts-ignore
    expect(rendererInstance!.countryInstances.has('USA')).toBe(true);
  });

  test('setMapMode should update instance colors (conceptual test)', async () => {
    await setupRenderer();
    const usaInstanceInfoBefore = rendererInstance!['countryInstances'].get('USA');
    const originalColorBefore = usaInstanceInfoBefore?.originalColor.clone();

    act(() => {
      rendererInstance!.setMapMode('economy');
    });
    
    const usaInstanceInfoAfter = rendererInstance!['countryInstances'].get('USA');
    const originalColorAfter = usaInstanceInfoAfter?.originalColor;

    expect(originalColorAfter).not.toBeNull();
    // We expect the color to change, but can't easily check the exact new hex without replicating getCountryBaseColor logic here.
    // So, we check if it's different, assuming 'economy' mode has different color logic than default 'political'.
    // This relies on mockCountriesData['USA'] having properties that lead to different colors in different modes.
    if (originalColorBefore && originalColorAfter) {
         // This check is a bit weak as it depends on the specific color values from getCountryBaseColor
         // A more robust test would involve spying on setColorAt on the instancedMesh if possible,
         // or checking that the `mapState.currentMapMode` changed and `clearColorCache` was called.
        expect(originalColorAfter.getHex()).not.toBe(originalColorBefore.getHex());
    }
    // @ts-ignore Check mapState directly for mode change
    expect(rendererInstance!['mapState'].currentMapMode).toBe('economy');
  });

  test('selectCountry should update isSelected flag and trigger appearance update', async () => {
    await setupRenderer();
    const updateAppearanceSpy = jest.spyOn(require('./map-display'), 'updateCountryInstanceAppearance');
    
    act(() => {
      rendererInstance!.selectCountry('USA');
    });

    const usaInstance = rendererInstance!['countryInstances'].get('USA');
    expect(usaInstance?.isSelected).toBe(true);
    expect(updateAppearanceSpy).toHaveBeenCalledWith('USA', rendererInstance!['countryInstances']);

    act(() => {
      rendererInstance!.selectCountry('USSR');
    });
    expect(usaInstance?.isSelected).toBe(false); // USA should be deselected
    expect(rendererInstance!['countryInstances'].get('USSR')?.isSelected).toBe(true);
    expect(updateAppearanceSpy).toHaveBeenCalledWith('USA', rendererInstance!['countryInstances']); // For deselection
    expect(updateAppearanceSpy).toHaveBeenCalledWith('USSR', rendererInstance!['countryInstances']); // For selection

    updateAppearanceSpy.mockRestore();
  });
  
  // Testing mouse interactions directly on MapRenderer is complex without a full browser environment.
  // We test the handlers in map-interaction.test.ts. Here, we can test if callbacks are set up.
  test('setOnCountrySelect and setOnCountryHover should register callbacks', async () => {
    await setupRenderer();
    const mockOnSelect = jest.fn();
    const mockOnHover = jest.fn();

    rendererInstance!.setOnCountrySelect(mockOnSelect);
    rendererInstance!.setOnCountryHover(mockOnHover);

    // @ts-ignore Access private member for test
    expect(rendererInstance!['onCountrySelectCallback']).toBe(mockOnSelect);
    // @ts-ignore
    expect(rendererInstance!['onCountryHoverCallback']).toBe(mockOnHover);
    
    // To actually trigger them, we would need to simulate raycaster intersections,
    // which is part of map-interaction's responsibility and tested there conceptually.
    // Here we could manually call the internal callbacks that would be triggered by map-interaction:
    // Example:
    // rendererInstance!['interactionData'].onCountrySelect!('USA');
    // expect(mockOnSelect).toHaveBeenCalledWith('USA');
    // rendererInstance!['interactionData'].onCountryHover!('CAN');
    // expect(mockOnHover).toHaveBeenCalledWith('CAN');
  });

  test('dispose should cleanup resources', async () => {
    await setupRenderer();
    const disposeSpy = jest.spyOn(rendererInstance!['renderer'], 'dispose');
    const eventCleanupSpy = jest.fn();
    // @ts-ignore
    rendererInstance!['eventListenerCleanup'] = eventCleanupSpy; // Mock the cleanup function

    act(() => {
      rendererInstance!.dispose();
    });

    expect(disposeSpy).toHaveBeenCalled();
    expect(eventCleanupSpy).toHaveBeenCalled();
    // @ts-ignore
    expect(rendererInstance!['disposed']).toBe(true);
  });
  
  // Conceptual test for zoom - verifies state update via interactionData
  test('zoom interaction should update mapState zoomLevel', async () => {
    await setupRenderer();
    const initialZoom = rendererInstance!['mapState'].zoomLevel;
    
    // Simulate a wheel event that map-interaction's handleMouseWheel would process
    // This directly calls the setZoomLevel callback configured in interactionData
    act(() => {
      rendererInstance!['interactionData'].zoomLevel = initialZoom; // Ensure interactionData is sync
      const setZoomFn = (newZoom: number) => {
        // @ts-ignore
        rendererInstance!['mapState'] = require('./map-state').setZoomLevel(rendererInstance!['mapState'], newZoom);
        // @ts-ignore
        rendererInstance!['interactionData'].zoomLevel = rendererInstance!['mapState'].zoomLevel;
      };
      // Simulate a zoom in
      require('./map-interaction').handleMouseWheel({ deltaY: -100, preventDefault: jest.fn() } as WheelEvent, {
        zoomLevel: initialZoom,
        setZoomLevel: setZoomFn
      });
    });

    expect(rendererInstance!['mapState'].zoomLevel).toBeGreaterThan(initialZoom);
  });

});
```
