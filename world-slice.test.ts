import worldReducer, {
  updateCountry,
  adjustTensionLevel,
  adjustClimateStability,
  addCrisis,
  updateCrisis,
  removeCrisis,
  addHistoricalEvent,
  processWorldTurn,
  loadWorldData,
  WorldState, // Assuming WorldState is exported
  // HistoricalEvent, // Not directly used in tests unless for specific type checks
} from './world-slice'; // Adjust path if your slice is elsewhere
import { Country } from './src/shared/types/country'; // Adjust path
import { Crisis } from './src/shared/types/crisis'; // Adjust path

// Mock the async thunk's underlying API call if it were a real API
// For this example, loadWorldData uses a Promise and setTimeout, so direct mocking isn't strictly needed
// unless we want to control its resolution/rejection explicitly without waiting for setTimeout.

const getInitialState = (): WorldState => ({
  countries: {},
  tensionLevel: 0,
  climateStabilityIndex: 100,
  currentCrises: [],
  historicalEvents: [],
  loading: false,
  error: null,
});

// Helper to create a mock Country object
const createMockCountry = (id: string, name: string, alignment: 'western' | 'eastern' | 'neutral' = 'neutral'): Country => ({
  id,
  name,
  code: id.toUpperCase(),
  government: { type: 'democracy', stability: 80, alignment },
  economy: { gdp: 1000, growth: 2.5, development: 'medium' },
  military: { power: 50, spending: 5, nuclearStatus: 'none' },
  internal: { insurgencyLevel: 0, coupRisk: 0 },
  relations: { usa: 50, ussr: 50 }, // Default relations
  // Ensure all required fields from your Country type are present
});

// Helper to create a mock Crisis object
const createMockCrisis = (id: string, type: string = 'border_dispute', targetCountries: string[] = ['USA', 'USSR']): Crisis => ({
  id,
  type,
  targetCountries,
  isActive: true,
  turnInitiated: 1,
  escalationLevel: 1,
  description: `A crisis involving ${targetCountries.join(' and ')}.`,
  // Ensure all required fields from your Crisis type are present
});


describe('worldSlice', () => {
  let initialState: WorldState;

  beforeEach(() => {
    initialState = getInitialState();
  });

  test('should return the initial state', () => {
    expect(worldReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('Synchronous Reducers', () => {
    test('updateCountry should add or update a country', () => {
      const countryUSA = createMockCountry('USA', 'United States', 'western');
      let actual = worldReducer(initialState, updateCountry(countryUSA));
      expect(actual.countries['USA']).toEqual(countryUSA);

      const updatedCountryUSA = { ...countryUSA, economy: { ...countryUSA.economy, gdp: 1200 } };
      actual = worldReducer(actual, updateCountry(updatedCountryUSA));
      expect(actual.countries['USA'].economy.gdp).toEqual(1200);
    });

    test('adjustTensionLevel should update tensionLevel within 0-100 bounds', () => {
      let actual = worldReducer(initialState, adjustTensionLevel(10));
      expect(actual.tensionLevel).toBe(10);
      actual = worldReducer(actual, adjustTensionLevel(100)); // Try to go above 100
      expect(actual.tensionLevel).toBe(100);
      actual = worldReducer(actual, adjustTensionLevel(-200)); // Try to go below 0
      expect(actual.tensionLevel).toBe(0);
    });

    test('adjustClimateStability should update climateStabilityIndex within 0-100 bounds', () => {
      let actual = worldReducer(initialState, adjustClimateStability(-10));
      expect(actual.climateStabilityIndex).toBe(90);
      actual = worldReducer(actual, adjustClimateStability(30)); // Try to go above 100 (current 90+30=120)
      expect(actual.climateStabilityIndex).toBe(100);
      actual = worldReducer(actual, adjustClimateStability(-200)); // Try to go below 0
      expect(actual.climateStabilityIndex).toBe(0);
    });

    test('addCrisis should add a crisis to currentCrises', () => {
      const crisis1 = createMockCrisis('crisis1');
      const actual = worldReducer(initialState, addCrisis(crisis1));
      expect(actual.currentCrises).toHaveLength(1);
      expect(actual.currentCrises[0]).toEqual(crisis1);
    });

    test('updateCrisis should update an existing crisis', () => {
      const crisis1 = createMockCrisis('crisis1');
      const stateWithCrisis = { ...initialState, currentCrises: [crisis1] };
      const updatedCrisis1 = { ...crisis1, escalationLevel: 2, description: 'Escalated crisis' };
      
      const actual = worldReducer(stateWithCrisis, updateCrisis(updatedCrisis1));
      expect(actual.currentCrises[0].escalationLevel).toBe(2);
      expect(actual.currentCrises[0].description).toBe('Escalated crisis');
    });
    
    test('updateCrisis should not change state if crisis ID not found', () => {
      const crisis1 = createMockCrisis('crisis1');
      const stateWithCrisis = { ...initialState, currentCrises: [crisis1] };
      const nonExistentCrisisUpdate = createMockCrisis('crisis2', 'other_type', ['CAN']); // Different ID
      
      const actual = worldReducer(stateWithCrisis, updateCrisis(nonExistentCrisisUpdate));
      expect(actual.currentCrises).toEqual([crisis1]); // State should be unchanged
    });


    test('removeCrisis should remove a crisis by id', () => {
      const crisis1 = createMockCrisis('crisis1');
      const crisis2 = createMockCrisis('crisis2');
      const stateWithCrises = { ...initialState, currentCrises: [crisis1, crisis2] };
      
      const actual = worldReducer(stateWithCrises, removeCrisis('crisis1'));
      expect(actual.currentCrises).toHaveLength(1);
      expect(actual.currentCrises[0].id).toEqual('crisis2');
    });

    test('addHistoricalEvent should add an event to historicalEvents', () => {
      const event = { id: 'event1', type: 'treaty' as const, countries: ['USA', 'CAN'], description: 'Treaty signed', turn: 5 };
      const actual = worldReducer(initialState, addHistoricalEvent(event));
      expect(actual.historicalEvents).toHaveLength(1);
      expect(actual.historicalEvents[0]).toEqual(event);
    });
    
    describe('processWorldTurn', () => {
        let stateWithCountries: WorldState;
        beforeEach(() => {
            stateWithCountries = {
                ...initialState,
                countries: {
                    'USA': createMockCountry('USA', 'United States', 'western'),
                    'USSR': createMockCountry('USSR', 'Soviet Union', 'eastern'),
                },
                tensionLevel: 10,
                climateStabilityIndex: 90,
            };
        });

        test('should decay tension if no crises', () => {
            const actual = worldReducer(stateWithCountries, processWorldTurn());
            expect(actual.tensionLevel).toBe(9); // 10 - 1
        });
        
        test('should not decay tension if crises exist', () => {
            const stateWithCrisis = {...stateWithCountries, currentCrises: [createMockCrisis('c1')]};
            const actual = worldReducer(stateWithCrisis, processWorldTurn());
            expect(actual.tensionLevel).toBe(stateWithCrisis.tensionLevel); // No decay
        });

        test('should apply economic growth to countries', () => {
            const initialUSAGdp = stateWithCountries.countries['USA'].economy.gdp;
            const usaGrowth = stateWithCountries.countries['USA'].economy.growth; // e.g., 2.5
            
            const actual = worldReducer(stateWithCountries, processWorldTurn());
            const expectedUSAGdp = initialUSAGdp * (1 + usaGrowth / 100);
            
            expect(actual.countries['USA'].economy.gdp).toBeCloseTo(expectedUSAGdp);
        });
        
        // Note: Testing random climate change is tricky. We can test bounds or mock Math.random.
        // For now, we'll skip direct test of its randomness but ensure it stays within bounds.
        test('climateStabilityIndex should remain within 0-100 after fluctuation', () => {
            // Run multiple times to increase chance of hitting edge cases if Math.random was not mocked
            let tempState = stateWithCountries;
            for (let i = 0; i < 20; i++) {
                tempState = worldReducer(tempState, processWorldTurn());
                expect(tempState.climateStabilityIndex).toBeGreaterThanOrEqual(0);
                expect(tempState.climateStabilityIndex).toBeLessThanOrEqual(100);
            }
        });
    });
  });

  describe('Async Thunks: loadWorldData', () => {
    test('loadWorldData.pending sets loading to true', () => {
      const action = { type: loadWorldData.pending.type };
      const state = worldReducer(initialState, action);
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    test('loadWorldData.fulfilled sets loading to false and updates countries', () => {
      const mockPayload = { countries: { 'CAN': createMockCountry('CAN', 'Canada') } };
      const action = { type: loadWorldData.fulfilled.type, payload: mockPayload };
      const state = worldReducer(initialState, action);
      expect(state.loading).toBe(false);
      expect(state.countries).toEqual(mockPayload.countries);
    });

    test('loadWorldData.rejected sets loading to false and stores error message', () => {
      const errorPayload = 'Failed to load data';
      const action = { type: loadWorldData.rejected.type, payload: errorPayload };
      const state = worldReducer(initialState, action);
      expect(state.loading).toBe(false);
      expect(state.error).toEqual(errorPayload);
    });
  });
});
```
