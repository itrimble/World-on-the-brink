/**
 * Touch event handling for the Three.js map on iOS/mobile.
 * Supports:
 * - Single finger tap → country selection
 * - Single finger drag → map panning
 * - Pinch (two fingers) → zoom in/out
 */
import * as THREE from 'three';
import { MapInteractionData, handleMouseClick, handleMouseMove } from './map-interaction';

export interface TouchState {
  /** Are we in a touch-drag? */
  isDragging: boolean;
  /** Starting position of the single-finger touch */
  touchStart: THREE.Vector2;
  /** Previous touch position for delta calculation */
  lastTouch: THREE.Vector2;
  /** Distance between two fingers at pinch start */
  pinchStartDistance: number;
  /** Zoom level when pinch started */
  pinchStartZoom: number;
  /** Timestamp of touch start (for tap detection) */
  touchStartTime: number;
  /** Was this touch a multi-touch gesture? If so, don't fire tap on end. */
  wasMultiTouch: boolean;
}

export function createTouchState(): TouchState {
  return {
    isDragging: false,
    touchStart: new THREE.Vector2(),
    lastTouch: new THREE.Vector2(),
    pinchStartDistance: 0,
    pinchStartZoom: 1,
    touchStartTime: 0,
    wasMultiTouch: false,
  };
}

const TAP_THRESHOLD_MS = 250;
const TAP_MOVE_THRESHOLD_PX = 10;

function getTouchDistance(t1: Touch, t2: Touch): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Handle touchstart - begin drag or pinch.
 */
export function handleTouchStart(
  event: TouchEvent,
  touchState: TouchState,
  data: MapInteractionData
): void {
  event.preventDefault();

  if (event.touches.length === 1) {
    const touch = event.touches[0];
    touchState.isDragging = true;
    touchState.touchStart.set(touch.clientX, touch.clientY);
    touchState.lastTouch.set(touch.clientX, touch.clientY);
    touchState.touchStartTime = Date.now();
    touchState.wasMultiTouch = false;

    data.setIsDragging(true);
    data.setDragStart(new THREE.Vector2(touch.clientX, touch.clientY));
  } else if (event.touches.length === 2) {
    // Pinch start
    touchState.wasMultiTouch = true;
    touchState.isDragging = false;
    data.setIsDragging(false);
    touchState.pinchStartDistance = getTouchDistance(event.touches[0], event.touches[1]);
    touchState.pinchStartZoom = data.zoomLevel || 1;
  }
}

/**
 * Handle touchmove - pan or zoom.
 */
export function handleTouchMove(
  event: TouchEvent,
  touchState: TouchState,
  data: MapInteractionData,
  onZoomChange: (newZoom: number) => void
): void {
  event.preventDefault();

  if (event.touches.length === 1 && touchState.isDragging) {
    const touch = event.touches[0];
    // Create a synthetic MouseEvent-like object for the existing mouse handler
    const syntheticEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY,
    } as MouseEvent;

    // Update drag start to current for delta calculation
    data.setDragStart(new THREE.Vector2(touchState.lastTouch.x, touchState.lastTouch.y));
    data.setIsDragging(true);

    // Calculate pan delta directly
    const deltaX = touch.clientX - touchState.lastTouch.x;
    const deltaY = touch.clientY - touchState.lastTouch.y;

    const zoomFactor = data.zoomLevel ? Math.max(0.1, data.zoomLevel) : 1.0;
    const dragScale = (0.05 * 50) / (data.camera.position.z * zoomFactor);

    data.onPan(deltaX * dragScale, -deltaY * dragScale);

    touchState.lastTouch.set(touch.clientX, touch.clientY);
  } else if (event.touches.length === 2) {
    // Pinch zoom
    touchState.wasMultiTouch = true;
    const currentDistance = getTouchDistance(event.touches[0], event.touches[1]);
    if (touchState.pinchStartDistance > 0) {
      const scale = currentDistance / touchState.pinchStartDistance;
      const newZoom = touchState.pinchStartZoom * scale;
      onZoomChange(newZoom);
    }
  }
}

/**
 * Handle touchend - detect taps for country selection.
 */
export function handleTouchEnd(
  event: TouchEvent,
  touchState: TouchState,
  raycaster: THREE.Raycaster,
  mouse: THREE.Vector2,
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer,
  data: MapInteractionData
): void {
  event.preventDefault();

  if (event.touches.length === 0) {
    const elapsed = Date.now() - touchState.touchStartTime;
    const changedTouch = event.changedTouches[0];

    // Detect tap (short duration, small movement, not a pinch)
    if (!touchState.wasMultiTouch && elapsed < TAP_THRESHOLD_MS && changedTouch) {
      const dx = changedTouch.clientX - touchState.touchStart.x;
      const dy = changedTouch.clientY - touchState.touchStart.y;
      const moveDistance = Math.sqrt(dx * dx + dy * dy);

      if (moveDistance < TAP_MOVE_THRESHOLD_PX) {
        // Convert touch position to normalized device coordinates
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((changedTouch.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((changedTouch.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        handleMouseClick({} as MouseEvent, raycaster, data);
      }
    }

    touchState.isDragging = false;
    touchState.wasMultiTouch = false;
    data.setIsDragging(false);
  }
}
