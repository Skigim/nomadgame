/**
 * Settle action module
 * Handles settler founding cities
 */

import type { Unit } from '../types';
import { gameState, createStructure, updateVisibility } from '../game-state';

/**
 * Check if a settler can found a city at their current location
 */
export function canSettle(unit: Unit): boolean {
    // Must be a settler
    if (unit.type !== 'Settler') return false;
    
    // Must not have acted this turn
    if (unit.hasActed) return false;
    
    // Check terrain - can't settle on water or mountains
    const tile = gameState.board[unit.row]?.[unit.col];
    if (!tile) return false;
    if (tile.terrain === 'water' || tile.terrain === 'mountain') return false;
    
    // Check if there's already a structure here
    const existingStructure = gameState.structures.find(
        s => s.col === unit.col && s.row === unit.row
    );
    if (existingStructure) return false;
    
    return true;
}

/**
 * Settle a city - consumes the settler and creates a City structure
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
