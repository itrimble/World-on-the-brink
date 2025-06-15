// src/renderer/services/PolicyService.ts
import { Policy, PolicyEffect, Country } from '../types';
import { PrestigeService } from './PrestigeService';

/**
 * PolicyService - Core service for applying policy effects to game state
 * 
 * This service bridges the gap between policy implementation and actual game state changes.
 * It handles success/failure calculations, applies effects to countries, and integrates
 * with the prestige system.
 */
export class PolicyService {
  /**
   * Calculate the success probability of a policy based on various factors
   */
  static calculateSuccessProbability(
    policy: Policy,
    targetCountry: Country,
    playerCountryId: string,
    playerPrestige: number
  ): number {
    let baseProbability = 0.7; // Base 70% success rate

    // Adjust based on policy type
    switch (policy.type) {
      case 'military_aid':
        baseProbability = 0.8; // Military aid generally more straightforward
        break;
      case 'economic_aid':
        baseProbability = 0.85; // Economic aid usually welcome
        break;
      case 'diplomatic_pressure':
        baseProbability = 0.6; // More resistance to pressure
        break;
      case 'destabilization':
        baseProbability = 0.5; // Covert operations are risky
        break;
      case 'intervention':
        baseProbability = 0.4; // Military intervention is very risky
        break;
      case 'insurgency_aid':
        baseProbability = 0.55; // Supporting insurgents is moderately risky
        break;
      case 'treaty':
        baseProbability = 0.75; // Treaties require mutual agreement
        break;
      case 'trade_policy':
        baseProbability = 0.8; // Trade usually mutually beneficial
        break;
    }

    // Adjust based on current relations with target country
    const currentRelation = targetCountry.relations[playerCountryId] || 0;
    const relationModifier = currentRelation / 200; // Relations range -100 to +100, normalize to -0.5 to +0.5
    baseProbability += relationModifier;

    // Adjust based on target country alignment
    if (policy.type === 'military_aid' || policy.type === 'economic_aid') {
      if (targetCountry.government.alignment === 'western' && playerCountryId === 'USA') {
        baseProbability += 0.2; // Aligned countries more receptive
      } else if (targetCountry.government.alignment === 'eastern' && playerCountryId === 'USSR') {
        baseProbability += 0.2;
      } else if (targetCountry.government.alignment === 'neutral') {
        baseProbability -= 0.1; // Neutral countries more cautious
      }
    }

    // Adjust based on target country stability (unstable countries harder to influence)
    const stabilityModifier = (targetCountry.government.stability || 50) / 200 - 0.25;
    baseProbability += stabilityModifier;

    // Adjust based on player prestige (higher prestige = more influence)
    const prestigeModifier = (playerPrestige - 50) / 200; // Assuming 50 is baseline prestige
    baseProbability += prestigeModifier;

    // Ensure probability stays within reasonable bounds
    return Math.max(0.1, Math.min(0.95, baseProbability));
  }

  /**
   * Apply policy effects to a target country
   */
  static applyPolicyEffects(
    policy: Policy,
    targetCountry: Country,
    playerCountryId: string,
    success: boolean
  ): {
    countryChanges: Partial<Country>;
    prestigeChange: number;
    relationChanges: Record<string, number>;
  } {
    const countryChanges: Partial<Country> = {
      id: targetCountry.id,
      government: { ...targetCountry.government },
      internal: { ...targetCountry.internal },
      relations: { ...targetCountry.relations },
    };

    let prestigeChange = 0;
    const relationChanges: Record<string, number> = {};

    // Apply base effects from policy definition
    policy.effects.forEach((effect: PolicyEffect) => {
      if (effect.targetCountryId === targetCountry.id) {
        const effectMultiplier = success ? 1 : 0.3; // Reduced effects on failure

        // Apply stability changes
        if (effect.stabilityChange && countryChanges.government) {
          const currentStability = countryChanges.government.stability || 50;
          countryChanges.government.stability = Math.max(0, Math.min(100, 
            currentStability + (effect.stabilityChange * effectMultiplier)
          ));
        }

        // Apply insurgency changes
        if (effect.insurgencyChange && countryChanges.internal) {
          const currentInsurgency = countryChanges.internal.insurgencyLevel;
          countryChanges.internal.insurgencyLevel = Math.max(0, Math.min(100,
            currentInsurgency + (effect.insurgencyChange * effectMultiplier)
          ));
        }

        // Apply coup risk changes
        if (effect.coupRiskChange && countryChanges.internal) {
          const currentCoupRisk = countryChanges.internal.coupRisk;
          countryChanges.internal.coupRisk = Math.max(0, Math.min(100,
            currentCoupRisk + (effect.coupRiskChange * effectMultiplier)
          ));
        }

        // Apply relation changes with player
        if (effect.relationChangeWithPlayer && countryChanges.relations) {
          const currentRelation = countryChanges.relations[playerCountryId] || 0;
          const newRelation = Math.max(-100, Math.min(100,
            currentRelation + (effect.relationChangeWithPlayer * effectMultiplier)
          ));
          countryChanges.relations[playerCountryId] = newRelation;
          relationChanges[playerCountryId] = effect.relationChangeWithPlayer * effectMultiplier;
        }

        // Apply relation changes with opponent
        if (effect.relationChangeWithOpponent && countryChanges.relations) {
          const opponentId = playerCountryId === 'USA' ? 'USSR' : 'USA';
          const currentRelation = countryChanges.relations[opponentId] || 0;
          const newRelation = Math.max(-100, Math.min(100,
            currentRelation + (effect.relationChangeWithOpponent * effectMultiplier)
          ));
          countryChanges.relations[opponentId] = newRelation;
          relationChanges[opponentId] = effect.relationChangeWithOpponent * effectMultiplier;
        }

        // Apply prestige changes
        if (effect.prestigeChangePlayer) {
          prestigeChange += effect.prestigeChangePlayer * effectMultiplier;
        }
      }
    });

    // Apply policy-specific effects
    switch (policy.type) {
      case 'military_aid':
        if (success && countryChanges.government) {
          // Military aid increases stability and reduces coup risk
          countryChanges.government.stability = Math.min(100, 
            (countryChanges.government.stability || 50) + 10
          );
          if (countryChanges.internal) {
            countryChanges.internal.coupRisk = Math.max(0, 
              countryChanges.internal.coupRisk - 15
            );
          }
        }
        break;

      case 'economic_aid':
        if (success && countryChanges.government) {
          // Economic aid increases stability and improves relations
          countryChanges.government.stability = Math.min(100, 
            (countryChanges.government.stability || 50) + 8
          );
          if (countryChanges.relations) {
            const currentRelation = countryChanges.relations[playerCountryId] || 0;
            countryChanges.relations[playerCountryId] = Math.min(100, currentRelation + 15);
            relationChanges[playerCountryId] = (relationChanges[playerCountryId] || 0) + 15;
          }
        }
        break;

      case 'destabilization':
        if (success && countryChanges.government && countryChanges.internal) {
          // Destabilization reduces stability and increases insurgency/coup risk
          countryChanges.government.stability = Math.max(0, 
            (countryChanges.government.stability || 50) - 20
          );
          countryChanges.internal.insurgencyLevel = Math.min(100, 
            countryChanges.internal.insurgencyLevel + 25
          );
          countryChanges.internal.coupRisk = Math.min(100, 
            countryChanges.internal.coupRisk + 30
          );
        }
        break;

      case 'diplomatic_pressure':
        if (success && countryChanges.relations) {
          // Diplomatic pressure affects relations based on target's alignment
          const relationChange = targetCountry.government.alignment === 'neutral' ? -10 : -5;
          const currentRelation = countryChanges.relations[playerCountryId] || 0;
          countryChanges.relations[playerCountryId] = Math.max(-100, currentRelation + relationChange);
          relationChanges[playerCountryId] = (relationChanges[playerCountryId] || 0) + relationChange;
        }
        break;

      case 'intervention':
        if (success && countryChanges.government && countryChanges.internal) {
          // Military intervention can stabilize or destabilize based on circumstances
          const stabilityChange = targetCountry.internal.insurgencyLevel > 50 ? 15 : -25;
          countryChanges.government.stability = Math.max(0, Math.min(100,
            (countryChanges.government.stability || 50) + stabilityChange
          ));
          // Always affects relations negatively initially
          if (countryChanges.relations) {
            const currentRelation = countryChanges.relations[playerCountryId] || 0;
            countryChanges.relations[playerCountryId] = Math.max(-100, currentRelation - 20);
            relationChanges[playerCountryId] = (relationChanges[playerCountryId] || 0) - 20;
          }
        }
        break;

      case 'insurgency_aid':
        if (success && countryChanges.internal && countryChanges.government) {
          // Supporting insurgents increases insurgency and reduces stability
          countryChanges.internal.insurgencyLevel = Math.min(100, 
            countryChanges.internal.insurgencyLevel + 30
          );
          countryChanges.government.stability = Math.max(0, 
            (countryChanges.government.stability || 50) - 15
          );
        }
        break;

      case 'treaty':
        if (success && countryChanges.relations) {
          // Treaties significantly improve relations
          const currentRelation = countryChanges.relations[playerCountryId] || 0;
          countryChanges.relations[playerCountryId] = Math.min(100, currentRelation + 25);
          relationChanges[playerCountryId] = (relationChanges[playerCountryId] || 0) + 25;
        }
        break;

      case 'trade_policy':
        if (success && countryChanges.relations && countryChanges.government) {
          // Trade policies improve relations and slightly increase stability
          const currentRelation = countryChanges.relations[playerCountryId] || 0;
          countryChanges.relations[playerCountryId] = Math.min(100, currentRelation + 12);
          relationChanges[playerCountryId] = (relationChanges[playerCountryId] || 0) + 12;
          countryChanges.government.stability = Math.min(100, 
            (countryChanges.government.stability || 50) + 5
          );
        }
        break;
    }

    return {
      countryChanges,
      prestigeChange,
      relationChanges
    };
  }

  /**
   * Process a policy implementation attempt
   */
  static processPolicy(
    policy: Policy,
    targetCountry: Country,
    playerCountryId: string,
    playerPrestige: number
  ): {
    success: boolean;
    successProbability: number;
    countryChanges: Partial<Country>;
    prestigeChange: number;
    relationChanges: Record<string, number>;
    message: string;
  } {
    const successProbability = this.calculateSuccessProbability(
      policy, targetCountry, playerCountryId, playerPrestige
    );

    const success = Math.random() < successProbability;

    const effects = this.applyPolicyEffects(policy, targetCountry, playerCountryId, success);

    // Calculate prestige change using PrestigeService
    const prestigeContext = {
      countries: { [targetCountry.id]: targetCountry },
      playerFaction: playerCountryId,
      currentPrestige: playerPrestige,
      turn: 1, // This should be passed from game state
      activePolicies: [policy]
    };
    
    const prestigeFromService = PrestigeService.calculatePolicyPrestigeChange(
      policy, targetCountry, prestigeContext
    );

    // Combine prestige changes
    const totalPrestigeChange = effects.prestigeChange + prestigeFromService.amount;

    const message = success 
      ? `${policy.name} implemented successfully in ${targetCountry.name}`
      : `${policy.name} implementation failed in ${targetCountry.name}`;

    return {
      success,
      successProbability,
      countryChanges: effects.countryChanges,
      prestigeChange: totalPrestigeChange,
      relationChanges: effects.relationChanges,
      message
    };
  }

  /**
   * Check if a policy can be implemented given current game state
   */
  static canImplementPolicy(
    policy: Policy,
    targetCountry: Country,
    playerCountryId: string,
    playerState: {
      politicalCapital: number;
      economicReserves: number;
      militaryReserves: number;
    }
  ): { canImplement: boolean; reason?: string } {
    // Check resource requirements
    if (playerState.politicalCapital < policy.cost.politicalCapital) {
      return { canImplement: false, reason: 'Insufficient political capital' };
    }

    if (policy.cost.economicCost && playerState.economicReserves < policy.cost.economicCost) {
      return { canImplement: false, reason: 'Insufficient economic resources' };
    }

    if (policy.cost.militaryCost && playerState.militaryReserves < policy.cost.militaryCost) {
      return { canImplement: false, reason: 'Insufficient military resources' };
    }

    // Check policy requirements
    if (policy.requirements) {
      const currentRelation = targetCountry.relations[playerCountryId] || 0;

      if (policy.requirements.minRelationWithTarget && currentRelation < policy.requirements.minRelationWithTarget) {
        return { canImplement: false, reason: 'Relations too poor with target country' };
      }

      if (policy.requirements.maxRelationWithTarget && currentRelation > policy.requirements.maxRelationWithTarget) {
        return { canImplement: false, reason: 'Relations too good for this policy type' };
      }

      if (policy.requirements.targetAlignment && 
          !policy.requirements.targetAlignment.includes(targetCountry.government.alignment)) {
        return { canImplement: false, reason: 'Target country alignment incompatible' };
      }

      if (policy.requirements.isTargetSuperpower !== undefined) {
        const isSuperpower = ['USA', 'USSR'].includes(targetCountry.id);
        if (policy.requirements.isTargetSuperpower !== isSuperpower) {
          return { 
            canImplement: false, 
            reason: policy.requirements.isTargetSuperpower 
              ? 'Policy can only target superpowers' 
              : 'Policy cannot target superpowers' 
          };
        }
      }
    }

    return { canImplement: true };
  }
}