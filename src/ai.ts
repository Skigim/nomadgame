/**
 * Enemy AI decision-making logic
 * 
 * Implements a simple but effective AI that:
 * 1. Attacks if target in range
 * 2. Moves towards nearest player unit
 * 3. Attacks again after moving if possible
 * 
 * Currently runs entirely client-side. Will need server-side validation
 * for multiplayer to prevent cheating.
 * 
 * @module ai
 * @todo SERVER: Execute AI turns server-side for multiplayer security
 * @todo Improve AI with threat assessment and defensive positioning
 * @todo Add AI difficulty levels (passive, normal, aggressive)
 * @todo Implement AI city management and production
 */

import { 
    gameState, 
    getUnitAt, 
    getAttackableTargets, 
    moveUnit, 
    attackUnit,
    findNearestPlayer,
    findBestMoveTowards
} from './game-state';

/**
 * Async delay helper for pacing AI actions
 * 
 * Makes AI turns more readable and prevents instant enemy turns.
 * Creates a Promise that resolves after specified milliseconds.
 * 
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after delay
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a complete AI turn for all enemy units
 * 
 * Runs asynchronously with delays for pacing. Processes each enemy unit:
 * 1. Reset movement and action state
 * 2. Check for immediate attack opportunity
 * 3. Move towards nearest player unit if no target
 * 4. Attack again after moving if target in range
 * 
 * After all enemies have moved, resets player units for their next turn.
 * 
 * @param onUpdate - Callback to trigger re-render after each AI action
 * @returns Promise that resolves when AI turn is complete
 * @todo SERVER: This entire function must run server-side in multiplayer
 */
export async function executeAITurn(onUpdate: () => void): Promise<void> {
    gameState.turn = 'enemy';
    gameState.selectedUnit = null;
    gameState.validMoves = [];
    gameState.validTargets = [];
    onUpdate();

    const enemies = gameState.units.filter(u => u.owner !== 'player');
    
    for (const unit of enemies) {
        if (unit.hp <= 0) continue;
        
        // Reset actions for this turn
        unit.movementRemaining = unit.moveRange;
        unit.hasActed = false;

        // Artificial delay for pacing
        await delay(600);

        // 1. Check if can attack immediately
        let targets = getAttackableTargets(unit);
        if (targets.length > 0 && !unit.hasActed) {
            const targetHex = targets[0];
            const target = getUnitAt(targetHex.col, targetHex.row);
            if (target) {
                attackUnit(unit, target);
                onUpdate();
                continue;
            }
        }

        // 2. Move towards nearest player
        if (unit.movementRemaining > 0) {
            const nearest = findNearestPlayer(unit);

            if (nearest) {
                const bestHex = findBestMoveTowards(unit, nearest);

                if (bestHex) {
                    moveUnit(unit, bestHex.col, bestHex.row);
                    onUpdate();
                    
                    // 3. Try attack after move
                    if (!unit.hasActed) {
                        targets = getAttackableTargets(unit);
                        if (targets.length > 0) {
                            await delay(300);
                            const target = getUnitAt(targets[0].col, targets[0].row);
                            if (target) {
                                attackUnit(unit, target);
                                onUpdate();
                            }
                        }
                    }
                }
            }
        }
    }
    
    // End AI turn - reset player unit actions
    gameState.turn = 'player';
    gameState.units
        .filter(u => u.owner === 'player')
        .forEach(u => {
            u.movementRemaining = u.moveRange;
            u.hasActed = false;
        });
    
    onUpdate();
}
