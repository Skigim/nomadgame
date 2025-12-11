/**
 * Hex grid mathematics and coordinate conversions
 * 
 * This module handles all hex grid coordinate system conversions and distance calculations.
 * Uses "Pointy Topped" hexagons with "Offset Coordinates (Odd-R)" for storage,
 * but converts to "Cube Coordinates" for algorithms like distance and pathfinding.
 * 
 * Coordinate Systems:
 * - **Offset (col, row)**: Used for board storage and array indexing (Odd-R layout)
 * - **Cube (q, r, s)**: Used for distance, neighbors, and pathfinding algorithms
 * - **Pixel (x, y)**: Used for Canvas rendering and mouse input
 * 
 * @module hex-math
 * @see https://www.redblobgames.com/grids/hexagons/ - Comprehensive hex grid guide
 */

import type { Hex, CubeCoord, Pixel } from './types';
import { HEX_SIZE } from './constants';

/**
 * Convert hex grid coordinates to pixel world coordinates
 * 
 * Converts from offset (odd-R) grid coordinates to pixel positions for rendering.
 * Returns the center point of the hex in world space.
 * 
 * @param col - Column position in grid
 * @param row - Row position in grid
 * @returns Pixel coordinates of hex center in world space
 */
export function hexToPixel(col: number, row: number): Pixel {
    const x = HEX_SIZE * Math.sqrt(3) * (col + 0.5 * (row & 1));
    const y = HEX_SIZE * 3/2 * row;
    return { x: x + HEX_SIZE, y: y + HEX_SIZE };
}

/**
 * Convert pixel world coordinates to hex grid coordinates
 * 
 * Converts from pixel position (e.g., mouse click) to the hex grid cell.
 * Uses cube coordinate conversion for accurate rounding.
 * 
 * @param x - Pixel X coordinate in world space
 * @param y - Pixel Y coordinate in world space
 * @returns Hex grid coordinates containing this pixel position
 */
export function pixelToHex(x: number, y: number): Hex {
    x -= HEX_SIZE;
    y -= HEX_SIZE;
    
    const q = (Math.sqrt(3)/3 * x - 1/3 * y) / HEX_SIZE;
    const r = (2/3 * y) / HEX_SIZE;
    
    return cubeToOddr(cubeRound({ q, r, s: -q - r }));
}

/**
 * Round fractional cube coordinates to nearest integer hex
 * 
 * When converting from pixel to cube coordinates, we get fractional values.
 * This function rounds to the nearest valid hex while maintaining the
 * cube coordinate constraint (q + r + s = 0).
 * 
 * @param cube - Fractional cube coordinates
 * @returns Integer cube coordinates of nearest hex
 */
export function cubeRound(cube: CubeCoord): CubeCoord {
    let rx = Math.round(cube.q);
    let ry = Math.round(cube.r);
    let rz = Math.round(cube.s);

    const x_diff = Math.abs(rx - cube.q);
    const y_diff = Math.abs(ry - cube.r);
    const z_diff = Math.abs(rz - cube.s);

    if (x_diff > y_diff && x_diff > z_diff) {
        rx = -ry - rz;
    } else if (y_diff > z_diff) {
        ry = -rx - rz;
    } else {
        rz = -rx - ry;
    }
    return { q: rx, r: ry, s: rz };
}

/**
 * Convert cube coordinates to odd-R offset coordinates
 * 
 * Transforms from the cube coordinate system (used in algorithms) back to
 * offset coordinates (used for board storage and indexing).
 * 
 * @param cube - Cube coordinates (q, r, s)
 * @returns Offset coordinates (col, row)
 */
export function cubeToOddr(cube: CubeCoord): Hex {
    const col = cube.q + (cube.r - (cube.r & 1)) / 2;
    const row = cube.r;
    return { col, row };
}

/**
 * Convert odd-R offset coordinates to cube coordinates
 * 
 * Transforms from offset grid coordinates (used for storage) to cube coordinates
 * (used for distance calculations and pathfinding algorithms).
 * 
 * @param col - Column in offset grid
 * @param row - Row in offset grid
 * @returns Cube coordinates (q, r, s)
 */
export function oddrToCube(col: number, row: number): CubeCoord {
    const q = col - (row - (row & 1)) / 2;
    const r = row;
    return { q, r, s: -q - r };
}

/**
 * Calculate Manhattan distance between two hexes
 * 
 * Converts both hexes to cube coordinates and uses the cube distance formula:
 * distance = (|Δq| + |Δr| + |Δs|) / 2
 * 
 * This is the minimum number of hex steps needed to travel from A to B,
 * assuming no obstacles.
 * 
 * @param hexA - Starting hex position
 * @param hexB - Target hex position
 * @returns Distance in hex steps (integer)
 */
export function getDistance(hexA: Hex, hexB: Hex): number {
    const ac = oddrToCube(hexA.col, hexA.row);
    const bc = oddrToCube(hexB.col, hexB.row);
    return (Math.abs(ac.q - bc.q) + Math.abs(ac.r - bc.r) + Math.abs(ac.s - bc.s)) / 2;
}

/**
 * Get all six neighboring hexes for a given position
 * 
 * Returns neighbors in clockwise order starting from the right.
 * Neighbor offsets differ for odd vs even rows due to the odd-R offset layout.
 * 
 * Does NOT check if neighbors are within board bounds - caller must validate.
 * 
 * @param col - Column position
 * @param row - Row position
 * @returns Array of 6 neighboring hex coordinates (may be out of bounds)
 */
export function getNeighbors(col: number, row: number): Hex[] {
    const parity = row & 1;
    
    if (parity === 1) {
        const offsets = [
            { c: 1, r: 0 }, { c: 1, r: -1 }, { c: 0, r: -1 },
            { c: -1, r: 0 }, { c: 0, r: 1 }, { c: 1, r: 1 }
        ];
        return offsets.map(d => ({ col: col + d.c, row: row + d.r }));
    } else {
        const offsets = [
            { c: 1, r: 0 }, { c: 0, r: -1 }, { c: -1, r: -1 },
            { c: -1, r: 0 }, { c: -1, r: 1 }, { c: 0, r: 1 }
        ];
        return offsets.map(d => ({ col: col + d.c, row: row + d.r }));
    }
}
