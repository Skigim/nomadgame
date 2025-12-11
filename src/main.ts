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

// Extend Window interface for our global state
declare global {
    interface Window {
        __GAME_INITIALIZED__?: boolean;
        __GAME_LISTENERS_ADDED__?: boolean;
        __GAME_PANNING_LOOP_ID__?: number;
        __GAME_KEYS_PRESSED__?: Set<string>;
    }
}

// DOM Elements
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const uiOverlay = document.getElementById('ui-overlay') as HTMLDivElement;
const turnIndicator = document.getElementById('turn-indicator') as HTMLDivElement;
const btnEndTurn = document.getElementById('btn-end-turn') as HTMLButtonElement;
const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;

// Use window-level key tracking to persist across HMR
if (!window.__GAME_KEYS_PRESSED__) {
    window.__GAME_KEYS_PRESSED__ = new Set<string>();
}
const keysPressed = window.__GAME_KEYS_PRESSED__;

// Camera panning state (local, reset is fine)
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

/**
 * Update UI elements based on game state
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
 * Main draw function
 */
function draw(): void {
    render(ctx, canvas, gameState);
}

/**
 * Resize canvas to fit window
 */
function resizeCanvas(): void {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 80;
    draw();
}

/**
 * Handle hex selection/click
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
 * Check and handle win/lose conditions
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
 * Start enemy AI turn
 */
async function startEnemyTurn(): Promise<void> {
    await executeAITurn(() => {
        draw();
        updateUI();
        handleWinCheck();
    });
}

/**
 * Full game initialization (sprites, state, camera)
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

// ============ Event Handlers (defined as named functions for potential cleanup) ============

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

function onMouseUp(): void {
    isDragging = false;
}

function onContextMenu(e: Event): void {
    e.preventDefault();
}

function onKeyDown(e: KeyboardEvent): void {
    keysPressed.add(e.key.toLowerCase());
    
    // 'B' key - Build/Found City (settle action)
    if (e.key.toLowerCase() === 'b' && gameState.selectedUnit && canSettle(gameState.selectedUnit)) {
        settleCity(gameState.selectedUnit);
        draw();
        updateUI();
    }
}

function onKeyUp(e: KeyboardEvent): void {
    keysPressed.delete(e.key.toLowerCase());
}

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

function onEndTurnClick(): void {
    if (gameState.turn === 'player') {
        startEnemyTurn();
    }
}

function onResetClick(): void {
    fullInitGame();
}

function onResize(): void {
    resizeCanvas();
}

/**
 * Setup all event listeners (only once)
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
 * Start keyboard panning loop (only once)
 */
function startKeyboardPanningLoop(): void {
    // Cancel any existing loop
    if (window.__GAME_PANNING_LOOP_ID__) {
        cancelAnimationFrame(window.__GAME_PANNING_LOOP_ID__);
    }
    
    const PAN_SPEED = 15;
    
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

// ============ Initialization ============

if (!window.__GAME_INITIALIZED__) {
    window.__GAME_INITIALIZED__ = true;
    setupEventListeners();
    startKeyboardPanningLoop();
    fullInitGame();
} else {
    // HMR reload - just redraw with existing state
    draw();
    updateUI();
}

// Vite HMR handler
if ((import.meta as any).hot) {
    (import.meta as any).hot.accept(() => {
        // Module was replaced - redraw but don't reinitialize
        draw();
        updateUI();
    });
}
