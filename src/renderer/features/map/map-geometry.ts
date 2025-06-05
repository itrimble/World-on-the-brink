import { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import * as THREE from 'three';

// Placeholder for storing loaded geometries
let countryGeometries: Map<string, THREE.ShapeGeometry[]> | null = null;
let countryProperties: Map<string, any> | null = null; // To store GeoJSON properties

const PROJECTION_SCALE = 1.5; // Increased for larger country appearance
const DEFAULT_COUNTRY_COLOR = 0x808080; // Grey

export interface CountryMeshData {
  meshGroup: THREE.Group;
  originalColor: THREE.Color;
  isHovered: boolean; // Added for hover state tracking
}
export type CountryMeshMap = Map<string, CountryMeshData>;


/**
 * Loads GeoJSON data from the specified file path.
 * @param filePath The path to the GeoJSON file.
 * @returns A promise that resolves with the GeoJSON FeatureCollection.
 */
export async function loadGeoJSONData(filePath: string): Promise<FeatureCollection> {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for file ${filePath}`);
    }
    const data = await response.json();
    return data as FeatureCollection;
  } catch (error) {
    console.error(`Error loading GeoJSON data from ${filePath}:`, error);
    throw error;
  }
}

/**
 * Creates Three.js geometries from GeoJSON feature data.
 * Uses a simple equirectangular projection.
 * @param geoJsonData The GeoJSON FeatureCollection.
 * @returns A map where keys are country IDs and values are arrays of THREE.ShapeGeometry.
 */
export function createGeometriesFromGeoJson(geoJsonData: FeatureCollection): Map<string, THREE.ShapeGeometry[]> {
  const geometriesMap = new Map<string, THREE.ShapeGeometry[]>();
  const propertiesMap = new Map<string, any>();

  geoJsonData.features.forEach((feature: Feature) => {
    if (!feature.geometry || !feature.properties) {
      console.warn("Skipping feature with missing geometry or properties:", feature);
      return;
    }

    const countryId = feature.properties.ADM0_A3 || feature.properties.ISO_A3;
    if (!countryId) {
      console.warn("Skipping feature with missing country identifier (ADM0_A3 or ISO_A3):", feature.properties);
      return;
    }

    // Store properties
    propertiesMap.set(countryId, feature.properties);

    const { geometry } = feature;
    const countryShapes: THREE.Shape[] = [];

    const processPolygonCoordinates = (coordinates: number[][][]): THREE.Shape => {
      const shape = new THREE.Shape();
      coordinates.forEach((ring, index) => {
        const points = ring.map(coord => {
          // Equirectangular projection: longitude as x, latitude as y
          // Normalize and scale. Adjust center as needed.
          // Example: Center around (0,0) by subtracting mean lon/lat or specific origin
          const x = coord[0] * PROJECTION_SCALE;
          const y = coord[1] * PROJECTION_SCALE;
          return new THREE.Vector2(x, y);
        });

        if (points.length === 0) return;

        if (index === 0) { // Exterior ring
          shape.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            shape.lineTo(points[i].x, points[i].y);
          }
        } else { // Interior ring (hole)
          const holePath = new THREE.Path();
          holePath.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            holePath.lineTo(points[i].x, points[i].y);
          }
          shape.holes.push(holePath);
        }
      });
      return shape;
    };

    if (geometry.type === 'Polygon') {
      countryShapes.push(processPolygonCoordinates(geometry.coordinates));
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach(polygonCoords => {
        countryShapes.push(processPolygonCoordinates(polygonCoords));
      });
    }

    if (countryShapes.length > 0) {
      const shapeGeometries = countryShapes.map(shape => new THREE.ShapeGeometry(shape));
      if (geometriesMap.has(countryId)) {
        geometriesMap.get(countryId)!.push(...shapeGeometries);
      } else {
        geometriesMap.set(countryId, shapeGeometries);
      }
    }
  });

  countryProperties = propertiesMap; // Store the extracted properties
  return geometriesMap;
}

export const countryMaterial = new THREE.MeshStandardMaterial({
  color: DEFAULT_COUNTRY_COLOR,
  side: THREE.DoubleSide, // Render both sides in case of winding order issues or 2D views
  // wireframe: true, // For debugging
});

/**
 * Creates and adds country meshes to the map group.
 * @param mapGroup The THREE.Group to add country meshes to.
 * @param countryMeshMap A map to store country instance data.
 * @returns An array of THREE.Group objects, each representing a country.
 */
export function createCountryMeshes(
  mapGroup: THREE.Group,
  countryMeshMap: CountryMeshMap
): THREE.Group[] {
  const loadedGeometries = getCountryGeometries();
  const countryGroups: THREE.Group[] = [];

  if (!loadedGeometries) {
    console.warn("Geometries not loaded yet. Call initializeMapData first.");
    return [];
  }

  clearCountryMeshes(mapGroup, countryMeshMap); // Clear previous meshes

  loadedGeometries.forEach((geometryArray, countryId) => {
    const countryGroup = new THREE.Group();
    countryGroup.name = countryId; // For identification

    geometryArray.forEach(geometry => {
      const mesh = new THREE.Mesh(geometry, countryMaterial.clone()); // Clone material for individual color changes later
      countryGroup.add(mesh);
    });

    mapGroup.add(countryGroup);
    countryGroups.push(countryGroup);

    countryMeshMap.set(countryId, {
      meshGroup: countryGroup,
      originalColor: new THREE.Color(DEFAULT_COUNTRY_COLOR),
      isHovered: false, // Initialize isHovered state
    });
  });
  console.log(`Created meshes for ${countryGroups.length} countries.`);
  return countryGroups;
}

/**
 * Clears previously created country meshes from the map group and disposes of their resources.
 * @param mapGroup The THREE.Group from which to remove country meshes.
 * @param countryMeshMap The map holding country instance data.
 */
export function clearCountryMeshes(mapGroup: THREE.Group, countryMeshMap: CountryMeshMap): void {
  countryMeshMap.forEach((countryData) => {
    countryData.meshGroup.children.forEach(mesh => {
      if (mesh instanceof THREE.Mesh) {
        mesh.geometry.dispose();
        // If material is cloned per mesh, dispose it too:
        // if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
        // else mesh.material.dispose();
      }
    });
    mapGroup.remove(countryData.meshGroup);
  });
  countryMeshMap.clear();
  console.log("Cleared existing country meshes.");
}


/**
 * Initializes map data by loading GeoJSON features and creating geometries.
 */
export async function initializeMapData(): Promise<void> {
  try {
    const geojsonData = await loadGeoJSONData('../assets/world-countries.geojson');

    if (geojsonData && geojsonData.features) {
      console.log(`Successfully loaded ${geojsonData.features.length} GeoJSON features.`);
      countryGeometries = createGeometriesFromGeoJson(geojsonData); // This will also populate countryProperties
      console.log(`Successfully created geometries for ${countryGeometries.size} countries.`);
      if (countryProperties) {
        console.log(`Successfully stored properties for ${countryProperties.size} countries.`);
      }
    } else {
      console.log("No features found or GeoJSON data is not in the expected format.");
    }
  } catch (error) {
    console.error("Failed to initialize map data:", error);
    countryGeometries = null;
    countryProperties = null;
  }
}

/**
 * Retrieves the pre-loaded country GeoJSON properties.
 * @returns A map of country IDs to their properties, or null if not loaded.
 */
export function getCountryProperties(): Map<string, any> | null {
  return countryProperties;
}

/**
 * Retrieves the pre-loaded country geometries.
 * @returns A map of country IDs to their geometries, or null if not loaded.
 */
export function getCountryGeometries(): Map<string, THREE.ShapeGeometry[]> | null {
  return countryGeometries;
}

// Example of how this might be called (e.g., in App.tsx or a main setup file)
// initializeMapData().then(() => {
//   const geometries = getCountryGeometries(); // This function would need to be exported to be used like this
//   if (geometries) {
//     console.log(`Geometries available for ${geometries.size} countries.`);
//   }
// });
