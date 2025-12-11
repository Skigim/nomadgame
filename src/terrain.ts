import type { HexTile, TerrainType } from './types';
import { BOARD_COLS, BOARD_ROWS, TERRAIN_CONFIG } from './constants';

/**
 * Create a single hex tile with terrain properties
 */
export function createHexTile(col: number, row: number, terrain: TerrainType): HexTile {
    const config = TERRAIN_CONFIG[terrain];
    return {
        col,
        row,
        terrain,
        movementCost: config.movementCost,
        defenseBonus: config.defenseBonus,
        blocksLineOfSight: config.blocksLineOfSight,
        elevation: config.elevation,
        visible: false,
        explored: false
    };
}

/**
 * Generate a board filled with a default terrain
 */
export function generateEmptyBoard(defaultTerrain: TerrainType = 'plains'): HexTile[][] {
    const board: HexTile[][] = [];
    for (let row = 0; row < BOARD_ROWS; row++) {
        board[row] = [];
        for (let col = 0; col < BOARD_COLS; col++) {
            board[row][col] = createHexTile(col, row, defaultTerrain);
        }
    }
    return board;
}

/**
 * Simple noise function for terrain generation
 */
function noise2D(x: number, y: number, seed: number = 12345): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
}

/**
 * Fractal noise for more natural-looking terrain
 */
function fractalNoise(x: number, y: number, octaves: number = 4, persistence: number = 0.5): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
        total += noise2D(x * frequency, y * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2;
    }
    
    return total / maxValue;
}

/**
 * Generate a randomized board with varied terrain using noise-based generation
 */
export function generateRandomBoard(): HexTile[][] {
    const board = generateEmptyBoard('plains');
    
    // Scale factors for noise (smaller = larger features)
    const terrainScale = 0.08;
    const moistureScale = 0.05;
    
    for (let row = 0; row < BOARD_ROWS; row++) {
        for (let col = 0; col < BOARD_COLS; col++) {
            // Get noise values for this position
            const elevation = fractalNoise(col * terrainScale, row * terrainScale, 4, 0.5);
            const moisture = fractalNoise(col * moistureScale + 100, row * moistureScale + 100, 3, 0.6);
            
            let terrain: TerrainType = 'plains';
            
            // Determine terrain based on elevation and moisture
            if (elevation < 0.25) {
                // Low elevation - water or swamp
                terrain = moisture > 0.5 ? 'water' : 'swamp';
            } else if (elevation < 0.4) {
                // Low-medium - sand (beaches/deserts) or swamp
                terrain = moisture < 0.3 ? 'sand' : (moisture < 0.5 ? 'plains' : 'swamp');
            } else if (elevation < 0.65) {
                // Medium - plains or forest based on moisture
                terrain = moisture > 0.5 ? 'forest' : 'plains';
            } else if (elevation < 0.8) {
                // Medium-high - forest or mountain
                terrain = moisture > 0.4 ? 'forest' : 'mountain';
            } else {
                // High elevation - mountains
                terrain = 'mountain';
            }
            
            board[row][col] = createHexTile(col, row, terrain);
        }
    }
    
    // Clear spawn areas (player spawn area near top-left, enemy near bottom-right)
    const spawnRadius = 8;
    
    // Player spawn area
    clearSpawnArea(board, 5, 5, spawnRadius);
    
    // Enemy spawn area
    clearSpawnArea(board, BOARD_COLS - 6, BOARD_ROWS - 6, spawnRadius);
    
    return board;
}

/**
 * Clear a spawn area to plains for fair starting position
 */
function clearSpawnArea(board: HexTile[][], centerCol: number, centerRow: number, radius: number): void {
    for (let row = centerRow - radius; row <= centerRow + radius; row++) {
        for (let col = centerCol - radius; col <= centerCol + radius; col++) {
            if (row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS) {
                const dx = col - centerCol;
                const dy = row - centerRow;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist <= radius) {
                    board[row][col] = createHexTile(col, row, 'plains');
                }
            }
        }
    }
}

/**
 * Get a tile from the board safely
 */
export function getTile(board: HexTile[][], col: number, row: number): HexTile | null {
    if (row < 0 || row >= board.length) return null;
    if (col < 0 || col >= board[row].length) return null;
    return board[row][col];
}

/**
 * Check if a tile is passable (movement cost is not infinite)
 */
export function isPassable(tile: HexTile): boolean {
    return tile.movementCost !== Infinity;
}
