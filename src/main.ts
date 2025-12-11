/**
 * Main entry point and event handling
 * 
 * Initializes the game, sets up all event listeners, and manages the game loop.
 * Coordinates between all other modules (state, rendering, AI, input).
 * 
 * Uses window-level globals to survive Vite HMR (Hot Module Replacement)
 * without duplicating listeners or reinitializing state unnecessarily.
 * 
 * @module main
 */

import { pixelToHex, hexToPixel } from './hex-math';
import { 
    gameState, 
    initGameState, 
    getUnitAt, 
    isValidHex, 
    getReachableHexes, 
    getAttackableTargets,
    moveUnit,
    attackUnit,
    checkWinCondition,
    canSettle,
    settleCity
} from './game-state';
import { render, preloadSprites } from './renderer';
import { executeAITurn } from './ai';
import { camera, panCamera, centerCameraOn, screenToWorld, resetCamera } from './camera';

/**
 * Extend Window interface to add HMR persistence flags
 * These prevent duplicate initialization during hot reload
 */
declare global {
    interface Window {
        /** Has game been initialized (prevents duplicate init) */
        __GAME_INITIALIZED__?: boolean;
        /** Have event listeners been added (prevents duplicates) */
        __GAME_LISTENERS_ADDED__?: boolean;
        /** RequestAnimationFrame ID for camera panning loop */
        __GAME_PANNING_LOOP_ID__?: number;
        /** Set of currently pressed keys (for WASD camera panning) */
        __GAME_KEYS_PRESSED__?: Set<string>;
    }
}

// ============ DOM Element References ============
/** Main game canvas element */
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
/** Canvas 2D rendering context */
const ctx = canvas.getContext('2d')!;
/** UI overlay container for unit info */
const uiOverlay = document.getElementById('ui-overlay') as HTMLDivElement;
/** Turn indicator text ("Player Turn" / "Enemy Turn") */
const turnIndicator = document.getElementById('turn-indicator') as HTMLDivElement;
/** End Turn button */
const btnEndTurn = document.getElementById('btn-end-turn') as HTMLButtonElement;
/** Reset Game button */
const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;

/**
 * Use window-level key tracking to persist across HMR
 * Tracks which keyboard keys are currently pressed for camera panning
 */
if (!window.__GAME_KEYS_PRESSED__) {
    window.__GAME_KEYS_PRESSED__ = new Set<string>();
}
const keysPressed = window.__GAME_KEYS_PRESSED__;

// ============ Camera Panning State ============
/** Whether user is currently dragging to pan camera */
let isDragging = false;
/** Last mouse X position (for drag delta calculation) */
let lastMouseX = 0;
/** Last mouse Y position (for drag delta calculation) */
let lastMouseY = 0;

/**
 * Update all UI elements based on current game state
 * 
 * Updates:
 * - Turn indicator text and styling
 * - End Turn button enabled state
 * - Selected unit info panel (type, HP, actions remaining)
 * - Settle action hint for settlers
 * 
 * Called after any game state change that affects UI.
 */
function updateUI(): void {
    if (gameState.turn === 'player') {
        turnIndicator.textContent = "Player Turn";
        turnIndicator.className = '';
        btnEndTurn.disabled = false;
    } else {
        turnIndicator.textContent = "Enemy Turn";
        turnIndicator.className = 'enemy-turn';
        btnEndTurn.disabled = true;
    }

    if (gameState.selectedUnit) {
        uiOverlay.style.display = 'block';
        document.getElementById('u-type')!.textContent = gameState.selectedUnit.type;
        document.getElementById('u-hp')!.textContent = 
            `${gameState.selectedUnit.hp}/${gameState.selectedUnit.maxHp}`;
        
        // Show action status
        const moveStatus = gameState.selectedUnit.movementRemaining > 0 ? `${gameState.selectedUnit.movementRemaining}` : '✗';
        const actStatus = gameState.selectedUnit.hasActed ? '✗' : '✓';
        let statusText = `Move:${moveStatus} Act:${actStatus}`;
        
        // Show settle option for settlers
        if (canSettle(gameState.selectedUnit)) {
            statusText += ' | [B] Found City';
        }
        
        document.getElementById('u-status')!.textContent = statusText;
    } else {
        uiOverlay.style.display = 'none';
    }
}

/**
 * Trigger a render frame
 * Wrapper around the renderer module's render function
 */
function draw(): void {
    render(ctx, canvas, gameState);
}

/**
 * Resize canvas to match window dimensions
 * Called on window resize and game initialization
 */
function resizeCanvas(): void {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 80;
    draw();
}

/**
 * Handle hex click/selection logic
 * 
 * Game flow:
 * 1. Click friendly unit -> Select it and show valid moves/attacks
 * 2. Click valid move hex -> Move selected unit there
 * 3. Click valid attack hex -> Attack that target
 * 4. Click empty space -> Deselect
 * 
 * Only processes clicks during player turn and when not animating.
 * 
 * @param col - Clicked hex column
 * @param row - Clicked hex row
 */
function handleSelection(col: number, row: number): void {
    if (gameState.turn !== 'player' || gameState.isAnimating) return;

    const clickedUnit = getUnitAt(col, row);

    // 1. Select a friendly unit
    if (clickedUnit && clickedUnit.owner === 'player') {
        const canMove = clickedUnit.movementRemaining > 0;
        const canAct = !clickedUnit.hasActed;
        
        gameState.selectedUnit = clickedUnit;
        gameState.validMoves = canMove ? getReachableHexes(clickedUnit) : [];
        gameState.validTargets = canAct ? getAttackableTargets(clickedUnit) : [];
        
        draw();
        updateUI();
        return;
    }

    // 2. If a unit is selected, try to Move or Attack
    if (gameState.selectedUnit) {
        // Check Move
        const moveHex = gameState.validMoves.find(h => h.col === col && h.row === row);
        if (moveHex) {
            moveUnit(gameState.selectedUnit, col, row);
            draw();
            updateUI();
            return;
        }

        // Check Attack
        const targetHex = gameState.validTargets.find(h => h.col === col && h.row === row);
        if (targetHex) {
            const target = getUnitAt(col, row);
            if (target) {
                attackUnit(gameState.selectedUnit, target);
                handleWinCheck();
                draw();
                updateUI();
            }
            return;
        }

        // Clicked empty space or invalid target -> Deselect
        gameState.selectedUnit = null;
        gameState.validMoves = [];
        gameState.validTargets = [];
        draw();
        updateUI();
    }
}

/**
 * Check for victory/defeat and show alert if game ended
 * Auto-restarts game after alert is dismissed
 */
function handleWinCheck(): void {
    const result = checkWinCondition();
    if (result === 'victory') {
        setTimeout(() => {
            alert("Victory! All enemies destroyed.");
            fullInitGame();
        }, 100);
    } else if (result === 'defeat') {
        setTimeout(() => {
            alert("Defeat! All your units were lost.");
            fullInitGame();
        }, 100);
    }
}

/**
 * Execute AI turn asynchronously
 * 
 * Runs all enemy unit actions with pacing delays.
 * Triggers re-render and win condition checks after each AI action.
 */
async function startEnemyTurn(): Promise<void> {
    await executeAITurn(() => {
        draw();
        updateUI();
        handleWinCheck();
    });
}

/**
 * Full game initialization sequence
 * 
 * Steps:
 * 1. Load sprites (if not already loaded)
 * 2. Reset camera to default view
 * 3. Initialize game state (new board, spawn units)
 * 4. Center camera on player start position
 * 5. Resize canvas and render first frame
 * 
 * Called on page load and when resetting the game.
 */
async function fullInitGame(): Promise<void> {
    await preloadSprites();
    resetCamera();
    initGameState();
    
    // Center camera on player starting position
    const playerCity = gameState.structures.find(s => s.owner === 'player');
    if (playerCity) {
        const cityPos = hexToPixel(playerCity.col, playerCity.row);
        centerCameraOn(cityPos.x, cityPos.y, canvas.width, canvas.height);
    }
    
    resizeCanvas();
    draw();
    updateUI();
}

// ============ Event Handlers ============
// Named functions for potential cleanup and debugging

/**
 * Handle mouse down events
 * 
 * Left click (button 0): Select units or execute commands
 * Middle/Right click (button 1/2): Start camera panning
 * 
 * @param e - Mouse event
 */
function onMouseDown(e: MouseEvent): void {
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    // Right click or middle click for panning
    if (e.button === 1 || e.button === 2) {
        isDragging = true;
        lastMouseX = screenX;
        lastMouseY = screenY;
        e.preventDefault();
        return;
    }
    
    // Left click for selection
    if (e.button === 0) {
        const world = screenToWorld(screenX, screenY);
        const hex = pixelToHex(world.x, world.y);
        
        if (isValidHex(hex.col, hex.row)) {
            handleSelection(hex.col, hex.row);
        }
    }
}

/**
 * Handle mouse move events
 * Pans camera when dragging is active
 * 
 * @param e - Mouse event
 */
function onMouseMove(e: MouseEvent): void {
    if (!isDragging) return;
    
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    const dx = (lastMouseX - screenX) / camera.zoom;
    const dy = (lastMouseY - screenY) / camera.zoom;
    
    panCamera(dx, dy, canvas.width, canvas.height);
    
    lastMouseX = screenX;
    lastMouseY = screenY;
    
    draw();
}

/**
 * Handle mouse up events
 * Ends camera dragging
 */
function onMouseUp(): void {
    isDragging = false;
}

/**
 * Prevent context menu on right click
 * Right click is used for camera panning
 * 
 * @param e - Context menu event
 */
function onContextMenu(e: Event): void {
    e.preventDefault();
}

/**
 * Handle key down events
 * 
 * 'B' key: Found city (if settler selected and location valid)
 * WASD/Arrow keys: Camera panning (handled in animation loop)
 * 
 * @param e - Keyboard event
 */
function onKeyDown(e: KeyboardEvent): void {
    keysPressed.add(e.key.toLowerCase());
    
    // 'B' key - Build/Found City (settle action)
    if (e.key.toLowerCase() === 'b' && gameState.selectedUnit && canSettle(gameState.selectedUnit)) {
        settleCity(gameState.selectedUnit);
        draw();
        updateUI();
    }
}

/**
 * Handle key up events
 * Removes key from pressed set
 * 
 * @param e - Keyboard event
 */
function onKeyUp(e: KeyboardEvent): void {
    keysPressed.delete(e.key.toLowerCase());
}

/**
 * Handle mouse wheel events for zooming
 * 
 * Zooms towards mouse cursor position (not center of screen).
 * Clamps zoom between 0.3x and 2.0x.
 * 
 * @param e - Wheel event
 */
function onWheel(e: WheelEvent): void {
    e.preventDefault();
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.3, Math.min(2, camera.zoom * zoomFactor));
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const worldBefore = screenToWorld(mouseX, mouseY);
    camera.zoom = newZoom;
    const worldAfter = screenToWorld(mouseX, mouseY);
    
    camera.x += worldBefore.x - worldAfter.x;
    camera.y += worldBefore.y - worldAfter.y;
    
    draw();
}

/**
 * Handle End Turn button click
 * Starts AI turn if it's currently the player's turn
 */
function onEndTurnClick(): void {
    if (gameState.turn === 'player') {
        startEnemyTurn();
    }
}

/**
 * Handle Reset Game button click
 * Reinitializes complete game state
 */
function onResetClick(): void {
    fullInitGame();
}

/**
 * Handle window resize events
 * Adjusts canvas size to match new window dimensions
 */
function onResize(): void {
    resizeCanvas();
}

/**
 * Setup all event listeners (only once)
 * 
 * Uses window-level flag to prevent duplicate listeners during HMR.
 * Attaches listeners for:
 * - Mouse input (click, drag, wheel)
 * - Keyboard input (WASD panning, action keys)
 * - Window resize
 * - UI buttons
 */
function setupEventListeners(): void {
    if (window.__GAME_LISTENERS_ADDED__) return;
    window.__GAME_LISTENERS_ADDED__ = true;
    
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);
    
    btnEndTurn.addEventListener('click', onEndTurnClick);
    btnReset.addEventListener('click', onResetClick);
}

/**
 * Start the keyboard-based camera panning animation loop
 * 
 * Runs continuously via requestAnimationFrame, checking for WASD/arrow key presses.
 * Pans camera smoothly based on which keys are held down.
 * 
 * Uses window-level flag to prevent duplicate loops during HMR.
 */
function startKeyboardPanningLoop(): void {
    // Cancel any existing loop
    if (window.__GAME_PANNING_LOOP_ID__) {
        cancelAnimationFrame(window.__GAME_PANNING_LOOP_ID__);
    }
    
    const PAN_SPEED = 15;
    
    /**
 * Inner loop function - checks keys and pans camera
     */
    function updateKeyboardPanning(): void {
        let dx = 0;
        let dy = 0;
        
        if (keysPressed.has('w') || keysPressed.has('arrowup')) dy -= PAN_SPEED;
        if (keysPressed.has('s') || keysPressed.has('arrowdown')) dy += PAN_SPEED;
        if (keysPressed.has('a') || keysPressed.has('arrowleft')) dx -= PAN_SPEED;
        if (keysPressed.has('d') || keysPressed.has('arrowright')) dx += PAN_SPEED;
        
        if (dx !== 0 || dy !== 0) {
            panCamera(dx, dy, canvas.width, canvas.height);
            draw();
        }
        
        window.__GAME_PANNING_LOOP_ID__ = requestAnimationFrame(updateKeyboardPanning);
    }
    
    window.__GAME_PANNING_LOOP_ID__ = requestAnimationFrame(updateKeyboardPanning);
}

// ============ Game Initialization ============
// Check window-level flag to prevent duplicate initialization during HMR

if (!window.__GAME_INITIALIZED__) {
    // First-time initialization
    window.__GAME_INITIALIZED__ = true;
    setupEventListeners();
    startKeyboardPanningLoop();
    fullInitGame();
} else {
    // HMR reload - just redraw with existing state (don't reinitialize)
    draw();
    updateUI();
}

// ============ Vite HMR Handler ============
/**
 * Hot Module Replacement handler
 * When code changes, redraw instead of full reinit to preserve game state
 */
if ((import.meta as any).hot) {
    (import.meta as any).hot.accept(() => {
        // Module was replaced - redraw but don't reinitialize
        draw();
        updateUI();
    });
}
