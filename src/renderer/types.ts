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

// Prestige 2.0: Four-pillar prestige system (inspired by Equilibrium design)
export type PrestigePillar = 'economic' | 'military' | 'cultural' | 'tech';

export interface PrestigePillars {
  economic: number;
  military: number;
  cultural: number;
  tech: number;
}

// Modern crisis types reflecting 2030s geopolitical realities
export type ModernCrisisType =
  | 'diplomatic' | 'military' | 'economic' | 'regional_conflict'
  // New modern types
  | 'cyber' | 'climate' | 'tech_governance' | 'space'
  | 'supply_chain' | 'migration' | 'resource' | 'information';

// From PRD 4.2 Crisis Management System
export interface Crisis {
  id: string;
  name: string;
  description: string;
  involvedCountries: string[];
  instigatorCountryId?: string;
  targetCountryId?: string;
  type: ModernCrisisType;
  escalationLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  prestigeAtStakeSuperpowerA: number;
  prestigeAtStakeSuperpowerB: number;
  // Per-pillar prestige stakes
  pillarStakes?: Partial<PrestigePillars>;
  status: 'emerging' | 'active' | 'resolved_peacefully' | 'resolved_conflict' | 'escalated_war';
  turnInitiated: number;
  lastActionBy?: string;
  superpowerAResponse?: string;
  superpowerBResponse?: string;
  // Template ID for modern crisis scenarios
  templateId?: string;
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

// Modern policy types: original 8 + new Global Skills from Equilibrium design
export type PolicyType =
  // Classic types (backward compatible)
  | 'military_aid' | 'insurgency_aid' | 'intervention' | 'economic_aid'
  | 'destabilization' | 'diplomatic_pressure' | 'treaty' | 'trade_policy'
  // Modern Global Skills
  | 'cyber_operation' | 'green_energy' | 'tech_sharing' | 'cultural_export'
  | 'sanctions' | 'stabilization_mission' | 'diplomatic_summit';

export interface Policy {
  id: string;
  name: string;
  description: string;
  type: PolicyType;
  cost: PolicyCost;
  effects: PolicyEffect[];
  duration?: number;
  // Per-pillar prestige impact (Prestige 2.0)
  pillarImpact?: Partial<PrestigePillars>;
  requirements?: {
    minRelationWithTarget?: number;
    maxRelationWithTarget?: number;
    targetGovernmentType?: string[];
    targetAlignment?: string[];
    isTargetSuperpower?: boolean;
  };
  status?: 'available' | 'active' | 'cooldown' | 'expired';
  targetCountryId?: string;
  turnEnacted?: number;
}
