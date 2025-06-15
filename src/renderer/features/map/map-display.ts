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
 * @param baseColor The base color of the country (usually its originalColor).
 * @param isSelected Whether the country is currently selected.
 * @param isHovered Whether the country is currently hovered.
 */
export function updateCountryMeshAppearance(
  countryData: CountryMeshData,
  baseColor: THREE.Color,
  isSelected: boolean,
  isHovered: boolean
): void {
  if (!countryData || !countryData.meshGroup) {
    console.warn('updateCountryMeshAppearance: Invalid countryData or meshGroup.');
    return;
  }

  const finalColor = baseColor.clone(); // Start with the base color

  if (isSelected) {
    // Apply HSL offset for selection: slightly increase saturation and lightness
    // Example: targetColor.offsetHSL(0, 0.1, 0.25);
    const hsl = { h: 0, s: 0, l: 0 };
    finalColor.getHSL(hsl);
    finalColor.setHSL(hsl.h, Math.min(1, hsl.s + 0.1), Math.min(1, hsl.l + 0.25));
  }
  if (isHovered && !isSelected) { // Apply hover effect only if not selected, or combine
    // Apply HSL offset for hover: increase saturation more, slightly less lightness increase
    // Example: targetColor.offsetHSL(0, 0.2, 0.15);
    const hsl = { h: 0, s: 0, l: 0 };
    // If selected, hover might be on top of selected color or a different effect
    // For now, let's assume hover on a selected item doesn't change its "selected" appearance further via hover HSL.
    // Or, if you want hover to be dominant or additive:
    // finalColor.getHSL(hsl); // Get HSL of potentially already modified selected color
    finalColor.getHSL(hsl); // Get HSL of baseColor if hover should not stack on selection, or finalColor if it should
    finalColor.setHSL(hsl.h, Math.min(1, hsl.s + 0.2), Math.min(1, hsl.l + 0.15));
  }
  // For items that are hovered AND selected, the selection adjustment takes precedence
  // or you could define a combined effect. For this example, selection highlight is stronger.

  countryData.meshGroup.children.forEach(mesh => {
    if (mesh instanceof THREE.Mesh && mesh.material instanceof THREE.MeshStandardMaterial) {
      mesh.material.color.set(finalColor);
      mesh.material.needsUpdate = true;
    }
  });
}

/**
 * Updates the appearance of all country meshes based on selection.
 * @param countryMeshMap A map of country IDs to their mesh data.
 * @param selectedCountryId The ID of the currently selected country, or null if none.
 * @param hoveredCountryId The ID of the currently hovered country, or null if none.
 */
export function updateAllCountryMeshAppearances(
  countryMeshMap: CountryMeshMap,
  selectedCountryId: string | null,
  hoveredCountryId: string | null
  // highlightColor is no longer needed here as effects are relative
): void {
  if (!countryMeshMap) {
    console.warn('updateAllCountryMeshAppearances: countryMeshMap is null.');
    return;
  }

  countryMeshMap.forEach((countryData, countryId) => {
    const isSelected = countryId === selectedCountryId;
    const isHovered = countryId === hoveredCountryId;
    updateCountryMeshAppearance(countryData, countryData.originalColor, isSelected, isHovered);
  });
}

/**
 * Updates the camera's Z position based on zoom and pans the mapGroup.
 * @param mapGroup The THREE.Group containing all map meshes.
 * @param camera The THREE.PerspectiveCamera to update.
 * @param currentCenter The current center of the map view (will be interpolated).
 * @param targetCenter The target center for panning.
 * @param zoomLevel The current zoom level.
 * @param deltaTime Time since the last frame, for smooth interpolation.
 * @returns The new currentCenter vector after interpolation.
 */
export function updateCameraMovement(
  mapGroup: THREE.Group,
  camera: THREE.PerspectiveCamera,
  currentCenter: THREE.Vector2,
  targetCenter: THREE.Vector2,
  zoomLevel: number,
  deltaTime: number
): THREE.Vector2 {
  if (!camera || !mapGroup || !currentCenter || !targetCenter) {
    console.warn("updateCameraMovement: Missing required arguments.");
    return currentCenter || new THREE.Vector2(); // Return current or default if undefined
  }

  // Panning: Interpolate currentCenter towards targetCenter
  // Adjust interpolationFactor for desired panning speed (e.g., 5.0 for faster, 1.0 for slower)
  const interpolationFactor = 4.0;
  currentCenter.lerp(targetCenter, interpolationFactor * deltaTime);

  // Update mapGroup position based on the (interpolated) currentCenter
  // The map itself moves inversely to the camera's logical XY movement
  mapGroup.position.x = -currentCenter.x;
  mapGroup.position.y = -currentCenter.y;
  // mapGroup.position.z remains 0 as individual meshes are at z=0 relative to mapGroup

  // Zoom: Adjust camera Z position based on zoom level
  const cameraZ = 180 / Math.max(0.1, zoomLevel);
  camera.position.z = THREE.MathUtils.clamp(cameraZ, 30, 800);

  // Camera looks at the center of its view, which is effectively where the mapGroup is positioned
  // If mapGroup is at (-currentCenter.x, -currentCenter.y, 0)
  // and camera is at (0,0,cameraZ), it's already looking towards the origin of the mapGroup's new position.
  // If camera itself was panned, it would be: camera.lookAt(currentCenter.x, currentCenter.y, 0);
  // But here, we move the map, so camera can often just look at mapGroup.position or (0,0,0) in its local space if mapGroup is parented.
  // For simplicity, if camera is a direct child of scene and mapGroup is also direct child of scene:
  camera.lookAt(mapGroup.position.x, mapGroup.position.y, 0);


  // camera.updateProjectionMatrix(); // Only needed if FOV or aspect ratio changes.
  // For Z position change, it's not strictly necessary unless other projection parameters change.

  return currentCenter.clone(); // Return the new state of currentCenter
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
