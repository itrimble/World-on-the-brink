import * as THREE from 'three';
import { CountryMeshMap, CountryMeshData } from './map-geometry';
// updateCountryMeshAppearance is used via a callback, so direct import isn't strictly necessary here,
// but good for type checking if the callback signature is complex.

// These constants are for reference if map-display.ts doesn't export them or if specific
// interaction-related colors are needed here. For now, map-display handles actual color application.
// const HOVER_COLOR = new THREE.Color(0xFFFF00);
// const SELECTED_COLOR = new THREE.Color(0x00FF00);

export interface MapInteractionData {
  countryMeshes: CountryMeshMap;
  onCountrySelect: (countryId: string | null) => void;
  updateCountryAppearanceCallback: ( // Signature matches map-display.ts
    countryData: CountryMeshData,
    baseColor: THREE.Color,
    isSelected: boolean,
    isHovered: boolean
  ) => void;
  selectedCountryId: string | null;
  hoveredCountryId: string | null; // This will be updated by updateRaycasterForCountryMeshes
  camera: THREE.Camera;
  scene: THREE.Scene; // Should be the group containing country meshes for raycasting
  zoomLevel?: number;

  // Panning related state, managed by MapRenderer via these callbacks
  isDragging: boolean;
  dragStart: THREE.Vector2;
  setIsDragging: (isDragging: boolean) => void;
  setDragStart: (dragStart: THREE.Vector2) => void;
  onPan: (deltaX: number, deltaY: number) => void;
}

const DRAG_SENSITIVITY_FACTOR = 0.05; // Adjusted for potentially more sensitive panning

/**
 * Finds the country ID and data associated with a given THREE.Object3D (Mesh).
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
  raycaster: THREE.Raycaster, // Assumed to be already updated with mouse coordinates
  data: MapInteractionData
): void {
  // Note: Raycaster should be updated with current mouse coordinates before calling this function.
  // MapRenderer's onClick should do this.
  const intersects = raycaster.intersectObjects(data.scene.children, true);

  if (intersects.length > 0) {
    const firstIntersect = intersects[0].object;
    const foundCountry = findCountryDataFromIntersect(firstIntersect, data.countryMeshes);

    if (foundCountry) {
      data.onCountrySelect(foundCountry.countryId);
    } else {
      data.onCountrySelect(null);
    }
  } else {
    data.onCountrySelect(null);
  }
}

/**
 * Handles mouse move events for hover effects and dragging.
 */
export function handleMouseMove(
    event: MouseEvent,
    raycaster: THREE.Raycaster, // Assumed to be already updated with mouse coordinates
    data: MapInteractionData
  ): void {

    if (data.isDragging) {
      const currentMouse = new THREE.Vector2(event.clientX, event.clientY);
      const deltaX = currentMouse.x - data.dragStart.x;
      const deltaY = currentMouse.y - data.dragStart.y;

      const zoomFactor = data.zoomLevel ? Math.max(0.1, data.zoomLevel) : 1.0;
      // Panning speed should decrease as zoom increases (camera is closer)
      // A smaller dragScale means more mouse movement is needed for the same pan distance.
      const dragScale = (DRAG_SENSITIVITY_FACTOR * 50) / (data.camera.position.z * zoomFactor) ;


      const scaledDeltaX = deltaX * dragScale;
      // Invert deltaY because screen Y is typically top-to-bottom, Three.js Y is bottom-to-top for map panning
      const scaledDeltaY = -deltaY * dragScale;

      data.onPan(scaledDeltaX, scaledDeltaY);
      data.setDragStart(currentMouse);
    } else {
      // Raycaster is assumed to be updated in MapRenderer's onMouseMove
      updateRaycasterForCountryMeshes(raycaster, data);
    }
  }

/**
 * Updates hover effects based on raycaster intersections.
 */
export function updateRaycasterForCountryMeshes(
    raycaster: THREE.Raycaster, // Raycaster should be already set with camera and mouse
    data: MapInteractionData
  ): void {
    const intersects = raycaster.intersectObjects(data.scene.children, true);
    let newHoveredCountryId: string | null = null;

    if (intersects.length > 0) {
      const firstIntersect = intersects[0].object;
      const foundCountry = findCountryDataFromIntersect(firstIntersect, data.countryMeshes);
      if (foundCountry) {
        newHoveredCountryId = foundCountry.countryId;
      }
    }

    if (data.hoveredCountryId !== newHoveredCountryId) {
      // Reset previously hovered country
      if (data.hoveredCountryId) {
        const oldHoverData = data.countryMeshes.get(data.hoveredCountryId);
        if (oldHoverData) {
          // oldHoverData.isHovered = false; // State managed by MapRenderer via setHoveredCountry
          const isSelected = data.selectedCountryId === data.hoveredCountryId;
          data.updateCountryAppearanceCallback(oldHoverData, oldHoverData.originalColor, isSelected, false);
        }
      }

      // Highlight new hovered country
      if (newHoveredCountryId) {
        const newHoverData = data.countryMeshes.get(newHoveredCountryId);
        if (newHoverData) {
          // newHoverData.isHovered = true; // State managed by MapRenderer via setHoveredCountry
          const isSelected = data.selectedCountryId === newHoveredCountryId;
          data.updateCountryAppearanceCallback(newHoverData, newHoverData.originalColor, isSelected, true);
        }
      }
      // Crucially, update the hoveredCountryId in the interactionData object,
      // so MapRenderer can pick it up and update its own state.
      data.hoveredCountryId = newHoveredCountryId;
    }
  }
