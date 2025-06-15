import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { PrestigeService } from '../../services/PrestigeService';
import { adjustAIPrestige } from './gameSlice';
// Note: Avoiding circular import, RootState will be available when this slice is integrated

export type AIDifficulty = 'easy' | 'normal' | 'hard' | 'realistic';

interface AIDecision {
  type: 'policy' | 'crisis_action' | 'diplomatic_move';
  target?: string;
  action: string;
  expectedPrestige: number;
  reasoning: string;
}

interface AIPlayerState {
  difficulty: AIDifficulty | null;
  isThinking: boolean;
  prestige: number;
  recentDecisions: AIDecision[];
  strategicPriorities: string[];
  aggressionLevel: number; // 0-100
  lastTurnActions: number;
}

const initialState: AIPlayerState = {
  difficulty: null,
  isThinking: false,
  prestige: 0,
  recentDecisions: [],
  strategicPriorities: ['sphere_expansion', 'crisis_management', 'economic_influence'],
  aggressionLevel: 50,
  lastTurnActions: 0,
};

const aiPlayerSlice = createSlice({
  name: 'aiPlayer',
  initialState,
  reducers: {
    setAIDifficulty: (state, action: PayloadAction<AIDifficulty>) => {
      state.difficulty = action.payload;
      // Adjust aggression based on difficulty
      switch (action.payload) {
        case 'easy':
          state.aggressionLevel = 30;
          break;
        case 'normal':
          state.aggressionLevel = 50;
          break;
        case 'hard':
          state.aggressionLevel = 70;
          break;
        case 'realistic':
          state.aggressionLevel = 60;
          break;
      }
    },
    setAIIsThinking: (state, action: PayloadAction<boolean>) => {
      state.isThinking = action.payload;
    },
    addAIDecision: (state, action: PayloadAction<AIDecision>) => {
      state.recentDecisions.unshift(action.payload);
      // Keep only last 10 decisions
      if (state.recentDecisions.length > 10) {
        state.recentDecisions = state.recentDecisions.slice(0, 10);
      }
    },
    adjustAIPrestige: (state, action: PayloadAction<number>) => {
      state.prestige += action.payload;
    },
    updateStrategicPriorities: (state, action: PayloadAction<string[]>) => {
      state.strategicPriorities = action.payload;
    },
    adjustAggressionLevel: (state, action: PayloadAction<number>) => {
      state.aggressionLevel = Math.max(0, Math.min(100, state.aggressionLevel + action.payload));
    },
    setLastTurnActions: (state, action: PayloadAction<number>) => {
      state.lastTurnActions = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(processAITurn.pending, (state) => {
        state.isThinking = true;
      })
      .addCase(processAITurn.fulfilled, (state) => {
        state.isThinking = false;
      })
      .addCase(processAITurn.rejected, (state) => {
        state.isThinking = false;
        // Optionally handle errors, e.g., log them or set an error state
        console.error("AI turn processing failed.");
      });
  },
});

export const processAITurn = createAsyncThunk<void, void, { state: any }>(
  'aiPlayer/processAITurn',
  async (_, { dispatch, getState }) => {
    const state = getState();
    const aiState = state.aiPlayer;
    const gameState = state.game;
    const worldState = state.world;
    const playerState = state.player;
    
    console.log(`AI (${aiState.difficulty || 'normal'}) is making strategic decisions...`);

    // Simulate AI thinking time based on difficulty
    const thinkingTime = aiState.difficulty === 'easy' ? 300 : 
                        aiState.difficulty === 'realistic' ? 1000 : 500;
    await new Promise(resolve => setTimeout(resolve, thinkingTime));

    try {
      // AI Decision Making Process
      const decisions = await makeStrategicDecisions(state, dispatch);
      
      // Track AI decisions
      decisions.forEach(decision => {
        dispatch(aiPlayerSlice.actions.addAIDecision(decision));
      });

      // Calculate AI prestige gains this turn
      const totalPrestigeGain = decisions.reduce((sum, decision) => sum + decision.expectedPrestige, 0);
      
      // Add some randomness and difficulty scaling
      const difficultyMultiplier = getDifficultyMultiplier(aiState.difficulty);
      const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
      const finalPrestigeGain = Math.round(totalPrestigeGain * difficultyMultiplier * randomFactor);

      if (finalPrestigeGain !== 0) {
        dispatch(aiPlayerSlice.actions.adjustAIPrestige(finalPrestigeGain));
        dispatch(adjustAIPrestige(finalPrestigeGain)); // Update game state as well
      }

      // Adjust aggression based on performance relative to player
      const prestigeDifference = aiState.prestige - playerState.prestige;
      if (prestigeDifference < -10) {
        dispatch(aiPlayerSlice.actions.adjustAggressionLevel(5)); // More aggressive when behind
      } else if (prestigeDifference > 20) {
        dispatch(aiPlayerSlice.actions.adjustAggressionLevel(-3)); // Less aggressive when ahead
      }

      // Track number of actions taken
      dispatch(aiPlayerSlice.actions.setLastTurnActions(decisions.length));

      console.log(`AI completed turn with ${decisions.length} actions, gaining ${finalPrestigeGain} prestige`);
      
    } catch (error) {
      console.error('AI turn processing failed:', error);
      // Fallback: AI gains small random prestige to maintain competition
      const fallbackGain = Math.floor(Math.random() * 3) + 1;
      dispatch(aiPlayerSlice.actions.adjustAIPrestige(fallbackGain));
      dispatch(adjustAIPrestige(fallbackGain));
    }
  }
);

/**
 * Core AI decision making logic
 */
async function makeStrategicDecisions(state: any, dispatch: any): Promise<AIDecision[]> {
  const decisions: AIDecision[] = [];
  const aiState = state.aiPlayer;
  const gameState = state.game;
  const worldState = state.world;
  const playerState = state.player;

  // Evaluate current situation
  const playerPrestige = playerState.prestige;
  const aiPrestige = aiState.prestige;
  const isLosingToPlayer = aiPrestige < playerPrestige - 5;
  const isLateGame = gameState.currentYear >= 2028;

  // Decision 1: Crisis Management
  if (worldState.activeCrises && worldState.activeCrises.length > 0) {
    const crisisDecision = decideCrisisAction(worldState.activeCrises, aiState, isLosingToPlayer);
    if (crisisDecision) {
      decisions.push(crisisDecision);
    }
  }

  // Decision 2: Policy Actions (simulate AI policies)
  const policyDecision = decidePolicyAction(worldState.countries, aiState, playerState, isLateGame);
  if (policyDecision) {
    decisions.push(policyDecision);
  }

  // Decision 3: Diplomatic Moves
  if (decisions.length < 2 && Math.random() > 0.4) {
    const diplomaticDecision = decideDiplomaticAction(worldState.countries, aiState, isLosingToPlayer);
    if (diplomaticDecision) {
      decisions.push(diplomaticDecision);
    }
  }

  // Ensure AI takes at least one action per turn (except on easy mode occasionally)
  if (decisions.length === 0 && (aiState.difficulty !== 'easy' || Math.random() > 0.3)) {
    decisions.push({
      type: 'diplomatic_move',
      action: 'Build international coalition',
      expectedPrestige: 2,
      reasoning: 'Maintaining diplomatic presence'
    });
  }

  return decisions;
}

/**
 * AI crisis decision logic
 */
function decideCrisisAction(crises: any[], aiState: any, isLosingToPlayer: boolean): AIDecision | null {
  if (!crises.length) return null;

  const crisis = crises[0]; // Focus on first crisis
  const shouldEscalate = aiState.aggressionLevel > 60 || (isLosingToPlayer && Math.random() > 0.5);

  if (shouldEscalate && crisis.escalationLevel < 6) {
    return {
      type: 'crisis_action',
      target: crisis.id,
      action: `Escalate ${crisis.name}`,
      expectedPrestige: 4 + Math.floor(Math.random() * 3),
      reasoning: `Escalating crisis to gain prestige advantage`
    };
  } else if (crisis.escalationLevel > 3 && Math.random() > 0.6) {
    return {
      type: 'crisis_action',
      target: crisis.id,
      action: `De-escalate ${crisis.name}`,
      expectedPrestige: 2,
      reasoning: `Diplomatic resolution to maintain stability`
    };
  }

  return null;
}

/**
 * AI policy decision logic
 */
function decidePolicyAction(countries: any, aiState: any, playerState: any, isLateGame: boolean): AIDecision | null {
  const availableCountries = Object.keys(countries || {});
  if (!availableCountries.length) return null;

  const targetCountry = availableCountries[Math.floor(Math.random() * availableCountries.length)];
  const country = countries[targetCountry];

  // Choose policy based on AI priorities and aggression
  let policyType: string;
  let expectedPrestige: number;

  if (aiState.aggressionLevel > 70 && Math.random() > 0.6) {
    policyType = isLateGame ? 'Military Intervention' : 'Aid to Insurgents';
    expectedPrestige = 5 + Math.floor(Math.random() * 4);
  } else if (aiState.aggressionLevel < 40 || Math.random() > 0.7) {
    policyType = Math.random() > 0.5 ? 'Economic Aid' : 'Diplomatic Pressure';
    expectedPrestige = 2 + Math.floor(Math.random() * 3);
  } else {
    policyType = Math.random() > 0.5 ? 'Military Aid' : 'Treaties';
    expectedPrestige = 3 + Math.floor(Math.random() * 3);
  }

  return {
    type: 'policy',
    target: targetCountry,
    action: `${policyType} in ${country?.name || targetCountry}`,
    expectedPrestige,
    reasoning: `Strategic ${policyType.toLowerCase()} to expand influence`
  };
}

/**
 * AI diplomatic decision logic
 */
function decideDiplomaticAction(countries: any, aiState: any, isLosingToPlayer: boolean): AIDecision | null {
  const diplomaticActions = [
    'Establish new trade agreements',
    'Form security partnerships',
    'Strengthen existing alliances',
    'Mediate regional disputes',
    'Expand cultural exchange programs'
  ];

  const action = diplomaticActions[Math.floor(Math.random() * diplomaticActions.length)];
  const basePrestige = isLosingToPlayer ? 3 : 2;
  
  return {
    type: 'diplomatic_move',
    action,
    expectedPrestige: basePrestige + Math.floor(Math.random() * 2),
    reasoning: `Diplomatic initiative to ${isLosingToPlayer ? 'catch up' : 'maintain'} strategic position`
  };
}

/**
 * Get difficulty multiplier for AI effectiveness
 */
function getDifficultyMultiplier(difficulty: AIDifficulty | null): number {
  switch (difficulty) {
    case 'easy': return 0.7;
    case 'normal': return 1.0;
    case 'hard': return 1.3;
    case 'realistic': return 1.1;
    default: return 1.0;
  }
}

export const { 
  setAIDifficulty, 
  setAIIsThinking, 
  addAIDecision, 
  adjustAIPrestige: adjustLocalAIPrestige,
  updateStrategicPriorities,
  adjustAggressionLevel,
  setLastTurnActions
} = aiPlayerSlice.actions;

// Selectors
export const selectAIDifficulty = (state: any) => state.aiPlayer.difficulty;
export const selectAIIsThinking = (state: any) => state.aiPlayer.isThinking;
export const selectAIPrestige = (state: any) => state.aiPlayer.prestige;
export const selectAIRecentDecisions = (state: any) => state.aiPlayer.recentDecisions;
export const selectAIStrategicPriorities = (state: any) => state.aiPlayer.strategicPriorities;
export const selectAIAggressionLevel = (state: any) => state.aiPlayer.aggressionLevel;
export const selectAILastTurnActions = (state: any) => state.aiPlayer.lastTurnActions;

// Enhanced selectors
export const selectAIPerformanceStatus = (state: any) => {
  const aiPrestige = state.aiPlayer.prestige;
  const playerPrestige = state.player.prestige;
  const difference = aiPrestige - playerPrestige;
  
  if (difference > 10) return 'winning';
  if (difference < -10) return 'losing';
  return 'competitive';
};

export const selectAILastDecisionSummary = (state: any) => {
  const decisions = state.aiPlayer.recentDecisions;
  if (!decisions.length) return null;
  
  return {
    totalActions: state.aiPlayer.lastTurnActions,
    lastAction: decisions[0],
    averagePrestige: decisions.slice(0, 3).reduce((sum, d) => sum + d.expectedPrestige, 0) / Math.min(3, decisions.length)
  };
};

export default aiPlayerSlice.reducer;
