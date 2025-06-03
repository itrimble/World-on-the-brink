import * as THREE from 'three';
import { CountryMeshMap, CountryMeshData } from './map-geometry'; // Assuming they are exported from map-geometry.ts

// Default color for highlighting selected countries
const DEFAULT_HIGHLIGHT_COLOR = new THREE.Color(0xFFFF00); // Yellow

export interface MapDisplayData {
  countryMeshes: CountryMeshMap | null;
  // other display-related data might go here
}

/**
 * Updates the appearance of a single country's mesh group.
 * @param countryData The mesh data for the country.
 * @param targetColor The color to apply if not selected.
 * @param isSelected Whether the country is currently selected.
 * @param highlightColor The color to use for highlighting if selected.
 */
export function updateCountryMeshAppearance(
  countryData: CountryMeshData,
  targetColor: THREE.Color,
  isSelected: boolean,
  highlightColor: THREE.Color = DEFAULT_HIGHLIGHT_COLOR
): void {
  if (!countryData || !countryData.meshGroup) {
    console.warn('updateCountryMeshAppearance: Invalid countryData or meshGroup.');
    return;
  }

  countryData.meshGroup.children.forEach(mesh => {
    if (mesh instanceof THREE.Mesh && mesh.material instanceof THREE.MeshStandardMaterial) {
      if (isSelected) {
        mesh.material.color.set(highlightColor);
        // Optionally, make it emissive for better visibility
        // mesh.material.emissive.set(highlightColor);
        // mesh.material.emissiveIntensity = 0.5;
      } else {
        mesh.material.color.set(targetColor);
        // mesh.material.emissive.set(0x000000); // Reset emissive if used
      }
      mesh.material.needsUpdate = true;
    }
  });
}

/**
 * Updates the appearance of all country meshes based on selection.
 * @param countryMeshMap A map of country IDs to their mesh data.
 * @param selectedCountryId The ID of the currently selected country, or null if none.
 * @param highlightColor The color to use for highlighting the selected country.
 */
export function updateAllCountryMeshAppearances(
  countryMeshMap: CountryMeshMap,
  selectedCountryId: string | null,
  highlightColor: THREE.Color = DEFAULT_HIGHLIGHT_COLOR
): void {
  if (!countryMeshMap) {
    console.warn('updateAllCountryMeshAppearances: countryMeshMap is null.');
    return;
  }

  countryMeshMap.forEach((countryData, countryId) => {
    const isSelected = countryId === selectedCountryId;
    updateCountryMeshAppearance(countryData, countryData.originalColor, isSelected, highlightColor);
  });
}

// Example usage (conceptual, would be part of a larger rendering loop or event handler)
/*
const mapDisplay: MapDisplayData = { countryMeshes: new Map() };
const selectedCountry: string | null = 'USA'; // Example: USA is selected

// Assume mapDisplay.countryMeshes is populated by createCountryMeshes
if (mapDisplay.countryMeshes) {
  updateAllCountryMeshAppearances(mapDisplay.countryMeshes, selectedCountry, new THREE.Color(0x00FF00));
}
*/
