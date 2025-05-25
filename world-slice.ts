```typescript
// src/renderer/features/game/worldSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Country } from '../../shared/types/country';
import { Crisis } from '../../shared/types/crisis';

interface HistoricalEvent {
  id: string;
  type: 'revolution' | 'coup' | 'finlandization' | 'treaty' | 'war';
  countries: string[];
  description: string;
  turn: number;
}

interface WorldState {
  countries: Record<string, Country>;
  tensionLevel: number;
  climateStabilityIndex: number;
  currentCrises: Crisis[];
  historicalEvents: HistoricalEvent[];
  loading: boolean;
  error: string | null;
}

const initialState: WorldState = {
  countries: {},
  tensionLevel: 0,
  climateStabilityIndex: 100,
  currentCrises: [],
  historicalEvents: [],
  loading: false,
  error: null,
};

// Load world data async thunk
export const loadWorldData = createAsyncThunk(
  'world/loadData',
  async (_, { rejectWithValue }) => {
    try {
      // In a real implementation, this would load from a file or API
      // For this example, we'll just return a placeholder
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
      
      return {
        countries: {
          // Sample country data
          'usa': {
            id: 'usa',
            name: 'United States',
            code: 'US',
            government: {
              type: 'democracy',
              stability: 90,
              alignment: 'western',
            },
            economy: {
              gdp: 5800,
              growth: 2.8,
              development: 'high',
            },
            military: {
              power: 100,
              spending: 40,
              nuclearStatus: 'arsenal',
            },
            internal: {
              insurgencyLevel: 0,
              coupRisk: 0,
            },
            relations: {
              usa: 100,
              ussr: 20,
            }
          },
          'ussr': {
            id: 'ussr',
            name: 'Soviet Union',
            code: 'SU',
            government: {
              type: 'communist',
              stability: 85,
              alignment: 'eastern',
            },
            economy: {
              gdp: 3500,
              growth: 1.5,
              development: 'high',
            },
            military: {
              power: 95,
              spending: 50,
              nuclearStatus: 'arsenal',
            },
            internal: {
              insurgencyLevel: 5,
              coupRisk: 10,
            },
            relations: {
              usa: 20,
              ussr: 100,
            }
          },
          // Add more countries here...
        }
      };
    } catch (error) {
      return rejectWithValue('Failed to load world data: ' + (error as Error).message);
    }
  }
);

const worldSlice = createSlice({
  name: 'world',
  initialState,
  reducers: {
    // Update a country's data
    updateCountry: (state, action: PayloadAction<Country>) => {
      state.countries[action.payload.id] = action.payload;
    },
    
    // Adjust global tension level
    adjustTensionLevel: (state, action: PayloadAction<number>) => {
      state.tensionLevel = Math.max(0, Math.min(100, state.tensionLevel + action.payload));
    },
    
    // Adjust climate stability
    adjustClimateStability: (state, action: PayloadAction<number>) => {
      state.climateStabilityIndex = Math.max(0, Math.min(100, state.climateStabilityIndex + action.payload));
    },
    
    // Add a new crisis
    addCrisis: (state, action: PayloadAction<Crisis>) => {
      state.currentCrises.push(action.payload);
    },
    
    // Update a crisis
    updateCrisis: (state, action: PayloadAction<Crisis>) => {
      const index = state.currentCrises.findIndex(crisis => crisis.id === action.payload.id);
      if (index !== -1) {
        state.currentCrises[index] = action.payload;
      }
    },
    
    // Remove a crisis
    removeCrisis: (state, action: PayloadAction<string>) => {
      state.currentCrises = state.currentCrises.filter(crisis => crisis.id !== action.payload);
    },
    
    // Add a historical event
    addHistoricalEvent: (state, action: PayloadAction<HistoricalEvent>) => {
      state.historicalEvents.push(action.payload);
    },
    
    // Process world turn
    processWorldTurn: (state) => {
      // This would process changes in the world state each turn
      // For example, economic growth, natural tension decay, etc.
      
      // Slight natural decay in tension if no crises
      if (state.currentCrises.length === 0) {
        state.tensionLevel = Math.max(0, state.tensionLevel - 1);
      }
      
      // Climate stability can fluctuate slightly
      const climateChange = Math.random() * 2 - 1; // Between -1 and 1
      state.climateStabilityIndex = Math.max(0, Math.min(100, state.climateStabilityIndex + climateChange));
      
      // Process country changes
      // This would be more complex in a real implementation
      Object.keys(state.countries).forEach(countryId => {
        const country = state.countries[countryId];
        
        // Simple economic growth
        country.economy.gdp *= (1 + country.economy.growth / 100);
        
        // Update country
        state.countries[countryId] = country;
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadWorldData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadWorldData.fulfilled, (state, action) => {
        state.loading = false;
        state.countries = action.payload.countries;
      })
      .addCase(loadWorldData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  updateCountry,
  adjustTensionLevel,
  adjustClimateStability,
  addCrisis,
  updateCrisis,
  removeCrisis,
  addHistoricalEvent,
  processWorldTurn,
} = worldSlice.actions;

// Selectors
export const selectCountries = (state: { world: WorldState }) => state.world.countries;
export const selectTensionLevel = (state: { world: WorldState }) => state.world.tensionLevel;
export const selectClimateStability = (state: { world: WorldState }) => state.world.climateStabilityIndex;
export const selectCurrentCrises = (state: { world: WorldState }) => state.world.currentCrises;
export const selectHistoricalEvents = (state: { world: WorldState }) => state.world.historicalEvents;
export const selectWorldIsLoading = (state: { world: WorldState }) => state.world.loading;
export const selectWorldError = (state: { world: WorldState }) => state.world.error;

// Selector to get a specific country by its ID
export const selectCountryById = (state: RootState, countryId: string | null): Country | null => {
  if (!countryId) return null;
  return state.world.countries[countryId] || null;
};

export default worldSlice.reducer;
```