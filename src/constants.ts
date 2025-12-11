/**
 * Game configuration constants
 * 
 * Defines hex grid dimensions, colors, and terrain properties.
 * Pure client-side configuration that could be moved to game creation settings.
 * 
 * @module constants
 * @todo SERVER: Make board size configurable per-game in database
 * @todo SERVER: Allow custom color schemes per player
 */

import type { Colors, TerrainType } from './types';

/** Size of a single hex (radius from center to vertex) in pixels */
export const HEX_SIZE = 35;

/** Width of a hex (point-to-point horizontally) */
export const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;

/** Height of a hex (point-to-point vertically) */
export const HEX_HEIGHT = 2 * HEX_SIZE;

/**
 * Number of columns in the game board
 * @todo SERVER: Make configurable per game instance
 */
export const BOARD_COLS = 100;

/**
 * Number of rows in the game board
 * @todo SERVER: Make configurable per game instance
 */
export const BOARD_ROWS = 80;

/**
 * Color palette for rendering game elements
 * Colors are in hex format (#RRGGBB)
 * 
 * @todo SERVER: Allow players to customize their colors in settings
 */
export const COLORS: Colors = {
    /** Hex grid line color (dark purple-gray) */
    gridStroke: '#3e3e5e',
    /** Player color (cyan) */
    player: '#4cc9f0',
    /** Enemy 1 color (pink/magenta) */
    enemy1: '#f72585',
    /** Enemy 2 color (orange) */
    enemy2: '#ff9f1c',
    /** Enemy 3 color (purple) */
    enemy3: '#7b2cbf',
    /** Enemy 4 color (teal) */
    enemy4: '#2ec4b6',
    /** Selected unit highlight (white) */
    select: '#ffffff',
    /** Valid movement overlay (translucent cyan) */
    move: 'rgba(76, 201, 240, 0.3)',
    /** Attack target overlay (translucent magenta) */
    attack: 'rgba(247, 37, 133, 0.3)',
    /** Movement path preview (translucent white) */
    path: 'rgba(255, 255, 255, 0.2)'
};

/**
 * Visual colors for each terrain type
 * Used for hex fill colors when rendering the map
 */
export const TERRAIN_COLORS: Record<TerrainType, string> = {
    /** Grasslands - dark green */
    plains: '#3a5a40',
    /** Dense forest - darker green */
    forest: '#2d4a2d',
    /** Rocky mountains - gray */
    mountain: '#6b6b6b',
    /** Ocean water - dark blue */
    ocean: '#1e3a5f',
    /** Arid desert - tan/yellow */
    desert: '#c2a83e',
    /** Rolling hills - brown/tan */
    hills: '#8b7355'
};

/**
 * Gameplay properties for each terrain type
 * Defines how terrain affects movement, combat, and visibility
 * 
 * Movement cost:
 * - 1 = normal (plains)
 * - 2+ = difficult/slow terrain
 * - Infinity = impassable (water for land units)
 * 
 * Defense bonus:
 * - 0 = no defensive advantage
 * - 0.25 = 25% damage reduction when defending
 * - Negative values increase damage taken
 * 
 * @todo SERVER: Balance values based on playtesting data
 */
export const TERRAIN_CONFIG: Record<TerrainType, {
    movementCost: number;
    defenseBonus: number;
    blocksLineOfSight: boolean;
}> = {
    plains: {
        movementCost: 1,
        defenseBonus: 0,
        blocksLineOfSight: false
    },
    forest: {
        movementCost: 2,
        defenseBonus: 0.25,  // Good cover
        blocksLineOfSight: true  // Ranged units can't shoot through
    },
    mountain: {
        movementCost: Infinity,  // Impassable
        defenseBonus: 0,
        blocksLineOfSight: true
    },
    ocean: {
        movementCost: 1,  // Passable for naval units only (enforced in pathfinding)
        defenseBonus: 0,
        blocksLineOfSight: false
    },
    desert: {
        movementCost: 2,  // Difficult to move through
        defenseBonus: 0,
        blocksLineOfSight: false
    },
    hills: {
        movementCost: 2,  // Hilly terrain is harder to traverse
        defenseBonus: 0.25,  // High ground advantage
        blocksLineOfSight: false
    }
};
