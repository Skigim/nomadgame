import type { Camera, Pixel } from './types';
import { HEX_WIDTH, HEX_HEIGHT, BOARD_COLS, BOARD_ROWS } from './constants';

/**
 * Global camera state
 */
export const camera: Camera = {
    x: 0,
    y: 0,
    zoom: 1
};

/**
 * Get world bounds based on board size
 */
export function getWorldBounds(): { width: number; height: number } {
    const width = BOARD_COLS * HEX_WIDTH + HEX_WIDTH / 2;
    const height = BOARD_ROWS * HEX_HEIGHT * 0.75 + HEX_HEIGHT * 0.25;
    return { width, height };
}

/**
 * Convert world coordinates to screen coordinates
 */
export function worldToScreen(worldX: number, worldY: number): Pixel {
    return {
        x: (worldX - camera.x) * camera.zoom,
        y: (worldY - camera.y) * camera.zoom
    };
}

/**
 * Convert screen coordinates to world coordinates
 */
export function screenToWorld(screenX: number, screenY: number): Pixel {
    return {
        x: screenX / camera.zoom + camera.x,
        y: screenY / camera.zoom + camera.y
    };
}

/**
 * Pan the camera by a delta amount
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
 * Center camera on a specific world position
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
 * Get visible hex range for culling (which hexes are on screen)
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
 * Reset camera to default position
 */
export function resetCamera(): void {
    camera.x = 0;
    camera.y = 0;
    camera.zoom = 1;
}
