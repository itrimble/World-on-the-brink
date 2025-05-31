```typescript
// src/renderer/features/player/playerSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Policy } from '../../shared/types/policy';

interface PlayerState {
  faction: string;
  politicalCapital: number;
  prestige: number;
  militaryReserves: number;
  economicReserves: number;
  defcon: 5 | 4 | 3 | 2 | 1;
  activePolicies: Policy[];
  diplomaticInfluence: Record<string, number>;
}

const initialState: PlayerState = {
  faction: 'usa', // Default to USA
  politicalCapital: 100,
  prestige: 0,
  militaryReserves: 500000, // Number of troops available for deployment
  economicReserves: 10000, // Economic aid available (in millions)
  defcon: 5, // Start at normal readiness
  activePolicies: [],
  diplomaticInfluence: {},
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    // Set player faction
    setFaction: (state, action: PayloadAction<string>) => {
      state.faction = action.payload;
    },
    
    // Adjust political capital
    adjustPoliticalCapital: (state, action: PayloadAction<number>) => {
      state.politicalCapital = Math.max(0, state.politicalCapital + action.payload);
    },
    
    // Adjust prestige
    adjustPrestige: (state, action: PayloadAction<number>) => {
      state.prestige += action.payload;
    },
    
    // Change DEFCON level
    setDefcon: (state, action: PayloadAction<5 | 4 | 3 | 2 | 1>) => {
      state.defcon = action.payload;
    },
    
    // Add a new policy
    addPolicy: (state, action: PayloadAction<Policy>) => {
      state.activePolicies.push(action.payload);
      
      // Deduct costs
      state.politicalCapital -= action.payload.cost.politicalCapital;
      state.economicReserves -= action.payload.cost.economicCost;
      state.militaryReserves -= action.payload.cost.militaryCost;
    },
    
    // Remove a policy
    removePolicy: (state, action: PayloadAction<string>) => {
      state.activePolicies = state.activePolicies.filter(policy => policy.id !== action.payload);
    },
    
    // Update diplomatic influence
    updateInfluence: (state, action: PayloadAction<{ countryId: string, value: number }>) => {
      const { countryId, value } = action.payload;
      state.diplomaticInfluence[countryId] = (state.diplomaticInfluence[countryId] || 0) + value;
    },
    
    // Reset player state (for new game)
    resetPlayer: (state, action: PayloadAction<{ faction: string }>) => {
      return {
        ...initialState,
        faction: action.payload.faction,
      };
    },
    
    // Prepare for next turn
    prepareNextTurn: (state) => {
      // Regenerate some political capital each turn
      state.politicalCapital += 10;
      
      // Update policy statuses and effects
      state.activePolicies = state.activePolicies.filter(policy => policy.status !== 'expired');
    },
  },
});

export const {
  setFaction,
  adjustPoliticalCapital,
  adjustPrestige,
  setDefcon,
  addPolicy,
  removePolicy,
  updateInfluence,
  resetPlayer,
  prepareNextTurn,
} = playerSlice.actions;

// Selectors
export const selectPlayerFaction = (state: { player: PlayerState }) => state.player.faction;
export const selectPoliticalCapital = (state: { player: PlayerState }) => state.player.politicalCapital;
export const selectPrestige = (state: { player: PlayerState }) => state.player.prestige;
export const selectMilitaryReserves = (state: { player: PlayerState }) => state.player.militaryReserves;
export const selectEconomicReserves = (state: { player: PlayerState }) => state.player.economicReserves;
export const selectDefcon = (state: { player: PlayerState }) => state.player.defcon;
export const selectActivePolicies = (state: { player: PlayerState }) => state.player.activePolicies;
export const selectDiplomaticInfluence = (state: { player: PlayerState }) => state.player.diplomaticInfluence;

export default playerSlice.reducer;
```