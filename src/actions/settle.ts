/**
 * Settle action module
 * 
 * Handles settler units founding cities.
 * Cities provide vision, control territory, and will produce units/buildings.
 * 
 * @module actions/settle
 * @todo Implement city production queues
 * @todo Add territory/culture borders around cities
 * @todo Prevent settling too close to other cities (minimum distance rule)
 * @todo SERVER: Validate settlement locations and persist cities to database
 */

import type { Unit } from '../types';
import { gameState, createStructure, updateVisibility } from '../game-state';

/**
 * Check if a settler can found a city at their current location
 * 
 * Requirements:
 * - Unit must be a Settler
 * - Settler must not have acted this turn
 * - Terrain must be buildable (not water or mountains)
 * - No existing structure at this location
 * 
 * @param unit - Unit to check (should be a Settler)
 * @returns True if this settler can found a city here
 * @todo Add minimum distance check from other cities
 * @todo Check for strategic/luxury resources at location
 */
export function canSettle(unit: Unit): boolean {
    // Must be a settler
    if (unit.type !== 'Settler') return false;
    
    // Must not have acted this turn
    if (unit.hasActed) return false;
    
    // Check terrain - can't settle on ocean or mountains
    const tile = gameState.board[unit.row]?.[unit.col];
    if (!tile) return false;
    if (tile.terrain === 'ocean' || tile.terrain === 'mountain') return false;
    
    // Check if there's already a structure here
    const existingStructure = gameState.structures.find(
        s => s.col === unit.col && s.row === unit.row
    );
    if (existingStructure) return false;
    
    return true;
}

/**
 * Found a city - consumes the settler and creates a City structure
 * 
 * Performs settlement validation, creates the city, removes the settler,
 * and updates fog of war (cities provide vision).
 * 
 * @param settler - Settler unit to consume (will be removed from game)
 * @todo SERVER: Validate settlement and persist city to database
 * @todo Trigger city founding event/animation
 * @todo Generate initial city name
 */
export function settleCity(settler: Unit): void {
    if (!canSettle(settler)) return;
    
    // Create the city at settler's location
    gameState.structures.push(createStructure('City', settler.owner, settler.col, settler.row));
    
    // Remove the settler
    gameState.units = gameState.units.filter(u => u !== settler);
    
    // Deselect
    gameState.selectedUnit = null;
    gameState.validMoves = [];
    gameState.validTargets = [];
    
    // Update visibility (city provides sight)
    updateVisibility();
}
