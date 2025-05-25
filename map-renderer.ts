import * as THREE from 'three';
import { Country } from '../../../shared/types/country';

// --- Module Imports ---
// Note: The paths to these modules might need adjustment based on the actual project structure.

// Geometry handling for map elements, including instanced rendering.
import {
  CountryInstanceInfo,
  CountryInstanceMap,
  createInstancedPlaceholderMap,
  clearInstancedMap,
  // initializePredefinedGeometries is called within map-geometry.ts itself.
} from './map-geometry';

// Interaction handling (mouse events, raycasting).
import {
  setupEventListeners,
  handleMouseMove,
  handleMouseClick,
  handleMouseWheel,
  handleMouseDown,
  handleMouseUp,
  updateRaycasterForInstancedMeshes,
  MapInteractionData,
  CleanupFunction as EventListenerCleanupFunction // Renamed for clarity
} from './map-interaction';

// State management for map properties (mode, zoom, pan, etc.) and color calculations.
import {
  MapState,
  createInitialMapState,
  setMapMode as setStateMapMode,
  setCurrentColorData as setStateCurrentColorData,
  setZoomLevel as setStateZoomLevel,
  setIsDragging as setStateIsDragging,
  setDragStart as setStateDragStart,
  setTargetCenter as setStateTargetCenter,
  setCurrentCenter as setStateCurrentCenter,
  getCountryBaseColor,
  clearColorCache,
  MapMode
} from './map-state';

// Display logic, including scene setup, rendering, and visual updates for instances.
import {
  setupLighting,
  updateCameraMovement,
  updateCountryInstanceAppearance,
  updateAllCountryInstanceAppearances,
  renderScene,
  handleWindowResize
} from './map-display';

/**
 * Main class responsible for rendering the world map and handling user interactions.
 * It integrates various modules for geometry, interaction, state, and display management
 * to provide an interactive map experience using Three.js with instanced rendering for performance.
 */
export class MapRenderer {
  // --- Three.js Core Components ---
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  /** Normalized mouse coordinates for raycasting. Initialized off-screen. */
  private mouse: THREE.Vector2;

  // --- Map Data & Instancing ---
  /** 
   * Stores information about each country's rendered instance, mapping country ID to `CountryInstanceInfo`.
   * This is central to managing per-country state with instanced rendering.
   */
  private countryInstances: CountryInstanceMap = new Map();
  /** Array to keep track of created `InstancedMesh` objects for efficient management and disposal. */
  private instancedMeshes: THREE.InstancedMesh[] = [];
  /** Parent `THREE.Group` for all map-related objects, facilitating transformations like panning. */
  private mapGroup: THREE.Group;
  /** The HTML DOM element that hosts the Three.js canvas. */
  private container: HTMLElement;

  // --- State & Callbacks ---
  /** Flag to indicate if the renderer has been disposed, to prevent operations on a disposed instance. */
  private disposed: boolean = false;
  /** Callback invoked when a country is selected (e.g., by clicking). */
  private onCountrySelectCallback?: (countryId: string) => void;
  /** Callback invoked when the mouse hovers over a country (or `null` if hovering over no country). */
  private onCountryHoverCallback?: (countryId: string | null) => void;
  /** Holds the current state of the map (mode, zoom, pan, etc.), managed by functions from `map-state.ts`. */
  private mapState: MapState;
  /** 
   * Data structure passed to interaction handlers, bundling necessary objects and callbacks.
   * Marked with `!` for definite assignment in the constructor via `setupInteractionData`.
   */
  private interactionData!: MapInteractionData;
  /** Function to clean up DOM event listeners, returned by `setupEventListeners`. */
  private eventListenerCleanup?: EventListenerCleanupFunction;
  /** 
   * Stores the raw country data loaded via `loadMap`.
   * Used for recalculating instance properties (like `originalColor`) when map mode changes.
   */
  private loadedCountriesData: Record<string, Country> = {};

  /**
   * Initializes the MapRenderer.
   * Sets up the Three.js scene, camera, renderer, lighting, interaction handlers, and starts the animation loop.
   * @param container - The HTML element where the map canvas will be appended.
   */
  constructor(container: HTMLElement) {
    this.container = container;
    // `initializePredefinedGeometries()` is now self-invoked within `map-geometry.ts`.

    this.mapState = createInitialMapState();

    // Initialize Three.js scene and core components.
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a202c); // Darker, neutral background.

    const aspect = container.clientWidth / container.clientHeight;
    // Adjusted FOV and clipping planes for potentially larger scenes or different perspectives.
    this.camera = new THREE.PerspectiveCamera(50, aspect, 10, 2000); 
    this.camera.position.z = 350; // Initial camera distance from the map plane.

    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      powerPreference: 'high-performance' // Request high performance GPU if available.
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    // For sharper visuals on high DPI screens, uncomment:
    // this.renderer.setPixelRatio(window.devicePixelRatio); 
    container.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    // Initialize mouse vector far off-screen to prevent accidental initial hover/selection.
    this.mouse = new THREE.Vector2(-1000, -1000); 

    this.mapGroup = new THREE.Group(); // This group will hold all map instances.
    this.scene.add(this.mapGroup);

    setupLighting(this.scene); // Configure scene lighting from `map-display.ts`.
    this.setupInteractionData(); // Prepare the data object for interaction handlers.
    this.setupDomEventListeners(); // Attach DOM event listeners.

    this.animate(); // Start the rendering loop.
  }

  /**
   * Initializes `this.interactionData` which bundles all necessary context for interaction handlers.
   * This method is called once during constructor setup.
   * @private
   */
  private setupInteractionData(): void {
    this.interactionData = {
      camera: this.camera,
      mouse: this.mouse,
      raycaster: this.raycaster,
      mapGroup: this.mapGroup,
      countryInstances: this.countryInstances, // Uses the instanced map.
      container: this.container,
      // State properties that might be read by interaction handlers:
      isDragging: this.mapState.isDragging,
      dragStart: this.mapState.dragStart,
      targetCenter: this.mapState.targetCenter,
      zoomLevel: this.mapState.zoomLevel,
      // Callbacks to notify external listeners:
      onCountrySelect: (countryId) => {
        if (this.onCountrySelectCallback) this.onCountrySelectCallback(countryId);
      },
      onCountryHover: (countryId) => {
        if (this.onCountryHoverCallback) this.onCountryHoverCallback(countryId);
      },
      // Functions to update the main MapState from interaction handlers:
      setIsDragging: (isDragging) => this.mapState = setStateIsDragging(this.mapState, isDragging),
      setDragStart: (dragStart) => this.mapState = setStateDragStart(this.mapState, dragStart),
      setTargetCenter: (targetCenter) => this.mapState = setStateTargetCenter(this.mapState, targetCenter),
      // Callback for interaction module to request visual update of an instance:
      updateCountryInstanceAppearance: (countryId) => updateCountryInstanceAppearance(countryId, this.countryInstances)
    };
  }
  
  /**
   * Sets up DOM event listeners for map interactions by delegating to `map-interaction.ts`.
   * Stores the returned cleanup function for later use in `dispose`.
   * @private
   */
  private setupDomEventListeners(): void {
    // Event handlers from `map-interaction.ts` are designed to be pure or operate on `interactionData`.
    // Binding `this` is not necessary if they don't access `MapRenderer`'s `this` context.
    const boundHandleMouseMove = (e: MouseEvent) => handleMouseMove(e, this.interactionData);
    const boundHandleMouseClick = (e: MouseEvent) => handleMouseClick(e, this.interactionData);
    const boundHandleMouseWheel = (e: WheelEvent) => {
        handleMouseWheel(e, {
            zoomLevel: this.mapState.zoomLevel,
            // Provide a setter for zoom level that updates MapState.
            setZoomLevel: (newZoomLevel) => this.mapState = setStateZoomLevel(this.mapState, newZoomLevel)
        });
        // Keep interactionData.zoomLevel in sync if it's used as a cache by other interaction functions.
        this.interactionData.zoomLevel = this.mapState.zoomLevel;
    };
    const boundHandleMouseDown = (e: MouseEvent) => handleMouseDown(e, this.interactionData);
    const boundHandleMouseUp = (e: MouseEvent) => handleMouseUp(e, this.interactionData);
    const boundHandleWindowResize = () => handleWindowResize(this.container, this.camera, this.renderer);

    this.eventListenerCleanup = setupEventListeners(
      this.container,
      this.interactionData, // Passed for context to handlers, though not directly used by setup.
      boundHandleMouseMove,
      boundHandleMouseClick,
      boundHandleMouseWheel,
      boundHandleMouseDown,
      boundHandleMouseUp,
      boundHandleWindowResize
    );
  }

  /**
   * The main animation loop. Called recursively using `requestAnimationFrame`.
   * Updates interaction states, camera/map position, raycasting for hover effects, and renders the scene.
   * @private
   */
  private animate(): void {
    if (this.disposed) return; // Stop loop if renderer is disposed.

    requestAnimationFrame(this.animate.bind(this));

    // Synchronize interactionData with the current mapState before updates.
    // This ensures that functions like `updateRaycasterForInstancedMeshes` have the latest state.
    this.interactionData.isDragging = this.mapState.isDragging;
    this.interactionData.dragStart = this.mapState.dragStart;
    this.interactionData.targetCenter = this.mapState.targetCenter;
    this.interactionData.zoomLevel = this.mapState.zoomLevel; 

    // Update camera and map group positions for smooth panning and zooming.
    const newCurrentCenter = updateCameraMovement(
      this.mapGroup, this.camera,
      this.mapState.currentCenter, this.mapState.targetCenter, this.mapState.zoomLevel
    );
    this.mapState = setStateCurrentCenter(this.mapState, newCurrentCenter);

    // Perform raycasting to detect hovered country instances and update their appearance.
    updateRaycasterForInstancedMeshes(this.interactionData);

    // Render the scene.
    renderScene(this.renderer, this.scene, this.camera);
  }

  /**
   * Loads map data, clears any existing map elements, and creates new instanced meshes for countries.
   * @param countriesData - A record mapping country IDs to `Country` data objects.
   */
  public loadMap(countriesData: Record<string, Country>): void {
    this.loadedCountriesData = countriesData; // Store for color recalculations on mode change.
    
    // Clear previously rendered map elements (InstancedMeshes and instance data).
    clearInstancedMap(this.mapGroup, this.countryInstances, this.instancedMeshes);

    // Create new InstancedMeshes based on the provided country data and current map mode.
    // `getCountryBaseColor` (with caching) is passed for initial color determination.
    this.instancedMeshes = createInstancedPlaceholderMap(
      countriesData,
      this.mapGroup,
      this.countryInstances,
      getCountryBaseColor, 
      this.mapState.currentMapMode
    );
    // Initial visual state (including colors) is set by `createInstancedPlaceholderMap`.
  }
  
  /**
   * Sets the current map display mode (e.g., political, economic).
   * This triggers a recalculation of base colors for all country instances and updates their appearance.
   * @param mode - The `MapMode` to activate.
   */
  public setMapMode(mode: MapMode): void {
    if (this.mapState.currentMapMode === mode) return; // No change if mode is already active.

    // Update mapState with the new mode. This also clears the color cache in `map-state.ts`.
    this.mapState = setStateMapMode(this.mapState, mode); 

    // Recalculate `originalColor` for each country instance based on the new map mode.
    // `getCountryBaseColor` will use its cache or recompute colors as needed.
    this.countryInstances.forEach((instanceInfo, countryId) => {
      const country = this.loadedCountriesData[countryId];
      if (country) {
        instanceInfo.originalColor.setHex(getCountryBaseColor(country, this.mapState.currentMapMode));
      }
    });
    // Apply the new colors and any selection/hover effects to all instances.
    updateAllCountryInstanceAppearances(this.countryInstances);
  }

  /**
   * Updates arbitrary color data in the map state.
   * The interpretation and application of this data depend on how `getCountryBaseColor`
   * or other display logic might use `mapState.currentColorData`.
   * Currently, this primarily updates the state; direct visual changes would require
   * further logic (e.g., cache invalidation, color recalculation) if base colors are affected.
   * @param colorData - A record mapping country IDs to numerical color values or data points.
   */
  public updateColorData(colorData: Record<string, number>): void {
    this.mapState = setStateCurrentColorData(this.mapState, colorData);
    // If `currentColorData` is used by `getCountryBaseColor` for base colors,
    // a full visual refresh (similar to `setMapMode`) would be needed here.
    // Example:
    // clearColorCache(); // Or a more targeted invalidation.
    // this.countryInstances.forEach(...recalculate originalColor...);
    // updateAllCountryInstanceAppearances(this.countryInstances);
    // console.warn("MapRenderer.updateColorData: Review if this should trigger a visual refresh of base colors.");
  }

  /**
   * Selects or deselects a country instance.
   * Updates the `isSelected` state of the target country instance and triggers a visual update for it.
   * @param countryId - The ID of the country to select, or `null` to deselect all.
   */
  public selectCountry(countryId: string | null): void {
    this.countryInstances.forEach((instance, id) => {
      const isNowSelected = (id === countryId);
      if (instance.isSelected !== isNowSelected) {
        instance.isSelected = isNowSelected;
        // `updateCountryInstanceAppearance` handles applying the correct color based on the new selected state.
        updateCountryInstanceAppearance(id, this.countryInstances);
      }
    });
  }

  /**
   * Registers a callback function to be invoked when a country is selected.
   * @param callback - The function to call with the selected country's ID.
   */
  public setOnCountrySelect(callback: (countryId: string) => void): void {
    this.onCountrySelectCallback = callback;
  }

  /**
   * Registers a callback function to be invoked when the mouse hovers over a country.
   * @param callback - The function to call with the hovered country's ID, or `null` if no country is hovered.
   */
  public setOnCountryHover(callback: (countryId: string | null) => void): void {
    this.onCountryHoverCallback = callback;
  }

  /**
   * Cleans up all resources used by the MapRenderer.
   * This includes removing event listeners, disposing of Three.js objects (geometries, materials, renderer),
   * and clearing caches. Should be called when the map is no longer needed to prevent memory leaks.
   */
  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    // Remove DOM event listeners.
    if (this.eventListenerCleanup) {
      this.eventListenerCleanup();
    }

    // Clear map data and dispose Three.js instanced meshes.
    clearInstancedMap(this.mapGroup, this.countryInstances, this.instancedMeshes);
    
    // Traverse the scene to dispose of any other materials and geometries.
    // Note: Predefined geometries and shared materials from `map-geometry.ts` are not disposed here
    // as they might be considered global. If their lifecycle is tied to MapRenderer, dispose them.
    this.scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
            if ((object as THREE.Mesh).geometry) {
              (object as THREE.Mesh).geometry.dispose();
            }
            // Materials on InstancedMesh are shared; handle their disposal carefully (e.g., once, if appropriate).
            // If multiple MapRenderers could exist, shared materials need careful lifecycle management.
        }
    });
    // Example if instancedCountryMaterial from map-geometry.ts was to be disposed here:
    // instancedCountryMaterial.dispose(); 

    this.renderer.dispose(); // Dispose of the WebGL renderer.

    // Remove the canvas from the DOM.
    if (this.container && this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
    
    clearColorCache(); // Clear any cached colors from map-state.
    // console.log("MapRenderer disposed."); // For debugging
  }
}
```