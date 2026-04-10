
// src/renderer/features/player/playerSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Policy, PrestigePillars } from '../../types';
import { PrestigeChange } from '../../services/PrestigeService';

interface PlayerState {
  faction: string;
  politicalCapital: number;
  prestige: number;
  // Prestige 2.0: Four-pillar breakdown
  prestigePillars: PrestigePillars;
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
  faction: 'usa',
  politicalCapital: 100,
  prestige: 0,
  prestigePillars: { economic: 50, military: 50, cultural: 50, tech: 50 },
  militaryReserves: 500000,
  economicReserves: 10000,
  defcon: 5,
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

      // Update aggregate prestige
      state.prestige += change.amount;

      // Update pillar-specific prestige if provided
      if (change.pillarDeltas) {
        for (const [pillar, delta] of Object.entries(change.pillarDeltas)) {
          const key = pillar as keyof PrestigePillars;
          state.prestigePillars[key] = Math.max(0, Math.min(100, state.prestigePillars[key] + delta));
        }
      }

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

    // Update a single prestige pillar directly
    adjustPrestigePillar: (state, action: PayloadAction<{ pillar: keyof PrestigePillars; delta: number }>) => {
      const { pillar, delta } = action.payload;
      state.prestigePillars[pillar] = Math.max(0, Math.min(100, state.prestigePillars[pillar] + delta));
      // Also update aggregate prestige as the average
      const pillars = state.prestigePillars;
      state.prestige = Math.round((pillars.economic + pillars.military + pillars.cultural + pillars.tech) / 4);
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
      prestigePillars?: Partial<PrestigePillars>;
    }>) => {
      const { faction, prestige, politicalCapital, economicReserves, militaryCapacity, prestigePillars } = action.payload;
      return {
        ...initialState,
        faction,
        prestige: prestige || initialState.prestige,
        politicalCapital: politicalCapital || initialState.politicalCapital,
        economicReserves: economicReserves || initialState.economicReserves,
        militaryReserves: militaryCapacity || initialState.militaryReserves,
        prestigePillars: { ...initialState.prestigePillars, ...prestigePillars },
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
  adjustPrestigePillar,
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

export const selectPrestigePillars = (state: { player: PlayerState }) => state.player.prestigePillars;

// Computed: total prestige as sum of pillars
export const selectTotalPillarPrestige = (state: { player: PlayerState }) => {
  const p = state.player.prestigePillars;
  return p.economic + p.military + p.cultural + p.tech;
};

export default playerSlice.reducer;
