/**
 * Terrain generation and tile utilities
 * 
 * Handles procedural map generation using fractal noise and provides
 * utility functions for working with individual terrain tiles.
 * 
 * @module terrain
 * @todo SERVER: Generate and persist map during game creation
 * @todo SERVER: Add save/load for procedurally generated maps
 */

import type { HexTile, TerrainType } from './types';
import { BOARD_COLS, BOARD_ROWS, TERRAIN_CONFIG } from './constants';

/**
 * Create a single hex tile with terrain properties
 * 
 * Constructs a HexTile from coordinates and terrain type, applying all
 * gameplay properties from TERRAIN_CONFIG. Tiles start unexplored.
 * 
 * @param col - Column position
 * @param row - Row position
 * @param terrain - Type of terrain for this tile
 * @returns Configured HexTile ready for use in game board
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
        visible: false,
        explored: false
    };
}

/**
 * Generate a board filled with a single terrain type
 * 
 * Creates a blank BOARD_ROWS x BOARD_COLS grid with uniform terrain.
 * Useful for testing or as a base for custom map generation.
 * 
 * @param defaultTerrain - Terrain type to fill the board with (default: 'plains')
 * @returns 2D array of HexTiles indexed as [row][col]
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
 * Simple 2D noise function using sine wave hashing
 * 
 * Generates pseudo-random values in [0, 1] based on x, y coordinates.
 * Not cryptographically secure - just for procedural generation.
 * 
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param seed - Random seed for variation (default: 12345)
 * @returns Pseudo-random value in range [0, 1]
 */
function noise2D(x: number, y: number, seed: number = 12345): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
}

/**
 * Multi-octave fractal noise for natural-looking terrain
 * 
 * Combines multiple layers of noise at different frequencies to create
 * more organic, varied terrain patterns. Higher octaves add finer detail.
 * 
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param octaves - Number of noise layers to combine (default: 4)
 * @param persistence - Amplitude decrease per octave (default: 0.5)
 * @returns Combined noise value in range [0, 1]
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
 * Generate a randomized board with varied terrain using procedural noise
 * 
 * Creates a realistic-looking map by combining elevation and moisture noise.
 * Terrain types are determined by elevation and moisture thresholds:
 * - Low elevation + water = water/swamp
 * - Medium elevation = plains/forest based on moisture
 * - High elevation = mountains
 * - Low moisture = sand/desert
 * 
 * Clears spawn areas to plains for fair starting positions for all players.
 * 
 * @returns Fully generated game board ready to play
 * @todo SERVER: Persist generated maps to database for multiplayer consistency
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
                // Low elevation - ocean or hills
                terrain = moisture > 0.5 ? 'ocean' : 'hills';
            } else if (elevation < 0.4) {
                // Low-medium - desert (dry) or plains/hills
                terrain = moisture < 0.3 ? 'desert' : (moisture < 0.5 ? 'plains' : 'hills');
            } else if (elevation < 0.65) {
                // Medium - plains or forest based on moisture
                terrain = moisture > 0.5 ? 'forest' : 'plains';
            } else if (elevation < 0.8) {
                // Medium-high - forest or hills
                terrain = moisture > 0.4 ? 'forest' : 'hills';
            } else {
                // High elevation - impassable mountains
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
 * Clear a circular spawn area to plains for fair starting position
 * 
 * Ensures each player starts on passable, neutral terrain without
 * random disadvantages from terrain generation.
 * 
 * @param board - Game board to modify
 * @param centerCol - Center column of spawn area
 * @param centerRow - Center row of spawn area
 * @param radius - Radius in hexes to clear
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
 * Safely get a tile from the board with bounds checking
 * 
 * Returns null if coordinates are out of bounds instead of throwing.
 * Useful for neighbor checks and edge cases.
 * 
 * @param board - Game board
 * @param col - Column to access
 * @param row - Row to access
 * @returns HexTile if in bounds, null otherwise
 */
export function getTile(board: HexTile[][], col: number, row: number): HexTile | null {
    if (row < 0 || row >= board.length) return null;
    if (col < 0 || col >= board[row].length) return null;
    return board[row][col];
}

/**
 * Check if a tile allows unit movement
 * 
 * A tile is passable if its movement cost is finite (not Infinity).
 * Water is typically impassable for land units.
 * 
 * @param tile - Tile to check
 * @returns True if units can enter this tile
 */
export function isPassable(tile: HexTile): boolean {
    return tile.movementCost !== Infinity;
}
