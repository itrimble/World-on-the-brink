import * as THREE from 'three';
import {
  CountryMeshMap,
  CountryMeshData,
  createCountryMeshes,
  clearCountryMeshes,
  initializeMapData,
  getCountryGeometries,
  getCountryProperties, // Added this import
  countryMaterial, // Assuming this is the shared material
} from './map-geometry';
import {
  updateCountryMeshAppearance,
  updateAllCountryMeshAppearances,
} from './map-display';
import {
  MapInteractionData,
  handleMouseClick,
  updateRaycasterForCountryMeshes,
} from './map-interaction';
// import { MapMode, Country } from '../../types'; // Will be imported from map-state
import {
  MapState,
  MapMode,
  Country,
  createInitialMapState,
  getCountryBaseColor as getBaseColorFromState, // Alias to avoid conflict
  setStateMapMode,
  setSelectedCountry,
  setHoveredCountry,
} from '../../../map-state'; // Adjusted path

// Define default colors for interaction states, if not already in map-display
const HIGHLIGHT_COLOR_SELECTED = new THREE.Color(0x00FF00); // Green
const HOVER_COLOR = new THREE.Color(0xFFFF00); // Yellow
// const DEFAULT_COUNTRY_COLOR = new THREE.Color(0x808080); // Now this can be handled by getCountryBaseColor default

export class MapRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private mapGroup: THREE.Group;
  private countryMeshes: CountryMeshMap = new Map();
  private countryMeshGroups: THREE.Group[] = []; // Stores the groups returned by createCountryMeshes
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private mapState: MapState; // Will be initialized by createInitialMapState
  private interactionData: MapInteractionData;
  private loadedCountriesData: Record<string, Country> = {}; // Store typed Country data

  private onCountrySelectCallback: (countryId: string | null) => void;

  constructor(container: HTMLElement, onCountrySelect: (countryId: string | null) => void) {
    this.onCountrySelectCallback = onCountrySelect;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);
    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 2000);
    this.camera.position.z = 50; // Adjust as needed based on projection scale

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.mapGroup = new THREE.Group();
    this.scene.add(this.mapGroup);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.mapState = createInitialMapState();

    this.setupInteractionData(); // Initialize interactionData

    // Bind event handlers
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);

    container.addEventListener('mousemove', this.onMouseMove);
    container.addEventListener('click', this.onClick);
    window.addEventListener('resize', this.onWindowResize);

    initializeMapData().then(() => {
        const geoJsonProperties = getCountryProperties();
        if (geoJsonProperties) {
            geoJsonProperties.forEach((props, countryId) => {
                // Transform raw GeoJSON properties to our Country type
                this.loadedCountriesData[countryId] = {
                    id: countryId,
                    name: props.NAME || props.NAME_LONG || 'Unknown',
                    properties: props, // Store all raw props
                    // Initialize nested structures with defaults or map from props
                    economy: {
                        gdp: props.GDP_MD ? Number(props.GDP_MD) : undefined,
                        incomeGroup: props.INCOME_GRP || 'Unknown',
                        sector: props.ECONOMY || 'Unknown',
                    },
                    internal: {
                        population: props.POP_EST ? Number(props.POP_EST) : undefined,
                    },
                    government: {
                        type: props.TYPE || 'Unknown',
                    },
                    relations: {}, // Placeholder
                    mapColor: props.MAPCOLOR7 // Example, adapt as needed
                };
            });
        }
        this.loadMap();
    }).catch(error => {
        console.error("Error initializing map data in MapRenderer:", error);
    });


    this.animate = this.animate.bind(this);
    this.animate();
  }

  private setupInteractionData(): void {
    this.interactionData = {
      countryMeshes: this.countryMeshes,
      onCountrySelect: (countryId: string | null) => this.selectCountry(countryId),
      updateCountryAppearanceCallback: updateCountryMeshAppearance, // Directly use the imported function
      selectedCountryId: this.mapState.selectedCountryId,
      hoveredCountryId: this.mapState.hoveredCountryId,
      camera: this.camera,
      scene: this.mapGroup, // Raycast against the mapGroup
    };
  }

  public loadMap(): void {
    if (!getCountryGeometries() || !this.loadedCountriesData) {
        console.warn("loadMap called before geometries or country data were initialized.");
        return;
    }

    clearCountryMeshes(this.mapGroup, this.countryMeshes);
    this.countryMeshGroups = createCountryMeshes(this.mapGroup, this.countryMeshes);

    // After meshes are created, set their original colors based on the current map mode
    this.countryMeshes.forEach((meshData, countryId) => {
      const countryTypedData = this.loadedCountriesData[countryId];
      meshData.originalColor.copy(getBaseColorFromState(countryTypedData, this.mapState.currentMapMode));
    });

    this.updateAllMeshAppearances();
    console.log("Map loaded with country meshes.");
  }

  private updateAllMeshAppearances(): void {
    updateAllCountryMeshAppearances(this.countryMeshes, this.mapState.selectedCountryId, HIGHLIGHT_COLOR_SELECTED);
  }

  public setMapMode(mode: MapMode): void {
    this.mapState = setStateMapMode(this.mapState, mode);
    this.interactionData.currentMapMode = mode; // Assuming MapInteractionData might need this

    this.countryMeshes.forEach((countryMeshData, countryId) => {
      const countryTypedData = this.loadedCountriesData[countryId];
      countryMeshData.originalColor.copy(getBaseColorFromState(countryTypedData, this.mapState.currentMapMode));
    });
    this.updateAllMeshAppearances();
  }

  public selectCountry(countryId: string | null): void {
    this.mapState = setSelectedCountry(this.mapState, countryId);
    this.interactionData.selectedCountryId = this.mapState.selectedCountryId;

    this.updateAllMeshAppearances();

    if (this.onCountrySelectCallback) {
      this.onCountrySelectCallback(countryId);
    }
    console.log("Selected country:", countryId);
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.renderer.domElement.parentElement) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    // Pass a copy of mapState or relevant parts to interactionData if it's designed to be immutable
    this.interactionData.hoveredCountryId = this.mapState.hoveredCountryId;
    this.interactionData.selectedCountryId = this.mapState.selectedCountryId;

    updateRaycasterForCountryMeshes(this.raycaster, this.interactionData);

    // Update mapState based on the result from interactionData if hoveredCountryId is managed there
    if (this.mapState.hoveredCountryId !== this.interactionData.hoveredCountryId) {
         this.mapState = setHoveredCountry(this.mapState, this.interactionData.hoveredCountryId);
    }
  }

  private onClick(event: MouseEvent): void {
     if (!this.renderer.domElement.parentElement) return;
    this.interactionData.selectedCountryId = this.mapState.selectedCountryId;
    this.interactionData.hoveredCountryId = this.mapState.hoveredCountryId;
    handleMouseClick(event, this.raycaster, this.interactionData);
    // onCountrySelect callback within interactionData will call this.selectCountry
  }

  private onWindowResize(): void {
    if (!this.renderer.domElement.parentElement) return;
    const container = this.renderer.domElement.parentElement;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate);
    // Add any animations or updates here
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    console.log("Disposing MapRenderer...");
    window.removeEventListener('resize', this.onWindowResize);
    if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeEventListener('mousemove', this.onMouseMove);
        this.renderer.domElement.parentElement.removeEventListener('click', this.onClick);
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }

    clearCountryMeshes(this.mapGroup, this.countryMeshes);

    // Dispose of shared material if it's managed by MapRenderer
    countryMaterial.dispose();

    this.renderer.dispose();
    // Scene and camera don't have explicit dispose methods for all child resources,
    // but geometries and materials used by meshes are handled in clearCountryMeshes.
  }
}

// Helper for MapMode if not defined elsewhere
// enum MapMode { Political = 'POLITICAL', Terrain = 'TERRAIN' }
// interface Country { id: string; name: string; /* other properties */ }
