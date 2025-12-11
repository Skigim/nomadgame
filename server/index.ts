/**
 * Nomad Game Server
 * Express + SQLite backend for game logic
 */

import express from 'express';
import cors from 'cors';
import { initDatabase } from './db';
import { gamesRouter } from './routes/games';
import { playersRouter } from './routes/players';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
const db = initDatabase();

// Make db available to routes
app.locals.db = db;

// Routes
app.use('/api/games', gamesRouter);
app.use('/api/players', playersRouter);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`🎮 Nomad server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    db.close();
    process.exit(0);
});
