/**
 * Shared types between client and server
 * These define the core game data structures
 */

// ============ Player & Auth ============
export interface Player {
    id: string;
    username: string;
    email?: string;
    createdAt: string;
    lastLoginAt: string;
}

// ============ Game Session ============
export type GameStatus = 'lobby' | 'active' | 'paused' | 'finished';

export interface Game {
    id: string;
    name: string;
    status: GameStatus;
    turnNumber: number;
    currentPlayerId: string | null;  // Whose turn is it
    maxPlayers: number;
    mapWidth: number;
    mapHeight: number;
    createdAt: string;
    updatedAt: string;
}

export interface GamePlayer {
    gameId: string;
    playerId: string;
    civilizationId: string;
    color: string;
    isHost: boolean;
    isEliminated: boolean;
    turnSubmitted: boolean;
}

// ============ Map & Terrain ============
export type TerrainType = 'plains' | 'forest' | 'mountain' | 'water' | 'sand' | 'swamp';

export interface Tile {
    id: number;
    gameId: string;
    col: number;
    row: number;
    terrain: TerrainType;
    ownerId: string | null;  // Which player controls this tile
    resourceType: string | null;
    resourceAmount: number;
}

// ============ Cities ============
export interface City {
    id: string;
    gameId: string;
    ownerId: string;
    name: string;
    col: number;
    row: number;
    population: number;
    food: number;
    production: number;
    gold: number;
    science: number;
    culture: number;
    currentProductionId: string | null;  // What's being built
    productionProgress: number;
    createdAt: string;
}

// ============ Units ============
export type UnitType = 'Settler' | 'Warrior' | 'Scout' | 'Spearman' | 'Slinger' | 'Horseman';

export interface Unit {
    id: string;
    gameId: string;
    ownerId: string;
    type: UnitType;
    col: number;
    row: number;
    hp: number;
    maxHp: number;
    movementRemaining: number;
    moveRange: number;
    attackRange: number;
    damage: number;
    hasActed: boolean;
}

// ============ Technology ============
export interface Technology {
    id: string;
    name: string;
    cost: number;
    prerequisites: string[];
    unlocks: string[];  // Unit types, buildings, etc.
}

export interface PlayerTech {
    gameId: string;
    playerId: string;
    techId: string;
    researchedAt: string;
}

export interface TechProgress {
    gameId: string;
    playerId: string;
    techId: string;
    progress: number;  // Science points accumulated
}

// ============ Turn Actions ============
export type ActionType = 'move' | 'attack' | 'settle' | 'build' | 'research' | 'produce';

export interface TurnAction {
    id: string;
    gameId: string;
    playerId: string;
    turnNumber: number;
    actionType: ActionType;
    unitId?: string;
    cityId?: string;
    targetCol?: number;
    targetRow?: number;
    targetId?: string;
    data?: string;  // JSON for flexible action data
    createdAt: string;
}

// ============ API Types ============
export interface CreateGameRequest {
    name: string;
    maxPlayers: number;
    mapWidth: number;
    mapHeight: number;
}

export interface JoinGameRequest {
    gameId: string;
    playerId: string;
    civilizationId: string;
}

export interface SubmitActionsRequest {
    gameId: string;
    playerId: string;
    actions: Omit<TurnAction, 'id' | 'createdAt'>[];
}

export interface GameStateResponse {
    game: Game;
    players: GamePlayer[];
    tiles: Tile[];
    cities: City[];
    units: Unit[];
    // Only include visible data for the requesting player (fog of war)
}
