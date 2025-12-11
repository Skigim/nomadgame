/**
 * HEX GRID MATH
 * Using "Pointy Topped" hexes and "Offset Coordinates" (Odd-R) for storage,
 * but converting to "Cube Coordinates" for algorithms (distance, pathfinding).
 */

import type { Hex, CubeCoord, Pixel } from './types';
import { HEX_SIZE } from './constants';

/**
 * Convert Grid (col, row) to Pixel (x, y)
 */
export function hexToPixel(col: number, row: number): Pixel {
    const x = HEX_SIZE * Math.sqrt(3) * (col + 0.5 * (row & 1));
    const y = HEX_SIZE * 3/2 * row;
    return { x: x + HEX_SIZE, y: y + HEX_SIZE };
}

/**
 * Convert Pixel to Grid (col, row)
 */
export function pixelToHex(x: number, y: number): Hex {
    x -= HEX_SIZE;
    y -= HEX_SIZE;
    
    const q = (Math.sqrt(3)/3 * x - 1/3 * y) / HEX_SIZE;
    const r = (2/3 * y) / HEX_SIZE;
    
    return cubeToOddr(cubeRound({ q, r, s: -q - r }));
}

/**
 * Round fractional cube coordinates to nearest hex
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
 * Convert cube coordinates to odd-r offset coordinates
 */
export function cubeToOddr(cube: CubeCoord): Hex {
    const col = cube.q + (cube.r - (cube.r & 1)) / 2;
    const row = cube.r;
    return { col, row };
}

/**
 * Convert odd-r offset coordinates to cube coordinates
 */
export function oddrToCube(col: number, row: number): CubeCoord {
    const q = col - (row - (row & 1)) / 2;
    const r = row;
    return { q, r, s: -q - r };
}

/**
 * Calculate hex distance between two hexes
 */
export function getDistance(hexA: Hex, hexB: Hex): number {
    const ac = oddrToCube(hexA.col, hexA.row);
    const bc = oddrToCube(hexB.col, hexB.row);
    return (Math.abs(ac.q - bc.q) + Math.abs(ac.r - bc.r) + Math.abs(ac.s - bc.s)) / 2;
}

/**
 * Get neighboring hexes for a given hex position
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
