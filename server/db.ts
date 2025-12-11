/**
 * Database initialization and schema
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database goes in the data folder at project root
const DB_PATH = path.join(__dirname, '../data/nomad.db');

export function initDatabase(): Database.Database {
    const db = new Database(DB_PATH);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Create tables
    db.exec(`
        -- Players table
        CREATE TABLE IF NOT EXISTS players (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_login_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Games table
        CREATE TABLE IF NOT EXISTS games (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            status TEXT DEFAULT 'lobby',
            turn_number INTEGER DEFAULT 0,
            current_player_id TEXT,
            max_players INTEGER DEFAULT 4,
            map_width INTEGER DEFAULT 100,
            map_height INTEGER DEFAULT 80,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Game players (many-to-many with extra data)
        CREATE TABLE IF NOT EXISTS game_players (
            game_id TEXT NOT NULL,
            player_id TEXT NOT NULL,
            civilization_id TEXT NOT NULL,
            color TEXT NOT NULL,
            is_host INTEGER DEFAULT 0,
            is_eliminated INTEGER DEFAULT 0,
            turn_submitted INTEGER DEFAULT 0,
            PRIMARY KEY (game_id, player_id),
            FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
            FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
        );

        -- Map tiles
        CREATE TABLE IF NOT EXISTS tiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id TEXT NOT NULL,
            col INTEGER NOT NULL,
            row INTEGER NOT NULL,
            terrain TEXT NOT NULL,
            owner_id TEXT,
            resource_type TEXT,
            resource_amount INTEGER DEFAULT 0,
            UNIQUE(game_id, col, row),
            FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
        );

        -- Cities
        CREATE TABLE IF NOT EXISTS cities (
            id TEXT PRIMARY KEY,
            game_id TEXT NOT NULL,
            owner_id TEXT NOT NULL,
            name TEXT NOT NULL,
            col INTEGER NOT NULL,
            row INTEGER NOT NULL,
            population INTEGER DEFAULT 1,
            food INTEGER DEFAULT 0,
            production INTEGER DEFAULT 0,
            gold INTEGER DEFAULT 0,
            science INTEGER DEFAULT 0,
            culture INTEGER DEFAULT 0,
            current_production_id TEXT,
            production_progress INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
        );

        -- Units
        CREATE TABLE IF NOT EXISTS units (
            id TEXT PRIMARY KEY,
            game_id TEXT NOT NULL,
            owner_id TEXT NOT NULL,
            type TEXT NOT NULL,
            col INTEGER NOT NULL,
            row INTEGER NOT NULL,
            hp INTEGER NOT NULL,
            max_hp INTEGER NOT NULL,
            movement_remaining INTEGER NOT NULL,
            move_range INTEGER NOT NULL,
            attack_range INTEGER NOT NULL,
            damage INTEGER NOT NULL,
            has_acted INTEGER DEFAULT 0,
            FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
        );

        -- Player technologies
        CREATE TABLE IF NOT EXISTS player_techs (
            game_id TEXT NOT NULL,
            player_id TEXT NOT NULL,
            tech_id TEXT NOT NULL,
            researched_at TEXT DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (game_id, player_id, tech_id),
            FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
        );

        -- Tech research progress
        CREATE TABLE IF NOT EXISTS tech_progress (
            game_id TEXT NOT NULL,
            player_id TEXT NOT NULL,
            tech_id TEXT NOT NULL,
            progress INTEGER DEFAULT 0,
            PRIMARY KEY (game_id, player_id, tech_id),
            FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
        );

        -- Turn actions (history)
        CREATE TABLE IF NOT EXISTS turn_actions (
            id TEXT PRIMARY KEY,
            game_id TEXT NOT NULL,
            player_id TEXT NOT NULL,
            turn_number INTEGER NOT NULL,
            action_type TEXT NOT NULL,
            unit_id TEXT,
            city_id TEXT,
            target_col INTEGER,
            target_row INTEGER,
            target_id TEXT,
            data TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
        );

        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_tiles_game ON tiles(game_id);
        CREATE INDEX IF NOT EXISTS idx_units_game ON units(game_id);
        CREATE INDEX IF NOT EXISTS idx_cities_game ON cities(game_id);
        CREATE INDEX IF NOT EXISTS idx_actions_game_turn ON turn_actions(game_id, turn_number);
    `);

    console.log('Database initialized at:', DB_PATH);
    return db;
}

export function getDatabase(): Database.Database {
    return new Database(DB_PATH);
}
