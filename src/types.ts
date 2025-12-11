/**
 * Type definitions for the Nomad hex strategy game
 * 
 * This module contains all TypeScript interfaces and types used throughout the game.
 * 
 * @module types
 */

/**
 * Unit and structure ownership
 * Currently client-side only, but will need to map to player IDs when multiplayer is added
 * 
 * @todo SERVER: Map owners to authenticated player IDs from database
 */
export type Owner = 'player' | 'enemy1' | 'enemy2' | 'enemy3' | 'enemy4';

/**
 * Turn indicator for game phase
 * Will be replaced with per-player turn system in multiplayer
 * 
 * @todo SERVER: Replace with active_player_id and turn order management
 */
export type Turn = 'player' | 'enemy';

/**
 * Available terrain types that affect movement and combat
 */
export type TerrainType = 'plains' | 'forest' | 'mountain' | 'ocean' | 'desert' | 'hills';

/**
 * Basic hex coordinates in offset (odd-R) format
 * Used for grid storage and indexing
 */
export interface Hex {
    /** Column position (x-axis) */
    col: number;
    /** Row position (y-axis) */
    row: number;
}

/**
 * A single hex tile on the game board with terrain and visibility data
 * Extends basic Hex coordinates with gameplay-relevant properties
 * 
 * @todo SERVER: Store explored status per-player in database for multiplayer fog of war
 */
export interface HexTile extends Hex {
    /** Type of terrain affecting movement and combat */
    terrain: TerrainType;
    /** Movement points required to enter (1 = normal, 2+ = difficult, Infinity = impassable) */
    movementCost: number;
    /** Defensive bonus multiplier for units on this tile (0-1 range, negative = penalty) */
    defenseBonus: number;
    /** Whether ranged attacks can pass through this terrain */
    blocksLineOfSight: boolean;
    /** Currently visible to the player this turn (fog of war) */
    visible: boolean;
    /** Has been seen by the player at some point (remains visible as explored terrain) */
    explored: boolean;
}

/**
 * Cube coordinates for hex grid algorithms
 * Used internally for distance calculation and pathfinding
 * Constraint: q + r + s = 0
 * 
 * @see https://www.redblobgames.com/grids/hexagons/#coordinates-cube
 */
export interface CubeCoord {
    /** Q-axis coordinate */
    q: number;
    /** R-axis coordinate */
    r: number;
    /** S-axis coordinate (constrained by q + r + s = 0) */
    s: number;
}

/**
 * Screen/world pixel coordinates
 * Used for rendering and mouse input
 */
export interface Pixel {
    /** Horizontal pixel position */
    x: number;
    /** Vertical pixel position */
    y: number;
}

/**
 * A unit on the game board (military or civilian)
 * 
 * @todo SERVER: Persist to database units table
 * @todo SERVER: Track unit experience, promotions, and veterancy
 * @todo SERVER: Validate all unit actions server-side before applying
 */
export interface Unit {
    /** Unique identifier (client-generated, will be DB primary key) */
    id: number;
    /** Unit type identifier (Warrior, Scout, Settler, etc.) */
    type: string;
    /** Owning player */
    owner: Owner;
    /** Current column position */
    col: number;
    /** Current row position */
    row: number;
    /** Maximum hit points */
    maxHp: number;
    /** Current hit points */
    hp: number;
    /** Base movement range per turn */
    moveRange: number;
    /** Attack range in hexes (0 = cannot attack, 1 = melee, 2+ = ranged) */
    range: number;
    /** Base damage dealt in combat */
    damage: number;
    /** Movement points remaining this turn (resets to moveRange each turn) */
    movementRemaining: number;
    /** Whether unit has used its combat action this turn */
    hasActed: boolean;
    /** How many hexes away this unit can see (fog of war radius) */
    sightRange: number;
    /** Whether this unit can traverse ocean tiles (ships, etc.) */
    isNaval: boolean;
}

/**
 * Types of structures that can be built on the map
 */
export type StructureType = 'City' | 'Outpost' | 'Fort' | 'Farm';

/**
 * A structure (building) on the game board
 * 
 * @todo SERVER: Persist to database structures table
 * @todo SERVER: Add production queues and resource generation
 * @todo SERVER: Implement structure-specific abilities and bonuses
 */
export interface Structure {
    /** Unique identifier (client-generated, will be DB primary key) */
    id: number;
    /** Structure type */
    type: StructureType;
    /** Owning player */
    owner: Owner;
    /** Column position */
    col: number;
    /** Row position */
    row: number;
    /** Maximum hit points (for combat damage) */
    maxHp: number;
    /** Current hit points */
    hp: number;
}

/**
 * Complete game state for a single game session
 * Currently managed entirely client-side
 * 
 * @todo SERVER: Split into server-authoritative state vs client UI state
 * @todo SERVER: Persist game state to database games table
 * @todo SERVER: Implement turn validation and anti-cheat measures
 * @todo SERVER: Add event log for replay and validation
 */
export interface GameState {
    /** Current turn phase */
    turn: Turn;
    /** All units in the game */
    units: Unit[];
    /** All structures (cities, forts, etc.) on the map */
    structures: Structure[];
    /** 2D grid of hex tiles indexed as [row][col] */
    board: HexTile[][];
    /** Currently selected unit (UI state, client-only) */
    selectedUnit: Unit | null;
    /** Valid movement destinations for selected unit (UI state, client-only) */
    validMoves: Hex[];
    /** Valid attack targets for selected unit (UI state, client-only) */
    validTargets: Hex[];
    /** Whether an animation is currently playing (UI state, client-only) */
    isAnimating: boolean;
}

/**
 * Color palette for game rendering
 * Pure client-side configuration
 */
export interface Colors {
    /** Grid line color */
    gridStroke: string;
    /** Player unit/structure color */
    player: string;
    /** Enemy 1 color */
    enemy1: string;
    /** Enemy 2 color */
    enemy2: string;
    /** Enemy 3 color */
    enemy3: string;
    /** Enemy 4 color */
    enemy4: string;
    /** Selected unit highlight color */
    select: string;
    /** Valid movement overlay color */
    move: string;
    /** Valid attack target overlay color */
    attack: string;
    /** Movement path preview color */
    path: string;
}

/**
 * Camera/viewport state for panning and zooming
 * Pure client-side UI state
 */
export interface Camera {
    /** World X offset (scroll position) */
    x: number;
    /** World Y offset (scroll position) */
    y: number;
    /** Zoom level (1.0 = 100%, 0.5 = 50%, 2.0 = 200%) */
    zoom: number;
}
