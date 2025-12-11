/**
 * Players API routes
 */

import { Router } from 'express';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import type Database from 'better-sqlite3';
import type { Player } from '../../shared/types';

export const playersRouter = Router();

// Simple password hashing (use bcrypt in production!)
function hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
}

// Register a new player
playersRouter.post('/register', (req, res) => {
    const db: Database.Database = req.app.locals.db;
    const { username, email, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    const playerId = randomUUID();
    const passwordHash = hashPassword(password);
    
    try {
        db.prepare(`
            INSERT INTO players (id, username, email, password_hash)
            VALUES (?, ?, ?, ?)
        `).run(playerId, username, email || null, passwordHash);
        
        res.status(201).json({ id: playerId, username });
    } catch (error: unknown) {
        if ((error as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({ error: 'Username or email already exists' });
        }
        console.error('Error registering player:', error);
        res.status(500).json({ error: 'Failed to register player' });
    }
});

// Login
playersRouter.post('/login', (req, res) => {
    const db: Database.Database = req.app.locals.db;
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    
    try {
        const player = db.prepare(
            'SELECT * FROM players WHERE username = ?'
        ).get(username) as (Player & { password_hash: string }) | undefined;
        
        if (!player || player.password_hash !== hashPassword(password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Update last login
        db.prepare(
            'UPDATE players SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(player.id);
        
        // Don't send password hash back
        const { password_hash: _, ...playerData } = player;
        res.json(playerData);
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Get player profile
playersRouter.get('/:playerId', (req, res) => {
    const db: Database.Database = req.app.locals.db;
    const { playerId } = req.params;
    
    try {
        const player = db.prepare(
            'SELECT id, username, email, created_at, last_login_at FROM players WHERE id = ?'
        ).get(playerId) as Player | undefined;
        
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        res.json(player);
    } catch (error) {
        console.error('Error getting player:', error);
        res.status(500).json({ error: 'Failed to get player' });
    }
});

// Get player's games
playersRouter.get('/:playerId/games', (req, res) => {
    const db: Database.Database = req.app.locals.db;
    const { playerId } = req.params;
    
    try {
        const games = db.prepare(`
            SELECT g.*, gp.color, gp.is_host, gp.is_eliminated
            FROM games g
            JOIN game_players gp ON g.id = gp.game_id
            WHERE gp.player_id = ?
            ORDER BY g.updated_at DESC
        `).all(playerId);
        
        res.json(games);
    } catch (error) {
        console.error('Error getting player games:', error);
        res.status(500).json({ error: 'Failed to get player games' });
    }
});
