/**
 * Pathfinding module for hex grid movement
 * 
 * Implements Breadth-First Search (BFS) pathfinding with movement costs.
 * Handles unit movement range calculation and optimal path selection.
 * 
 * Movement costs are cached to enable efficient multi-step movement and
 * proper cost calculation when units move multiple hexes.
 * 
 * Pure algorithmic module - no game state mutation happens here.
 * 
 * @module pathfinder
 * @todo Implement A* pathfinding for better performance on large boards
 * @todo Add diagonal movement penalties for more realistic paths
 */

import type { Unit, Hex, HexTile } from './types';
import { getNeighbors, getDistance } from './hex-math';

/**
 * Cached movement costs from last pathfinding operation
 * Maps "col,row" strings to movement cost to reach that hex
 */
let cachedMoveCosts: Map<string, number> | null = null;

/**
 * Check if a hex tile is passable for a specific unit
 * 
 * Accounts for:
 * - Impassable terrain (Infinity movement cost)
 * - Land/naval restrictions (land units can't enter ocean, naval can't enter land)
 * 
 * @param tile - Tile to check (undefined if out of bounds)
 * @param isNaval - Whether the unit is a naval unit
 * @returns True if the unit can enter this tile
 */
function isPassableTile(tile: HexTile | undefined, isNaval: boolean): boolean {
    if (!tile) return false;
    if (tile.movementCost === Infinity) return false;
    
    // Naval units can only move on ocean, land units cannot enter ocean
    if (tile.terrain === 'ocean') {
        return isNaval;
    } else {
        return !isNaval;
    }
}

/**
 * Get the cached movement cost to reach a specific hex
 * 
 * Returns the cost from the most recent pathfinding operation.
 * Used by moveUnit to properly deduct movement points.
 * 
 * @param col - Column position
 * @param row - Row position
 * @returns Movement cost to reach this hex, or 1 if not cached (fallback)
 */
export function getMovementCost(col: number, row: number): number {
    const key = `${col},${row}`;
    return cachedMoveCosts?.get(key) ?? 1;
}

/**
 * Clear cached movement costs
 * 
 * Should be called when switching selected units or ending turn to avoid
 * stale cache data affecting new pathfinding calculations.
 */
export function clearMovementCache(): void {
    cachedMoveCosts = null;
}

/**
 * Calculate all hexes reachable by a unit this turn using BFS pathfinding
 * 
 * Uses Breadth-First Search to explore all hexes the unit can reach with
 * its remaining movement points, accounting for terrain movement costs.
 * 
 * Caches movement costs in `cachedMoveCosts` for use by applyMovement.
 * 
 * Ignores:
 * - Out of bounds hexes (validated by isValidHexFn)
 * - Hexes occupied by other units (enemy or friendly)
 * - Impassable terrain (water for land units)
 * 
 * @param unit - The unit to calculate reachable hexes for
 * @param board - The game board (for terrain movement costs)
 * @param getUnitAtFn - Function to check if a hex is occupied by a unit
 * @param isValidHexFn - Function to check if hex coordinates are within bounds
 * @returns Array of Hex coordinates the unit can move to
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
                
                // Check terrain passability (including land/naval restrictions)
                const tile = board[next.row]?.[next.col];
                if (!isPassableTile(tile, unit.isNaval)) continue;

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
 * Find the best reachable hex to move towards a target position
 * 
 * From a pre-calculated set of reachable hexes, selects the one that
 * minimizes distance to the target. Used by AI to pursue player units.
 * 
 * @param reachableHexes - Pre-calculated reachable hexes (from getReachableHexes)
 * @param target - Target position to move towards
 * @returns The reachable hex closest to target, or null if no reachable hexes
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
 * Apply movement to a unit and deduct movement cost
 * 
 * Moves the unit to the destination and subtracts the movement cost
 * (from cached pathfinding) from movementRemaining.
 * 
 * MUTATES the unit object directly.
 * 
 * @param unit - The unit to move (will be mutated)
 * @param col - Destination column
 * @param row - Destination row
 * @returns The movement cost that was deducted
 */
export function applyMovement(unit: Unit, col: number, row: number): number {
    const cost = getMovementCost(col, row);
    
    unit.col = col;
    unit.row = row;
    unit.movementRemaining -= cost;
    
    return cost;
}
