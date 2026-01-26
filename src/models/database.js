// SQLite database setup and initialization

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/sheepshead.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  );

  -- Player statistics
  CREATE TABLE IF NOT EXISTS player_stats (
    user_id INTEGER PRIMARY KEY,
    games_played INTEGER DEFAULT 0,
    hands_played INTEGER DEFAULT 0,
    hands_picked INTEGER DEFAULT 0,
    hands_won_as_picker INTEGER DEFAULT 0,
    hands_won_as_partner INTEGER DEFAULT 0,
    hands_won_as_defender INTEGER DEFAULT 0,
    schwanzers_played INTEGER DEFAULT 0,
    schwanzers_won INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    schneiders_achieved INTEGER DEFAULT 0,
    schwarz_achieved INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Game history
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    hands_played INTEGER DEFAULT 0
  );

  -- Hand history (individual hands within a game)
  CREATE TABLE IF NOT EXISTS hands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    hand_number INTEGER NOT NULL,
    picker_id INTEGER,
    partner_id INTEGER,
    called_suit TEXT,
    is_schwanzer BOOLEAN DEFAULT FALSE,
    picker_points INTEGER,
    defender_points INTEGER,
    schneider BOOLEAN DEFAULT FALSE,
    schwarz BOOLEAN DEFAULT FALSE,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id),
    FOREIGN KEY (picker_id) REFERENCES users(id),
    FOREIGN KEY (partner_id) REFERENCES users(id)
  );

  -- Player results for each hand
  CREATE TABLE IF NOT EXISTS hand_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hand_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL, -- 'picker', 'partner', 'defender', 'schwanzer'
    points_taken INTEGER NOT NULL,
    tricks_won INTEGER NOT NULL,
    score_change INTEGER NOT NULL,
    FOREIGN KEY (hand_id) REFERENCES hands(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_hand_results_user ON hand_results(user_id);
  CREATE INDEX IF NOT EXISTS idx_hands_game ON hands(game_id);
`);

module.exports = db;
