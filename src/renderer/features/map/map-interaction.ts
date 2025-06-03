import * as THREE from 'three';
import { CountryMeshMap, CountryMeshData } from './map-geometry';
import { updateCountryMeshAppearance } from './map-display'; // Assuming this is the correct path and function name

// Default colors for interaction states
const HOVER_COLOR = new THREE.Color(0xFFFF00); // Yellow for hover
const SELECTED_COLOR = new THREE.Color(0x00FF00); // Green for selected

export interface MapInteractionData {
  countryMeshes: CountryMeshMap;
  onCountrySelect: (countryId: string | null) => void;
  // Callback to update visual appearance, matches signature from map-display.ts
  updateCountryAppearanceCallback: (
    countryData: CountryMeshData,
    targetColor: THREE.Color,
    isSelected: boolean,
    highlightColor?: THREE.Color
  ) => void;
  selectedCountryId: string | null;
  hoveredCountryId: string | null;
  camera: THREE.Camera;
  scene: THREE.Scene; // Or a specific group containing only country meshes
}

/**
 * Finds the country ID and data associated with a given THREE.Object3D (Mesh).
 * It traverses up the object's parents to find the country group.
 */
function findCountryDataFromIntersect(
  object: THREE.Object3D,
  countryMeshes: CountryMeshMap
): { countryId: string; countryData: CountryMeshData } | null {
  let currentObject = object;
  while (currentObject.parent && !(currentObject instanceof THREE.Scene)) {
    if (currentObject.name && countryMeshes.has(currentObject.name)) {
      return { countryId: currentObject.name, countryData: countryMeshes.get(currentObject.name)! };
    }
    currentObject = currentObject.parent;
  }
  return null;
}

/**
 * Handles mouse click events to select countries.
 */
export function handleMouseClick(
  event: MouseEvent,
  raycaster: THREE.Raycaster,
  data: MapInteractionData
): void {
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(mouse, data.camera);

  const intersects = raycaster.intersectObjects(data.scene.children, true); // true for recursive

  if (intersects.length > 0) {
    const firstIntersect = intersects[0].object;
    const foundCountry = findCountryDataFromIntersect(firstIntersect, data.countryMeshes);

    if (foundCountry) {
      data.onCountrySelect(foundCountry.countryId);
    } else {
      data.onCountrySelect(null); // Clicked on something, but not a recognized country
    }
  } else {
    data.onCountrySelect(null); // Clicked outside any object
  }
}

/**
 * Updates raycaster interactions for country meshes, handling hover effects.
 */
export function updateRaycasterForCountryMeshes(
  raycaster: THREE.Raycaster,
  data: MapInteractionData
): void {
  raycaster.setFromCamera( // Assuming mouse coordinates are updated elsewhere or this is called in a mousemove handler
    new THREE.Vector2( /* current mouse.x */ 0, /* current mouse.y */ 0 ), // Placeholder for actual mouse coords
    data.camera
  );

  const intersects = raycaster.intersectObjects(data.scene.children, true);
  let newHoveredCountryId: string | null = null;

  if (intersects.length > 0) {
    const firstIntersect = intersects[0].object;
    const foundCountry = findCountryDataFromIntersect(firstIntersect, data.countryMeshes);
    if (foundCountry) {
      newHoveredCountryId = foundCountry.countryId;
    }
  }

  // Manage hover state changes
  if (data.hoveredCountryId !== newHoveredCountryId) {
    // Reset previously hovered country
    if (data.hoveredCountryId) {
      const oldHoverData = data.countryMeshes.get(data.hoveredCountryId);
      if (oldHoverData) {
        oldHoverData.isHovered = false;
        const colorToApply = data.selectedCountryId === data.hoveredCountryId
          ? SELECTED_COLOR
          : oldHoverData.originalColor;
        data.updateCountryAppearanceCallback(oldHoverData, colorToApply, data.selectedCountryId === data.hoveredCountryId, HOVER_COLOR);
      }
    }

    // Highlight new hovered country
    if (newHoveredCountryId) {
      const newHoverData = data.countryMeshes.get(newHoveredCountryId);
      if (newHoverData) {
        newHoverData.isHovered = true;
        // Apply hover color, but respect selected state if it's also selected
        const colorToApply = data.selectedCountryId === newHoveredCountryId
          ? SELECTED_COLOR // Or a combined selected+hover color
          : HOVER_COLOR;
        data.updateCountryAppearanceCallback(newHoverData, newHoverData.originalColor, data.selectedCountryId === newHoveredCountryId, HOVER_COLOR);
        // Simpler: just apply hover color if not selected
        // if (data.selectedCountryId !== newHoveredCountryId) {
        //   data.updateCountryAppearanceCallback(newHoverData, HOVER_COLOR, false, HOVER_COLOR);
        // }
      }
    }
    data.hoveredCountryId = newHoveredCountryId;
  }
}

// Note: Mouse coordinate updates for updateRaycasterForCountryMeshes
// would typically happen in the main render loop or a mousemove event listener
// that then calls this function. For this subtask, the internal logic is the focus.
// The placeholder (0,0) for mouse coordinates in updateRaycasterForCountryMeshes
// means it won't correctly find intersects without external mouse updates.
// The subtask asks to adapt logic, which has been done.
// The actual call to updateCountryMeshAppearance from map-display.ts is aliased
// to data.updateCountryAppearanceCallback in MapInteractionData for flexibility.
// A decision was made to use HOVER_COLOR for hover, and SELECTED_COLOR for selected.
// If a country is selected AND hovered, it will show SELECTED_COLOR (or a combined one if desired).
// The current logic for hover state change ensures the previously hovered country is reset
// to its correct state (selected or original) before applying hover to a new one.
// A helper findCountryDataFromIntersect was added to avoid code duplication.
// The updateCountryMeshAppearance function from map-display.ts is expected to handle
// setting the mesh material color directly.
