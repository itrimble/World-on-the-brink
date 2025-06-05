import * as THREE from 'three';
import {
  CountryMeshMap,
  CountryMeshData,
  createCountryMeshes,
  clearCountryMeshes,
  initializeMapData,
  getCountryGeometries,
  getCountryProperties,
  countryMaterial,
} from './map-geometry';
import {
  updateCountryMeshAppearance,
  updateAllCountryMeshAppearances,
  updateCameraMovement, // Import updateCameraMovement
} from './map-display';
import {
  MapInteractionData,
  handleMouseClick,
  // updateRaycasterForCountryMeshes, // This is now called by handleMouseMove
  handleMouseMove, // Import handleMouseMove
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
  setZoomLevel,
  setCurrentCenter, // Import setCurrentCenter
  setTargetCenter,  // Import setTargetCenter
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
  private mapState: MapState;
  private interactionData: MapInteractionData;
  private loadedCountriesData: Record<string, Country> = {};
  private clock: THREE.Clock; // For deltaTime

  private onCountrySelectCallback: (countryId: string | null) => void;

  constructor(container: HTMLElement, onCountrySelect: (countryId: string | null) => void) {
    this.onCountrySelectCallback = onCountrySelect;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);
    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 2000);
    this.camera.position.z = 180; // Adjusted for a wider initial world map view

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
    this.clock = new THREE.Clock();

    this.mapState = createInitialMapState();
    // Initial camera position is set, then controlled by updateCameraMovement via animate()
    this.camera.position.set(0, 0, 180); // Ensure camera is looking at 0,0,0 where mapGroup is initially
    this.camera.lookAt(0,0,0);


    this.setupInteractionData();

    // Bind event handlers
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
    this.onMouseWheel = this.onMouseWheel.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this); // Bind mousedown
    this.onMouseUp = this.onMouseUp.bind(this);     // Bind mouseup

    container.addEventListener('mousemove', this.onMouseMove);
    container.addEventListener('click', this.onClick);
    container.addEventListener('wheel', this.onMouseWheel);
    container.addEventListener('mousedown', this.onMouseDown); // Add mousedown listener
    container.addEventListener('mouseup', this.onMouseUp);     // Add mouseup listener
    container.addEventListener('mouseleave', this.onMouseUp); // Also stop dragging if mouse leaves container

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
      updateCountryAppearanceCallback: updateCountryMeshAppearance,
      selectedCountryId: this.mapState.selectedCountryId,
      hoveredCountryId: this.mapState.hoveredCountryId, // Will be updated by interaction logic
      camera: this.camera,
      scene: this.mapGroup,
      zoomLevel: this.mapState.zoomLevel,

      // Panning related state and callbacks
      isDragging: false, // Initial dragging state
      dragStart: new THREE.Vector2(), // Initial drag start
      setIsDragging: (isDragging: boolean) => {
        this.interactionData.isDragging = isDragging; // Allow interaction module to update this
      },
      setDragStart: (dragStart: THREE.Vector2) => {
        this.interactionData.dragStart.copy(dragStart); // Allow interaction module to update this
      },
      onPan: (deltaX: number, deltaY: number) => {
        const currentTarget = this.mapState.targetCenter.clone();
        const newTargetCenterX = currentTarget.x + deltaX;
        const newTargetCenterY = currentTarget.y + deltaY; // Assuming deltaY is already adjusted for screen coords
        this.mapState = setTargetCenter(this.mapState, new THREE.Vector2(newTargetCenterX, newTargetCenterY));
      },
      // currentMapMode: this.mapState.currentMapMode, // If needed by interactions
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
    // If MapInteractionData needs currentMapMode, update it (though it's not currently in its interface)
    // if(this.interactionData) this.interactionData.currentMapMode = mode;

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
    // Update raycaster with current mouse coordinates
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Synchronize state for interaction module
    this.interactionData.hoveredCountryId = this.mapState.hoveredCountryId;
    this.interactionData.selectedCountryId = this.mapState.selectedCountryId;
    this.interactionData.zoomLevel = this.mapState.zoomLevel;
    // isDragging and dragStart are managed by interactionData's callbacks

    handleMouseMove(event, this.raycaster, this.interactionData);

    // Update mapState based on the result from interactionData (hoveredCountryId)
    if (this.interactionData && this.mapState.hoveredCountryId !== this.interactionData.hoveredCountryId) {
         this.mapState = setHoveredCountry(this.mapState, this.interactionData.hoveredCountryId);
    }
  }

  private onClick(event: MouseEvent): void {
    if (!this.renderer.domElement.parentElement || !this.interactionData) return;
    // Synchronize state for interaction module before handling click
    this.interactionData.selectedCountryId = this.mapState.selectedCountryId;
    this.interactionData.hoveredCountryId = this.mapState.hoveredCountryId;
    // Raycaster is updated in onMouseMove, which should precede click handling if mouse moves.
    // If mouse doesn't move between mousedown and mouseup (a simple click),
    // raycaster might not be perfectly up-to-date if scene changed.
    // For robust click detection after potential scene changes without mouse move,
    // it might be necessary to update raycaster here too.
    // However, for typical UI flow, onMouseMove handles raycaster.
    handleMouseClick(event, this.raycaster, this.interactionData);
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0 && this.interactionData) { // Left mouse button
      this.interactionData.setIsDragging(true);
      this.interactionData.setDragStart(new THREE.Vector2(event.clientX, event.clientY));
    }
  }

  private onMouseUp(event: MouseEvent): void {
    // Check if it's the left mouse button or if no button is pressed (e.g. mouseleave)
    if ((event.button === 0 || event.type === 'mouseleave') && this.interactionData) {
      this.interactionData.setIsDragging(false);
    }
  }

  private onMouseWheel(event: WheelEvent): void {
    event.preventDefault();
    const zoomDeltaFactor = event.deltaY > 0 ? -0.2 : 0.2; // Adjusted zoomDeltaFactor
    const newZoomLevel = this.mapState.zoomLevel + zoomDeltaFactor;

    this.mapState = setZoomLevel(this.mapState, newZoomLevel);
    if (this.interactionData) {
        this.interactionData.zoomLevel = this.mapState.zoomLevel; // Update if interaction logic needs it
    }
    // Camera position update is handled in animate() via updateCameraMovement
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
    const deltaTime = this.clock.getDelta();

    // Update camera and mapGroup position based on current state
    const newCenter = updateCameraMovement(
      this.mapGroup,
      this.camera,
      this.mapState.currentCenter, // This Vector2 will be mutated by lerp
      this.mapState.targetCenter,
      this.mapState.zoomLevel,
      deltaTime
    );
    // Update state with the (potentially) new currentCenter from lerping
    this.mapState = setCurrentCenter(this.mapState, newCenter);
    if(this.interactionData) {
        // this.interactionData.currentCenter = this.mapState.currentCenter; // If needed
    }


    // Add any other animations or updates here
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    console.log("Disposing MapRenderer...");
    window.removeEventListener('resize', this.onWindowResize);
    if (this.renderer.domElement.parentElement) {
        const parentElement = this.renderer.domElement.parentElement;
        parentElement.removeEventListener('mousemove', this.onMouseMove);
        parentElement.removeEventListener('click', this.onClick);
        parentElement.removeEventListener('wheel', this.onMouseWheel);
        parentElement.removeEventListener('mousedown', this.onMouseDown);
        parentElement.removeEventListener('mouseup', this.onMouseUp);
        parentElement.removeEventListener('mouseleave', this.onMouseUp);
        parentElement.removeChild(this.renderer.domElement);
    }

    clearCountryMeshes(this.mapGroup, this.countryMeshes);

    // Dispose of shared material if it's managed by MapRenderer
    countryMaterial.dispose();

    this.renderer.dispose();
    // Scene and camera don't have explicit dispose methods for all child resources,
    // but geometries and materials used by meshes are handled in clearCountryMeshes.
  }
}

// Helper for MapMode if not defined elsewhere (now in map-state.ts)
// interface Country { id: string; name: string; properties: any; /* other properties */ }

// The MapInteractionData might also need a zoomLevel property if updateRaycasterForCountryMeshes
// or other interaction logic depends on it directly.
// For now, MapRenderer directly calls updateCameraZoom after updating state.
// If MapInteractionData.zoomLevel is needed, it should be added to its interface
// and updated in MapRenderer when mapState.zoomLevel changes.
// Added placeholder for this in onMouseWheel: this.interactionData.zoomLevel = this.mapState.zoomLevel;
// This implies MapInteractionData interface in map-interaction.ts would need:
// zoomLevel?: number; (optional, if not all interactions need it)
