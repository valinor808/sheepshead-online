/**
 * User model for authentication and statistics tracking.
 *
 * Handles user registration, login, and stat tracking for Sheepshead games.
 * Stats are tracked both lifetime and daily for leaderboard purposes.
 */

const db = require('./database');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/**
 * Helper to calculate win/pick rates from stats object.
 * @param {Object} stats - Raw stats with hands_played, hands_picked, etc.
 * @returns {Object} - Object with winRate, pickRate, pickerWinRate as strings
 */
function calculateRates(stats) {
  const handsWon = (stats.hands_won_as_picker || 0) +
                   (stats.hands_won_as_partner || 0) +
                   (stats.hands_won_as_defender || 0);

  const winRate = stats.hands_played > 0
    ? (handsWon / stats.hands_played * 100).toFixed(1)
    : '0';

  const pickRate = stats.hands_played > 0
    ? (stats.hands_picked / stats.hands_played * 100).toFixed(1)
    : '0';

  const pickerWinRate = stats.hands_picked > 0
    ? (stats.hands_won_as_picker / stats.hands_picked * 100).toFixed(1)
    : '0';

  return { winRate, pickRate, pickerWinRate };
}

class User {
  /**
   * Create a new user account.
   * @param {string} username - Unique username (will be lowercased)
   * @param {string} password - Plain text password (will be hashed)
   * @param {string} displayName - Display name shown in game
   * @returns {Object} - { success: boolean, userId?: number, error?: string }
   */
  static async create(username, password, displayName) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    try {
      // Check if username exists
      const existing = db.queryOne('SELECT id FROM users WHERE username = ?', [username.toLowerCase()]);
      if (existing) {
        return { success: false, error: 'Username already taken' };
      }

      const result = db.run(
        'INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)',
        [username.toLowerCase(), passwordHash, displayName]
      );

      const userId = result.lastInsertRowid;
      console.log('Created user with ID:', userId);

      // Create initial stats record
      db.run('INSERT INTO player_stats (user_id) VALUES (?)', [userId]);

      return { success: true, userId };
    } catch (err) {
      console.error('Create user error:', err.message, err.stack);
      // Check for unique constraint violation
      if (err.message && err.message.includes('UNIQUE')) {
        return { success: false, error: 'Username already taken' };
      }
      return { success: false, error: 'Failed to create user: ' + err.message };
    }
  }

  /**
   * Authenticate a user
   */
  static async authenticate(username, password) {
    const user = db.queryOne(
      'SELECT id, username, password_hash, display_name FROM users WHERE username = ?',
      [username.toLowerCase()]
    );

    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return { success: false, error: 'Invalid username or password' };
    }

    // Update last login
    db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name
      }
    };
  }

  /**
   * Get user by ID
   */
  static getById(id) {
    const user = db.queryOne(
      'SELECT id, username, display_name, created_at FROM users WHERE id = ?',
      [id]
    );
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      createdAt: user.created_at
    };
  }

  /**
   * Get lifetime stats for a user.
   * @param {number} userId - User ID
   * @returns {Object|null} - Stats object or null if not found
   */
  static getStats(userId) {
    const stats = db.queryOne('SELECT * FROM player_stats WHERE user_id = ?', [userId]);
    if (!stats) return null;

    const rates = calculateRates(stats);

    return {
      gamesPlayed: stats.games_played,
      handsPlayed: stats.hands_played,
      handsPicked: stats.hands_picked,
      handsWonAsPicker: stats.hands_won_as_picker,
      handsCalledAsPartner: stats.hands_called_as_partner || 0,
      handsWonAsPartner: stats.hands_won_as_partner,
      handsWonAsDefender: stats.hands_won_as_defender,
      handsAlone: stats.hands_alone || 0,
      handsWonAsAlone: stats.hands_won_as_alone || 0,
      schwanzersPlayed: stats.schwanzers_played,
      schwanzersWon: stats.schwanzers_won,
      totalScore: stats.total_score,
      schneidersAchieved: stats.schneiders_achieved,
      schwarzAchieved: stats.schwarz_achieved,
      ...rates
    };
  }

  /**
   * Update stats after a hand (both lifetime and daily)
   */
  static updateStats(userId, handResult) {
    // Update lifetime stats
    db.run(`
      UPDATE player_stats SET
        hands_played = hands_played + 1,
        hands_picked = hands_picked + ?,
        hands_won_as_picker = hands_won_as_picker + ?,
        hands_called_as_partner = hands_called_as_partner + ?,
        hands_won_as_partner = hands_won_as_partner + ?,
        hands_won_as_defender = hands_won_as_defender + ?,
        hands_alone = hands_alone + ?,
        hands_won_as_alone = hands_won_as_alone + ?,
        schwanzers_played = schwanzers_played + ?,
        schwanzers_won = schwanzers_won + ?,
        total_score = total_score + ?,
        schneiders_achieved = schneiders_achieved + ?,
        schwarz_achieved = schwarz_achieved + ?
      WHERE user_id = ?
    `, [
      handResult.wasPicker ? 1 : 0,
      handResult.wonAsPicker ? 1 : 0,
      handResult.wasCalledAsPartner ? 1 : 0,
      handResult.wonAsPartner ? 1 : 0,
      handResult.wonAsDefender ? 1 : 0,
      handResult.wentAlone ? 1 : 0,
      handResult.wonAsAlone ? 1 : 0,
      handResult.isSchwanzer ? 1 : 0,
      handResult.wonSchwanzer ? 1 : 0,
      handResult.scoreChange,
      handResult.schneider ? 1 : 0,
      handResult.schwarz ? 1 : 0,
      userId
    ]);

    // Update daily stats
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Try to insert or update daily stats
    const existing = db.queryOne('SELECT id FROM daily_stats WHERE user_id = ? AND date = ?', [userId, today]);

    if (existing) {
      db.run(`
        UPDATE daily_stats SET
          hands_played = hands_played + 1,
          hands_picked = hands_picked + ?,
          hands_won_as_picker = hands_won_as_picker + ?,
          hands_called_as_partner = hands_called_as_partner + ?,
          hands_won_as_partner = hands_won_as_partner + ?,
          hands_won_as_defender = hands_won_as_defender + ?,
          hands_alone = hands_alone + ?,
          hands_won_as_alone = hands_won_as_alone + ?,
          schwanzers_played = schwanzers_played + ?,
          schwanzers_won = schwanzers_won + ?,
          score = score + ?,
          schneiders_achieved = schneiders_achieved + ?,
          schwarz_achieved = schwarz_achieved + ?
        WHERE user_id = ? AND date = ?
      `, [
        handResult.wasPicker ? 1 : 0,
        handResult.wonAsPicker ? 1 : 0,
        handResult.wasCalledAsPartner ? 1 : 0,
        handResult.wonAsPartner ? 1 : 0,
        handResult.wonAsDefender ? 1 : 0,
        handResult.wentAlone ? 1 : 0,
        handResult.wonAsAlone ? 1 : 0,
        handResult.isSchwanzer ? 1 : 0,
        handResult.wonSchwanzer ? 1 : 0,
        handResult.scoreChange,
        handResult.schneider ? 1 : 0,
        handResult.schwarz ? 1 : 0,
        userId,
        today
      ]);
    } else {
      db.run(`
        INSERT INTO daily_stats (user_id, date, hands_played, hands_picked, hands_won_as_picker,
          hands_called_as_partner, hands_won_as_partner, hands_won_as_defender, hands_alone,
          hands_won_as_alone, schwanzers_played, schwanzers_won, score, schneiders_achieved, schwarz_achieved)
        VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        today,
        handResult.wasPicker ? 1 : 0,
        handResult.wonAsPicker ? 1 : 0,
        handResult.wasCalledAsPartner ? 1 : 0,
        handResult.wonAsPartner ? 1 : 0,
        handResult.wonAsDefender ? 1 : 0,
        handResult.wentAlone ? 1 : 0,
        handResult.wonAsAlone ? 1 : 0,
        handResult.isSchwanzer ? 1 : 0,
        handResult.wonSchwanzer ? 1 : 0,
        handResult.scoreChange,
        handResult.schneider ? 1 : 0,
        handResult.schwarz ? 1 : 0
      ]);
    }
  }

  /**
   * Get daily stats for a user.
   * @param {number} userId - User ID
   * @param {string|null} date - Date in YYYY-MM-DD format, defaults to today
   * @returns {Object} - Stats object (returns zeros if no stats for that day)
   */
  static getDailyStats(userId, date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const stats = db.queryOne('SELECT * FROM daily_stats WHERE user_id = ? AND date = ?', [userId, targetDate]);

    // Return zeros if no stats exist for this day
    if (!stats) {
      return {
        handsPlayed: 0,
        handsPicked: 0,
        handsWonAsPicker: 0,
        handsCalledAsPartner: 0,
        handsWonAsPartner: 0,
        handsWonAsDefender: 0,
        handsAlone: 0,
        handsWonAsAlone: 0,
        schwanzersPlayed: 0,
        schwanzersWon: 0,
        score: 0,
        schneidersAchieved: 0,
        schwarzAchieved: 0,
        winRate: '0',
        pickRate: '0',
        pickerWinRate: '0'
      };
    }

    const rates = calculateRates(stats);

    return {
      handsPlayed: stats.hands_played,
      handsPicked: stats.hands_picked,
      handsWonAsPicker: stats.hands_won_as_picker,
      handsCalledAsPartner: stats.hands_called_as_partner || 0,
      handsWonAsPartner: stats.hands_won_as_partner,
      handsWonAsDefender: stats.hands_won_as_defender,
      handsAlone: stats.hands_alone || 0,
      handsWonAsAlone: stats.hands_won_as_alone || 0,
      schwanzersPlayed: stats.schwanzers_played,
      schwanzersWon: stats.schwanzers_won,
      score: stats.score,
      schneidersAchieved: stats.schneiders_achieved,
      schwarzAchieved: stats.schwarz_achieved,
      ...rates
    };
  }

  /**
   * Get leaderboard (lifetime)
   */
  static getLeaderboard(limit = 10) {
    return db.query(`
      SELECT
        u.display_name as displayName,
        u.username,
        ps.total_score as totalScore,
        ps.hands_played as handsPlayed,
        ps.hands_won_as_picker + ps.hands_won_as_partner + ps.hands_won_as_defender as handsWon
      FROM users u
      JOIN player_stats ps ON u.id = ps.user_id
      WHERE ps.hands_played > 0
      ORDER BY ps.total_score DESC
      LIMIT ?
    `, [limit]);
  }

  /**
   * Get daily leaderboard
   */
  static getDailyLeaderboard(limit = 10, date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return db.query(`
      SELECT
        u.display_name as displayName,
        u.username,
        ds.score as totalScore,
        ds.hands_played as handsPlayed,
        ds.hands_won_as_picker + ds.hands_won_as_partner + ds.hands_won_as_defender as handsWon
      FROM users u
      JOIN daily_stats ds ON u.id = ds.user_id
      WHERE ds.date = ? AND ds.hands_played > 0
      ORDER BY ds.score DESC
      LIMIT ?
    `, [targetDate, limit]);
  }

  /**
   * Get player score summary (for showing on player cards in-game)
   */
  static getScoreSummary(userId) {
    const lifetime = db.queryOne('SELECT total_score FROM player_stats WHERE user_id = ?', [userId]);
    const today = new Date().toISOString().split('T')[0];
    const daily = db.queryOne('SELECT score FROM daily_stats WHERE user_id = ? AND date = ?', [userId, today]);

    return {
      lifetime: lifetime?.total_score || 0,
      daily: daily?.score || 0
    };
  }
}

module.exports = User;
