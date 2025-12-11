/**
 * Canvas 2D rendering engine
 * 
 * Handles all drawing operations for the game:
 * - Hex grid and terrain
 * - Units and structures with owner-colored sprites
 * - UI overlays (movement ranges, attack targets, selection)
 * - Fog of war visualization
 * 
 * Uses pre-loaded and recolored sprites for performance.
 * Implements viewport culling to only render visible hexes.
 * 
 * Pure client-side rendering - no server communication.
 * 
 * @module renderer
 * @todo Add sprite animation system
 * @todo Implement particle effects for combat
 * @todo Add minimap rendering
 */

import type { Unit, Structure, GameState, HexTile, Owner } from './types';
import { HEX_SIZE, COLORS, TERRAIN_COLORS } from './constants';
import { hexToPixel } from './hex-math';
import { camera, worldToScreen, getVisibleHexRange } from './camera';

/**
 * Map unit types to sprite asset file paths
 * Each unit type must have a corresponding PNG in /assets/
 */
const UNIT_SPRITES: Record<string, string> = {
    'Warrior': '/assets/warrior.png',
    'Spearman': '/assets/spearman.png',
    'Scout': '/assets/scout.png',
    'Horseman': '/assets/horseman.png',
    'Settler': '/assets/settler.png',
    'Slinger': '/assets/slinger.png'
};

/**
 * Map structure types to sprite asset file paths
 */
const STRUCTURE_SPRITES: Record<string, string> = {
    'City': '/assets/city.png'
};

/**
 * Owner color palette for sprite recoloring
 * Maps owners to their team colors
 */
const OWNER_COLORS: Record<Owner, string> = {
    'player': COLORS.player,
    'enemy1': COLORS.enemy1,
    'enemy2': COLORS.enemy2,
    'enemy3': COLORS.enemy3,
    'enemy4': COLORS.enemy4
};

/**
 * Cache for recolored sprite canvases
 * Key format: "unitType_owner" -> pre-rendered canvas
 * Prevents re-rendering sprites every frame
 */
const recoloredSpriteCache: Map<string, HTMLCanvasElement> = new Map();

/**
 * Load an image from a URL
 * 
 * Wraps the Image API in a Promise for async/await usage.
 * 
 * @param src - Image file path
 * @returns Promise resolving to loaded HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

/**
 * Recolor a sprite image and return as a canvas
 * 
 * Creates an off-screen canvas with the sprite recolored to match owner color.
 * The sprite format assumes white icons on a colored circular background.
 * 
 * Algorithm:
 * - Pixels above brightness threshold (>180) = keep white (the icon)
 * - Pixels below threshold = recolor to target color (the background circle)
 * 
 * @param image - Source sprite image
 * @param targetColor - Hex color to recolor background to (e.g., "#4cc9f0")
 * @param size - Canvas size in pixels
 * @returns Canvas element with recolored sprite
 */
function createRecoloredSprite(
    image: HTMLImageElement,
    targetColor: string,
    size: number
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Draw original sprite
    ctx.drawImage(image, 0, 0, size, size);
    
    // Get image data for pixel manipulation
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    
    // Parse target color (handles hex like #4cc9f0)
    const r = parseInt(targetColor.slice(1, 3), 16);
    const g = parseInt(targetColor.slice(3, 5), 16);
    const b = parseInt(targetColor.slice(5, 7), 16);
    
    // Threshold for considering a pixel "white" (icon) vs colored (background)
    // Lower threshold catches more of the background including anti-aliased edges
    const whiteThreshold = 180;
    
    for (let i = 0; i < data.length; i += 4) {
        const red = data[i];
        const green = data[i + 1];
        const blue = data[i + 2];
        const alpha = data[i + 3];
        
        // Skip transparent pixels
        if (alpha < 10) continue;
        
        // Check if pixel is "white" (part of the icon) - keep it white
        if (red > whiteThreshold && green > whiteThreshold && blue > whiteThreshold) {
            continue;
        }
        
        // Otherwise, it's the background circle - recolor it
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

// Track sprite loading state to prevent duplicate loads
let spritesLoaded = false;

/**
 * Preload all unit and structure sprites with recoloring
 * 
 * Loads all sprite images and creates recolored versions for each owner.
 * This is done once at game startup to avoid rendering delays.
 * 
 * Creates cache entries like:
 * - "Warrior_player"
 * - "Warrior_enemy1"
 * - "City_player"
 * - etc.
 * 
 * @returns Promise that resolves when all sprites are loaded and cached
 */
export async function preloadSprites(): Promise<void> {
    // Only load sprites once
    if (spritesLoaded) return;
    
    const spriteSize = Math.ceil(HEX_SIZE * 1.4);
    
    // Combine all sprites
    const allSprites = { ...UNIT_SPRITES, ...STRUCTURE_SPRITES };
    
    // Load all original images
    const loadPromises = Object.entries(allSprites).map(async ([type, src]) => {
        const image = await loadImage(src);
        
        // Create recolored versions for each owner
        for (const [owner, color] of Object.entries(OWNER_COLORS)) {
            const cacheKey = `${type}_${owner}`;
            const recoloredCanvas = createRecoloredSprite(image, color, spriteSize);
            recoloredSpriteCache.set(cacheKey, recoloredCanvas);
        }
    });
    
    await Promise.all(loadPromises);
    spritesLoaded = true;
}

/**
 * Get a cached recolored sprite canvas
 * 
 * @param unitType - Type of unit/structure ("Warrior", "City", etc.)
 * @param owner - Owner for color selection
 * @returns Cached canvas element, or null if not found (fallback to basic rendering)
 */
function getCachedSprite(unitType: string, owner: Owner): HTMLCanvasElement | null {
    const cacheKey = `${unitType}_${owner}`;
    return recoloredSpriteCache.get(cacheKey) || null;
}

/**
 * Draw a single hexagon with camera transformation
 * 
 * Converts grid coordinates to world pixel coordinates, then to screen coordinates.
 * Draws a pointy-topped hexagon using the current camera zoom and position.
 * 
 * @param ctx - Canvas 2D rendering context
 * @param col - Hex column position
 * @param row - Hex row position
 * @param fillStyle - Fill color (null for no fill)
 * @param strokeStyle - Stroke color (default: grid color)
 * @param lineWidth - Line width in pixels (default: 1)
 */
export function drawHex(
    ctx: CanvasRenderingContext2D,
    col: number,
    row: number,
    fillStyle: string | null,
    strokeStyle: string = COLORS.gridStroke,
    lineWidth: number = 1
): void {
    const worldCenter = hexToPixel(col, row);
    const center = worldToScreen(worldCenter.x, worldCenter.y);
    const scaledHexSize = HEX_SIZE * camera.zoom;
    
    ctx.beginPath();
    
    for (let i = 0; i < 6; i++) {
        const angle_deg = 60 * i - 30;
        const angle_rad = Math.PI / 180 * angle_deg;
        const x = center.x + scaledHexSize * Math.cos(angle_rad);
        const y = center.y + scaledHexSize * Math.sin(angle_rad);
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
    
    if (fillStyle) {
        ctx.fillStyle = fillStyle;
        ctx.fill();
    }
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
}

/**
 * Draw a unit on the canvas with sprite and status overlays
 * 
 * Renders (in order):
 * 1. Glow effect if unit is selected
 * 2. Owner-colored sprite (or colored circle fallback)
 * 3. HP bar showing health status
 * 4. Exhaustion overlay if unit has no actions remaining
 * 
 * @param ctx - Canvas 2D rendering context
 * @param unit - Unit to render
 * @param selectedUnit - Currently selected unit (for glow effect)
 */
export function drawUnit(
    ctx: CanvasRenderingContext2D,
    unit: Unit,
    selectedUnit: Unit | null
): void {
    const worldCenter = hexToPixel(unit.col, unit.row);
    const center = worldToScreen(worldCenter.x, worldCenter.y);
    const spriteSize = HEX_SIZE * 1.4 * camera.zoom;
    const scaledHexSize = HEX_SIZE * camera.zoom;
    const ownerColor = OWNER_COLORS[unit.owner];
    
    // Glow for active unit
    if (unit === selectedUnit) {
        ctx.beginPath();
        ctx.arc(center.x, center.y, scaledHexSize * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
    }

    // Draw unit sprite from cache
    const cachedSprite = getCachedSprite(unit.type, unit.owner);
    if (cachedSprite) {
        ctx.drawImage(
            cachedSprite,
            center.x - spriteSize / 2,
            center.y - spriteSize / 2,
            spriteSize,
            spriteSize
        );
    } else {
        // Fallback: draw colored circle with letter
        ctx.beginPath();
        ctx.arc(center.x, center.y, scaledHexSize * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = ownerColor;
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${14 * camera.zoom}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(unit.type[0], center.x, center.y);
    }

    // HP Bar
    const barWidth = 30 * camera.zoom;
    const hpPct = unit.hp / unit.maxHp;
    ctx.fillStyle = '#333';
    ctx.fillRect(center.x - barWidth/2, center.y + 20 * camera.zoom, barWidth, 6 * camera.zoom);
    ctx.fillStyle = hpPct > 0.5 ? '#0f0' : '#f00';
    ctx.fillRect(center.x - barWidth/2 + 1, center.y + 21 * camera.zoom, (barWidth - 2) * hpPct, 4 * camera.zoom);
    
    // Exhausted overlay - shows when unit has used all actions
    const isExhausted = unit.movementRemaining <= 0 && unit.hasActed;
    if (unit.owner === 'player' && isExhausted) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.arc(center.x, center.y, spriteSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Draw a structure (city, fort, etc.) on the canvas
 * 
 * Similar to drawUnit but for buildings.
 * Renders sprite and HP bar.
 * 
 * @param ctx - Canvas 2D rendering context
 * @param structure - Structure to render
 */
export function drawStructure(
    ctx: CanvasRenderingContext2D,
    structure: Structure
): void {
    const worldCenter = hexToPixel(structure.col, structure.row);
    const center = worldToScreen(worldCenter.x, worldCenter.y);
    const spriteSize = HEX_SIZE * 1.4 * camera.zoom;
    const scaledHexSize = HEX_SIZE * camera.zoom;
    const ownerColor = OWNER_COLORS[structure.owner];

    // Draw structure sprite from cache
    const cachedSprite = getCachedSprite(structure.type, structure.owner);
    if (cachedSprite) {
        ctx.drawImage(
            cachedSprite,
            center.x - spriteSize / 2,
            center.y - spriteSize / 2,
            spriteSize,
            spriteSize
        );
    } else {
        // Fallback: draw colored square with letter
        ctx.fillStyle = ownerColor;
        ctx.fillRect(
            center.x - scaledHexSize * 0.4,
            center.y - scaledHexSize * 0.4,
            scaledHexSize * 0.8,
            scaledHexSize * 0.8
        );
        
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${14 * camera.zoom}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(structure.type[0], center.x, center.y);
    }

    // HP Bar
    const barWidth = 30 * camera.zoom;
    const hpPct = structure.hp / structure.maxHp;
    ctx.fillStyle = '#333';
    ctx.fillRect(center.x - barWidth/2, center.y + 20 * camera.zoom, barWidth, 6 * camera.zoom);
    ctx.fillStyle = hpPct > 0.5 ? '#0f0' : '#f00';
    ctx.fillRect(center.x - barWidth/2 + 1, center.y + 21 * camera.zoom, (barWidth - 2) * hpPct, 4 * camera.zoom);
}

/**
 * Main render function - draws the complete game frame
 * 
 * Rendering order (painter's algorithm, back to front):
 * 1. Dark background
 * 2. Terrain hexes (with fog of war)
 * 3. Movement/attack overlay highlights
 * 4. Structures (sorted by row for proper overlap)
 * 5. Units (sorted by row for proper overlap)
 * 
 * Uses viewport culling to only render visible hexes for performance.
 * 
 * Fog of war rendering:
 * - Unexplored: Draw black hex (no information)
 * - Explored but not visible: Draw terrain with dark overlay
 * - Visible: Draw terrain and units normally
 * 
 * @param ctx - Canvas 2D rendering context
 * @param canvas - Canvas element (for dimensions)
 * @param gameState - Current game state to render
 */
export function render(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    gameState: GameState
): void {
    // Clear Background
    ctx.fillStyle = '#12121c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Get visible hex range for culling
    const visible = getVisibleHexRange(canvas.width, canvas.height);

    // Draw Grid & Highlights (only visible hexes)
    for (let r = visible.minRow; r <= visible.maxRow; r++) {
        for (let q = visible.minCol; q <= visible.maxCol; q++) {
            // Get tile from board
            const tile: HexTile | undefined = gameState.board[r]?.[q];
            if (!tile) continue;
            
            // Skip completely unexplored tiles (draw nothing - black fog)
            if (!tile.explored) {
                drawHex(ctx, q, r, '#0a0a0f', '#0a0a0f', 1);
                continue;
            }
            
            // Get terrain color as base fill
            let fill: string | null = TERRAIN_COLORS[tile.terrain];
            let stroke = COLORS.gridStroke;
            let lw = 1;

            // Highlight Logic (overlays on terrain) - only for visible tiles
            if (tile.visible) {
                if (gameState.validMoves.some(m => m.col === q && m.row === r)) {
                    // Draw terrain first, then overlay
                    drawHex(ctx, q, r, fill, stroke, lw);
                    fill = COLORS.move;
                }
                if (gameState.validTargets.some(t => t.col === q && t.row === r)) {
                    drawHex(ctx, q, r, fill, stroke, lw);
                    fill = COLORS.attack;
                    stroke = COLORS.enemy1;
                    lw = 2;
                }
                if (gameState.selectedUnit && 
                    gameState.selectedUnit.col === q && 
                    gameState.selectedUnit.row === r) {
                    stroke = COLORS.select;
                    lw = 3;
                }
            }

            drawHex(ctx, q, r, fill, stroke, lw);
            
            // Fog overlay for explored but not currently visible tiles
            if (tile.explored && !tile.visible) {
                drawHex(ctx, q, r, 'rgba(0, 0, 0, 0.6)', stroke, lw);
            }
        }
    }

    // Draw Structures (only if visible or explored)
    const sortedStructures = [...gameState.structures]
        .filter(s => {
            const tile = gameState.board[s.row]?.[s.col];
            return tile?.visible; // Only show if currently visible
        })
        .sort((a, b) => a.row - b.row);
    sortedStructures.forEach(s => drawStructure(ctx, s));

    // Draw Units (only if visible)
    const sortedUnits = [...gameState.units]
        .filter(u => {
            const tile = gameState.board[u.row]?.[u.col];
            // Always show player units, only show enemy units if visible
            return u.owner === 'player' || tile?.visible;
        })
        .sort((a, b) => a.row - b.row);
    sortedUnits.forEach(u => drawUnit(ctx, u, gameState.selectedUnit));
}
