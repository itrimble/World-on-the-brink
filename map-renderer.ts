```typescript
// src/renderer/components/map/MapRenderer.ts
import * as THREE from 'three';
import { Country } from '../../../shared/types/country';

export interface CountryMesh {
  id: string;
  mesh: THREE.Mesh;
  originalColor: THREE.Color;
  isSelected: boolean;
  isHovered: boolean;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export class MapRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private countryMeshes: Map<string, CountryMesh> = new Map();
  private textureLoader: THREE.TextureLoader;
  private mapGroup: THREE.Group;
  private container: HTMLElement;
  private disposed: boolean = false;
  
  // Interaction callbacks
  private onCountrySelect?: (countryId: string) => void;
  private onCountryHover?: (countryId: string | null) => void;
  
  // Map state
  private currentMapMode: 'political' | 'influence' | 'insurgency' | 'coup' | 'economy' = 'political';
  private currentColorData: Record<string, number> = {};
  private zoomLevel: number = 1;
  private isDragging: boolean = false;
  private dragStart = new THREE.Vector2();
  private targetCenter = new THREE.Vector2(0, 0);
  private currentCenter = new THREE.Vector2(0, 0);
  
  constructor(container: HTMLElement) {
    this.container = container;
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111827);
    
    // Create camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.z = 300;
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);
    
    // Create raycaster for selection
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    // Create texture loader
    this.textureLoader = new THREE.TextureLoader();
    
    // Create map group
    this.mapGroup = new THREE.Group();
    this.scene.add(this.mapGroup);
    
    // Add lighting
    this.setupLighting();
    
    // Add event listeners
    this.setupEventListeners();
    
    // Start animation loop
    this.animate();
  }
  
  /**
   * Set up scene lighting
   */
  private setupLighting(): void {
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 1, 1);
    this.scene.add(directionalLight);
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Mouse move for hover
    this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
    
    // Mouse click for selection
    this.container.addEventListener('click', this.onMouseClick.bind(this));
    
    // Mouse wheel for zoom
    this.container.addEventListener('wheel', this.onMouseWheel.bind(this));
    
    // Mouse drag for panning
    this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    document.addEventListener('mouseleave', this.onMouseUp.bind(this));
    
    // Window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }
  
  /**
   * Animation loop
   */
  private animate(): void {
    if (this.disposed) return;
    
    requestAnimationFrame(this.animate.bind(this));
    
    // Smooth camera zooming and panning
    this.updateCameraMovement();
    
    // Update raycaster
    this.updateRaycaster();
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
  }
  
  /**
   * Update camera position and zoom
   */
  private updateCameraMovement(): void {
    // Smooth transition between current and target center
    this.currentCenter.lerp(this.targetCenter, 0.1);
    
    // Apply camera position
    this.mapGroup.position.x = this.currentCenter.x;
    this.mapGroup.position.y = this.currentCenter.y;
    
    // Apply zoom
    this.camera.position.z = 300 / this.zoomLevel;
  }
  
  /**
   * Update raycaster and check for hover
   */
  private updateRaycaster(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Find intersections
    const intersects = this.raycaster.intersectObjects(this.mapGroup.children);
    
    // Check if we're hovering over a country
    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object as THREE.Mesh;
      
      // Find the country that owns this mesh
      let hoveredCountryId: string | null = null;
      
      for (const [countryId, countryMesh] of this.countryMeshes.entries()) {
        if (countryMesh.mesh === intersectedObject) {
          hoveredCountryId = countryId;
          
          // If not already hovered, set hovered state
          if (!countryMesh.isHovered) {
            countryMesh.isHovered = true;
            this.updateCountryMeshMaterial(countryId);
          }
        } else if (countryMesh.isHovered) {
          // Reset previously hovered country
          countryMesh.isHovered = false;
          this.updateCountryMeshMaterial(countryId);
        }
      }
      
      // Call hover callback if set
      if (this.onCountryHover && hoveredCountryId) {
        this.onCountryHover(hoveredCountryId);
      }
    } else {
      // Reset all hover states if not hovering over any country
      for (const [countryId, countryMesh] of this.countryMeshes.entries()) {
        if (countryMesh.isHovered) {
          countryMesh.isHovered = false;
          this.updateCountryMeshMaterial(countryId);
        }
      }
      
      // Call hover callback with null
      if (this.onCountryHover) {
        this.onCountryHover(null);
      }
    }
  }
  
  /**
   * Load the world map
   * @param countriesData Countries data to use for generating the map
   */
  public loadMap(countriesData: Record<string, Country>): void {
    // Clear existing map
    this.clearMap();
    
    // For now, create a simple placeholder with country shapes
    // In a real implementation, this would load GeoJSON or other map data
    this.createPlaceholderMap(countriesData);
  }
  
  /**
   * Clear the map
   */
  private clearMap(): void {
    // Remove all countries from the map group
    while (this.mapGroup.children.length > 0) {
      const child = this.mapGroup.children[0];
      this.mapGroup.remove(child);
      
      // Dispose geometry and material to prevent memory leaks
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        } else if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        }
      }
    }
    
    // Clear country meshes map
    this.countryMeshes.clear();
  }
  
  /**
   * Create a placeholder map for demonstration
   * @param countriesData Countries data
   */
  private createPlaceholderMap(countriesData: Record<string, Country>): void {
    // Create a grid of country placeholders
    const countryIds = Object.keys(countriesData);
    const gridSize = Math.ceil(Math.sqrt(countryIds.length));
    const spacing = 40;
    const startX = -spacing * (gridSize - 1) / 2;
    const startY = spacing * (gridSize - 1) / 2;
    
    countryIds.forEach((countryId, index) => {
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;
      
      const x = startX + col * spacing;
      const y = startY - row * spacing;
      
      // Randomize the shape a bit to make it look more like a country
      const countryGeometry = this.createRandomCountryShape();
      
      // Create base color based on political alignment (for 'political' mode)
      const country = countriesData[countryId];
      const colorValue = this.getCountryBaseColor(country);
      const color = new THREE.Color(colorValue);
      
      // Create material
      const material = new THREE.MeshStandardMaterial({
        color: color,
        flatShading: true
      });
      
      // Create mesh
      const mesh = new THREE.Mesh(countryGeometry, material);
      mesh.position.set(x, y, 0);
      
      // Add to map group
      this.mapGroup.add(mesh);
      
      // Add to country meshes map
      this.countryMeshes.set(countryId, {
        id: countryId,
        mesh: mesh,
        originalColor: color.clone(),
        isSelected: false,
        isHovered: false,
        bounds: {
          minX: x - 10,
          maxX: x + 10,
          minY: y - 10,
          maxY: y + 10
        }
      });
    });
  }
  
  /**
   * Create a random country-like shape
   */
  private createRandomCountryShape(): THREE.BufferGeometry {
    // Create a base shape
    const shape = new THREE.Shape();
    
    // Number of points to use for the shape
    const points = 6 + Math.floor(Math.random() * 5);
    
    // Generate random points around a circle
    const radius = 10;
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const radiusVariation = radius * (0.7 + Math.random() * 0.6);
      const x = Math.cos(angle) * radiusVariation;
      const y = Math.sin(angle) * radiusVariation;
      
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    
    shape.closePath();
    
    // Create geometry from shape
    const geometry = new THREE.ShapeGeometry(shape);
    
    return geometry;
  }
  
  /**
   * Get base color for a country based on its data
   */
  private getCountryBaseColor(country: Country): number {
    // Base color depends on map mode
    switch (this.currentMapMode) {
      case 'political':
        // Base on government alignment
        if (country.government.alignment === 'western') {
          return 0x3b82f6; // Blue for western-aligned
        } else if (country.government.alignment === 'eastern') {
          return 0xef4444; // Red for eastern-aligned
        } else if (country.government.alignment === 'neutral') {
          return 0x10b981; // Green for neutral
        } else {
          return 0x8b5cf6; // Purple for non-aligned
        }
        
      case 'influence':
        // Base on diplomatic relations
        const usaRelation = country.relations.usa;
        const ussrRelation = country.relations.ussr;
        
        if (usaRelation > ussrRelation + 30) {
          return 0x3b82f6; // Blue for USA influence
        } else if (ussrRelation > usaRelation + 30) {
          return 0xef4444; // Red for USSR influence
        } else {
          return 0xd97706; // Orange for contested
        }
        
      case 'insurgency':
        // Base on insurgency level
        const insurgencyLevel = country.internal.insurgencyLevel;
        
        if (insurgencyLevel < 10) {
          return 0x10b981; // Green for peaceful
        } else if (insurgencyLevel < 30) {
          return 0xf59e0b; // Yellow for unrest
        } else if (insurgencyLevel < 60) {
          return 0xd97706; // Orange for guerilla war
        } else {
          return 0xef4444; // Red for civil war
        }
        
      case 'coup':
        // Base on coup risk / government stability
        const coupRisk = country.internal.coupRisk;
        
        if (coupRisk < 10) {
          return 0x10b981; // Green for stable
        } else if (coupRisk < 30) {
          return 0xf59e0b; // Yellow for some risk
        } else if (coupRisk < 60) {
          return 0xd97706; // Orange for high risk
        } else {
          return 0xef4444; // Red for imminent coup
        }
        
      case 'economy':
        // Base on economic development
        const development = country.economy.development;
        
        if (development === 'high') {
          return 0x10b981; // Green for high development
        } else if (development === 'medium') {
          return 0xf59e0b; // Yellow for medium development
        } else {
          return 0xef4444; // Red for low development
        }
        
      default:
        return 0x888888; // Gray for unknown mode
    }
  }
  
  /**
   * Update color data for all countries
   * @param colorData New color data
   */
  public updateColorData(colorData: Record<string, number>): void {
    this.currentColorData = colorData;
    
    // Update all country colors
    this.updateAllCountryColors();
  }
  
  /**
   * Update all country colors based on current mode and data
   */
  private updateAllCountryColors(): void {
    for (const [countryId, countryMesh] of this.countryMeshes.entries()) {
      this.updateCountryMeshMaterial(countryId);
    }
  }
  
  /**
   * Update a specific country's material based on its state
   */
  private updateCountryMeshMaterial(countryId: string): void {
    const countryMesh = this.countryMeshes.get(countryId);
    if (!countryMesh) return;
    
    // Get the base color
    let color = countryMesh.originalColor.clone();
    
    // Apply modifications based on state
    if (countryMesh.isSelected) {
      // Brighten the color for selected country
      color.offsetHSL(0, 0, 0.2);
    }
    
    if (countryMesh.isHovered) {
      // Brighten and saturate for hover
      color.offsetHSL(0, 0.2, 0.1);
    }
    
    // Update the material
    if (countryMesh.mesh.material instanceof THREE.Material) {
      countryMesh.mesh.material.color = color;
      
      // Update opacity for selected countries
      if (countryMesh.isSelected) {
        countryMesh.mesh.material.opacity = 1.0;
      } else {
        countryMesh.mesh.material.opacity = 0.9;
      }
    }
  }
  
  /**
   * Set the current map mode
   */
  public setMapMode(mode: 'political' | 'influence' | 'insurgency' | 'coup' | 'economy'): void {
    this.currentMapMode = mode;
    
    // Update all country colors
    this.updateAllCountryColors();
  }
  
  /**
   * Set a country as selected
   */
  public selectCountry(countryId: string | null): void {
    // Reset all selections
    this.countryMeshes.forEach((countryMesh, id) => {
      if (countryMesh.isSelected) {
        countryMesh.isSelected = false;
        this.updateCountryMeshMaterial(id);
      }
    });
    
    // Select the new country
    if (countryId) {
      const countryMesh = this.countryMeshes.get(countryId);
      if (countryMesh) {
        countryMesh.isSelected = true;
        this.updateCountryMeshMaterial(countryId);
      }
    }
  }
  
  /**
   * Set country selection callback
   */
  public setOnCountrySelect(callback: (countryId: string) => void): void {
    this.onCountrySelect = callback;
  }
  
  /**
   * Set country hover callback
   */
  public setOnCountryHover(callback: (countryId: string | null) => void): void {
    this.onCountryHover = callback;
  }
  
  /**
   * Handle mouse move event
   */
  private onMouseMove(event: MouseEvent): void {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / this.container.clientWidth) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / this.container.clientHeight) * 2 + 1;
    
    // Handle dragging for map panning
    if (this.isDragging) {
      const dragX = this.mouse.x - this.dragStart.x;
      const dragY = this.mouse.y - this.dragStart.y;
      
      // Scale drag amount by zoom level and camera distance
      const dragScale = this.camera.position.z;
      
      // Update target center
      this.targetCenter.x += dragX * dragScale;
      this.targetCenter.y += dragY * dragScale;
      
      // Update drag start
      this.dragStart.copy(this.mouse);
    }
  }
  
  /**
   * Handle mouse click event
   */
  private onMouseClick(event: MouseEvent): void {
    // Ignore if we were dragging
    if (this.isDragging) return;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Find intersections
    const intersects = this.raycaster.intersectObjects(this.mapGroup.children);
    
    // Check if we clicked on a country
    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object as THREE.Mesh;
      
      // Find the country that owns this mesh
      for (const [countryId, countryMesh] of this.countryMeshes.entries()) {
        if (countryMesh.mesh === intersectedObject) {
          // Call selection callback if set
          if (this.onCountrySelect) {
            this.onCountrySelect(countryId);
          }
          
          break;
        }
      }
    }
  }
  
  /**
   * Handle mouse wheel event for zooming
   */
  private onMouseWheel(event: WheelEvent): void {
    event.preventDefault();
    
    // Determine zoom direction
    const zoomDelta = Math.sign(event.deltaY) * -0.1;
    
    // Apply zoom bounds
    this.zoomLevel = Math.max(0.5, Math.min(4, this.zoomLevel + zoomDelta));
  }
  
  /**
   * Handle mouse down event for dragging
   */
  private onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.dragStart.copy(this.mouse);
  }
  
  /**
   * Handle mouse up event to end dragging
   */
  private onMouseUp(event: MouseEvent): void {
    this.isDragging = false;
  }
  
  /**
   * Handle window resize
   */
  private onWindowResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }
  
  /**
   * Dispose resources
   */
  public dispose(): void {
    this.disposed = true;
    
    // Remove event listeners
    this.container.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.container.removeEventListener('click', this.onMouseClick.bind(this));
    this.container.removeEventListener('wheel', this.onMouseWheel.bind(this));
    this.container.removeEventListener('mousedown', this.onMouseDown.bind(this));
    document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    document.removeEventListener('mouseleave', this.onMouseUp.bind(this));
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    
    // Dispose resources
    this.clearMap();
    this.renderer.dispose();
    
    // Remove from DOM
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
```