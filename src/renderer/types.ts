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
```
