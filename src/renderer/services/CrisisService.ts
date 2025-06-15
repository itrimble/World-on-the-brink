// src/renderer/services/CrisisService.ts

import type { Crisis, Country, Policy } from '../types';

/**
 * Core Crisis Management Service
 * Implements the 7-stage crisis escalation system from PRD Section 4.2
 * 
 * Escalation Levels:
 * 1. Question (diplomatic inquiry)
 * 2. Challenge (formal protest)
 * 3. Diplomatic Crisis (public confrontation)
 * 4. DefCon 4 (military alert)
 * 5. DefCon 3 (heightened readiness)
 * 6. DefCon 2 (war preparation)
 * 7. DefCon 1 (nuclear war - game over)
 */
export class CrisisService {
  
  /**
   * Generate a new crisis based on policy actions and world state
   */
  static generateCrisis(params: {
    triggeringPolicy: Policy;
    instigatorCountryId: string;
    targetCountryId: string;
    currentTurn: number;
    worldTension: number;
  }): Crisis {
    const { triggeringPolicy, instigatorCountryId, targetCountryId, currentTurn, worldTension } = params;
    
    // Calculate initial escalation level based on policy type and world tension
    const baseEscalationLevel = this.calculateInitialEscalationLevel(triggeringPolicy, worldTension);
    
    // Calculate prestige stakes based on policy impact and countries involved
    const prestigeStakes = this.calculatePrestigeStakes(triggeringPolicy, instigatorCountryId, targetCountryId);
    
    const crisis: Crisis = {
      id: `crisis_${currentTurn}_${Date.now()}`,
      name: this.generateCrisisName(triggeringPolicy, targetCountryId),
      description: this.generateCrisisDescription(triggeringPolicy, instigatorCountryId, targetCountryId),
      involvedCountries: [instigatorCountryId, targetCountryId],
      instigatorCountryId,
      targetCountryId,
      type: this.mapPolicyTypeToCrisisType(triggeringPolicy.type),
      escalationLevel: baseEscalationLevel,
      prestigeAtStakeSuperpowerA: prestigeStakes.superpowerA,
      prestigeAtStakeSuperpowerB: prestigeStakes.superpowerB,
      status: 'emerging',
      turnInitiated: currentTurn,
      lastActionBy: instigatorCountryId
    };
    
    return crisis;
  }
  
  /**
   * Escalate a crisis to the next level
   */
  static escalateCrisis(crisis: Crisis, actionBy: string): Crisis {
    if (crisis.escalationLevel >= 7) {
      // Already at maximum escalation (Nuclear War)
      return {
        ...crisis,
        status: 'escalated_war',
        lastActionBy: actionBy
      };
    }
    
    const newEscalationLevel = Math.min(7, crisis.escalationLevel + 1) as Crisis['escalationLevel'];
    
    return {
      ...crisis,
      escalationLevel: newEscalationLevel,
      lastActionBy: actionBy,
      status: newEscalationLevel === 7 ? 'escalated_war' : 'active'
    };
  }
  
  /**
   * De-escalate a crisis (back down)
   */
  static deEscalateCrisis(crisis: Crisis, actionBy: string): Crisis {
    if (crisis.escalationLevel <= 1) {
      // Already at minimum escalation, resolve peacefully
      return {
        ...crisis,
        status: 'resolved_peacefully',
        lastActionBy: actionBy
      };
    }
    
    const newEscalationLevel = Math.max(1, crisis.escalationLevel - 1) as Crisis['escalationLevel'];
    
    return {
      ...crisis,
      escalationLevel: newEscalationLevel,
      lastActionBy: actionBy,
      status: newEscalationLevel === 1 ? 'resolved_peacefully' : 'active'
    };
  }
  
  /**
   * Calculate prestige impact when crisis resolves
   */
  static calculatePrestigeImpact(crisis: Crisis, winner: 'superpowerA' | 'superpowerB' | 'tie'): {
    superpowerAChange: number;
    superpowerBChange: number;
  } {
    const basePrestige = crisis.escalationLevel * 10; // Higher escalation = more prestige at stake
    
    switch (winner) {
      case 'superpowerA':
        return {
          superpowerAChange: crisis.prestigeAtStakeSuperpowerA,
          superpowerBChange: -crisis.prestigeAtStakeSuperpowerB
        };
      case 'superpowerB':
        return {
          superpowerAChange: -crisis.prestigeAtStakeSuperpowerA,
          superpowerBChange: crisis.prestigeAtStakeSuperpowerB
        };
      case 'tie':
        return {
          superpowerAChange: Math.floor(crisis.prestigeAtStakeSuperpowerA * 0.2),
          superpowerBChange: Math.floor(crisis.prestigeAtStakeSuperpowerB * 0.2)
        };
    }
  }
  
  /**
   * Check if crisis should trigger accidental escalation
   */
  static shouldAccidentallyEscalate(crisis: Crisis, worldTension: number): boolean {
    if (crisis.escalationLevel < 4) return false; // Only at DefCon levels
    
    // Higher escalation level and world tension increase accident risk
    const riskFactor = (crisis.escalationLevel - 3) / 4; // 0.25 at DefCon 4, 1.0 at DefCon 7
    const tensionFactor = worldTension / 100; // Assuming tension is 0-100
    
    const accidentProbability = riskFactor * tensionFactor * 0.05; // Max 5% chance
    
    return Math.random() < accidentProbability;
  }
  
  /**
   * Get escalation level name for display
   */
  static getEscalationLevelName(level: Crisis['escalationLevel']): string {
    const levelNames = {
      1: 'Question',
      2: 'Challenge', 
      3: 'Diplomatic Crisis',
      4: 'DefCon 4',
      5: 'DefCon 3',
      6: 'DefCon 2',
      7: 'DefCon 1 - Nuclear War'
    };
    
    return levelNames[level];
  }
  
  // Private helper methods
  
  private static calculateInitialEscalationLevel(policy: Policy, worldTension: number): Crisis['escalationLevel'] {
    let baseLevel = 1; // Start with Question
    
    // Adjust based on policy type
    switch (policy.type) {
      case 'military_aid':
      case 'insurgency_aid':
        baseLevel = 2; // Challenge
        break;
      case 'intervention':
        baseLevel = 3; // Diplomatic Crisis
        break;
      case 'destabilization':
        baseLevel = 2; // Challenge
        break;
      default:
        baseLevel = 1; // Question
    }
    
    // Adjust based on world tension
    if (worldTension > 70) {
      baseLevel = Math.min(7, baseLevel + 2);
    } else if (worldTension > 40) {
      baseLevel = Math.min(7, baseLevel + 1);
    }
    
    return baseLevel as Crisis['escalationLevel'];
  }
  
  private static calculatePrestigeStakes(policy: Policy, instigatorId: string, targetId: string): {
    superpowerA: number;
    superpowerB: number;
  } {
    // Base prestige calculation - higher for more significant actions
    let basePrestige = 20;
    
    switch (policy.type) {
      case 'intervention':
        basePrestige = 50;
        break;
      case 'military_aid':
      case 'insurgency_aid':
        basePrestige = 30;
        break;
      case 'economic_aid':
        basePrestige = 15;
        break;
      case 'destabilization':
        basePrestige = 40;
        break;
      default:
        basePrestige = 20;
    }
    
    return {
      superpowerA: basePrestige,
      superpowerB: basePrestige
    };
  }
  
  private static mapPolicyTypeToCrisisType(policyType: Policy['type']): Crisis['type'] {
    switch (policyType) {
      case 'military_aid':
      case 'insurgency_aid':
      case 'intervention':
        return 'military';
      case 'economic_aid':
      case 'trade_policy':
        return 'economic';
      case 'diplomatic_pressure':
      case 'treaty':
        return 'diplomatic';
      case 'destabilization':
        return 'regional_conflict';
      default:
        return 'diplomatic';
    }
  }
  
  private static generateCrisisName(policy: Policy, targetCountryId: string): string {
    const countryName = targetCountryId; // TODO: Convert country ID to display name
    
    switch (policy.type) {
      case 'intervention':
        return `${countryName} Intervention Crisis`;
      case 'military_aid':
        return `${countryName} Military Aid Dispute`;
      case 'insurgency_aid':
        return `${countryName} Insurgency Crisis`;
      case 'destabilization':
        return `${countryName} Destabilization Crisis`;
      case 'economic_aid':
        return `${countryName} Economic Influence Crisis`;
      default:
        return `${countryName} Diplomatic Crisis`;
    }
  }
  
  private static generateCrisisDescription(policy: Policy, instigatorId: string, targetId: string): string {
    const instigator = instigatorId; // TODO: Convert to display name
    const target = targetId; // TODO: Convert to display name
    
    switch (policy.type) {
      case 'intervention':
        return `${instigator} has initiated military intervention in ${target}, creating a major international crisis.`;
      case 'military_aid':
        return `${instigator}'s military aid to ${target} has sparked tensions and diplomatic protests.`;
      case 'insurgency_aid':
        return `Allegations of ${instigator} supporting insurgent groups in ${target} have created a serious crisis.`;
      case 'destabilization':
        return `${instigator}'s destabilization efforts in ${target} have been exposed, causing international incident.`;
      case 'economic_aid':
        return `${instigator}'s significant economic aid to ${target} has created sphere of influence tensions.`;
      default:
        return `Diplomatic tensions between ${instigator} and ${target} have escalated into a crisis situation.`;
    }
  }
}