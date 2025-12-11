// Type definitions for Hex Tactics game

export type Owner = 'player' | 'enemy1' | 'enemy2' | 'enemy3' | 'enemy4';
export type Turn = 'player' | 'enemy';

export type TerrainType = 'plains' | 'forest' | 'mountain' | 'water' | 'sand' | 'swamp';

export interface Hex {
    col: number;
    row: number;
}

export interface HexTile extends Hex {
    terrain: TerrainType;
    movementCost: number;      // Cost to enter this tile (1 = normal, 2+ = difficult, Infinity = impassable)
    defenseBonus: number;      // Damage reduction when unit is on this tile (0-1 multiplier)
    blocksLineOfSight: boolean; // Whether this terrain blocks ranged attacks
    elevation: number;         // Height level (0 = low, 1 = normal, 2 = high)
    visible: boolean;          // Currently visible by player units
    explored: boolean;         // Has been seen at least once
}

export interface CubeCoord {
    q: number;
    r: number;
    s: number;
}

export interface Pixel {
    x: number;
    y: number;
}

export interface Unit {
    id: number;
    type: string;
    owner: Owner;
    col: number;
    row: number;
    maxHp: number;
    hp: number;
    moveRange: number;
    range: number;          // Attack range
    damage: number;
    movementRemaining: number;  // Movement points left this turn
    hasActed: boolean;      // Has used combat action this turn (attack, heal, etc.)
    sightRange: number;     // How far this unit can see (for fog of war)
}

export type StructureType = 'City' | 'Outpost' | 'Fort' | 'Farm';

export interface Structure {
    id: number;
    type: StructureType;
    owner: Owner;
    col: number;
    row: number;
    maxHp: number;
    hp: number;
}

export interface GameState {
    turn: Turn;
    units: Unit[];
    structures: Structure[];   // Buildings on the map
    board: HexTile[][];        // 2D array of hex tiles [row][col]
    selectedUnit: Unit | null;
    validMoves: Hex[];
    validTargets: Hex[];
    isAnimating: boolean;
}

export interface Colors {
    gridStroke: string;
    player: string;
    enemy1: string;
    enemy2: string;
    enemy3: string;
    enemy4: string;
    select: string;
    move: string;
    attack: string;
    path: string;
}

export interface Camera {
    x: number;              // World X offset
    y: number;              // World Y offset
    zoom: number;           // Zoom level (1 = 100%)
}
