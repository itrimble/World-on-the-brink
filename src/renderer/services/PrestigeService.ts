// src/renderer/services/PrestigeService.ts

import { Country, Policy, Crisis } from '../types';

type PolicyType = Policy['type'];

export interface PrestigeChange {
  source: 'policy' | 'crisis' | 'diplomacy' | 'sphere_influence' | 'turn_processing';
  action: string;
  amount: number;
  reason: string;
  relatedCountry?: string;
  relatedCrisis?: string;
  timestamp: number;
}

export interface PrestigeCalculationContext {
  countries: Record<string, Country>;
  playerFaction: string;
  currentPrestige: number;
  turn: number;
  activePolicies: Policy[];
}

/**
 * PrestigeService handles all complex prestige calculations and provides
 * a centralized system for determining prestige changes based on various actions.
 */
export class PrestigeService {
  
  /**
   * Calculate the strategic importance weight of a country for prestige purposes.
   * Based on GDP, military power, and government stability.
   */
  static calculateCountryPrestigeWeight(country: Country): number {
    const gdpWeight = Math.log10((country.economy?.gdp || 1) * 1000) / 15; // 0.0 - 1.0
    const militaryWeight = (country.military?.power || 0) / 100; // 0.0 - 1.0
    const stabilityWeight = (country.government?.stability || 50) / 100; // 0.0 - 1.0
    
    // Regional importance modifiers (simplified without region property)
    const regionMultiplier = this.getRegionMultiplier(country.name);
    
    // Base weight combines economic, military, and stability factors
    const baseWeight = (gdpWeight + militaryWeight + stabilityWeight) / 3;
    
    return Math.max(0.1, Math.min(2.0, baseWeight * regionMultiplier));
  }

  /**
   * Get regional multiplier for prestige calculations.
   * Strategic countries have higher prestige value.
   */
  private static getRegionMultiplier(countryName?: string): number {
    const countryMultipliers: Record<string, number> = {
      // Major powers
      'United States': 2.0,
      'Soviet Union': 2.0,
      'China': 1.8,
      'United Kingdom': 1.5,
      'France': 1.4,
      'Germany': 1.4,
      'Japan': 1.3,
      'India': 1.3,
      'Brazil': 1.2,
      'Israel': 1.3,
      'Egypt': 1.2,
      'Iran': 1.2,
      'Saudi Arabia': 1.2,
      'South Korea': 1.1,
      'Turkey': 1.1,
      'Poland': 1.1,
      'Cuba': 1.2,
      'Vietnam': 1.1,
      'Afghanistan': 1.1,
      'Pakistan': 1.1,
    };
    
    return countryMultipliers[countryName || ''] || 1.0;
  }

  /**
   * Calculate prestige change from a policy implementation.
   */
  static calculatePolicyPrestigeChange(
    policy: Policy,
    targetCountry: Country,
    context: PrestigeCalculationContext
  ): PrestigeChange {
    const countryWeight = this.calculateCountryPrestigeWeight(targetCountry);
    const basePolicyValue = this.getPolicyBasePrestigeValue(policy.type);
    
    // Calculate success probability based on context
    const successProbability = this.calculatePolicySuccessProbability(
      policy,
      targetCountry,
      context
    );
    
    // Apply success/failure modifier
    const successModifier = successProbability > 0.5 ? 1 : -0.5;
    
    // Calculate final amount
    const amount = Math.round(basePolicyValue * countryWeight * successModifier);
    
    const reason = successModifier > 0 
      ? `Successful ${policy.type} in ${targetCountry.name}`
      : `Failed ${policy.type} in ${targetCountry.name}`;

    return {
      source: 'policy',
      action: policy.type,
      amount,
      reason,
      relatedCountry: targetCountry.id,
      timestamp: Date.now()
    };
  }

  /**
   * Get base prestige value for different policy types.
   */
  private static getPolicyBasePrestigeValue(policyType: PolicyType): number {
    const policyValues: Record<PolicyType, number> = {
      'military_aid': 15,
      'insurgency_aid': 20,
      'intervention': 35,
      'economic_aid': 10,
      'destabilization': 25,
      'diplomatic_pressure': 12,
      'treaty': 30,
      'trade_policy': 8
    };
    
    return policyValues[policyType] || 10;
  }

  /**
   * Calculate the probability of policy success based on various factors.
   */
  private static calculatePolicySuccessProbability(
    policy: Policy,
    targetCountry: Country,
    context: PrestigeCalculationContext
  ): number {
    let baseProbability = 0.5;
    
    // Factor in target country's stability
    if (targetCountry.government?.stability) {
      baseProbability += (targetCountry.government.stability - 50) / 200; // -0.25 to +0.25
    }
    
    // Factor in existing diplomatic relations
    const relation = targetCountry.relations?.[context.playerFaction];
    if (relation !== undefined) {
      baseProbability += (relation - 50) / 100; // -0.5 to +0.5
    }
    
    // Factor in military vs civilian policies
    if (policy.type === 'intervention' && targetCountry.military?.power) {
      baseProbability -= targetCountry.military.power / 200; // Stronger military = harder intervention
    }
    
    // Factor in economic policies vs country wealth
    if (policy.type === 'economic_aid' && targetCountry.economy?.gdp) {
      baseProbability += Math.log10(targetCountry.economy.gdp) / 20; // Wealthier countries are easier to aid
    }
    
    return Math.max(0.1, Math.min(0.9, baseProbability));
  }

  /**
   * Calculate prestige change from crisis resolution.
   */
  static calculateCrisisPrestigeChange(
    crisis: Crisis,
    playerAction: 'escalate' | 'de-escalate' | 'win' | 'lose',
    context: PrestigeCalculationContext
  ): PrestigeChange {
    const baseValue = this.getCrisisBasePrestigeValue(crisis.escalationLevel, crisis.type);
    
    let multiplier = 1;
    switch (playerAction) {
      case 'win':
        multiplier = 1.5;
        break;
      case 'lose':
        multiplier = -1.2;
        break;
      case 'escalate':
        multiplier = crisis.escalationLevel > 4 ? -0.3 : 0.2; // Risky at high levels
        break;
      case 'de-escalate':
        multiplier = 0.8; // Peaceful resolution bonus
        break;
    }
    
    const amount = Math.round(baseValue * multiplier);
    
    return {
      source: 'crisis',
      action: playerAction,
      amount,
      reason: `${playerAction} in ${crisis.name}`,
      relatedCrisis: crisis.id,
      timestamp: Date.now()
    };
  }

  /**
   * Get base prestige value for crisis based on escalation level and type.
   */
  private static getCrisisBasePrestigeValue(escalationLevel: number, crisisType: string): number {
    const escalationMultiplier = escalationLevel * 5; // 5-35 points
    
    const typeMultipliers: Record<string, number> = {
      'diplomatic': 1.0,
      'military': 1.3,
      'economic': 0.8,
      'regional_conflict': 1.5
    };
    
    const typeMultiplier = typeMultipliers[crisisType] || 1.0;
    
    return Math.round(escalationMultiplier * typeMultiplier);
  }

  /**
   * Calculate turn-based prestige changes from sphere of influence.
   */
  static calculateSphereOfInfluencePrestige(
    context: PrestigeCalculationContext
  ): PrestigeChange[] {
    const changes: PrestigeChange[] = [];
    
    // Calculate prestige from countries in sphere of influence
    Object.values(context.countries).forEach(country => {
      const relation = country.relations?.[context.playerFaction];
      
      if (relation && relation > 70) { // Strong allies
        const weight = this.calculateCountryPrestigeWeight(country);
        const prestigeGain = Math.round(weight * 2); // 0-4 points per turn per ally
        
        changes.push({
          source: 'sphere_influence',
          action: 'allied_influence',
          amount: prestigeGain,
          reason: `Sphere of influence: ${country.name}`,
          relatedCountry: country.id,
          timestamp: Date.now()
        });
      }
    });
    
    return changes;
  }

  /**
   * Calculate prestige changes from diplomatic relationships.
   */
  static calculateDiplomaticPrestige(
    context: PrestigeCalculationContext,
    previousRelations: Record<string, Record<string, number>>
  ): PrestigeChange[] {
    const changes: PrestigeChange[] = [];
    
    Object.values(context.countries).forEach(country => {
      const currentRelation = country.relations?.[context.playerFaction] || 50;
      const previousRelation = previousRelations[country.id]?.[context.playerFaction] || 50;
      
      const relationChange = currentRelation - previousRelation;
      
      if (Math.abs(relationChange) > 5) { // Significant relationship change
        const weight = this.calculateCountryPrestigeWeight(country);
        const prestigeChange = Math.round((relationChange / 10) * weight);
        
        changes.push({
          source: 'diplomacy',
          action: relationChange > 0 ? 'improved_relations' : 'deteriorated_relations',
          amount: prestigeChange,
          reason: `Diplomatic relations ${relationChange > 0 ? 'improved' : 'deteriorated'} with ${country.name}`,
          relatedCountry: country.id,
          timestamp: Date.now()
        });
      }
    });
    
    return changes;
  }

  /**
   * Calculate total prestige target for victory condition.
   * Based on game length and difficulty.
   */
  static calculateVictoryPrestigeTarget(
    totalTurns: number,
    difficulty: 'easy' | 'normal' | 'hard' | 'realistic'
  ): number {
    const baseTarget = totalTurns * 10; // 10 points per turn average
    
    const difficultyMultipliers = {
      easy: 0.7,
      normal: 1.0,
      hard: 1.3,
      realistic: 1.5
    };
    
    return Math.round(baseTarget * difficultyMultipliers[difficulty]);
  }

  /**
   * Determine if a prestige score represents a victory condition.
   */
  static evaluateVictoryStatus(
    playerPrestige: number,
    aiPrestige: number,
    victoryTarget: number,
    gameEndCondition: boolean
  ): 'victory' | 'defeat' | 'stalemate' | 'ongoing' {
    if (!gameEndCondition) {
      // Check for early victory conditions
      if (playerPrestige >= victoryTarget) return 'victory';
      if (playerPrestige < -100) return 'defeat'; // Catastrophic loss
      return 'ongoing';
    }
    
    // End game evaluation
    if (playerPrestige >= victoryTarget) return 'victory';
    if (playerPrestige > aiPrestige) return 'victory';
    if (playerPrestige < aiPrestige - 50) return 'defeat';
    
    return 'stalemate';
  }

  /**
   * Format prestige change for user display.
   */
  static formatPrestigeChange(change: PrestigeChange): string {
    const sign = change.amount >= 0 ? '+' : '';
    return `${sign}${change.amount} Prestige: ${change.reason}`;
  }
}