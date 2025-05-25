import * as THREE from 'three';
import { CountryInstanceInfo, CountryInstanceMap } from './map-geometry'; 

/**
 * Defines the callback signatures for country interaction events.
 */
export interface MapInteractionHandlers {
  /** Callback function invoked when a country instance is selected (e.g., clicked). */
  onCountrySelect?: (countryId: string) => void;
  /** Callback function invoked when the mouse cursor hovers over a country instance or leaves it. `null` if no country is hovered. */
  onCountryHover?: (countryId: string | null) => void;
}

/**
 * Encapsulates all data required by the map interaction handlers.
 * This includes Three.js objects, map state, DOM elements, and callbacks.
 * This structure is passed to event handling functions to provide them with necessary context.
 */
export interface MapInteractionData {
  /** The Three.js perspective camera used for rendering the scene. */
  camera: THREE.PerspectiveCamera;
  /** A `THREE.Vector2` representing the mouse's current position in normalized device coordinates (-1 to +1 for both components). */
  mouse: THREE.Vector2;
  /** The Three.js raycaster used for detecting intersections with map objects. */
  raycaster: THREE.Raycaster;
  /** The `THREE.Group` that contains all `InstancedMesh` objects representing countries. */
  mapGroup: THREE.Group;
  /** A map from country IDs to `CountryInstanceInfo`, providing details about each rendered country instance. */
  countryInstances: CountryInstanceMap;
  /** The HTML DOM element that contains the map renderer. */
  container: HTMLElement;

  // --- Interaction State ---
  /** Flag indicating if the user is currently dragging (panning) the map. */
  isDragging: boolean;
  /** The screen coordinates (normalized) where the current drag operation started. */
  dragStart: THREE.Vector2;
  /** The target map center coordinates towards which the camera is smoothly animating for panning. */
  targetCenter: THREE.Vector2;
  /** Current zoom level of the map. */
  zoomLevel: number;

  // --- Callbacks & State Setters ---
  /** Callback to notify when a country is selected. */
  onCountrySelect?: (countryId: string) => void;
  /** Callback to notify when a country is hovered. */
  onCountryHover?: (countryId: string | null) => void;

  /** Function to update the `isDragging` state in the main `MapState`. */
  setIsDragging: (isDragging: boolean) => void;
  /** Function to update the `dragStart` position in the main `MapState`. */
  setDragStart: (dragStart: THREE.Vector2) => void;
  /** Function to update the `targetCenter` for panning in the main `MapState`. */
  setTargetCenter: (targetCenter: THREE.Vector2) => void;

  /** 
   * Callback function to request an update to a country instance's visual appearance.
   * This is typically called after a state change (e.g., hover, selection).
   */
  updateCountryInstanceAppearance: (countryId: string) => void; 
}

// --- Event Listener Management ---

/** Timestamp of the last processed mouse move event, used for throttling. @internal */
let lastMouseMoveTime = 0;
/** Minimum interval (in milliseconds) between processing mouse move events. ~30 FPS. @internal */
const MOUSE_MOVE_THROTTLE_INTERVAL = 1000 / 30; 

/**
 * Type alias for the cleanup function returned by `setupEventListeners`.
 * Calling this function will remove all event listeners set up by the module.
 */
export type CleanupFunction = () => void;

/**
 * Sets up all necessary DOM event listeners for map interaction (mouse, wheel, resize).
 * It binds the provided handlers to their respective events.
 *
 * @param container - The HTML element hosting the map.
 * @param _data - The `MapInteractionData` object. While not directly used by `setupEventListeners` itself,
 *               it's listed to indicate that the bound handlers will require it.
 * @param boundOnMouseMove - The event handler for 'mousemove' events.
 * @param boundOnMouseClick - The event handler for 'click' events.
 * @param boundOnMouseWheel - The event handler for 'wheel' events.
 * @param boundOnMouseDown - The event handler for 'mousedown' events.
 * @param boundOnMouseUp - The event handler for 'mouseup' events (attached to document).
 * @param boundOnWindowResize - The event handler for 'resize' events (attached to window).
 * @returns A `CleanupFunction` that, when called, removes all attached event listeners.
 */
export function setupEventListeners(
  container: HTMLElement,
  _data: MapInteractionData, 
  boundOnMouseMove: (event: MouseEvent) => void,
  boundOnMouseClick: (event: MouseEvent) => void,
  boundOnMouseWheel: (event: WheelEvent) => void,
  boundOnMouseDown: (event: MouseEvent) => void,
  boundOnMouseUp: (event: MouseEvent) => void,
  boundOnWindowResize: () => void
): CleanupFunction {
  container.addEventListener('mousemove', boundOnMouseMove);
  container.addEventListener('click', boundOnMouseClick);
  // `passive: false` allows `preventDefault` to be called within `boundOnMouseWheel`.
  container.addEventListener('wheel', boundOnMouseWheel, { passive: false });
  container.addEventListener('mousedown', boundOnMouseDown);
  
  // Listen for mouseup on the document to correctly end drags that finish outside the container.
  document.addEventListener('mouseup', boundOnMouseUp);
  // Also end drag if mouse leaves the document entirely (e.g., user drags off-browser).
  document.addEventListener('mouseleave', boundOnMouseUp); 
  
  window.addEventListener('resize', boundOnWindowResize);

  // Return a cleanup function to remove all listeners.
  return () => {
    container.removeEventListener('mousemove', boundOnMouseMove);
    container.removeEventListener('click', boundOnMouseClick);
    container.removeEventListener('wheel', boundOnMouseWheel);
    container.removeEventListener('mousedown', boundOnMouseDown);
    document.removeEventListener('mouseup', boundOnMouseUp);
    document.removeEventListener('mouseleave', boundOnMouseUp);
    window.removeEventListener('resize', boundOnWindowResize);
    // console.log("Map interaction event listeners cleaned up."); // For debugging
  };
}

// --- Event Handlers ---

/**
 * Handles 'mousemove' events on the map container.
 * Updates the normalized mouse coordinates and handles map panning if dragging is active.
 * This function is throttled to limit its execution frequency for performance.
 * Raycasting for hover effects is typically deferred to the animation loop (`updateRaycasterForInstancedMeshes`).
 *
 * @param event - The `MouseEvent` object.
 * @param data - The `MapInteractionData` providing context for the interaction.
 */
export function handleMouseMove(event: MouseEvent, data: MapInteractionData): void {
  const now = Date.now();
  if (now - lastMouseMoveTime < MOUSE_MOVE_THROTTLE_INTERVAL) {
    return; // Throttle the event processing.
  }
  lastMouseMoveTime = now;

  const rect = data.container.getBoundingClientRect();
  
  // Optimization: Only process if mouse is within the map container bounds.
  if (event.clientX < rect.left || event.clientX > rect.right || 
      event.clientY < rect.top || event.clientY > rect.bottom) {
    // If mouse is outside, one might want to clear hover states or stop certain interactions.
    // For now, simply returning avoids unnecessary calculations.
    return;
  }

  // Update mouse coordinates in normalized device coordinates (NDC).
  data.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  data.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  // Handle map panning if dragging is active.
  if (data.isDragging) {
    const deltaX = data.mouse.x - data.dragStart.x;
    const deltaY = data.mouse.y - data.dragStart.y;
    
    // Drag sensitivity can be tuned. This factor scales mouse movement to map movement.
    // It's influenced by camera Z position to make panning feel consistent at different zoom levels.
    const dragSensitivityFactor = 200; 
    const dragScale = (data.camera.position.z / dragSensitivityFactor);

    const newTargetCenter = data.targetCenter.clone();
    // Note: Scaling by rect.width/height might be too much if dragScale already accounts for perspective.
    // The original implementation `data.targetCenter.x += dragX * dragScale;` might be more standard
    // if map units are consistent. This depends on how mapGroup positions are interpreted.
    // Assuming mapGroup positions are in a world unit that needs to be scaled relative to screen pixels and zoom.
    newTargetCenter.x -= deltaX * dragScale * (rect.width / 2); // Invert deltaX for natural map panning
    newTargetCenter.y += deltaY * dragScale * (rect.height / 2);
    
    data.setTargetCenter(newTargetCenter);
    data.setDragStart(data.mouse.clone()); // Update drag start for the next delta calculation.
  }
}

/**
 * Handles 'click' events on the map container.
 * Performs raycasting to detect clicks on country instances.
 * If an instance is clicked, it invokes the `onCountrySelect` callback.
 *
 * @param event - The `MouseEvent` object.
 * @param data - The `MapInteractionData` providing context.
 */
export function handleMouseClick(event: MouseEvent, data: MapInteractionData): void {
  // Prevent selection if a drag operation just finished.
  if (data.isDragging) return;

  // Update raycaster from camera and mouse position.
  data.raycaster.setFromCamera(data.mouse, data.camera);
  // Intersect with children of mapGroup (which should be the InstancedMesh objects).
  const intersects = data.raycaster.intersectObjects(data.mapGroup.children, true); // `true` for recursive.

  if (intersects.length > 0) {
    const firstIntersect = intersects[0];
    // `instanceId` is a property added by Three.js when raycasting hits an InstancedMesh.
    const instanceId = (firstIntersect as any).instanceId as number | undefined;
    const object = firstIntersect.object as THREE.InstancedMesh; // The InstancedMesh itself.

    if (instanceId !== undefined && object instanceof THREE.InstancedMesh) {
      // Find the countryId corresponding to this InstancedMesh and instanceId.
      for (const [countryId, instanceInfo] of data.countryInstances.entries()) {
        if (instanceInfo.instancedMesh === object && instanceInfo.instanceId === instanceId) {
          if (data.onCountrySelect) {
            data.onCountrySelect(countryId);
          }
          return; // Click handled.
        }
      }
    }
  }
}

/**
 * Handles 'wheel' events for map zooming.
 * Updates the zoom level based on wheel delta and calls `setZoomLevel`.
 *
 * @param event - The `WheelEvent` object.
 * @param zoomData - An object containing current `zoomLevel` and `setZoomLevel` function.
 */
export function handleMouseWheel(event: WheelEvent, zoomData: { zoomLevel: number, setZoomLevel: (zoomLevel: number) => void }): void {
  event.preventDefault(); // Prevent default browser scroll behavior.
  const zoomDeltaFactor = 0.1; // Adjust for zoom sensitivity.
  const zoomDirection = Math.sign(event.deltaY) * -1; // -1 for wheel down (zoom out), 1 for wheel up (zoom in).
  const newZoomLevel = zoomData.zoomLevel + zoomDirection * zoomDeltaFactor;
  
  // `setZoomLevel` (from map-state) is responsible for clamping the zoom level within valid bounds.
  zoomData.setZoomLevel(newZoomLevel);
}

/**
 * Handles 'mousedown' events to initiate map dragging.
 * Sets the `isDragging` state and records the drag start position.
 *
 * @param event - The `MouseEvent` object.
 * @param data - The `MapInteractionData` providing context.
 */
export function handleMouseDown(event: MouseEvent, data: MapInteractionData): void {
  const rect = data.container.getBoundingClientRect();
  // Only initiate drag if mousedown is within the container.
  if (event.clientX >= rect.left && event.clientX <= rect.right && 
      event.clientY >= rect.top && event.clientY <= rect.bottom) {
    
    // Update mouse position for the exact start of the drag.
    data.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    data.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    data.setIsDragging(true);
    data.setDragStart(data.mouse.clone());
  }
}

/**
 * Handles 'mouseup' events (typically on the document) to end map dragging.
 *
 * @param event - The `MouseEvent` object. (Currently unused, but part of signature)
 * @param data - The `MapInteractionData` providing context.
 */
export function handleMouseUp(_event: MouseEvent, data: MapInteractionData): void {
  if (data.isDragging) {
    data.setIsDragging(false);
  }
}

/**
 * Updates hover states based on raycaster intersections with instanced meshes.
 * This function is typically called within the animation loop.
 * It identifies which country instance (if any) is currently under the mouse cursor
 * and updates its hover state, triggering a visual update via `updateCountryInstanceAppearance`.
 *
 * @param data - The `MapInteractionData` providing context.
 */
export function updateRaycasterForInstancedMeshes(data: MapInteractionData): void {
  // Ensure mouse coordinates are up-to-date before raycasting (if not done by a throttled mousemove).
  // If mousemove is heavily throttled, raycasting might use slightly stale mouse coords.
  // This is often acceptable for hover effects.
  data.raycaster.setFromCamera(data.mouse, data.camera);
  const intersects = data.raycaster.intersectObjects(data.mapGroup.children, true);

  let currentHoveredCountryId: string | null = null;

  if (intersects.length > 0) {
    const firstIntersect = intersects[0];
    const instanceId = (firstIntersect as any).instanceId as number | undefined;
    const object = firstIntersect.object as THREE.InstancedMesh;

    if (instanceId !== undefined && object instanceof THREE.InstancedMesh) {
      // Find the countryId for the intersected instance.
      for (const [countryId, instanceInfo] of data.countryInstances.entries()) {
        if (instanceInfo.instancedMesh === object && instanceInfo.instanceId === instanceId) {
          currentHoveredCountryId = countryId;
          if (!instanceInfo.isHovered) {
            instanceInfo.isHovered = true;
            data.updateCountryInstanceAppearance(countryId); // Update visual state.
          }
          break; 
        }
      }
    }
  }

  // Reset hover state for any instance that was previously hovered but no longer is.
  data.countryInstances.forEach((instanceInfo, countryId) => {
    if (instanceInfo.isHovered && countryId !== currentHoveredCountryId) {
      instanceInfo.isHovered = false;
      data.updateCountryInstanceAppearance(countryId); // Revert visual state.
    }
  });

  // Notify via callback about the currently hovered country (or null if none).
  if (data.onCountryHover) {
    data.onCountryHover(currentHoveredCountryId);
  }
}
```
