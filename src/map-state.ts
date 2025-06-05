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
  zoomLevel: number;
  currentCenter: THREE.Vector2; // For smooth panning
  targetCenter: THREE.Vector2;  // Target for panning
}

export function createInitialMapState(): MapState {
  return {
    currentMapMode: MapMode.Political,
    selectedCountryId: null,
    hoveredCountryId: null,
    zoomLevel: 1,
    currentCenter: new THREE.Vector2(0, 0),
    targetCenter: new THREE.Vector2(0, 0),
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

export function setZoomLevel(currentState: MapState, zoomLevel: number): MapState {
  return {
    ...currentState,
    // Clamp zoomLevel between 0.25 and 5 as requested
    zoomLevel: Math.max(0.25, Math.min(5, zoomLevel))
  };
}

export function setCurrentCenter(currentState: MapState, center: THREE.Vector2): MapState {
  return {
    ...currentState,
    currentCenter: center.clone(), // Clone to ensure immutability if Vector2 is mutated elsewhere
  };
}

export function setTargetCenter(currentState: MapState, target: THREE.Vector2): MapState {
  return {
    ...currentState,
    targetCenter: target.clone(),
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
      // Assuming an 'ALIGNMENT' property like 'western', 'eastern', 'neutral'
      const alignment = country.properties.ALIGNMENT?.toLowerCase(); // Make it case-insensitive
      if (alignment === 'western') {
        return new THREE.Color(0x0077FF); // Brighter blue
      } else if (alignment === 'eastern') {
        return new THREE.Color(0xFF3333); // Brighter red
      } else if (alignment === 'neutral') {
        return new THREE.Color(0x33CC33); // Brighter green
      } else if (country.properties.MAPCOLOR7) { // Fallback to MAPCOLOR7 if no specific alignment
        const colorIndex = parseInt(country.properties.MAPCOLOR7, 10) % 10;
        return new THREE.Color().setHSL(colorIndex / 10, 0.7, 0.6); // Adjusted lightness
      }
      // Fallback for 'other' or undefined alignment if MAPCOLOR7 also not present
      return new THREE.Color(0x9933FF); // Brighter purple for 'other'

    case MapMode.Population:
      const popEst = country.properties.POP_EST ? Number(country.properties.POP_EST) : 0;
      if (popEst > 0) {
        // Simple log scale, may need adjustment based on actual data range for better distribution
        const maxPopLog = Math.log10(1.5e9); // Approx max population
        const intensity = Math.min(1, Math.log10(popEst) / maxPopLog);
        return new THREE.Color().setHSL(0, 0.8, intensity * 0.5 + 0.2); // Red hue, varying lightness
      }
      return new THREE.Color(DEFAULT_COUNTRY_COLOR_HEX);

    case MapMode.GDP: // Or a new MapMode.EconomyDevelopment
      const incomeGrp = country.properties.INCOME_GRP?.toLowerCase();
      if (incomeGrp?.startsWith('1. high income') || incomeGrp?.startsWith('2. high income')) {
        return new THREE.Color(0x2ECC71); // Emerald green
      } else if (incomeGrp?.startsWith('3. upper middle income')) {
        return new THREE.Color(0xF1C40F); // Sunflower yellow
      } else if (incomeGrp?.startsWith('4. lower middle income') || incomeGrp?.startsWith('5. low income')) {
        return new THREE.Color(0xE74C3C); // Alizarin red
      }
      // Fallback if INCOME_GRP is not one of the expected values
      const gdpMd = country.properties.GDP_MD ? Number(country.properties.GDP_MD) : 0;
      if (gdpMd > 0) {
        const maxGdpLog = Math.log10(2.2e7); // Approx max GDP_MD for a country
        const intensity = Math.min(1, Math.log10(gdpMd) / maxGdpLog);
        return new THREE.Color().setHSL(0.33, 0.8, intensity * 0.5 + 0.2); // Green hue, varying lightness
      }
      return new THREE.Color(DEFAULT_COUNTRY_COLOR_HEX);

    case MapMode.Terrain: // Example placeholder
      return new THREE.Color(0x8B4513); // SaddleBrown for terrain

    // case MapMode.DevelopmentIndex: // Example placeholder
    //   // Logic based on development index
    //   return new THREE.Color(0x0000FF); // Blue for example

    default:
      // Fallback to a default color if mode is unknown or properties are missing
      return new THREE.Color(DEFAULT_COUNTRY_COLOR_HEX);
  }
}
