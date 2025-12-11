import type { GameState, Unit, Hex, Structure, StructureType, Owner } from './types';
import { BOARD_COLS, BOARD_ROWS } from './constants';
import { getNeighbors, getDistance } from './hex-math';
import { createUnit, resetUnitIdCounter } from './unit';
import { generateRandomBoard } from './terrain';
import { 
    getReachableHexes as pathfinderGetReachableHexes, 
    findBestMoveTowards as pathfinderFindBestMove,
    applyMovement
} from './pathfinder';

// Constants
const STRUCTURE_SIGHT_RANGE = 3;

let structureIdCounter = 0;

/**
 * Create a new structure
 */
export function createStructure(
    type: StructureType,
    owner: Owner,
    col: number,
    row: number
): Structure {
    structureIdCounter++;
    return {
        id: structureIdCounter,
        type,
        owner,
        col,
        row,
        maxHp: type === 'City' ? 50 : 25,
        hp: type === 'City' ? 50 : 25
    };
}

function resetStructureIdCounter(): void {
    structureIdCounter = 0;
}

// Global game state
export const gameState: GameState = {
    turn: 'player',
    units: [],
    structures: [],
    board: [],
    selectedUnit: null,
    validMoves: [],
    validTargets: [],
    isAnimating: false
};

/**
 * Initialize/reset the game state
 */
export function initGameState(): void {
    resetUnitIdCounter();
    resetStructureIdCounter();
    gameState.units = [];
    gameState.structures = [];
    gameState.board = generateRandomBoard();
    gameState.turn = 'player';
    gameState.selectedUnit = null;
    gameState.validMoves = [];
    gameState.validTargets = [];
    gameState.isAnimating = false;

    // No starting structures - settlers must found cities
    gameState.structures = [];

    // Spawn Player Units - Starting roster: Settler + Warrior
    gameState.units.push(createUnit('Settler', 'player', 5, 5));
    gameState.units.push(createUnit('Warrior', 'player', 6, 5));
    
    // Spawn Enemy 1 Units (bottom-right)
    gameState.units.push(createUnit('Settler', 'enemy1', BOARD_COLS - 6, BOARD_ROWS - 6));
    gameState.units.push(createUnit('Warrior', 'enemy1', BOARD_COLS - 7, BOARD_ROWS - 6));
    
    // Spawn Enemy 2 Units (top-right)
    gameState.units.push(createUnit('Settler', 'enemy2', BOARD_COLS - 6, 6));
    gameState.units.push(createUnit('Warrior', 'enemy2', BOARD_COLS - 7, 6));
    
    // Spawn Enemy 3 Units (bottom-left)
    gameState.units.push(createUnit('Settler', 'enemy3', 6, BOARD_ROWS - 6));
    gameState.units.push(createUnit('Warrior', 'enemy3', 5, BOARD_ROWS - 6));
    
    // Spawn Enemy 4 Units (center)
    gameState.units.push(createUnit('Settler', 'enemy4', Math.floor(BOARD_COLS / 2), Math.floor(BOARD_ROWS / 2)));
    gameState.units.push(createUnit('Warrior', 'enemy4', Math.floor(BOARD_COLS / 2) - 1, Math.floor(BOARD_ROWS / 2)));
    
    // Calculate initial visibility
    updateVisibility();
}

/**
 * Get unit at a specific hex position
 */
export function getUnitAt(col: number, row: number): Unit | undefined {
    return gameState.units.find(u => u.col === col && u.row === row);
}

/**
 * Check if hex coordinates are within the board
 */
export function isValidHex(col: number, row: number): boolean {
    return col >= 0 && col < BOARD_COLS && row >= 0 && row < BOARD_ROWS;
}

/**
 * Get all hexes reachable by a unit using BFS pathfinding
 * Wrapper around pathfinder module
 */
export function getReachableHexes(unit: Unit): Hex[] {
    return pathfinderGetReachableHexes(unit, gameState.board, getUnitAt, isValidHex);
}

/**
 * Get attackable enemy targets for a unit based on its range
 */
export function getAttackableTargets(unit: Unit): Hex[] {
    if (unit.range === 0) return []; // Units with no attack (like Settler)
    
    const targets: Hex[] = [];
    
    // For range 1, just check neighbors
    if (unit.range === 1) {
        const neighbors = getNeighbors(unit.col, unit.row);
        for (const hex of neighbors) {
            const occupant = getUnitAt(hex.col, hex.row);
            if (occupant && occupant.owner !== unit.owner) {
                targets.push(hex);
            }
        }
    } else {
        // For range > 1, check all hexes within range
        for (let row = unit.row - unit.range; row <= unit.row + unit.range; row++) {
            for (let col = unit.col - unit.range; col <= unit.col + unit.range; col++) {
                if (!isValidHex(col, row)) continue;
                if (col === unit.col && row === unit.row) continue;
                
                const dist = getDistance(unit, { col, row });
                if (dist <= unit.range) {
                    const occupant = getUnitAt(col, row);
                    if (occupant && occupant.owner !== unit.owner) {
                        targets.push({ col, row });
                    }
                }
            }
        }
    }
    
    return targets;
}

/**
 * Move a unit to a new position, subtracting movement cost
 */
export function moveUnit(unit: Unit, col: number, row: number): void {
    // Apply movement through pathfinder module
    applyMovement(unit, col, row);
    
    // Update fog of war after movement (for player units)
    if (unit.owner === 'player') {
        updateVisibility();
    }
    
    // Recalculate valid moves if unit can still move
    if (unit.movementRemaining > 0) {
        gameState.validMoves = getReachableHexes(unit);
    } else {
        gameState.validMoves = [];
    }
    
    // Can still attack after moving if hasn't acted
    if (!unit.hasActed) {
        gameState.validTargets = getAttackableTargets(unit);
    } else {
        gameState.validTargets = [];
    }
    
    // Deselect if unit is exhausted (no movement and already acted)
    if (unit.movementRemaining <= 0 && unit.hasActed) {
        gameState.selectedUnit = null;
        gameState.validMoves = [];
        gameState.validTargets = [];
    }
}

// Re-export action functions from actions module
export { attackUnit, canSettle, settleCity } from './actions';

/**
 * Check win/lose conditions
 */
export function checkWinCondition(): 'victory' | 'defeat' | null {
    const enemies = gameState.units.filter(u => u.owner !== 'player');
    const players = gameState.units.filter(u => u.owner === 'player');
    
    if (enemies.length === 0) {
        return 'victory';
    } else if (players.length === 0) {
        return 'defeat';
    }
    return null;
}

/**
 * Find nearest player unit to an enemy
 */
export function findNearestPlayer(enemy: Unit): Unit | null {
    const players = gameState.units.filter(u => u.owner === 'player');
    let nearest: Unit | null = null;
    let minDist = Infinity;
    
    for (const p of players) {
        const d = getDistance(enemy, p);
        if (d < minDist) {
            minDist = d;
            nearest = p;
        }
    }
    return nearest;
}

/**
 * Find best hex to move towards a target
 * Wrapper around pathfinder module
 */
export function findBestMoveTowards(unit: Unit, target: Unit): Hex | null {
    const reachable = getReachableHexes(unit);
    return pathfinderFindBestMove(reachable, target);
}

/**
 * Update visibility for all hexes based on player unit positions
 */
export function updateVisibility(): void {
    // Reset all tiles to not visible (but keep explored status)
    for (let row = 0; row < BOARD_ROWS; row++) {
        for (let col = 0; col < BOARD_COLS; col++) {
            if (gameState.board[row]?.[col]) {
                gameState.board[row][col].visible = false;
            }
        }
    }
    
    // Calculate visibility from each player unit
    const playerUnits = gameState.units.filter(u => u.owner === 'player');
    
    for (const unit of playerUnits) {
        revealAroundUnit(unit);
    }
    
    // Also reveal around player structures
    const playerStructures = gameState.structures.filter(s => s.owner === 'player');
    for (const structure of playerStructures) {
        revealAroundPosition(structure.col, structure.row, STRUCTURE_SIGHT_RANGE);
    }
}

/**
 * Reveal hexes around a unit based on its sight range
 */
function revealAroundUnit(unit: Unit): void {
    revealAroundPosition(unit.col, unit.row, unit.sightRange);
}

/**
 * Reveal hexes around a position with given sight range
 */
function revealAroundPosition(centerCol: number, centerRow: number, sightRange: number): void {
    // Use a simple circle for visibility (could be enhanced with line-of-sight checks)
    for (let row = centerRow - sightRange - 1; row <= centerRow + sightRange + 1; row++) {
        for (let col = centerCol - sightRange - 1; col <= centerCol + sightRange + 1; col++) {
            if (!isValidHex(col, row)) continue;
            
            const dist = getDistance({ col: centerCol, row: centerRow }, { col, row });
            
            if (dist <= sightRange) {
                const tile = gameState.board[row]?.[col];
                if (tile) {
                    tile.visible = true;
                    tile.explored = true;
                }
            }
        }
    }
}
