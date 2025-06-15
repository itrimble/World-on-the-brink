// src/renderer/components/map/ImprovedMapView.tsx
// Improved Map component addressing React/Three.js integration issues

import React, { useRef, useLayoutEffect, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as THREE from 'three';
import { selectCountry as setSelectedCountryAction } from '../../store/slices/uiSlice';
import type { MapMode } from '../../store/slices/uiSlice';
import { AppDispatch, RootState } from '../../store';

interface MapState {
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  geoJsonLoaded: boolean;
}

export const ImprovedMapView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const mountedRef = useRef<boolean>(true);

  const dispatch: AppDispatch = useDispatch();
  const currentMapMode = useSelector((state: RootState) => state.ui.mapMode);

  const [mapState, setMapState] = useState<MapState>({
    isLoading: true,
    isInitialized: false,
    error: null,
    geoJsonLoaded: false
  });

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  
  // Interactive elements
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const countryMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('ImprovedMapView: Cleaning up...');
    
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    if (rendererRef.current && containerRef.current) {
      // Remove canvas from DOM
      const canvas = rendererRef.current.domElement;
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      rendererRef.current.dispose();
      rendererRef.current = null;
    }

    sceneRef.current = null;
    cameraRef.current = null;
  }, []);

  // Initialize Three.js scene
  const initializeScene = useCallback(async () => {
    const container = containerRef.current;
    if (!container || !mountedRef.current) {
      console.log('ImprovedMapView: Container not ready or component unmounted');
      return;
    }

    try {
      console.log('ImprovedMapView: Initializing Three.js scene...');

      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x001122);
      sceneRef.current = scene;

      // Create camera
      const camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        2000
      );
      camera.position.set(0, 0, 180);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      // Create renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);

      console.log('ImprovedMapView: Basic Three.js setup complete');

      if (mountedRef.current) {
        setMapState(prev => ({ 
          ...prev, 
          isInitialized: true, 
          isLoading: false 
        }));
      }

      // Load GeoJSON data asynchronously
      await loadGeoJsonData();

    } catch (error) {
      console.error('ImprovedMapView: Failed to initialize scene:', error);
      if (mountedRef.current) {
        setMapState(prev => ({ 
          ...prev, 
          error: `Failed to initialize map: ${error}`,
          isLoading: false 
        }));
      }
    }
  }, []);

  // Load GeoJSON data
  const loadGeoJsonData = useCallback(async () => {
    if (!sceneRef.current || !mountedRef.current) return;

    try {
      console.log('ImprovedMapView: Loading GeoJSON data...');
      
      const response = await fetch('/assets/world-countries.geojson');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const geoJsonData = await response.json();
      console.log(`ImprovedMapView: Loaded ${geoJsonData.features?.length || 0} GeoJSON features`);

      if (!mountedRef.current) return;

      // Create a simple world representation for now
      await createSimpleWorldMap(geoJsonData);

      if (mountedRef.current) {
        setMapState(prev => ({ 
          ...prev, 
          geoJsonLoaded: true 
        }));
      }

    } catch (error) {
      console.error('ImprovedMapView: Failed to load GeoJSON:', error);
      if (mountedRef.current) {
        // Create fallback map even if GeoJSON fails
        createFallbackMap();
        setMapState(prev => ({ 
          ...prev, 
          geoJsonLoaded: true,
          error: `GeoJSON load failed, using fallback: ${error}`
        }));
      }
    }
  }, []);

  // Get country color based on map mode
  const getCountryColor = useCallback((countryData: any, mode: MapMode = 'political') => {
    switch (mode) {
      case 'influence':
        // Color based on superpower influence
        return countryData.properties?.SOVEREIGNT?.includes('United States') ? 0x0066cc : 
               countryData.properties?.SOVEREIGNT?.includes('Russia') ? 0xcc0000 : 0x666666;
      case 'insurgency':
        // Color based on stability (random for demo)
        return Math.random() > 0.7 ? 0xff3333 : 0x33ff33;
      case 'coup':
        // Color based on coup risk/government stability
        const gdp = parseFloat(countryData.properties?.GDP_MD || '0');
        return gdp > 1000 ? 0x00ff00 : gdp > 100 ? 0xffff00 : 0xff0000;
      case 'economy':
        // Color based on economic development
        const population = parseInt(countryData.properties?.POP_EST || '0');
        return population > 100000000 ? 0x0000ff : population > 10000000 ? 0x00aaff : 0x66ccff;
      case 'political':
      default:
        // Default political coloring
        return new THREE.Color().setHSL(Math.random() * 0.8, 0.6, 0.5).getHex();
    }
  }, []);

  // Create simple world map from GeoJSON
  const createSimpleWorldMap = useCallback(async (geoJsonData: any) => {
    if (!sceneRef.current) return;

    const mapGroup = new THREE.Group();
    let countryCount = 0;
    countryMeshesRef.current.clear();

    // Process each country feature
    geoJsonData.features?.forEach((feature: any, index: number) => {
      if (!feature.geometry || !feature.properties) return;

      const countryId = feature.properties.ISO_A3 || feature.properties.ADM0_A3 || `ID_${index}`;
      const countryName = feature.properties.NAME || feature.properties.ADMIN || `Country_${index}`;
      
      // Create a more interesting country representation
      const width = Math.random() * 15 + 8;
      const height = Math.random() * 8 + 4;
      const geometry = new THREE.BoxGeometry(width, height, 1);
      
      const baseColor = getCountryColor(feature, currentMapMode);
      const material = new THREE.MeshLambertMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.8
      });

      const countryMesh = new THREE.Mesh(geometry, material);
      
      // Position countries in a world-like grid pattern
      const gridSize = Math.ceil(Math.sqrt(geoJsonData.features.length));
      const row = Math.floor(countryCount / gridSize);
      const col = countryCount % gridSize;
      
      countryMesh.position.set(
        (col - gridSize / 2) * 18,
        (row - gridSize / 2) * 12,
        0
      );
      
      countryMesh.userData = { 
        countryId,
        countryName,
        originalColor: baseColor,
        feature
      };

      // Store reference for interaction
      countryMeshesRef.current.set(countryId, countryMesh);

      mapGroup.add(countryMesh);
      countryCount++;
    });

    sceneRef.current.add(mapGroup);
    console.log(`ImprovedMapView: Created ${countryCount} interactive country representations`);
  }, [currentMapMode, getCountryColor]);

  // Create fallback map if GeoJSON fails
  const createFallbackMap = useCallback(() => {
    if (!sceneRef.current) return;

    console.log('ImprovedMapView: Creating fallback map...');

    // Create a simple world plane
    const planeGeometry = new THREE.PlaneGeometry(200, 100, 40, 20);
    const planeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x004080,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });
    const worldPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    sceneRef.current.add(worldPlane);

    // Add some continents as simple shapes
    const continents = [
      { name: 'North America', pos: [-50, 30, 1], color: 0x00ff00 },
      { name: 'Europe', pos: [20, 40, 1], color: 0xff0000 },
      { name: 'Asia', pos: [60, 20, 1], color: 0x0000ff },
      { name: 'Africa', pos: [10, -10, 1], color: 0xffff00 },
      { name: 'South America', pos: [-40, -30, 1], color: 0xff00ff },
      { name: 'Australia', pos: [80, -40, 1], color: 0x00ffff }
    ];

    continents.forEach(continent => {
      const geometry = new THREE.SphereGeometry(10, 8, 6);
      const material = new THREE.MeshBasicMaterial({ color: continent.color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(continent.pos[0], continent.pos[1], continent.pos[2]);
      mesh.userData = { continentName: continent.name };
      sceneRef.current!.add(mesh);
    });
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    if (!mountedRef.current || !rendererRef.current || !cameraRef.current || !sceneRef.current) {
      return;
    }

    animationIdRef.current = requestAnimationFrame(animate);
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  }, []);

  // Mouse interaction handlers
  const handleMouseMove = useCallback((event: MouseEvent) => {
    const container = containerRef.current;
    if (!container || !cameraRef.current || !sceneRef.current) return;

    const rect = container.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects([...countryMeshesRef.current.values()]);

    // Handle hover
    if (intersects.length > 0) {
      const hoveredMesh = intersects[0].object as THREE.Mesh;
      const countryId = hoveredMesh.userData.countryId;
      
      if (hoveredCountry !== countryId) {
        // Reset previous hovered country
        if (hoveredCountry && countryMeshesRef.current.has(hoveredCountry)) {
          const prevMesh = countryMeshesRef.current.get(hoveredCountry)!;
          (prevMesh.material as THREE.MeshLambertMaterial).color.setHex(prevMesh.userData.originalColor);
        }
        
        // Highlight new hovered country
        (hoveredMesh.material as THREE.MeshLambertMaterial).color.setHex(0xffff00);
        setHoveredCountry(countryId);
        
        // Change cursor
        container.style.cursor = 'pointer';
      }
    } else {
      // Reset hover state
      if (hoveredCountry && countryMeshesRef.current.has(hoveredCountry)) {
        const prevMesh = countryMeshesRef.current.get(hoveredCountry)!;
        (prevMesh.material as THREE.MeshLambertMaterial).color.setHex(prevMesh.userData.originalColor);
      }
      setHoveredCountry(null);
      container.style.cursor = 'default';
    }
  }, [hoveredCountry]);

  const handleMouseClick = useCallback((event: MouseEvent) => {
    if (!cameraRef.current || !sceneRef.current) return;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects([...countryMeshesRef.current.values()]);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const countryId = clickedMesh.userData.countryId;
      const countryName = clickedMesh.userData.countryName;
      
      console.log(`Country selected: ${countryName} (${countryId})`);
      
      // Reset previous selection
      if (selectedCountry && countryMeshesRef.current.has(selectedCountry)) {
        const prevMesh = countryMeshesRef.current.get(selectedCountry)!;
        prevMesh.scale.setScalar(1);
      }
      
      // Highlight selected country
      clickedMesh.scale.setScalar(1.2);
      setSelectedCountry(countryId);
      
      // Dispatch to Redux
      dispatch(setSelectedCountryAction(countryId));
    }
  }, [selectedCountry, dispatch]);

  // Handle window resize
  const handleResize = useCallback(() => {
    const container = containerRef.current;
    if (!container || !rendererRef.current || !cameraRef.current) return;

    cameraRef.current.aspect = container.clientWidth / container.clientHeight;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(container.clientWidth, container.clientHeight);
  }, []);

  // Main initialization effect - using useLayoutEffect for synchronous execution
  useLayoutEffect(() => {
    mountedRef.current = true;
    
    // Initialize scene
    initializeScene();

    // Start animation loop
    const startAnimation = () => {
      if (mountedRef.current && rendererRef.current) {
        animate();
      }
    };

    // Add event listeners
    window.addEventListener('resize', handleResize);

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('click', handleMouseClick);
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(startAnimation, 100);

    // Cleanup
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('click', handleMouseClick);
      }
      
      cleanup();
    };
  }, [initializeScene, animate, handleResize, cleanup]);

  // Handle map mode changes
  useLayoutEffect(() => {
    if (mapState.geoJsonLoaded && sceneRef.current && countryMeshesRef.current.size > 0) {
      console.log('ImprovedMapView: Map mode changed to:', currentMapMode);
      
      // Re-color all countries based on new map mode
      countryMeshesRef.current.forEach((mesh, countryId) => {
        if (mesh.userData.feature) {
          const newColor = getCountryColor(mesh.userData.feature, currentMapMode);
          mesh.userData.originalColor = newColor;
          
          // Only update color if not currently hovered or selected
          if (hoveredCountry !== countryId) {
            (mesh.material as THREE.MeshLambertMaterial).color.setHex(newColor);
          }
        }
      });
    }
  }, [currentMapMode, mapState.geoJsonLoaded, getCountryColor, hoveredCountry]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        backgroundColor: '#001122',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Loading/Error/Status overlay */}
      {(mapState.isLoading || mapState.error) && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          background: 'rgba(0,0,0,0.8)',
          padding: '20px',
          borderRadius: '8px',
          color: 'white',
          zIndex: 10
        }}>
          {mapState.isLoading && (
            <>
              <p>Loading World Map...</p>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                border: '4px solid #333',
                borderTop: '4px solid #fff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '10px auto'
              }} />
            </>
          )}
          {mapState.error && (
            <div>
              <p style={{ color: '#ff6b6b' }}>Map Error:</p>
              <p style={{ fontSize: '0.9em' }}>{mapState.error}</p>
            </div>
          )}
        </div>
      )}

      {/* Status indicator */}
      {mapState.isInitialized && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 5
        }}>
          Map: {mapState.geoJsonLoaded ? 'Loaded' : 'Loading GeoJSON...'}
          {currentMapMode && ` | Mode: ${currentMapMode}`}
          {mapState.geoJsonLoaded && (
            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>
              Countries: {countryMeshesRef.current.size} | Interactive: ✓
            </div>
          )}
        </div>
      )}

      {/* Country tooltip */}
      {hoveredCountry && countryMeshesRef.current.has(hoveredCountry) && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.9)',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '6px',
          fontSize: '14px',
          zIndex: 6,
          border: '1px solid #ffd700'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {countryMeshesRef.current.get(hoveredCountry)?.userData.countryName}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            ID: {hoveredCountry}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>
            Click to select
          </div>
        </div>
      )}

      {/* Selected country info */}
      {selectedCountry && countryMeshesRef.current.has(selectedCountry) && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(0,100,200,0.9)',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '6px',
          fontSize: '14px',
          zIndex: 6,
          border: '1px solid #00aaff'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            Selected: {countryMeshesRef.current.get(selectedCountry)?.userData.countryName}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            Mode: {currentMapMode || 'political'}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};