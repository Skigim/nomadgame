/**
 * Attack action module
 * Handles combat between units
 */

import type { Unit } from '../types';
import { gameState } from '../game-state';

/**
 * Execute an attack from attacker to defender
 */
export function attackUnit(attacker: Unit, defender: Unit): void {
    defender.hp -= attacker.damage;
    attacker.hasActed = true;
    
    if (defender.hp <= 0) {
        gameState.units = gameState.units.filter(u => u !== defender);
    }
    
    // Deselect after attacking (turn complete for this unit)
    gameState.selectedUnit = null;
    gameState.validMoves = [];
    gameState.validTargets = [];
}
