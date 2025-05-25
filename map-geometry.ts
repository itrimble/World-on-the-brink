import * as THREE from 'three';
import { Country } from '../../../shared/types/country'; // This path might need adjustment
import { MapMode } from './map-state'; // Assuming MapMode is exported from map-state

// --- Predefined Geometries ---

/**
 * The number of unique, predefined geometric shapes to use for representing countries.
 * A small set of shapes is created once and reused for all country instances to optimize performance.
 */
const NUM_PREDEFINED_SHAPES = 5;

/**
 * Array holding the set of predefined `THREE.BufferGeometry` objects.
 * These are generated once by `initializePredefinedGeometries` and then randomly assigned to countries.
 * @internal
 */
const predefinedGeometries: THREE.BufferGeometry[] = [];

/**
 * Creates a single random 2D shape geometry.
 * This is used to populate the `predefinedGeometries` array.
 * The shapes are simple polygons with a variable number of points and radius, then centered.
 * @returns A `THREE.BufferGeometry` representing the generated shape.
 * @internal
 */
function createRandomShape(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const points = 5 + Math.floor(Math.random() * 7); // 5 to 11 points
  const baseRadius = 8 + Math.random() * 4; // 8 to 12 base radius for variety

  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const radiusVariation = baseRadius * (0.6 + Math.random() * 0.8); // Ensure some irregularity
    const x = Math.cos(angle) * radiusVariation;
    const y = Math.sin(angle) * radiusVariation;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.center(); // Center the geometry for consistent scaling and positioning from its origin.
  return geometry;
}

/**
 * Initializes the `predefinedGeometries` array if it's currently empty.
 * This function should be called once during the application setup phase
 * before any map rendering that relies on these geometries occurs.
 * It populates the array with `NUM_PREDEFINED_SHAPES` unique random shapes.
 */
export function initializePredefinedGeometries(): void {
  if (predefinedGeometries.length === 0) {
    for (let i = 0; i < NUM_PREDEFINED_SHAPES; i++) {
      predefinedGeometries.push(createRandomShape());
    }
    // console.log(`Initialized ${NUM_PREDEFINED_SHAPES} predefined geometries.`); // For debugging
  }
}

// Initialize geometries when this module is loaded.
// This is a common pattern for module-level setup.
// Ensure this doesn't have unintended side effects if module is loaded multiple times in some contexts.
initializePredefinedGeometries();


// --- Instanced Mesh Data Structure ---

/**
 * Holds information about a single country's instance within an `InstancedMesh`.
 * This structure is used to manage the state and properties of individual countries
 * when using instanced rendering, allowing for efficient rendering of many similar objects.
 */
export interface CountryInstanceInfo {
  /** The unique identifier of the country this instance represents. */
  countryId: string;
  /** The local ID of this instance within its parent `InstancedMesh`. */
  instanceId: number;
  /** A reference to the `THREE.InstancedMesh` that renders this specific country instance. */
  instancedMesh: THREE.InstancedMesh;
  /** The base color calculated for this country instance, before hover or selection effects. */
  originalColor: THREE.Color;
  /** Flag indicating if this country instance is currently selected by the user. */
  isSelected: boolean;
  /** Flag indicating if the mouse cursor is currently hovering over this country instance. */
  isHovered: boolean;
  /** 
   * The transformation matrix (position, rotation, scale) for this specific instance. 
   * Stored to potentially update individual instances if needed, though batch updates are preferred for performance.
   */
  matrix: THREE.Matrix4;
  // Note: Per-instance bounding boxes are complex with InstancedMesh.
  // Raycasting is performed against the InstancedMesh, and `intersection.instanceId` identifies the hit.
  // Precise per-instance bounds for other purposes would require custom calculation.
}

/**
 * A map data structure that associates country IDs (strings) with their `CountryInstanceInfo`.
 * This allows for quick lookup of instance-specific data.
 */
export type CountryInstanceMap = Map<string, CountryInstanceInfo>;


// --- Material for Instanced Meshes ---

/**
 * A shared `THREE.MeshStandardMaterial` used for all country `InstancedMesh` objects.
 * Using a single material is crucial for performance with instanced rendering.
 * `vertexColors` is enabled to allow per-instance colors to be set via `InstancedMesh.setColorAt()`.
 * @internal
 */
const instancedCountryMaterial = new THREE.MeshStandardMaterial({
  flatShading: true, // Gives a distinct, faceted look.
  vertexColors: true, // Essential for per-instance coloring using `setColorAt`.
  // side: THREE.DoubleSide, // Consider if shapes are always viewed from front or if backfaces might be visible.
});


// --- Instanced Map Creation ---

/**
 * Creates and configures `InstancedMesh` objects to represent all countries on the map.
 * It distributes countries among a set of predefined shapes and sets their initial
 * position, scale, and color based on current map mode and country data.
 *
 * @param countriesData - A record mapping country IDs to `Country` data objects.
 * @param mapGroup - The `THREE.Group` to which the created `InstancedMesh` objects will be added.
 * @param countryInstances - An empty `CountryInstanceMap` that will be populated by this function
 *                           with information about each country's instance.
 * @param getCountryBaseColor - A function that returns the base color for a country given its data and the current map mode.
 * @param currentMapMode - The active `MapMode`, used for initial color calculation.
 * @returns An array of the created `THREE.InstancedMesh` objects. These should be stored by the caller
 *          (e.g., `MapRenderer`) for later updates and disposal.
 */
export function createInstancedPlaceholderMap(
  countriesData: Record<string, Country>,
  mapGroup: THREE.Group,
  countryInstances: CountryInstanceMap,
  getCountryBaseColor: (country: Country, mapMode: MapMode) => number,
  currentMapMode: MapMode
): THREE.InstancedMesh[] {
  
  countryInstances.clear(); // Ensure the map is empty before populating.
  const createdInstancedMeshes: THREE.InstancedMesh[] = [];

  const countryIds = Object.keys(countriesData);
  const numCountries = countryIds.length;

  if (numCountries === 0 || predefinedGeometries.length === 0) {
    // console.warn("No countries data or no predefined geometries available for map creation.");
    return [];
  }

  // Distribute countries among the available predefined shapes.
  // Each predefined shape will become an InstancedMesh.
  const countriesPerShape = Math.ceil(numCountries / predefinedGeometries.length);
  let countryDataIndex = 0; // Tracks the current country being processed from `countryIds`.

  for (let shapeIndex = 0; shapeIndex < predefinedGeometries.length; shapeIndex++) {
    const geometry = predefinedGeometries[shapeIndex];
    // Determine how many country instances this particular InstancedMesh will manage.
    const instanceCountForThisShape = Math.min(countriesPerShape, numCountries - countryDataIndex);

    if (instanceCountForThisShape === 0) continue; // No more countries to assign to this shape.

    // Create an InstancedMesh for the current predefined shape.
    const instancedMesh = new THREE.InstancedMesh(geometry, instancedCountryMaterial, instanceCountForThisShape);
    instancedMesh.name = `instanced_countries_shape_${shapeIndex}`;
    mapGroup.add(instancedMesh);
    createdInstancedMeshes.push(instancedMesh);

    // Assign country data to instances within this InstancedMesh.
    for (let instanceLocalId = 0; instanceLocalId < instanceCountForThisShape; instanceLocalId++) {
      if (countryDataIndex >= numCountries) break; // Should not happen if logic is correct.
      
      const countryId = countryIds[countryDataIndex];
      const country = countriesData[countryId];
      
      // Transformation: position, rotation, scale for this instance.
      const matrix = new THREE.Matrix4();
      // Example: Simple grid layout. Replace with actual geographic data or layout algorithm.
      const position = new THREE.Vector3(
        (countryDataIndex % 20) * 25 - 250, // Arbitrary layout constants
        Math.floor(countryDataIndex / 20) * 25 - 250,
        0 // Assuming a 2D map on the XY plane.
      );
      const scale = new THREE.Vector3(1, 1, 1); // Uniform scale, can be varied per instance.
      const quaternion = new THREE.Quaternion(); // Default: no rotation.
      matrix.compose(position, quaternion, scale);
      instancedMesh.setMatrixAt(instanceLocalId, matrix);

      // Color: Set the initial color for this instance.
      const colorValue = getCountryBaseColor(country, currentMapMode);
      const color = new THREE.Color(colorValue);
      instancedMesh.setColorAt(instanceLocalId, color);
      
      // Store information about this instance for later access (e.g., for selection, hover).
      countryInstances.set(countryId, {
        countryId,
        instanceId: instanceLocalId,
        instancedMesh,
        originalColor: color.clone(),
        isSelected: false,
        isHovered: false,
        matrix: matrix.clone(), // Store the matrix if needed for individual updates (rare).
      });
      countryDataIndex++;
    }
    // Crucial: Inform Three.js that instance matrix and color data has changed and needs GPU upload.
    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) { // instanceColor can be null if material doesn't use vertexColors
        instancedMesh.instanceColor.needsUpdate = true;
    }
  }
  return createdInstancedMeshes;
}


// --- Clear Map ---

/**
 * Clears all country instances from the map and disposes of associated `InstancedMesh` objects.
 * This should be called when reloading the map or before the `MapRenderer` is disposed.
 *
 * @param mapGroup - The `THREE.Group` from which to remove the `InstancedMesh` objects.
 * @param countryInstances - The `CountryInstanceMap` to be cleared.
 * @param instancedMeshes - An array holding references to the `InstancedMesh` objects to be disposed.
 *                          This array will be emptied by this function.
 */
export function clearInstancedMap(
    mapGroup: THREE.Group, 
    countryInstances: CountryInstanceMap, 
    instancedMeshes: THREE.InstancedMesh[] // Pass the array of meshes to be cleared
): void {
  instancedMeshes.forEach(mesh => {
    mapGroup.remove(mesh); // Remove from scene graph.
    mesh.dispose(); // Dispose of the InstancedMesh (releases GPU resources).
                    // This also disposes the instanced attributes (matrix, color).
  });
  instancedMeshes.length = 0; // Clear the array passed by reference.

  // The `predefinedGeometries` and `instancedCountryMaterial` are shared and managed globally in this module.
  // They are not disposed here, as they are intended to be reused.
  // If their lifecycle were tied to a single map load, they would be disposed here.

  countryInstances.clear(); // Clear the map storing instance information.
}


/**
 * Original `createRandomCountryShape` function, renamed for clarity.
 * This is kept for reference or for scenarios where individual, non-instanced meshes might still be needed.
 * It is NOT used by the instanced rendering path for each country instance.
 * @returns A `THREE.BufferGeometry` for a single random shape.
 * @deprecated Prefer using the instanced rendering pipeline with `predefinedGeometries`.
 */
export function createSingleRandomCountryShape(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const points = 6 + Math.floor(Math.random() * 5);
  const radius = 10;
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const radiusVariation = radius * (0.7 + Math.random() * 0.6);
    const x = Math.cos(angle) * radiusVariation;
    const y = Math.sin(angle) * radiusVariation;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}
```
