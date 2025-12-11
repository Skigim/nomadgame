/**
 * Camera and viewport management
 * 
 * Handles camera state for panning, zooming, and coordinate transformations.
 * Provides viewport culling to optimize rendering by only drawing visible hexes.
 * 
 * Pure client-side module - all camera state is local to the player's view.
 * 
 * @module camera
 */

import type { Camera, Pixel } from './types';
import { HEX_WIDTH, HEX_HEIGHT, BOARD_COLS, BOARD_ROWS } from './constants';

/**
 * Global camera state - controls viewport position and zoom level
 * Mutated by panning and zooming functions
 */
export const camera: Camera = {
    x: 0,
    y: 0,
    zoom: 1
};

/**
 * Calculate the total world dimensions based on board size
 * 
 * Returns the pixel width and height of the entire game board.
 * Used for clamping camera bounds to prevent scrolling into empty space.
 * 
 * @returns World dimensions in pixels
 */
export function getWorldBounds(): { width: number; height: number } {
    const width = BOARD_COLS * HEX_WIDTH + HEX_WIDTH / 2;
    const height = BOARD_ROWS * HEX_HEIGHT * 0.75 + HEX_HEIGHT * 0.25;
    return { width, height };
}

/**
 * Transform world coordinates to screen coordinates
 * 
 * Applies camera offset and zoom to convert from world space (hex positions)
 * to screen space (canvas pixels). Used for rendering.
 * 
 * @param worldX - X coordinate in world space
 * @param worldY - Y coordinate in world space
 * @returns Screen pixel coordinates
 */
export function worldToScreen(worldX: number, worldY: number): Pixel {
    return {
        x: (worldX - camera.x) * camera.zoom,
        y: (worldY - camera.y) * camera.zoom
    };
}

/**
 * Transform screen coordinates to world coordinates
 * 
 * Applies inverse camera transformation to convert from screen pixels
 * (e.g., mouse position) to world space. Used for input handling.
 * 
 * @param screenX - X coordinate in screen space (canvas pixels)
 * @param screenY - Y coordinate in screen space (canvas pixels)
 * @returns World coordinates
 */
export function screenToWorld(screenX: number, screenY: number): Pixel {
    return {
        x: screenX / camera.zoom + camera.x,
        y: screenY / camera.zoom + camera.y
    };
}

/**
 * Pan the camera by a delta amount with bounds clamping
 * 
 * Moves the camera view and clamps to world bounds with some overshoot allowed
 * for better UX at edges. Mutates the global camera state.
 * 
 * @param dx - Change in X position (positive = pan right)
 * @param dy - Change in Y position (positive = pan down)
 * @param canvasWidth - Current canvas width in pixels
 * @param canvasHeight - Current canvas height in pixels
 */
export function panCamera(dx: number, dy: number, canvasWidth: number, canvasHeight: number): void {
    const bounds = getWorldBounds();
    
    camera.x += dx;
    camera.y += dy;
    
    // Clamp to world bounds (allow some overshoot for edge visibility)
    const viewWidth = canvasWidth / camera.zoom;
    const viewHeight = canvasHeight / camera.zoom;
    
    const minX = -viewWidth * 0.2;
    const minY = -viewHeight * 0.2;
    const maxX = bounds.width - viewWidth * 0.8;
    const maxY = bounds.height - viewHeight * 0.8;
    
    camera.x = Math.max(minX, Math.min(maxX, camera.x));
    camera.y = Math.max(minY, Math.min(maxY, camera.y));
}

/**
 * Center the camera on a specific world position
 * 
 * Snaps the camera so the given world coordinates are centered in the viewport.
 * Useful for focusing on units, cities, or other points of interest.
 * 
 * @param worldX - World X coordinate to center on
 * @param worldY - World Y coordinate to center on
 * @param canvasWidth - Current canvas width in pixels
 * @param canvasHeight - Current canvas height in pixels
 */
export function centerCameraOn(worldX: number, worldY: number, canvasWidth: number, canvasHeight: number): void {
    const viewWidth = canvasWidth / camera.zoom;
    const viewHeight = canvasHeight / camera.zoom;
    
    camera.x = worldX - viewWidth / 2;
    camera.y = worldY - viewHeight / 2;
    
    // Re-apply bounds clamping
    panCamera(0, 0, canvasWidth, canvasHeight);
}

/**
 * Calculate which hex range is currently visible in the viewport
 * 
 * Used for rendering optimization (viewport culling). Only hexes within this
 * range need to be drawn. Includes padding to catch partially-visible hexes.
 * 
 * @param canvasWidth - Current canvas width in pixels
 * @param canvasHeight - Current canvas height in pixels
 * @returns Visible hex coordinate bounds
 */
export function getVisibleHexRange(canvasWidth: number, canvasHeight: number): {
    minCol: number;
    maxCol: number;
    minRow: number;
    maxRow: number;
} {
    const viewWidth = canvasWidth / camera.zoom;
    const viewHeight = canvasHeight / camera.zoom;
    
    // Add padding for hexes partially on screen
    const padding = 2;
    
    const minCol = Math.max(0, Math.floor(camera.x / HEX_WIDTH) - padding);
    const maxCol = Math.min(BOARD_COLS - 1, Math.ceil((camera.x + viewWidth) / HEX_WIDTH) + padding);
    const minRow = Math.max(0, Math.floor(camera.y / (HEX_HEIGHT * 0.75)) - padding);
    const maxRow = Math.min(BOARD_ROWS - 1, Math.ceil((camera.y + viewHeight) / (HEX_HEIGHT * 0.75)) + padding);
    
    return { minCol, maxCol, minRow, maxRow };
}

/**
 * Reset camera to default position and zoom
 * 
 * Returns camera to top-left origin with 1:1 zoom.
 * Used when starting a new game or resetting view.
 */
export function resetCamera(): void {
    camera.x = 0;
    camera.y = 0;
    camera.zoom = 1;
}
