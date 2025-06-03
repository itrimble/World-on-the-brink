import * as THREE from 'three';

// Assuming Country and MapMode might be used elsewhere,
// they could be in a shared types file like 'src/renderer/types.ts'
// For now, defining them here for self-containment.

export enum MapMode {
  Political = 'POLITICAL',
  Terrain = 'TERRAIN',
  Population = 'POPULATION',
  GDP = 'GDP',
  DevelopmentIndex = 'DEVELOPMENT_INDEX', // Example, if data becomes available
}

// Simplified Country type based on available GeoJSON properties and potential future needs
export interface Country {
  id: string; // ADM0_A3 or ISO_A3
  name: string; // NAME property
  properties: Record<string, any>; // Store all other GeoJSON properties

  // Placeholder for more detailed, structured data if available/needed later
  government?: {
    type?: string; // e.g., Republic, Monarchy
    // ... other government details
  };
  economy?: {
    gdp?: number; // GDP_MD
    incomeGroup?: string; // INCOME_GRP
    sector?: string; // ECONOMY
    // ... other economy details
  };
  internal?: {
    population?: number; // POP_EST
    // ... other internal details
  };
  relations?: {
    // ... relations details
  };
  // Visual properties, can be moved to a different structure if needed
  mapColor?: string; // From MAPCOLOR7, MAPCOLOR8 etc.
}

export interface MapState {
  currentMapMode: MapMode;
  selectedCountryId: string | null;
  hoveredCountryId: string | null;
  // Potentially add other global map states here, like zoom level, camera position if managed globally
}

export function createInitialMapState(): MapState {
  return {
    currentMapMode: MapMode.Political,
    selectedCountryId: null,
    hoveredCountryId: null,
  };
}

// State Setters (pure functions)
export function setStateMapMode(currentState: MapState, mode: MapMode): MapState {
  return {
    ...currentState,
    currentMapMode: mode,
  };
}

export function setSelectedCountry(currentState: MapState, countryId: string | null): MapState {
  return {
    ...currentState,
    selectedCountryId: countryId,
  };
}

export function setHoveredCountry(currentState: MapState, countryId: string | null): MapState {
  return {
    ...currentState,
    hoveredCountryId: countryId,
  };
}


const DEFAULT_COUNTRY_COLOR_HEX = 0xCCCCCC; // Light Grey as a default

/**
 * Determines the base color of a country based on its data and the current map mode.
 * @param country The country data.
 * @param mode The current map mode.
 * @returns A THREE.Color object.
 */
export function getCountryBaseColor(country: Country | undefined, mode: MapMode): THREE.Color {
  if (!country || !country.properties) {
    return new THREE.Color(DEFAULT_COUNTRY_COLOR_HEX);
  }

  switch (mode) {
    case MapMode.Political:
      // Example: Use MAPCOLOR7 if available, otherwise default
      // GeoJSON properties often use strings for colors, or numerical indices.
      // This needs to be adapted to the actual data format in world-countries.geojson
      if (country.properties.MAPCOLOR7) {
        // Attempt to create a color based on MAPCOLOR7. This is a simplification.
        // Real map coloring is more complex (e.g., ensuring adjacent countries have different colors).
        // For now, we'll use a pseudo-random color based on the MAPCOLOR7 value.
        const colorIndex = parseInt(country.properties.MAPCOLOR7, 10) % 10; // Example
        return new THREE.Color().setHSL(colorIndex / 10, 0.7, 0.7);
      }
      return new THREE.Color(DEFAULT_COUNTRY_COLOR_HEX);

    case MapMode.Population:
      // Example: Color intensity based on population
      // This requires knowing the range of POP_EST values to normalize properly.
      const popEst = country.properties.POP_EST ? Number(country.properties.POP_EST) : 0;
      if (popEst > 0) {
        const intensity = Math.min(1, Math.log10(popEst) / Math.log10(1.4e9)); // Normalize against max known population (approx)
        return new THREE.Color(intensity, 0, 0); // Red intensity
      }
      return new THREE.Color(DEFAULT_COUNTRY_COLOR_HEX);

    case MapMode.GDP:
      const gdpMd = country.properties.GDP_MD ? Number(country.properties.GDP_MD) : 0;
      if (gdpMd > 0) {
        const intensity = Math.min(1, Math.log10(gdpMd) / Math.log10(2.1e7)); // Normalize against max known GDP (approx)
        return new THREE.Color(0, intensity, 0); // Green intensity
      }
      return new THREE.Color(DEFAULT_COUNTRY_COLOR_HEX);

    // Add more cases for other map modes as needed
    // case MapMode.Terrain:
    //   return new THREE.Color(0x556B2F); // DarkOliveGreen
    // case MapMode.DevelopmentIndex:
    //   // Logic based on development index
    //   return new THREE.Color(0x0000FF); // Blue for example

    default:
      return new THREE.Color(DEFAULT_COUNTRY_COLOR_HEX);
  }
}
