// src/renderer/types.ts
/**
 * Defines the structure for a country's economic data.
 */
export interface CountryEconomy {
  /** Gross Domestic Product in billions or a relevant unit. */
  gdp?: number;
  /** Economic growth rate as a percentage. */
  growth?: number;
  /** Level of economic development. */
  development: 'high' | 'medium' | 'low' | 'emerging' | 'underdeveloped'; // Expanded options
}
/**
 * Defines the structure for a country's governmental information.
 */
export interface CountryGovernment {
  /** Type of government (e.g., democracy, monarchy, communist). */
  type?: string;
  /** Numerical representation of government stability (e.g., 0-100). */
  stability?: number;
  /** Geopolitical alignment of the country. */
  alignment: 'western' | 'eastern' | 'neutral' | 'other' | 'non-aligned'; // Expanded options
}
/**
 * Defines the structure for a country's internal affairs.
 */
export interface CountryInternalAffairs {
  /** Level of insurgency activity (e.g., 0-100). */
  insurgencyLevel: number;
  /** Risk of a coup d'état (e.g., 0-100). */
  coupRisk: number;
}
/**
 * Defines the structure for a country's military information.
 */
export interface CountryMilitary {
  /** Overall military power index or ranking. */
  power?: number;
  /** Annual military spending in billions or a relevant unit. */
  spending?: number;
  /** Status regarding nuclear capabilities. */
  nuclearStatus?: 'none' | 'developing' | 'arsenal' | 'suspected'; // Expanded options
}
/**
 * Represents a country in the game world.
 * This type should align with the data structure used in `worldSlice.ts`
 * and any shared type definitions if they become available.
 */
export interface Country {
  /** Unique identifier for the country (e.g., "USA", "USSR"). */
  id: string;
  /** Common name of the country. */
  name: string;
  /** Short country code (e.g., "US", "SU"). Optional. */
  code?: string;
  /** Information about the country's government. */
  government: CountryGovernment;
  /** Information about the country's economy. */
  economy: CountryEconomy;
  /** Information about the country's internal affairs. */
  internal: CountryInternalAffairs;
  /** Information about the country's military. Optional. */
  military?: CountryMilitary;
  /** 
   * Record of diplomatic relations with other countries.
   * Key is the other country's ID, value is a numerical representation of the relationship.
   * (e.g., { "USA": 100, "USSR": -50 }).
   */
  relations: Record<string, number>; 
}
// Placeholder for other shared types if needed by components.

// From PRD 4.2 Crisis Management System
export interface Crisis {
  id: string; // Unique identifier for the crisis
  name: string; // Short name or description of the crisis (e.g., "Berlin Blockade")
  description: string; // More detailed description of the crisis
  involvedCountries: string[]; // Array of country IDs involved
  instigatorCountryId?: string; // Country ID that initiated the crisis action
  targetCountryId?: string; // Country ID that is the target of the crisis action
  type: 'diplomatic' | 'military' | 'economic' | 'regional_conflict'; // Type of crisis
  escalationLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7; // Corresponds to DefCon levels + initial stages. 1=Question, 7=Nuclear War
  prestigeAtStakeSuperpowerA: number; // Prestige points at stake for superpower A
  prestigeAtStakeSuperpowerB: number; // Prestige points at stake for superpower B (if applicable)
  status: 'emerging' | 'active' | 'resolved_peacefully' | 'resolved_conflict' | 'escalated_war'; // Current status
  turnInitiated: number; // Game turn when the crisis began
  // Optional fields for specific crisis actions and responses
  lastActionBy?: string; // Player/AI that took the last action
  superpowerAResponse?: string; // Superpower A's stance or response
  superpowerBResponse?: string; // Superpower B's stance or response
}

// From PRD 4.3 Policy Implementation System
export interface PolicyCost {
  politicalCapital: number;
  economicCost?: number; // e.g., for Economic Aid
  militaryCost?: number; // e.g., for troop deployment with Military Aid/Intervention
}

export interface PolicyEffect {
  targetCountryId: string;
  stabilityChange?: number;
  insurgencyChange?: number;
  coupRiskChange?: number;
  alignmentChange?: number; // Change in alignment towards player/away from opponent
  prestigeChangePlayer?: number; // Prestige change for the implementing player
  prestigeChangeTarget?: number; // Prestige change for the target country
  relationChangeWithPlayer?: number; // Change in relations with the implementing player
  relationChangeWithOpponent?: number; // Change in relations with the opponent superpower
  // Add other specific effects as needed
}

export interface Policy {
  id: string; // Unique identifier for the policy (e.g., "military_aid_friendly")
  name: string; // Display name of the policy (e.g., "Provide Military Aid")
  description: string; // Detailed description
  type: 'military_aid' | 'insurgency_aid' | 'intervention' | 'economic_aid' | 'destabilization' | 'diplomatic_pressure' | 'treaty' | 'trade_policy'; // From PRD 4.3
  cost: PolicyCost; // Costs to implement
  effects: PolicyEffect[]; // Potential effects
  duration?: number; // Duration in turns, if applicable
  requirements?: { // Conditions to be met to enact this policy
    minRelationWithTarget?: number;
    maxRelationWithTarget?: number;
    targetGovernmentType?: string[]; // e.g., ['democracy', 'monarchy']
    targetAlignment?: string[]; // e.g., ['western', 'neutral']
    isTargetSuperpower?: boolean;
    // Add other conditions
  };
  status?: 'available' | 'active' | 'cooldown' | 'expired'; // Status of the policy instance
  targetCountryId?: string; // For policies enacted on a specific country
  turnEnacted?: number; // Turn the policy was enacted
}
