// User model for authentication and stats

const db = require('./database');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

class User {
  /**
   * Create a new user
   */
  static async create(username, password, displayName) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    try {
      const stmt = db.prepare(`
        INSERT INTO users (username, password_hash, display_name)
        VALUES (?, ?, ?)
      `);
      const result = stmt.run(username.toLowerCase(), passwordHash, displayName);

      // Create initial stats record
      db.prepare(`INSERT INTO player_stats (user_id) VALUES (?)`).run(result.lastInsertRowid);

      return { success: true, userId: result.lastInsertRowid };
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return { success: false, error: 'Username already taken' };
      }
      throw err;
    }
  }

  /**
   * Authenticate a user
   */
  static async authenticate(username, password) {
    const user = db.prepare(`
      SELECT id, username, password_hash, display_name
      FROM users WHERE username = ?
    `).get(username.toLowerCase());

    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return { success: false, error: 'Invalid username or password' };
    }

    // Update last login
    db.prepare(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`).run(user.id);

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
    return db.prepare(`
      SELECT id, username, display_name as displayName, created_at as createdAt
      FROM users WHERE id = ?
    `).get(id);
  }

  /**
   * Get user stats
   */
  static getStats(userId) {
    const stats = db.prepare(`
      SELECT * FROM player_stats WHERE user_id = ?
    `).get(userId);

    if (!stats) return null;

    // Calculate derived stats
    const winRate = stats.hands_played > 0
      ? ((stats.hands_won_as_picker + stats.hands_won_as_partner + stats.hands_won_as_defender) / stats.hands_played * 100).toFixed(1)
      : 0;

    const pickRate = stats.hands_played > 0
      ? (stats.hands_picked / stats.hands_played * 100).toFixed(1)
      : 0;

    const pickerWinRate = stats.hands_picked > 0
      ? (stats.hands_won_as_picker / stats.hands_picked * 100).toFixed(1)
      : 0;

    return {
      gamesPlayed: stats.games_played,
      handsPlayed: stats.hands_played,
      handsPicked: stats.hands_picked,
      handsWonAsPicker: stats.hands_won_as_picker,
      handsWonAsPartner: stats.hands_won_as_partner,
      handsWonAsDefender: stats.hands_won_as_defender,
      schwanzersPlayed: stats.schwanzers_played,
      schwanzersWon: stats.schwanzers_won,
      totalScore: stats.total_score,
      schneidersAchieved: stats.schneiders_achieved,
      schwarzAchieved: stats.schwarz_achieved,
      winRate,
      pickRate,
      pickerWinRate
    };
  }

  /**
   * Update stats after a hand
   */
  static updateStats(userId, handResult) {
    const stmt = db.prepare(`
      UPDATE player_stats SET
        hands_played = hands_played + 1,
        hands_picked = hands_picked + ?,
        hands_won_as_picker = hands_won_as_picker + ?,
        hands_won_as_partner = hands_won_as_partner + ?,
        hands_won_as_defender = hands_won_as_defender + ?,
        schwanzers_played = schwanzers_played + ?,
        schwanzers_won = schwanzers_won + ?,
        total_score = total_score + ?,
        schneiders_achieved = schneiders_achieved + ?,
        schwarz_achieved = schwarz_achieved + ?
      WHERE user_id = ?
    `);

    stmt.run(
      handResult.wasPicker ? 1 : 0,
      handResult.wonAsPicker ? 1 : 0,
      handResult.wonAsPartner ? 1 : 0,
      handResult.wonAsDefender ? 1 : 0,
      handResult.isSchwanzer ? 1 : 0,
      handResult.wonSchwanzer ? 1 : 0,
      handResult.scoreChange,
      handResult.schneider ? 1 : 0,
      handResult.schwarz ? 1 : 0,
      userId
    );
  }

  /**
   * Get leaderboard
   */
  static getLeaderboard(limit = 10) {
    return db.prepare(`
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
    `).all(limit);
  }
}

module.exports = User;
