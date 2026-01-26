// SQLite database setup using sql.js (pure JavaScript, no native dependencies)

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/sheepshead.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;
let SQL = null;

// Initialize database
async function initDb() {
  if (db) return db;

  SQL = await initSqlJs();

  // Try to load existing database
  try {
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
      console.log('Loaded existing database');
    } else {
      db = new SQL.Database();
      console.log('Created new database');
    }
  } catch (err) {
    console.error('Error loading database, creating new one:', err.message);
    db = new SQL.Database();
  }

  // Initialize tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `);

  db.run(`
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
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      hands_played INTEGER DEFAULT 0
    )
  `);

  db.run(`
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
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS hand_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hand_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      points_taken INTEGER NOT NULL,
      tricks_won INTEGER NOT NULL,
      score_change INTEGER NOT NULL,
      FOREIGN KEY (hand_id) REFERENCES hands(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Save initially
  saveDb();

  return db;
}

// Save database to file
function saveDb() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Error saving database:', err.message);
  }
}

// Helper to run a query and get results
function query(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error('Query error:', sql, err.message);
    throw err;
  }
}

// Helper to run a query and get first result
function queryOne(sql, params = []) {
  const results = query(sql, params);
  return results[0] || null;
}

// Helper to run an insert/update/delete
function run(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  try {
    db.run(sql, params);
    saveDb();
    // Get last insert rowid using a prepared statement
    const stmt = db.prepare("SELECT last_insert_rowid() as id");
    stmt.step();
    const result = stmt.getAsObject();
    stmt.free();
    return {
      lastInsertRowid: result.id,
      changes: db.getRowsModified()
    };
  } catch (err) {
    console.error('Run error:', sql, err.message);
    throw err;
  }
}

module.exports = {
  initDb,
  saveDb,
  query,
  queryOne,
  run,
  getDb: () => db
};
