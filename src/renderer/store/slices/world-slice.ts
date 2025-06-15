
// src/renderer/features/game/worldSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Country, Crisis, Policy } from '../../types';
import { CrisisService } from '../../services/CrisisService';
import { PolicyService } from '../../services/PolicyService';
import { CountryDataService } from '../../services/CountryDataService';

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
      // Simulate loading time for realistic experience
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Load comprehensive country data from CountryDataService
      const countries = CountryDataService.getAllCountries();
      
      // Initialize bilateral relations for all countries
      CountryDataService.initializeBilateralRelations();
      
      console.log(`Loaded ${Object.keys(countries).length} countries with comprehensive data`);
      
      return {
        countries,
        tensionLevel: 25, // Starting world tension (Cold War era)
        climateStabilityIndex: 85, // Starting climate stability
      };
    } catch (error) {
      return rejectWithValue('Failed to load world data: ' + (error as Error).message);
    }
  }
);

// Trigger a new crisis based on policy action
export const triggerCrisis = createAsyncThunk(
  'world/triggerCrisis',
  async (params: {
    triggeringPolicy: Policy;
    instigatorCountryId: string;
    targetCountryId: string;
    currentTurn: number;
  }, { getState, dispatch }) => {
    const state = getState() as { world: WorldState };
    const worldTension = state.world.tensionLevel;
    
    const crisis = CrisisService.generateCrisis({
      ...params,
      worldTension
    });
    
    // Add tension based on crisis escalation level
    const tensionIncrease = crisis.escalationLevel * 5;
    dispatch(adjustTensionLevel(tensionIncrease));
    
    return crisis;
  }
);

// Escalate an existing crisis
export const escalateCrisis = createAsyncThunk(
  'world/escalateCrisis',
  async (params: {
    crisisId: string;
    actionBy: string;
  }, { getState, dispatch }) => {
    const state = getState() as { world: WorldState };
    const crisis = state.world.currentCrises.find(c => c.id === params.crisisId);
    
    if (!crisis) {
      throw new Error('Crisis not found');
    }
    
    const escalatedCrisis = CrisisService.escalateCrisis(crisis, params.actionBy);
    
    // Add tension for escalation
    const tensionIncrease = 10;
    dispatch(adjustTensionLevel(tensionIncrease));
    
    // Check for nuclear war (game over condition)
    if (escalatedCrisis.escalationLevel === 7) {
      // TODO: Trigger game over state
      console.warn('Nuclear War reached - Game Over condition');
    }
    
    return escalatedCrisis;
  }
);

// De-escalate an existing crisis
export const deEscalateCrisis = createAsyncThunk(
  'world/deEscalateCrisis',
  async (params: {
    crisisId: string;
    actionBy: string;
  }, { getState, dispatch }) => {
    const state = getState() as { world: WorldState };
    const crisis = state.world.currentCrises.find(c => c.id === params.crisisId);
    
    if (!crisis) {
      throw new Error('Crisis not found');
    }
    
    const deEscalatedCrisis = CrisisService.deEscalateCrisis(crisis, params.actionBy);
    
    // Reduce tension for de-escalation
    const tensionDecrease = -5;
    dispatch(adjustTensionLevel(tensionDecrease));
    
    return deEscalatedCrisis;
  }
);

// Process crisis for accidental escalation (called each turn)
export const processCrisisAccidents = createAsyncThunk(
  'world/processCrisisAccidents',
  async (_, { getState, dispatch }) => {
    const state = getState() as { world: WorldState };
    const activeCrises = state.world.currentCrises.filter(c => c.status === 'active');
    const worldTension = state.world.tensionLevel;
    
    const accidentalEscalations: Crisis[] = [];
    
    for (const crisis of activeCrises) {
      if (CrisisService.shouldAccidentallyEscalate(crisis, worldTension)) {
        const escalatedCrisis = CrisisService.escalateCrisis(crisis, 'ACCIDENT');
        accidentalEscalations.push(escalatedCrisis);
        
        // Add significant tension for accidental escalation
        dispatch(adjustTensionLevel(15));
        
        console.warn(`Crisis ${crisis.name} accidentally escalated to ${CrisisService.getEscalationLevelName(escalatedCrisis.escalationLevel)}`);
      }
    }
    
    return accidentalEscalations;
  }
);

// Apply policy effects to target country
export const applyPolicyEffects = createAsyncThunk(
  'world/applyPolicyEffects',
  async (params: {
    policy: Policy;
    targetCountryId: string;
    playerCountryId: string;
    playerPrestige: number;
  }, { getState, dispatch }) => {
    const state = getState() as { world: WorldState };
    const targetCountry = state.world.countries[params.targetCountryId];
    
    if (!targetCountry) {
      throw new Error(`Target country ${params.targetCountryId} not found`);
    }
    
    // Process the policy using PolicyService
    const result = PolicyService.processPolicy(
      params.policy,
      targetCountry,
      params.playerCountryId,
      params.playerPrestige
    );
    
    // Apply country changes to world state
    if (result.countryChanges) {
      dispatch(updateCountry({
        ...targetCountry,
        ...result.countryChanges
      } as Country));
    }
    
    // Adjust tension based on policy type and success
    let tensionChange = 0;
    if (params.policy.type === 'intervention' || params.policy.type === 'destabilization') {
      tensionChange = result.success ? 8 : 4; // Aggressive policies increase tension
    } else if (params.policy.type === 'diplomatic_pressure') {
      tensionChange = result.success ? 3 : 1;
    } else if (params.policy.type === 'treaty' || params.policy.type === 'trade_policy') {
      tensionChange = result.success ? -2 : 0; // Peaceful policies reduce tension
    }
    
    if (tensionChange !== 0) {
      dispatch(adjustTensionLevel(tensionChange));
    }
    
    return {
      ...result,
      tensionChange
    };
  }
);

// Check if a policy can be implemented
export const checkPolicyEligibility = createAsyncThunk(
  'world/checkPolicyEligibility',
  async (params: {
    policy: Policy;
    targetCountryId: string;
    playerCountryId: string;
    playerState: {
      politicalCapital: number;
      economicReserves: number;
      militaryReserves: number;
    };
  }, { getState }) => {
    const state = getState() as { world: WorldState };
    const targetCountry = state.world.countries[params.targetCountryId];
    
    if (!targetCountry) {
      return { canImplement: false, reason: 'Target country not found' };
    }
    
    return PolicyService.canImplementPolicy(
      params.policy,
      targetCountry,
      params.playerCountryId,
      params.playerState
    );
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
    
    // Load world state from saved game
    loadWorldState: (state, action: PayloadAction<{
      countries: Record<string, Country>;
      tensionLevel: number;
      climateStabilityIndex: number;
      currentCrises: Crisis[];
      historicalEvents: HistoricalEvent[];
    }>) => {
      const loaded = action.payload;
      state.countries = loaded.countries;
      state.tensionLevel = loaded.tensionLevel;
      state.climateStabilityIndex = loaded.climateStabilityIndex;
      state.currentCrises = loaded.currentCrises;
      state.historicalEvents = loaded.historicalEvents;
      state.loading = false;
      state.error = null;
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
        if (country.economy?.gdp && country.economy?.growth) {
          country.economy.gdp *= (1 + country.economy.growth / 100);
        }
        
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
        state.tensionLevel = action.payload.tensionLevel;
        state.climateStabilityIndex = action.payload.climateStabilityIndex;
      })
      .addCase(loadWorldData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Crisis management thunks
      .addCase(triggerCrisis.fulfilled, (state, action) => {
        state.currentCrises.push(action.payload);
      })
      .addCase(triggerCrisis.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to trigger crisis';
      })
      .addCase(escalateCrisis.fulfilled, (state, action) => {
        const index = state.currentCrises.findIndex(crisis => crisis.id === action.payload.id);
        if (index !== -1) {
          state.currentCrises[index] = action.payload;
        }
      })
      .addCase(escalateCrisis.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to escalate crisis';
      })
      .addCase(deEscalateCrisis.fulfilled, (state, action) => {
        const index = state.currentCrises.findIndex(crisis => crisis.id === action.payload.id);
        if (index !== -1) {
          state.currentCrises[index] = action.payload;
          // Remove if resolved peacefully
          if (action.payload.status === 'resolved_peacefully') {
            state.currentCrises = state.currentCrises.filter(crisis => crisis.id !== action.payload.id);
          }
        }
      })
      .addCase(deEscalateCrisis.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to de-escalate crisis';
      })
      .addCase(processCrisisAccidents.fulfilled, (state, action) => {
        // Update accidentally escalated crises
        action.payload.forEach(escalatedCrisis => {
          const index = state.currentCrises.findIndex(crisis => crisis.id === escalatedCrisis.id);
          if (index !== -1) {
            state.currentCrises[index] = escalatedCrisis;
          }
        });
      })
      // Policy effects thunks
      .addCase(applyPolicyEffects.fulfilled, (state, action) => {
        // Policy effects are applied in the thunk via updateCountry dispatch
        // No additional state changes needed here
      })
      .addCase(applyPolicyEffects.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to apply policy effects';
      })
      .addCase(checkPolicyEligibility.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to check policy eligibility';
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
  loadWorldState,
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
export const selectCountryById = (state: any, countryId: string | null): Country | null => {
  if (!countryId) return null;
  return state.world.countries[countryId] || null;
};

// Enhanced crisis selectors
export const selectActiveCrises = (state: { world: WorldState }) => 
  state.world.currentCrises.filter(crisis => crisis.status === 'active');

export const selectCrisisByEscalationLevel = (state: { world: WorldState }, level: Crisis['escalationLevel']) =>
  state.world.currentCrises.filter(crisis => crisis.escalationLevel === level);

export const selectHighestEscalationLevel = (state: { world: WorldState }): Crisis['escalationLevel'] | null => {
  const crises = state.world.currentCrises;
  if (crises.length === 0) return null;
  return Math.max(...crises.map(crisis => crisis.escalationLevel)) as Crisis['escalationLevel'];
};

export const selectCrisisById = (state: { world: WorldState }, crisisId: string): Crisis | null =>
  state.world.currentCrises.find(crisis => crisis.id === crisisId) || null;

export const selectCrisesInvolvingCountry = (state: { world: WorldState }, countryId: string) =>
  state.world.currentCrises.filter(crisis => crisis.involvedCountries.includes(countryId));

export default worldSlice.reducer;
