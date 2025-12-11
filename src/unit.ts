/**
 * Unit factory and configuration
 * 
 * Defines unit types and provides a factory function for creating units.
 * All unit stats and balancing are centralized here.
 * 
 * @module unit
 * @todo SERVER: Move unit configs to database for easier balancing
 * @todo SERVER: Add unit tech tree and upgrade paths
 * @todo SERVER: Implement unit experience and promotions
 */

import type { Unit, Owner } from './types';

/** Auto-incrementing ID counter for units (client-side, replace with DB IDs later) */
let unitIdCounter = 0;

/**
 * Unit type configuration database
 * 
 * Defines base stats for each unit type:
 * - hp: Hit points (health)
 * - moveRange: Movement points per turn
 * - range: Attack range (0 = cannot attack, 1 = melee, 2+ = ranged)
 * - damage: Base attack damage
 * - sightRange: Fog of war vision radius
 * - isNaval: Whether unit can traverse ocean tiles
 * 
 * @todo SERVER: Move to database table for dynamic balancing
 * @todo Add production cost, required tech, special abilities
 */
const UNIT_CONFIGS: Record<string, { hp: number; moveRange: number; range: number; damage: number; sightRange: number; isNaval: boolean }> = {
    /** Basic melee infantry - well-rounded stats */
    'Warrior': { hp: 12, moveRange: 2, range: 1, damage: 4, sightRange: 3, isNaval: false },
    /** Defensive infantry - good against cavalry */
    'Spearman': { hp: 10, moveRange: 2, range: 1, damage: 3, sightRange: 3, isNaval: false },
    /** Fast reconnaissance unit - fragile but mobile with excellent vision */
    'Scout': { hp: 6, moveRange: 4, range: 1, damage: 2, sightRange: 5, isNaval: false },
    /** Fast cavalry - high damage and mobility */
    'Horseman': { hp: 10, moveRange: 4, range: 1, damage: 4, sightRange: 4, isNaval: false },
    /** Civilian unit for founding cities - cannot attack */
    'Settler': { hp: 5, moveRange: 2, range: 0, damage: 0, sightRange: 2, isNaval: false },
    /** Ranged infantry - can attack from distance but fragile */
    'Slinger': { hp: 6, moveRange: 2, range: 2, damage: 2, sightRange: 4, isNaval: false }
};

/**
 * Create a new unit instance
 * 
 * Factory function that creates a Unit with stats from UNIT_CONFIGS.
 * Assigns a unique ID and initializes movement/action state for the turn.
 * 
 * @param type - Unit type identifier (must exist in UNIT_CONFIGS)
 * @param owner - Owning player
 * @param col - Starting column position
 * @param row - Starting row position
 * @returns Fully initialized Unit ready for gameplay
 * @todo SERVER: Validate unit type and position server-side
 */
export function createUnit(
    type: string,
    owner: Owner,
    col: number,
    row: number
): Unit {
    unitIdCounter++;
    const config = UNIT_CONFIGS[type] || { hp: 10, moveRange: 3, range: 1, damage: 3, sightRange: 3, isNaval: false };
    
    return {
        id: unitIdCounter,
        type,
        owner,
        col,
        row,
        maxHp: config.hp,
        hp: config.hp,
        moveRange: config.moveRange,
        range: config.range,
        damage: config.damage,
        movementRemaining: config.moveRange,
        hasActed: false,
        sightRange: config.sightRange,
        isNaval: config.isNaval
    };
}

/**
 * Reset the unit ID counter to zero
 * 
 * Called when starting a new game to ensure consistent IDs.
 * In multiplayer, this will be replaced by database-generated IDs.
 * 
 * @todo SERVER: Remove when using database-generated primary keys
 */
export function resetUnitIdCounter(): void {
    unitIdCounter = 0;
}
