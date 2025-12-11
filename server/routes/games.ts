/**
 * Games API routes
 */

import { Router } from 'express';
import { randomUUID } from 'crypto';
import type Database from 'better-sqlite3';
import type { CreateGameRequest, Game, GamePlayer, GameStateResponse, Tile, City, Unit } from '../../shared/types';

export const gamesRouter = Router();

// Create a new game
gamesRouter.post('/', (req, res) => {
    const db: Database.Database = req.app.locals.db;
    const { name, maxPlayers = 4, mapWidth = 100, mapHeight = 80 }: CreateGameRequest = req.body;
    
    const gameId = randomUUID();
    
    try {
        db.prepare(`
            INSERT INTO games (id, name, max_players, map_width, map_height)
            VALUES (?, ?, ?, ?, ?)
        `).run(gameId, name, maxPlayers, mapWidth, mapHeight);
        
        res.status(201).json({ id: gameId, name, status: 'lobby' });
    } catch (error) {
        console.error('Error creating game:', error);
        res.status(500).json({ error: 'Failed to create game' });
    }
});

// List all games
gamesRouter.get('/', (req, res) => {
    const db: Database.Database = req.app.locals.db;
    const status = req.query.status as string | undefined;
    
    try {
        let query = 'SELECT * FROM games';
        const params: string[] = [];
        
        if (status) {
            query += ' WHERE status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const games = db.prepare(query).all(...params);
        res.json(games);
    } catch (error) {
        console.error('Error listing games:', error);
        res.status(500).json({ error: 'Failed to list games' });
    }
});

// Get game state
gamesRouter.get('/:gameId', (req, res) => {
    const db: Database.Database = req.app.locals.db;
    const { gameId } = req.params;
    const playerId = req.query.playerId as string;
    
    try {
        const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as Game | undefined;
        
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }
        
        const players = db.prepare('SELECT * FROM game_players WHERE game_id = ?').all(gameId) as GamePlayer[];
        const tiles = db.prepare('SELECT * FROM tiles WHERE game_id = ?').all(gameId) as Tile[];
        const cities = db.prepare('SELECT * FROM cities WHERE game_id = ?').all(gameId) as City[];
        const units = db.prepare('SELECT * FROM units WHERE game_id = ?').all(gameId) as Unit[];
        
        // TODO: Filter by fog of war for playerId
        
        const response: GameStateResponse = {
            game,
            players,
            tiles,
            cities,
            units
        };
        
        res.json(response);
    } catch (error) {
        console.error('Error getting game state:', error);
        res.status(500).json({ error: 'Failed to get game state' });
    }
});

// Join a game
gamesRouter.post('/:gameId/join', (req, res) => {
    const db: Database.Database = req.app.locals.db;
    const { gameId } = req.params;
    const { playerId, civilizationId } = req.body;
    
    try {
        const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as Game | undefined;
        
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }
        
        if (game.status !== 'lobby') {
            return res.status(400).json({ error: 'Game already started' });
        }
        
        const existingPlayers = db.prepare('SELECT COUNT(*) as count FROM game_players WHERE game_id = ?').get(gameId) as { count: number };
        
        if (existingPlayers.count >= game.maxPlayers) {
            return res.status(400).json({ error: 'Game is full' });
        }
        
        // Assign a color based on player number
        const colors = ['#4cc9f0', '#f72585', '#ff9f1c', '#7b2cbf', '#2ec4b6', '#fb5607'];
        const color = colors[existingPlayers.count % colors.length];
        const isHost = existingPlayers.count === 0;
        
        db.prepare(`
            INSERT INTO game_players (game_id, player_id, civilization_id, color, is_host)
            VALUES (?, ?, ?, ?, ?)
        `).run(gameId, playerId, civilizationId, color, isHost ? 1 : 0);
        
        res.json({ success: true, color, isHost });
    } catch (error) {
        console.error('Error joining game:', error);
        res.status(500).json({ error: 'Failed to join game' });
    }
});

// Start a game
gamesRouter.post('/:gameId/start', (req, res) => {
    const db: Database.Database = req.app.locals.db;
    const { gameId } = req.params;
    const { playerId } = req.body;
    
    try {
        // Verify player is host
        const gamePlayer = db.prepare(
            'SELECT * FROM game_players WHERE game_id = ? AND player_id = ?'
        ).get(gameId, playerId) as GamePlayer | undefined;
        
        if (!gamePlayer?.isHost) {
            return res.status(403).json({ error: 'Only host can start the game' });
        }
        
        // Update game status
        db.prepare(`
            UPDATE games SET status = 'active', turn_number = 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(gameId);
        
        // TODO: Generate map and spawn units for each player
        
        res.json({ success: true, status: 'active' });
    } catch (error) {
        console.error('Error starting game:', error);
        res.status(500).json({ error: 'Failed to start game' });
    }
});

// Submit turn actions
gamesRouter.post('/:gameId/actions', (req, res) => {
    const db: Database.Database = req.app.locals.db;
    const { gameId } = req.params;
    const { playerId, actions } = req.body;
    
    try {
        const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as Game | undefined;
        
        if (!game || game.status !== 'active') {
            return res.status(400).json({ error: 'Game not active' });
        }
        
        // Insert actions
        const insertAction = db.prepare(`
            INSERT INTO turn_actions (id, game_id, player_id, turn_number, action_type, unit_id, city_id, target_col, target_row, target_id, data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const action of actions) {
            insertAction.run(
                randomUUID(),
                gameId,
                playerId,
                game.turnNumber,
                action.actionType,
                action.unitId || null,
                action.cityId || null,
                action.targetCol || null,
                action.targetRow || null,
                action.targetId || null,
                action.data || null
            );
        }
        
        // Mark player turn as submitted
        db.prepare(`
            UPDATE game_players SET turn_submitted = 1 WHERE game_id = ? AND player_id = ?
        `).run(gameId, playerId);
        
        // Check if all players have submitted
        const pendingPlayers = db.prepare(`
            SELECT COUNT(*) as count FROM game_players 
            WHERE game_id = ? AND turn_submitted = 0 AND is_eliminated = 0
        `).get(gameId) as { count: number };
        
        if (pendingPlayers.count === 0) {
            // TODO: Process turn and advance to next turn
            console.log(`All players submitted for game ${gameId}, processing turn...`);
        }
        
        res.json({ success: true, pendingPlayers: pendingPlayers.count });
    } catch (error) {
        console.error('Error submitting actions:', error);
        res.status(500).json({ error: 'Failed to submit actions' });
    }
});
