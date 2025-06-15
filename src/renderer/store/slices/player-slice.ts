
// src/renderer/features/player/playerSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Policy } from '../../types';
import { PrestigeChange } from '../../services/PrestigeService';

interface PlayerState {
  faction: string;
  politicalCapital: number;
  prestige: number;
  militaryReserves: number;
  economicReserves: number;
  defcon: 5 | 4 | 3 | 2 | 1;
  activePolicies: Policy[];
  diplomaticInfluence: Record<string, number>;
  prestigeHistory: Array<{
    turn: number;
    prestige: number;
    change: number;
    timestamp: number;
  }>;
  prestigeChanges: PrestigeChange[];
  lastTurnPrestige: number;
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
  prestigeHistory: [],
  prestigeChanges: [],
  lastTurnPrestige: 0,
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

    // Apply prestige change with detailed tracking
    applyPrestigeChange: (state, action: PayloadAction<{ change: PrestigeChange; turn: number }>) => {
      const { change, turn } = action.payload;
      
      // Update prestige
      state.prestige += change.amount;
      
      // Add to history
      state.prestigeHistory.push({
        turn,
        prestige: state.prestige,
        change: change.amount,
        timestamp: change.timestamp
      });
      
      // Add detailed change record
      state.prestigeChanges.push(change);
      
      // Keep only last 20 detailed changes to prevent memory bloat
      if (state.prestigeChanges.length > 20) {
        state.prestigeChanges = state.prestigeChanges.slice(-20);
      }
    },

    // Record turn prestige for comparison
    recordTurnPrestige: (state, action: PayloadAction<number>) => {
      state.lastTurnPrestige = state.prestige;
    },
    
    // Change DEFCON level
    setDefcon: (state, action: PayloadAction<5 | 4 | 3 | 2 | 1>) => {
      state.defcon = action.payload;
    },
    
    // Add a new policy
    addPolicy: (state, action: PayloadAction<Policy>) => {
      state.activePolicies.push(action.payload);
      
      // Deduct costs
      state.politicalCapital -= (action.payload.cost as any).politicalCost || 0;
      state.economicReserves -= action.payload.cost.economicCost || 0;
      state.militaryReserves -= action.payload.cost.militaryCost || 0;
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
    resetPlayer: (state, action: PayloadAction<{ 
      faction: string;
      prestige?: number;
      politicalCapital?: number;
      economicReserves?: number;
      militaryCapacity?: number;
    }>) => {
      const { faction, prestige, politicalCapital, economicReserves, militaryCapacity } = action.payload;
      return {
        ...initialState,
        faction,
        prestige: prestige || initialState.prestige,
        politicalCapital: politicalCapital || initialState.politicalCapital,
        economicReserves: economicReserves || initialState.economicReserves,
        militaryReserves: militaryCapacity || initialState.militaryReserves,
      };
    },
    
    // Load player state from saved game
    loadPlayerState: (state, action: PayloadAction<{
      faction: string;
      politicalCapital: number;
      prestige: number;
      militaryReserves: number;
      economicReserves: number;
      defcon: 5 | 4 | 3 | 2 | 1;
      activePolicies: Policy[];
      diplomaticInfluence: Record<string, number>;
    }>) => {
      const loaded = action.payload;
      state.faction = loaded.faction;
      state.politicalCapital = loaded.politicalCapital;
      state.prestige = loaded.prestige;
      state.militaryReserves = loaded.militaryReserves;
      state.economicReserves = loaded.economicReserves;
      state.defcon = loaded.defcon;
      state.activePolicies = loaded.activePolicies;
      state.diplomaticInfluence = loaded.diplomaticInfluence;
      
      // Clear change tracking for fresh load
      state.prestigeHistory = [];
      state.prestigeChanges = [];
      state.lastTurnPrestige = loaded.prestige;
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
  applyPrestigeChange,
  recordTurnPrestige,
  setDefcon,
  addPolicy,
  removePolicy,
  updateInfluence,
  resetPlayer,
  loadPlayerState,
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
export const selectPrestigeHistory = (state: { player: PlayerState }) => state.player.prestigeHistory;
export const selectRecentPrestigeChanges = (state: { player: PlayerState }) => state.player.prestigeChanges;
export const selectLastTurnPrestige = (state: { player: PlayerState }) => state.player.lastTurnPrestige;

// Computed selectors
export const selectPrestigeChange = (state: { player: PlayerState }) => 
  state.player.prestige - state.player.lastTurnPrestige;

export default playerSlice.reducer;
