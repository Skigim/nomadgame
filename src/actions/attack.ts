/**
 * Attack action module
 * 
 * Handles combat resolution between units.
 * Currently a simple damage application system.
 * 
 * @module actions/attack
 * @todo Implement terrain defense bonuses
 * @todo Add combat strength modifiers (flanking, support, etc.)
 * @todo Implement counter-attacks for adjacent melee units
 * @todo Add combat animations and sound effects
 * @todo SERVER: Validate all attacks server-side before applying damage
 */

import type { Unit } from '../types';
import { gameState } from '../game-state';

/**
 * Execute an attack from attacker to defender
 * 
 * Applies damage to the defender and marks attacker as having acted.
 * If defender reaches 0 HP, removes them from the game.
 * 
 * Automatically deselects the attacking unit (turn complete).
 * 
 * @param attacker - Unit performing the attack
 * @param defender - Unit receiving damage
 * @todo Apply terrain defense bonuses from defender's tile
 * @todo Implement elevation advantage/disadvantage
 * @todo Add combat log/history for replay
 * @todo SERVER: Validate attacker has not acted and defender is in range
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
