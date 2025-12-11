/**
 * Pathfinding module for hex grid movement
 * Handles BFS pathfinding, movement cost calculation, and reachability
 */

import type { Unit, Hex, HexTile } from './types';
import { getNeighbors, getDistance } from './hex-math';

// Cached movement costs from last pathfinding operation
let cachedMoveCosts: Map<string, number> | null = null;

/**
 * Check if a hex is passable for movement
 */
function isPassableTile(tile: HexTile | undefined): boolean {
    if (!tile) return false;
    return tile.movementCost < Infinity;
}

/**
 * Get the cached movement cost to reach a hex
 * Returns the cost or 1 as fallback if not cached
 */
export function getMovementCost(col: number, row: number): number {
    const key = `${col},${row}`;
    return cachedMoveCosts?.get(key) ?? 1;
}

/**
 * Clear cached movement costs
 */
export function clearMovementCache(): void {
    cachedMoveCosts = null;
}

/**
 * Get all hexes reachable by a unit using BFS pathfinding
 * Caches movement costs for use when actually moving
 * 
 * @param unit - The unit to calculate reachable hexes for
 * @param board - The game board
 * @param getUnitAtFn - Function to check if a hex is occupied
 * @param isValidHexFn - Function to check if hex is within bounds
 */
export function getReachableHexes(
    unit: Unit,
    board: HexTile[][],
    getUnitAtFn: (col: number, row: number) => Unit | undefined,
    isValidHexFn: (col: number, row: number) => boolean
): Hex[] {
    const frontier: Array<{ col: number; row: number; cost: number }> = [];
    frontier.push({ col: unit.col, row: unit.row, cost: 0 });
    
    const reached = new Map<string, number>();
    reached.set(`${unit.col},${unit.row}`, 0);

    const results: Hex[] = [];

    while (frontier.length > 0) {
        const current = frontier.shift()!;

        if (current.cost < unit.movementRemaining) {
            const neighbors = getNeighbors(current.col, current.row);
            
            for (const next of neighbors) {
                if (!isValidHexFn(next.col, next.row)) continue;
                if (getUnitAtFn(next.col, next.row)) continue;
                
                // Check terrain passability and get movement cost
                const tile = board[next.row]?.[next.col];
                if (!isPassableTile(tile)) continue;

                const newCost = current.cost + tile!.movementCost;
                const key = `${next.col},${next.row}`;
                
                // Only add if within remaining movement
                if (newCost <= unit.movementRemaining && (!reached.has(key) || newCost < reached.get(key)!)) {
                    reached.set(key, newCost);
                    frontier.push({ col: next.col, row: next.row, cost: newCost });
                    results.push({ col: next.col, row: next.row });
                }
            }
        }
    }
    
    // Cache costs for moveUnit to use
    cachedMoveCosts = reached;
    
    return results;
}

/**
 * Find the best hex to move towards a target position
 * Uses cached reachable hexes from a previous getReachableHexes call
 * 
 * @param reachableHexes - Pre-calculated reachable hexes
 * @param target - Target position to move towards
 */
export function findBestMoveTowards(reachableHexes: Hex[], target: Hex): Hex | null {
    let bestHex: Hex | null = null;
    let bestDist = Infinity;

    for (const hex of reachableHexes) {
        const d = getDistance(hex, target);
        if (d < bestDist) {
            bestDist = d;
            bestHex = hex;
        }
    }
    return bestHex;
}

/**
 * Apply movement to a unit and return the cost
 * 
 * @param unit - The unit to move
 * @param col - Destination column
 * @param row - Destination row
 * @returns The movement cost spent
 */
export function applyMovement(unit: Unit, col: number, row: number): number {
    const cost = getMovementCost(col, row);
    
    unit.col = col;
    unit.row = row;
    unit.movementRemaining -= cost;
    
    return cost;
}
