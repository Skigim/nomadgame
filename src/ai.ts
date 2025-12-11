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
 * Delay helper for AI pacing
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute AI turn for all enemy units
 */
export async function executeAITurn(onUpdate: () => void): Promise<void> {
    gameState.turn = 'enemy';
    gameState.selectedUnit = null;
    gameState.validMoves = [];
    gameState.validTargets = [];
    onUpdate();

    const enemies = gameState.units.filter(u => u.owner === 'enemy');
    
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
