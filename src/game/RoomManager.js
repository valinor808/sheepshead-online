// Room manager for handling game rooms

const { SheepsheadGame, PHASES } = require('./SheepsheadGame');

class RoomManager {
  constructor() {
    this.rooms = new Map();       // roomId -> SheepsheadGame
    this.playerRooms = new Map(); // playerId -> roomId
  }

  /**
   * Create a new room
   */
  createRoom(roomId) {
    if (this.rooms.has(roomId)) {
      return { success: false, error: 'Room already exists' };
    }

    const game = new SheepsheadGame(roomId);
    this.rooms.set(roomId, game);
    return { success: true, roomId };
  }

  /**
   * Get or create a room
   */
  getOrCreateRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.createRoom(roomId);
    }
    return this.rooms.get(roomId);
  }

  /**
   * Get a room
   */
  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  /**
   * Join a player to a room
   */
  joinRoom(roomId, playerId, playerName) {
    // Leave current room first
    if (this.playerRooms.has(playerId)) {
      this.leaveRoom(playerId);
    }

    const game = this.getOrCreateRoom(roomId);
    const result = game.addPlayer(playerId, playerName);

    if (result.success) {
      this.playerRooms.set(playerId, roomId);
    }

    return result;
  }

  /**
   * Remove a player from their current room
   */
  leaveRoom(playerId) {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return { success: false, error: 'Not in a room' };

    const game = this.rooms.get(roomId);
    if (!game) {
      this.playerRooms.delete(playerId);
      return { success: true };
    }

    const result = game.removePlayer(playerId);
    if (result.success) {
      this.playerRooms.delete(playerId);

      // Clean up empty rooms
      if (game.players.length === 0) {
        this.rooms.delete(roomId);
      }
    }

    return { ...result, roomId };
  }

  /**
   * Get the room a player is in
   */
  getPlayerRoom(playerId) {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return null;
    return this.rooms.get(roomId);
  }

  /**
   * Get list of all public rooms
   */
  getPublicRooms() {
    const rooms = [];
    for (const [roomId, game] of this.rooms) {
      rooms.push({
        roomId,
        playerCount: game.players.length,
        phase: game.phase,
        players: game.players.map(p => p.name)
      });
    }
    return rooms;
  }
}

// Singleton instance
const roomManager = new RoomManager();

module.exports = roomManager;
