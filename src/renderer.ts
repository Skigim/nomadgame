import type { Unit, Structure, GameState, HexTile, Owner } from './types';
import { HEX_SIZE, COLORS, TERRAIN_COLORS } from './constants';
import { hexToPixel } from './hex-math';
import { camera, worldToScreen, getVisibleHexRange } from './camera';

// Map unit types to asset filenames
const UNIT_SPRITES: Record<string, string> = {
    'Warrior': '/assets/warrior.png',
    'Spearman': '/assets/spearman.png',
    'Scout': '/assets/scout.png',
    'Horseman': '/assets/horseman.png',
    'Settler': '/assets/settler.png',
    'Slinger': '/assets/slinger.png'
};

// Map structure types to asset filenames
const STRUCTURE_SPRITES: Record<string, string> = {
    'City': '/assets/city.png'
};

// Owner colors for recoloring sprites
const OWNER_COLORS: Record<Owner, string> = {
    'player': COLORS.player,
    'enemy': COLORS.enemy
};

// Cache for recolored sprite canvases: Map<"unitType_owner", HTMLCanvasElement>
const recoloredSpriteCache: Map<string, HTMLCanvasElement> = new Map();

/**
 * Load an image
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
 * Recolor a sprite and return a canvas with the result
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

// Track if sprites have been loaded
let spritesLoaded = false;

/**
 * Preload all unit and structure sprites and create recolored versions for each owner
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
 * Get cached recolored sprite for a unit type and owner
 */
function getCachedSprite(unitType: string, owner: Owner): HTMLCanvasElement | null {
    const cacheKey = `${unitType}_${owner}`;
    return recoloredSpriteCache.get(cacheKey) || null;
}

/**
 * Draw a single hexagon (using screen coordinates with camera offset)
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
 * Draw a unit on the canvas
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
    const ownerColor = unit.owner === 'player' ? COLORS.player : COLORS.enemy;
    
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
 * Draw a structure on the canvas
 */
export function drawStructure(
    ctx: CanvasRenderingContext2D,
    structure: Structure
): void {
    const worldCenter = hexToPixel(structure.col, structure.row);
    const center = worldToScreen(worldCenter.x, worldCenter.y);
    const spriteSize = HEX_SIZE * 1.4 * camera.zoom;
    const scaledHexSize = HEX_SIZE * camera.zoom;
    const ownerColor = structure.owner === 'player' ? COLORS.player : COLORS.enemy;

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
 * Main render function
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
                    stroke = COLORS.enemy;
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
