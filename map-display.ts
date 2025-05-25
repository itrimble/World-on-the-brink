import * as THREE from 'three';
import { CountryInstanceInfo, CountryInstanceMap } from './map-geometry'; 

/**
 * Encapsulates data required by display functions, primarily focusing on Three.js scene components
 * and the map of country instances for visual updates.
 */
export interface MapDisplayData {
  /** The main Three.js scene object. */
  scene: THREE.Scene;
  /** The perspective camera used to view the scene. */
  camera: THREE.PerspectiveCamera;
  /** The WebGL renderer responsible for drawing the scene. */
  renderer: THREE.WebGLRenderer;
  /** The `THREE.Group` containing all `InstancedMesh` objects that represent countries. */
  mapGroup: THREE.Group;
  /** A map from country IDs to `CountryInstanceInfo`, holding state and references for each rendered country. */
  countryInstances: CountryInstanceMap;
}

/**
 * Sets up basic lighting for the scene.
 * Includes an ambient light for overall illumination and a directional light for highlights and shadows.
 * @param scene - The `THREE.Scene` to which the lights will be added.
 */
export function setupLighting(scene: THREE.Scene): void {
  // Ambient light provides a soft, even illumination to the entire scene.
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Color: white, Intensity: 0.7
  scene.add(ambientLight);

  // Directional light simulates light from a distant source (like the sun).
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6); // Color: white, Intensity: 0.6
  directionalLight.position.set(50, 100, 75); // Positioned to cast light from an angle.
  // Note: For shadows, directionalLight.castShadow = true; would be set,
  // and objects would need `castShadow = true` and `receiveShadow = true`.
  scene.add(directionalLight);

  // Optional: Hemisphere light can provide more nuanced outdoor lighting.
  // const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.4); // Sky color, ground color, intensity
  // scene.add(hemisphereLight);
}

/**
 * Updates the camera and map group position for smooth panning and zooming.
 * It interpolates the map group's current center towards a target center and adjusts camera's Z position based on zoom level.
 *
 * @param mapGroup - The `THREE.Group` containing the map elements. Its position is adjusted for panning.
 * @param camera - The `THREE.PerspectiveCamera` viewing the scene. Its Z position is adjusted for zooming.
 * @param currentCenter - The current logical center of the map view as a `THREE.Vector2`.
 * @param targetCenter - The target logical center towards which the map view should pan.
 * @param zoomLevel - The desired zoom level. Higher values zoom in.
 * @returns The new `currentCenter` after interpolation, to be stored back in the `MapState`.
 */
export function updateCameraMovement(
  mapGroup: THREE.Group,
  camera: THREE.PerspectiveCamera,
  currentCenter: THREE.Vector2,
  targetCenter: THREE.Vector2,
  zoomLevel: number
): THREE.Vector2 {
  // Smoothly interpolate the current map center towards the target center.
  const newCurrentCenter = currentCenter.clone().lerp(targetCenter, 0.15); // Lerp factor (0.1 to 0.2 is common)

  // Apply the inverted center to the mapGroup's position for conventional map panning.
  // (e.g., dragging mouse right moves map left, revealing content to the right).
  mapGroup.position.x = -newCurrentCenter.x;
  mapGroup.position.y = newCurrentCenter.y; // Y-axis inversion depends on the 2D coordinate system setup.

  // Adjust camera's Z position based on zoom level.
  // The base value (300) and min/max zoom depths (50, 1000) depend on scene scale.
  const cameraZ = 300 / Math.max(0.1, zoomLevel); // Prevent zoomLevel from being zero or too small
  camera.position.z = THREE.MathUtils.clamp(cameraZ, 50, 1000); 
  
  return newCurrentCenter;
}


/**
 * Updates the visual appearance (specifically color) of a single country instance.
 * This is used to reflect changes in state like selection or hover.
 * It modifies the color of the specified instance within its parent `InstancedMesh`.
 *
 * @param countryId - The ID of the country whose instance appearance needs to be updated.
 * @param countryInstances - The map holding all `CountryInstanceInfo` objects.
 */
export function updateCountryInstanceAppearance(
  countryId: string,
  countryInstances: CountryInstanceMap
): void {
  const instanceInfo = countryInstances.get(countryId);
  if (!instanceInfo || !instanceInfo.instancedMesh) {
    // console.warn(`updateCountryInstanceAppearance: Instance info not found for countryId: ${countryId}`);
    return;
  }

  const { instancedMesh, instanceId, originalColor, isSelected, isHovered } = instanceInfo;
  // Start with the instance's original base color.
  const targetColor = originalColor.clone();

  // Apply HSL adjustments for selection and hover states to make them visually distinct.
  // These adjustments modify the color in place.
  if (isSelected) {
    // Example: Make selected items brighter and slightly more saturated.
    targetColor.offsetHSL(0, 0.1, 0.25); 
  }
  if (isHovered) {
    // Example: Make hovered items also distinct, perhaps a different brightness/saturation.
    targetColor.offsetHSL(0, 0.2, 0.15); 
  }
  
  // Apply the calculated color to the specific instance in the InstancedMesh.
  instancedMesh.setColorAt(instanceId, targetColor);
  
  // Crucial: Mark the `instanceColor` buffer of the InstancedMesh as needing an update.
  // This tells Three.js to re-upload the color data to the GPU.
  if (instancedMesh.instanceColor) {
    instancedMesh.instanceColor.needsUpdate = true;
  }
}


/**
 * Updates the appearance (color) of all country instances.
 * This is typically called when a global change occurs that affects all countries,
 * such as a map mode change (which redefines `originalColor` for all instances).
 * It iterates through all known country instances and applies their current state-derived color.
 *
 * @param countryInstances - The map holding all `CountryInstanceInfo` objects.
 */
export function updateAllCountryInstanceAppearances(
  countryInstances: CountryInstanceMap
): void {
  // Use a Set to efficiently track which InstancedMesh objects have been modified,
  // so `needsUpdate` is only set once per mesh.
  const meshesToUpdate = new Set<THREE.InstancedMesh>();

  countryInstances.forEach((instanceInfo) => {
    const { instancedMesh, instanceId, originalColor, isSelected, isHovered } = instanceInfo;
    const targetColor = originalColor.clone();

    if (isSelected) {
      targetColor.offsetHSL(0, 0.1, 0.25);
    }
    // isHovered is generally managed by more frequent updates from `updateRaycasterForInstancedMeshes`.
    // Including it here ensures visual consistency if this function is called after a batch state change
    // that might not have gone through the typical hover update path.
    if (isHovered) { 
      targetColor.offsetHSL(0, 0.2, 0.15);
    }
    
    instancedMesh.setColorAt(instanceId, targetColor);
    meshesToUpdate.add(instancedMesh); // Add the parent mesh to the set for update.
  });

  // Set `needsUpdate = true` for the `instanceColor` buffer of each affected InstancedMesh.
  meshesToUpdate.forEach(mesh => {
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  });
}


/**
 * Renders the Three.js scene using the provided renderer and camera.
 * This function is typically called in the main animation loop.
 * @param renderer - The `THREE.WebGLRenderer` instance.
 * @param scene - The `THREE.Scene` to render.
 * @param camera - The `THREE.Camera` through which to render the scene.
 */
export function renderScene(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
  renderer.render(scene, camera);
}

/**
 * Handles window resize events to update camera aspect ratio and renderer size.
 * This ensures the map display remains correctly proportioned when the browser window changes size.
 * @param container - The HTML element that contains the renderer's canvas.
 * @param camera - The `THREE.PerspectiveCamera` whose aspect ratio needs updating.
 * @param renderer - The `THREE.WebGLRenderer` whose size needs updating.
 */
export function handleWindowResize(
  container: HTMLElement,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
): void {
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Avoid errors if the container has zero size (e.g., if hidden).
  if (width === 0 || height === 0) return;

  camera.aspect = width / height;
  camera.updateProjectionMatrix(); // Must be called after changing camera properties like aspect.
  renderer.setSize(width, height);
}
```
