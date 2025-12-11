/**
 * Actions module barrel export
 * 
 * Centralizes all game actions for convenient importing.
 * Actions are game state mutations triggered by player or AI decisions.
 * 
 * @module actions
 * @todo Add more actions: fortify, heal, pillage, etc.
 * @todo Implement action validation and permission system
 * @todo Add action undo/redo for single-player
 */

export { attackUnit } from './attack';
export { canSettle, settleCity } from './settle';
