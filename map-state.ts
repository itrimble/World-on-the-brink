import * as THREE from 'three';
import { Country } from '../../../shared/types/country'; // This path might need adjustment if shared types are elsewhere

/**
 * Defines the different modes the map can be in, affecting country colors and potentially other display elements.
 */
export type MapMode = 'political' | 'influence' | 'insurgency' | 'coup' | 'economy';

/**
 * Represents the overall state of the map rendering and interaction logic.
 * This includes visual modes, zoom/pan states, and interaction states like dragging.
 */
export interface MapState {
  /** The current display mode of the map (e.g., 'political', 'economy'). */
  currentMapMode: MapMode;
  /** 
   * Data used for specific color overlays or data-driven visualizations,
   * potentially overriding or supplementing base country colors.
   * Keyed by country ID, value might be a color or a numerical value for a gradient.
   */
  currentColorData: Record<string, number>;
  /** Current zoom level of the map. Higher values mean more zoomed in. */
  zoomLevel: number;
  /** Flag indicating if the user is currently dragging (panning) the map. */
  isDragging: boolean;
  /** Screen coordinates where the current drag operation started. */
  dragStart: THREE.Vector2;
  /** The target map center coordinates towards which the camera is smoothly animating for panning. */
  targetCenter: THREE.Vector2;
  /** The current map center coordinates, reflecting the ongoing smooth pan animation. */
  currentCenter: THREE.Vector2;
}

/**
 * Creates and returns an initial `MapState` object with default values.
 * @returns The initial state for the map.
 */
export function createInitialMapState(): MapState {
  return {
    currentMapMode: 'political',
    currentColorData: {},
    zoomLevel: 1,
    isDragging: false,
    dragStart: new THREE.Vector2(),
    targetCenter: new THREE.Vector2(0, 0),
    currentCenter: new THREE.Vector2(0, 0),
  };
}

// --- State Modifier Functions ---
// These functions are pure; they take the current state and parameters,
// and return a new state object, promoting immutability.

/**
 * Updates the map mode in the state.
 * This also clears the `countryColorCache` because base country colors depend on the map mode.
 * @param state - The current `MapState`.
 * @param mode - The new `MapMode` to set.
 * @returns A new `MapState` object with the updated map mode.
 */
export function setMapMode(state: MapState, mode: MapMode): MapState {
  clearColorCache(); // Invalidate color cache as map mode changes base colors.
  return { ...state, currentMapMode: mode };
}

/**
 * Updates the `currentColorData` in the state.
 * This data might be used for overlays or specific data-driven coloring.
 * Note: If this data directly influences `getCountryBaseColor`, the color cache
 * might need to be invalidated here as well.
 * @param state - The current `MapState`.
 * @param colorData - The new color data to set.
 * @returns A new `MapState` object with the updated color data.
 */
export function setCurrentColorData(state: MapState, colorData: Record<string, number>): MapState {
  return { ...state, currentColorData: colorData };
}

/**
 * Updates the zoom level in the state, clamping it within predefined min/max values.
 * @param state - The current `MapState`.
 * @param zoomLevel - The new zoom level to set.
 * @returns A new `MapState` object with the updated (and clamped) zoom level.
 */
export function setZoomLevel(state: MapState, zoomLevel: number): MapState {
  // Clamps the zoom level between 0.5x and 4x.
  return { ...state, zoomLevel: Math.max(0.5, Math.min(4, zoomLevel)) };
}

/**
 * Updates the dragging state.
 * @param state - The current `MapState`.
 * @param isDragging - Boolean indicating if dragging is active.
 * @returns A new `MapState` object with the updated dragging state.
 */
export function setIsDragging(state: MapState, isDragging: boolean): MapState {
  return { ...state, isDragging };
}

/**
 * Updates the starting position of a drag operation.
 * @param state - The current `MapState`.
 * @param dragStart - A `THREE.Vector2` representing the screen coordinates where dragging started.
 * @returns A new `MapState` object with the updated drag start position.
 */
export function setDragStart(state: MapState, dragStart: THREE.Vector2): MapState {
  return { ...state, dragStart };
}

/**
 * Updates the target center for map panning.
 * The map will smoothly animate towards this new center.
 * @param state - The current `MapState`.
 * @param targetCenter - A `THREE.Vector2` representing the target map coordinates.
 * @returns A new `MapState` object with the updated target center.
 */
export function setTargetCenter(state: MapState, targetCenter: THREE.Vector2): MapState {
  return { ...state, targetCenter };
}

/**
 * Updates the current center of the map, usually during a smooth pan animation.
 * @param state - The current `MapState`.
 * @param currentCenter - A `THREE.Vector2` representing the current map coordinates.
 * @returns A new `MapState` object with the updated current center.
 */
export function setCurrentCenter(state: MapState, currentCenter: THREE.Vector2): MapState {
  return { ...state, currentCenter };
}

// --- Color Calculation and Caching ---

/**
 * Cache for storing calculated country base colors.
 * Keyed by a string combining country ID and map mode (e.g., "USA-political").
 * This avoids redundant calculations when colors are frequently requested.
 */
const countryColorCache = new Map<string, number>();

/**
 * Generates a unique cache key for a country and map mode combination.
 * @param countryId - The unique identifier of the country.
 * @param mapMode - The current `MapMode`.
 * @returns A string key for use with `countryColorCache`.
 */
function generateCacheKey(countryId: string, mapMode: MapMode): string {
  return `${countryId}-${mapMode}`;
}

/**
 * Clears the entire `countryColorCache`.
 * This should be called when global conditions change that would invalidate all cached colors (e.g., map mode change).
 */
export function clearColorCache(): void {
    countryColorCache.clear();
    // console.debug("Country color cache cleared."); // Optional: for debugging cache behavior
}

/**
 * Retrieves the base color for a given country and map mode.
 * Uses a cache to avoid re-calculating colors if already determined.
 * Requires `Country` objects to have a unique `id` string property for effective caching.
 * @param country - The `Country` object for which to get the color.
 * @param currentMapMode - The current `MapMode` which determines the color logic.
 * @returns A numerical representation of the color (e.g., 0xff0000 for red).
 */
export function getCountryBaseColor(country: Country, currentMapMode: MapMode): number {
  // The `Country` type should ideally enforce the presence of an `id: string`.
  // If `country.id` could be missing, more robust error handling or a default ID might be needed.
  if (!country || !country.id) {
    // console.warn("Country object is missing or has no 'id', cannot use color cache.", country);
    // Fallback to direct calculation without caching if no ID is available.
    return calculateCountryBaseColor(country, currentMapMode);
  }

  const cacheKey = generateCacheKey(country.id, currentMapMode);
  if (countryColorCache.has(cacheKey)) {
    return countryColorCache.get(cacheKey)!; // `!` asserts that key exists, due to `has` check.
  }

  const color = calculateCountryBaseColor(country, currentMapMode);
  countryColorCache.set(cacheKey, color);
  return color;
}

/**
 * Performs the actual calculation of a country's base color based on its properties and the current map mode.
 * This function is called by `getCountryBaseColor` if the color is not found in the cache.
 * @param country - The `Country` object.
 * @param currentMapMode - The current `MapMode`.
 * @returns A numerical representation of the color.
 */
function calculateCountryBaseColor(country: Country, currentMapMode: MapMode): number {
  // Ensure country and its nested properties are valid before accessing to prevent runtime errors.
  // This is especially important if the `Country` type definition allows for optional/nullable fields
  // that are used in the switch cases. For brevity, explicit checks are omitted here but are good practice.

  switch (currentMapMode) {
    case 'political':
      if (country.government?.alignment === 'western') return 0x3b82f6; // Blue
      if (country.government?.alignment === 'eastern') return 0xef4444; // Red
      if (country.government?.alignment === 'neutral') return 0x10b981; // Green
      return 0x8b5cf6; // Purple for non-aligned / other
    case 'influence':
      const usaRelation = country.relations?.usa ?? 0;
      const ussrRelation = country.relations?.ussr ?? 0;
      if (usaRelation > ussrRelation + 30) return 0x3b82f6; // Blue for USA influence
      if (ussrRelation > usaRelation + 30) return 0xef4444; // Red for USSR influence
      return 0xd97706; // Orange for contested
    case 'insurgency':
      const insurgencyLevel = country.internal?.insurgencyLevel ?? 0;
      if (insurgencyLevel < 10) return 0x10b981; // Green for peaceful
      if (insurgencyLevel < 30) return 0xf59e0b; // Yellow for unrest
      if (insurgencyLevel < 60) return 0xd97706; // Orange for guerilla war
      return 0xef4444; // Red for civil war
    case 'coup':
      const coupRisk = country.internal?.coupRisk ?? 0;
      if (coupRisk < 10) return 0x10b981; // Green for stable
      if (coupRisk < 30) return 0xf59e0b; // Yellow for some risk
      if (coupRisk < 60) return 0xd97706; // Orange for high risk
      return 0xef4444; // Red for imminent coup
    case 'economy':
      const development = country.economy?.development;
      if (development === 'high') return 0x10b981; // Green
      if (development === 'medium') return 0xf59e0b; // Yellow
      return 0xef4444; // Red for low or undefined
    default:
      // This case should ideally not be reached if `MapMode` type is exhaustive
      // and all enum values are handled. Adding a log for unexpected modes.
      // console.warn(`Unknown map mode encountered in calculateCountryBaseColor: ${currentMapMode}`);
      return 0x888888; // Default gray for unknown or unhandled modes
  }
}
```
