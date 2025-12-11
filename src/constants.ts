// Game constants

import type { Colors, TerrainType } from './types';

export const HEX_SIZE = 35;
export const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
export const HEX_HEIGHT = 2 * HEX_SIZE;
export const BOARD_COLS = 100;
export const BOARD_ROWS = 80;

export const COLORS: Colors = {
    gridStroke: '#3e3e5e',
    player: '#4cc9f0',
    enemy1: '#f72585',    // Pink/Magenta
    enemy2: '#ff9f1c',    // Orange
    enemy3: '#7b2cbf',    // Purple
    enemy4: '#2ec4b6',    // Teal
    select: '#ffffff',
    move: 'rgba(76, 201, 240, 0.3)',
    attack: 'rgba(247, 37, 133, 0.3)',
    path: 'rgba(255, 255, 255, 0.2)'
};

// Terrain colors for rendering
export const TERRAIN_COLORS: Record<TerrainType, string> = {
    plains: '#3a5a40',
    forest: '#2d4a2d',
    mountain: '#6b6b6b',
    water: '#1e3a5f',
    sand: '#c2a83e',
    swamp: '#4a5a3a'
};

// Terrain properties configuration
export const TERRAIN_CONFIG: Record<TerrainType, {
    movementCost: number;
    defenseBonus: number;
    blocksLineOfSight: boolean;
    elevation: number;
}> = {
    plains: {
        movementCost: 1,
        defenseBonus: 0,
        blocksLineOfSight: false,
        elevation: 1
    },
    forest: {
        movementCost: 2,
        defenseBonus: 0.25,
        blocksLineOfSight: true,
        elevation: 1
    },
    mountain: {
        movementCost: 3,
        defenseBonus: 0.5,
        blocksLineOfSight: true,
        elevation: 2
    },
    water: {
        movementCost: Infinity,  // Impassable
        defenseBonus: 0,
        blocksLineOfSight: false,
        elevation: 0
    },
    sand: {
        movementCost: 2,
        defenseBonus: 0,
        blocksLineOfSight: false,
        elevation: 1
    },
    swamp: {
        movementCost: 2,
        defenseBonus: -0.1,  // Negative = takes more damage
        blocksLineOfSight: false,
        elevation: 0
    }
};
