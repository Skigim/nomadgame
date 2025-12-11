import type { Unit, Owner } from './types';

let unitIdCounter = 0;

// Unit type configurations
const UNIT_CONFIGS: Record<string, { hp: number; moveRange: number; range: number; damage: number; sightRange: number }> = {
    'Warrior': { hp: 12, moveRange: 2, range: 1, damage: 4, sightRange: 3 },
    'Spearman': { hp: 10, moveRange: 2, range: 1, damage: 3, sightRange: 3 },
    'Scout': { hp: 6, moveRange: 4, range: 1, damage: 2, sightRange: 5 },
    'Horseman': { hp: 10, moveRange: 4, range: 1, damage: 4, sightRange: 4 },
    'Settler': { hp: 5, moveRange: 2, range: 0, damage: 0, sightRange: 2 },
    'Slinger': { hp: 6, moveRange: 2, range: 2, damage: 2, sightRange: 4 }
};

export function createUnit(
    type: string,
    owner: Owner,
    col: number,
    row: number
): Unit {
    unitIdCounter++;
    const config = UNIT_CONFIGS[type] || { hp: 10, moveRange: 3, range: 1, damage: 3, sightRange: 3 };
    
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
        sightRange: config.sightRange
    };
}

export function resetUnitIdCounter(): void {
    unitIdCounter = 0;
}
