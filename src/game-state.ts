/**
 * Centralized game state management
 * 
 * This is the single source of truth for all game data. All game state mutations
 * should happen through exported functions in this module.
 * 
 * Currently manages state entirely client-side. When moving to multiplayer:
 * - Most functions will become API calls to server
 * - Server will validate all state changes
 * - Client will only store UI state (selectedUnit, validMoves, etc.)
 * 
 * @module game-state
 * @todo SERVER: Split into server state (authoritative) vs client UI state
 * @todo SERVER: Implement state synchronization protocol
 * @todo SERVER: Add event sourcing for game replay and validation
 */

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

/** Vision range for structures (cities provide sight) */
const STRUCTURE_SIGHT_RANGE = 3;

/** Auto-incrementing ID counter for structures (replace with DB IDs in multiplayer) */
let structureIdCounter = 0;

/**
 * Create a new structure instance
 * 
 * Factory function similar to createUnit but for buildings.
 * Assigns unique ID and sets HP based on structure type.
 * 
 * @param type - Structure type (City, Outpost, Fort, Farm)
 * @param owner - Owning player
 * @param col - Column position
 * @param row - Row position
 * @returns Fully initialized Structure
 * @todo SERVER: Validate structure placement rules
 * @todo Add structure costs and prerequisites
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

/**
 * Reset structure ID counter to zero
 * Internal helper for game initialization
 */
function resetStructureIdCounter(): void {
    structureIdCounter = 0;
}

/**
 * Global game state object - the single source of truth
 * 
 * Contains all units, structures, terrain, and UI state.
 * Mutated by exported functions throughout the game.
 * 
 * @todo SERVER: This will become local client state synced from server
 */
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
 * Initialize or reset complete game state for a new game
 * 
 * Resets all counters, generates new map, spawns starting units for all players.
 * Starting composition: 1 Settler + 1 Warrior per player.
 * 
 * Spawn locations:
 * - Player: top-left (5, 5)
 * - Enemy 1: bottom-right
 * - Enemy 2: top-right
 * - Enemy 3: bottom-left
 * - Enemy 4: center
 * 
 * @todo SERVER: Replace with API call to create new game
 * @todo Make starting units configurable
 * @todo Implement random spawn location generation
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
 * Get the unit occupying a specific hex position
 * 
 * @param col - Column to check
 * @param row - Row to check
 * @returns Unit at this position, or undefined if empty
 */
export function getUnitAt(col: number, row: number): Unit | undefined {
    return gameState.units.find(u => u.col === col && u.row === row);
}

/**
 * Check if hex coordinates are within the board boundaries
 * 
 * @param col - Column to validate
 * @param row - Row to validate
 * @returns True if coordinates are in bounds
 */
export function isValidHex(col: number, row: number): boolean {
    return col >= 0 && col < BOARD_COLS && row >= 0 && row < BOARD_ROWS;
}

/**
 * Calculate all hexes a unit can move to this turn
 * 
 * Wrapper around pathfinder module that provides game state context.
 * Accounts for terrain movement costs and occupied hexes.
 * 
 * @param unit - Unit to calculate movement for
 * @returns Array of reachable hex coordinates
 */
export function getReachableHexes(unit: Unit): Hex[] {
    return pathfinderGetReachableHexes(unit, gameState.board, getUnitAt, isValidHex);
}

/**
 * Get all enemy units within attack range of a unit
 * 
 * For melee units (range 1): checks immediate neighbors
 * For ranged units (range 2+): checks all hexes within range circle
 * 
 * Does not check line of sight (TODO: implement LOS blocking)
 * 
 * @param unit - Attacking unit
 * @returns Array of hex coordinates containing attackable enemies
 * @todo Implement line-of-sight blocking for ranged attacks
 * @todo Account for terrain elevation modifiers
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
 * Move a unit to a new position and update game state
 * 
 * Applies movement cost, updates fog of war, recalculates valid moves/targets,
 * and auto-deselects if unit is exhausted.
 * 
 * @param unit - Unit to move
 * @param col - Destination column
 * @param row - Destination row
 * @todo SERVER: Validate movement is legal before applying
 * @todo Add movement animations
 * @todo Trigger zone of control and opportunity attack checks
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

// Re-export action functions from actions module for convenience
export { attackUnit, canSettle, settleCity } from './actions';

/**
 * Check if game has been won or lost
 * 
 * Current simple rules:
 * - Victory: All enemy units eliminated
 * - Defeat: All player units eliminated
 * 
 * @returns 'victory', 'defeat', or null if game continues
 * @todo Add more win conditions (domination, science, culture, time)
 * @todo Consider cities in victory conditions
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
 * Find the nearest player unit to an enemy (for AI targeting)
 * 
 * Uses hex distance calculation to find closest target.
 * 
 * @param enemy - Enemy unit searching for target
 * @returns Nearest player unit, or null if no players exist
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
 * Find the best reachable hex to move towards a target (AI helper)
 * 
 * Wrapper around pathfinder that calculates reachable hexes and picks
 * the one closest to target.
 * 
 * @param unit - Unit that wants to move
 * @param target - Target to move towards
 * @returns Best hex to move to, or null if no valid moves
 */
export function findBestMoveTowards(unit: Unit, target: Unit): Hex | null {
    const reachable = getReachableHexes(unit);
    return pathfinderFindBestMove(reachable, target);
}

/**
 * Update fog of war for all hexes based on player vision
 * 
 * Resets all visible flags, then reveals hexes within sight range of:
 * - All player units (based on unit.sightRange)
 * - All player structures (fixed STRUCTURE_SIGHT_RANGE)
 * 
 * Keeps explored status persistent (once seen, always shown but dimmed).
 * 
 * @todo Implement line-of-sight blocking (mountains block vision)
 * @todo SERVER: Calculate visibility per-player for multiplayer
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
 * Reveal hexes around a unit using its sight range
 * Internal helper for updateVisibility
 * 
 * @param unit - Unit providing vision
 */
function revealAroundUnit(unit: Unit): void {
    revealAroundPosition(unit.col, unit.row, unit.sightRange);
}

/**
 * Reveal hexes within a circular radius of a position
 * 
 * Uses simple circular vision (no line-of-sight blocking currently).
 * Marks tiles as both visible and explored.
 * 
 * @param centerCol - Center column
 * @param centerRow - Center row
 * @param sightRange - Vision radius in hexes
 * @todo Implement line-of-sight raycasting for realistic vision
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
