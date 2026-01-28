/**
 * Main Server Entry Point
 *
 * Sets up Express server with Socket.IO for real-time game communication.
 * Handles authentication via sessions and provides REST API endpoints.
 *
 * Socket Events:
 * - joinRoom: Player joins a game room
 * - leaveRoom: Player leaves current room
 * - startGame: Start a new hand (requires 5 players)
 * - pick: Player picks or passes during picking phase
 * - bury: Picker buries 2 cards
 * - callAce: Picker calls a partner (or goes alone)
 * - playCard: Player plays a card during trick-taking
 * - newHand: Player votes to continue to next hand
 * - leaveTable: Player votes to leave after hand
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const path = require('path');

const db = require('./models/database');
const User = require('./models/User');
const roomManager = require('./game/RoomManager');
const { PHASES } = require('./game/SheepsheadGame');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true, // Allow same origin
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'sheepshead-secret-change-in-production';
// Railway sets PORT, so if PORT is set we're likely in production
const IS_PRODUCTION = process.env.PORT || process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;

console.log('Environment:', { IS_PRODUCTION, PORT: process.env.PORT, NODE_ENV: process.env.NODE_ENV });

// Trust proxy for Railway (needed for secure cookies behind reverse proxy)
// Always trust proxy since Railway uses a reverse proxy
app.set('trust proxy', 1);

// Tab-isolated session store
// Stores session data per tab ID to allow multiple logins from same computer
const tabSessionStore = new Map();

// Session configuration with memory store
const sessionMiddleware = session({
  name: 'sheepshead.sid',
  store: new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  secret: SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: IS_PRODUCTION, // Use secure cookies in production (HTTPS)
    httpOnly: true,
    sameSite: IS_PRODUCTION ? 'none' : 'lax', // 'none' required for cross-site with secure
    maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
  }
});

// Tab isolation middleware
// Intercepts session access and uses tab-specific storage
function tabIsolationMiddleware(req, res, next) {
  const tabId = req.headers['x-tab-id'];

  if (!tabId) {
    // No tab ID, use default session behavior
    return next();
  }

  // Store original session object
  const originalSession = req.session;

  // Get or create tab-specific session data
  if (!tabSessionStore.has(tabId)) {
    tabSessionStore.set(tabId, {});
  }

  const tabSession = tabSessionStore.get(tabId);

  // Create a proxy that reads/writes to tab-specific storage
  req.session = new Proxy(originalSession, {
    get(target, prop) {
      // Special properties that should use original session
      if (prop === 'save' || prop === 'destroy' || prop === 'regenerate' || prop === 'reload' || prop === 'touch') {
        // Bind methods to the original session object to preserve 'this' context
        const value = target[prop];
        return typeof value === 'function' ? value.bind(target) : value;
      }
      if (prop === 'cookie' || prop === 'id') {
        return target[prop];
      }
      // Use tab-specific storage for user data
      return tabSession[prop];
    },
    set(target, prop, value) {
      tabSession[prop] = value;
      return true;
    },
    has(target, prop) {
      return prop in tabSession;
    },
    deleteProperty(target, prop) {
      delete tabSession[prop];
      return true;
    }
  });

  // Store tabId on request for later use
  req.tabId = tabId;

  next();
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
app.use(tabIsolationMiddleware); // Enable session isolation per tab
app.use(express.static(path.join(__dirname, '../public')));

// Share session with Socket.IO
io.engine.use(sessionMiddleware);

// ============== API Routes ==============

// Register
app.post('/api/register', async (req, res) => {
  const { username, password, displayName } = req.body;

  if (!username || !password || !displayName) {
    return res.status(400).json({ error: 'All fields required' });
  }

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Username must be 3-20 characters' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const result = await User.create(username, password, displayName);

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  req.session.userId = result.userId;
  req.session.displayName = displayName;

  console.log('Register: Setting session', { userId: result.userId, sessionID: req.sessionID });

  // Explicitly save session before responding
  req.session.save((err) => {
    console.log('Register: Session saved', { err, sessionID: req.sessionID });
    if (err) {
      console.error('Session save error:', err);
      return res.status(500).json({ error: 'Session error' });
    }
    res.json({ success: true, displayName });
  });
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const result = await User.authenticate(username, password);

  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }

  req.session.userId = result.user.id;
  req.session.displayName = result.user.displayName;

  // Explicitly save session before responding
  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err);
      return res.status(500).json({ error: 'Session error' });
    }
    res.json({ success: true, displayName: result.user.displayName });
  });
});

// Logout
app.post('/api/logout', (req, res) => {
  // Clear tab-specific session if exists
  if (req.tabId && tabSessionStore.has(req.tabId)) {
    tabSessionStore.delete(req.tabId);
  }

  req.session.destroy();
  res.json({ success: true });
});

// Get current user
app.get('/api/me', (req, res) => {
  console.log('/api/me: Session check', { sessionID: req.sessionID, userId: req.session?.userId, cookies: req.headers.cookie });
  // Check for undefined/null specifically, not falsy (0 is a valid userId)
  if (req.session.userId === undefined || req.session.userId === null) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const user = User.getById(req.session.userId);

  if (!user) {
    console.log('/api/me: User not found for userId:', req.session.userId);
    return res.status(401).json({ error: 'User not found' });
  }

  const stats = User.getStats(req.session.userId);

  res.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName
    },
    stats
  });
});

// Get leaderboard (supports ?type=daily for daily leaderboard)
app.get('/api/leaderboard', (req, res) => {
  const type = req.query.type || 'lifetime';
  if (type === 'daily') {
    const leaderboard = User.getDailyLeaderboard(20);
    res.json(leaderboard);
  } else {
    const leaderboard = User.getLeaderboard(20);
    res.json(leaderboard);
  }
});

// Get daily stats for current user
app.get('/api/stats/daily', (req, res) => {
  if (req.session.userId === undefined || req.session.userId === null) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  const stats = User.getDailyStats(req.session.userId);
  res.json(stats);
});

// Get rooms
app.get('/api/rooms', (req, res) => {
  const rooms = roomManager.getPublicRooms();
  res.json(rooms);
});

// ============== Socket.IO ==============

const socketUsers = new Map();

io.on('connection', (socket) => {
  const sess = socket.request.session;
  const tabId = socket.handshake.auth?.tabId;

  // Apply tab isolation for Socket.IO
  let userId, displayName;

  if (tabId && tabSessionStore.has(tabId)) {
    const tabSession = tabSessionStore.get(tabId);
    userId = tabSession.userId;
    displayName = tabSession.displayName;
  } else {
    // Fall back to regular session if no tab ID
    userId = sess.userId;
    displayName = sess.displayName;
  }

  // Check for undefined/null specifically, not falsy (0 is a valid userId)
  if (userId === undefined || userId === null) {
    socket.emit('error', { message: 'Not authenticated' });
    socket.disconnect();
    return;
  }

  const oderId = userId; // Note: Variable named for historical reasons

  socketUsers.set(socket.id, { oderId: 'user_' + oderId, displayName, dbId: oderId });

  console.log('User connected: ' + displayName);

  socket.on('joinRoom', (data) => {
    const roomId = typeof data === 'string' ? data : data.roomId;
    const asKibbitzer = typeof data === 'object' ? data.asKibbitzer : false;
    const playerId = 'user_' + oderId;

    const currentRooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    currentRooms.forEach(r => socket.leave(r));

    if (asKibbitzer) {
      // Join as kibbitzer (spectator)
      const game = roomManager.getRoom(roomId) || roomManager.createRoom(roomId);
      const result = game.addKibbitzer(playerId, displayName);

      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      socket.join(roomId);

      // Send kibitzer-specific game state
      const playerScores = getPlayerScores(game);
      const state = game.getStateForKibbitzer(playerId);
      state.playerScores = playerScores;
      socket.emit('gameState', state);

      // Notify others that a kibbitzer joined
      socket.to(roomId).emit('kibitzerJoined', { kibitzerId: playerId, displayName });
    } else {
      // Join as player
      const result = roomManager.joinRoom(roomId, playerId, displayName);

      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      socket.join(roomId);

      const game = roomManager.getRoom(roomId);

      // Reset voting state when a new player joins (they shouldn't see stale voting data)
      game.resetVoting();

      // Get player scores for all players in the game
      const playerScores = getPlayerScores(game);
      const state = game.getStateForPlayer(playerId);
      state.playerScores = playerScores;
      socket.emit('gameState', state);
      socket.to(roomId).emit('playerJoined', { playerId, displayName, seatIndex: result.seatIndex });

      io.to(roomId).emit('roomUpdate', {
        players: game.players.map(p => ({ id: p.id, name: p.name, seatIndex: p.seatIndex })),
        phase: game.phase
      });
    }
  });

  socket.on('leaveRoom', () => {
    const playerId = 'user_' + oderId;
    const game = roomManager.getPlayerRoom(playerId);

    if (game) {
      // Check if they're a kibbitzer first
      const isKibbitzer = game.kibbitzers.find(k => k.id === playerId);

      if (isKibbitzer) {
        // Remove kibbitzer
        game.removeKibbitzer(playerId);
        socket.leave(game.roomId);
        socket.to(game.roomId).emit('kibitzerLeft', { kibitzerId: playerId, displayName });
      } else {
        // Remove player
        const roomId = game.roomId;
        roomManager.leaveRoom(playerId);
        socket.leave(roomId);
        socket.to(roomId).emit('playerLeft', { playerId, displayName });

        const updatedGame = roomManager.getRoom(roomId);
        if (updatedGame) {
          io.to(roomId).emit('roomUpdate', {
            players: updatedGame.players.map(p => ({ id: p.id, name: p.name, seatIndex: p.seatIndex })),
            phase: updatedGame.phase
          });
        }
      }
    }
  });

  socket.on('startGame', () => {
    const playerId = 'user_' + oderId;
    const game = roomManager.getPlayerRoom(playerId);

    if (!game) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }

    const result = game.startHand();

    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    for (const player of game.players) {
      const playerSocket = findSocketByPlayerId(player.id);
      if (playerSocket) {
        playerSocket.emit('gameState', game.getStateForPlayer(player.id));
      }
    }
  });

  socket.on('pick', (wantsToPick) => {
    const playerId = 'user_' + oderId;
    const game = roomManager.getPlayerRoom(playerId);

    if (!game) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }

    const result = game.pick(playerId, wantsToPick);

    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    // Check if Schwanzer (everyone passed) - hand completes immediately
    if (result.schwanzer && result.handComplete) {
      updatePlayerStats(game, result.results);
      io.to(game.roomId).emit('handComplete', result.results);
    }

    broadcastGameState(game);
  });

  socket.on('bury', (cardIds) => {
    const playerId = 'user_' + oderId;
    const game = roomManager.getPlayerRoom(playerId);

    if (!game) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }

    const result = game.bury(playerId, cardIds);

    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    broadcastGameState(game);
  });

  socket.on('callAce', (data) => {
    const playerId = 'user_' + oderId;
    const game = roomManager.getPlayerRoom(playerId);

    if (!game) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }

    const result = game.callAce(playerId, data.suit, data.goAlone, data.underCardId);

    if (!result.success) {
      // If needs under card, send back the requirement
      if (result.needsUnderCard) {
        socket.emit('needsUnderCard', { suit: data.suit });
        return;
      }
      socket.emit('error', { message: result.error });
      return;
    }

    broadcastGameState(game);
  });

  socket.on('playCard', (cardId) => {
    const playerId = 'user_' + oderId;
    const game = roomManager.getPlayerRoom(playerId);

    if (!game) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }

    const result = game.playCard(playerId, cardId);

    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    io.to(game.roomId).emit('cardPlayed', {
      playerId,
      card: result.card,
      partnerRevealed: result.partnerRevealed
    });

    if (result.trickComplete) {
      io.to(game.roomId).emit('trickComplete', {
        trick: result.trick,
        winner: result.winner,
        points: result.points
      });

      if (result.handComplete) {
        updatePlayerStats(game, result.results);
        io.to(game.roomId).emit('handComplete', result.results);
      }
    }

    broadcastGameState(game);
  });

  socket.on('newHand', () => {
    const playerId = 'user_' + oderId;
    const game = roomManager.getPlayerRoom(playerId);

    if (!game) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }

    if (game.phase !== PHASES.SCORING) {
      socket.emit('error', { message: 'Game not in scoring phase' });
      return;
    }

    // Check if anyone has already left
    const someoneLeavingOrLeft = game.playersLeaving.length > 0 || game.players.length < 5;

    if (someoneLeavingOrLeft) {
      // Someone left - can't continue with current players
      // Send THIS player back to waiting room immediately
      socket.emit('sessionEnded', {
        message: 'Not enough players to continue. Returning to waiting room.'
      });

      // Mark this player as voted for next hand (for tracking)
      game.markPlayerNextHand(playerId);

      // Broadcast updated voting state to other players still on scoring screen
      socket.to(game.roomId).emit('votingUpdate', {
        playersNextHand: game.getNextHandPlayerNames(),
        playersLeaving: game.getLeavingPlayerNames(),
        allVoted: game.haveAllPlayersVoted()
      });

      // Check if this was the last player to vote - if so, reset the game
      if (game.haveAllPlayersVoted()) {
        game.resetToWaiting();
        game.resetVoting();
        broadcastGameState(game);
      }

      return;
    }

    // No one has left yet - mark this player as wanting next hand
    const result = game.markPlayerNextHand(playerId);

    // Broadcast updated voting state
    io.to(game.roomId).emit('votingUpdate', {
      playersNextHand: game.getNextHandPlayerNames(),
      playersLeaving: game.getLeavingPlayerNames(),
      allVoted: result.allVoted
    });

    // Check if all players have voted
    if (result.allVoted) {
      if (game.allVotedNextHand()) {
        // All players want to continue - start next hand
        game.resetVoting();
        const startResult = game.startHand();

        if (!startResult.success) {
          socket.emit('error', { message: startResult.error });
          return;
        }

        broadcastGameState(game);
      } else {
        // This shouldn't happen now since we handle leaving differently
        // but keep it as a fallback
        const leavingNames = game.getLeavingPlayerNames();
        game.resetToWaiting();
        game.resetVoting();

        // Notify remaining players that session ended
        io.to(game.roomId).emit('sessionEnded', {
          message: `${leavingNames.join(', ')} left the table. Returning to waiting room.`
        });

        broadcastGameState(game);
      }
    } else {
      // Not all votes in yet - just update state
      broadcastGameState(game);
    }
  });

  socket.on('leaveTable', () => {
    const playerId = 'user_' + oderId;
    const game = roomManager.getPlayerRoom(playerId);

    if (!game) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }

    if (game.phase !== PHASES.SCORING) {
      socket.emit('error', { message: 'Can only leave table after hand is complete' });
      return;
    }

    const roomId = game.roomId;

    // Mark as leaving (stores name for display)
    game.markPlayerLeaving(playerId);

    // Remove the player immediately and send them to lobby
    roomManager.leaveRoom(playerId);
    socket.leave(roomId);

    // Tell this player to go to lobby
    socket.emit('returnToLobby', { message: 'You left the table' });

    // Notify remaining players
    socket.to(roomId).emit('playerLeft', { playerId, displayName });

    // Broadcast updated voting state to remaining players
    const updatedGame = roomManager.getRoom(roomId);
    if (updatedGame) {
      io.to(roomId).emit('votingUpdate', {
        playersNextHand: updatedGame.getNextHandPlayerNames(),
        playersLeaving: updatedGame.getLeavingPlayerNames(), // Names are persisted
        allVoted: updatedGame.haveAllPlayersVoted()
      });

      // Check if all remaining players have voted
      if (updatedGame.haveAllPlayersVoted()) {
        if (updatedGame.allVotedNextHand()) {
          // All remaining players want to continue - but we're missing players now
          // Reset to waiting state
          updatedGame.resetToWaiting();
          updatedGame.resetVoting();

          io.to(roomId).emit('sessionEnded', {
            message: `${displayName} left the table. Returning to waiting room.`
          });
        } else {
          // Multiple players left - reset to waiting
          const leavingNames = updatedGame.getLeavingPlayerNames();
          updatedGame.resetToWaiting();
          updatedGame.resetVoting();

          io.to(roomId).emit('sessionEnded', {
            message: `${leavingNames.join(', ')} left the table. Returning to waiting room.`
          });
        }
      }

      // Broadcast updated game state to remaining players
      for (const player of updatedGame.players) {
        const playerSocket = findSocketByPlayerId(player.id);
        if (playerSocket) {
          playerSocket.emit('gameState', updatedGame.getStateForPlayer(player.id));
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected: ' + displayName);

    // Auto-leave room on disconnect
    const playerId = 'user_' + oderId;
    const game = roomManager.getPlayerRoom(playerId);

    if (game) {
      const roomId = game.roomId;
      const result = roomManager.leaveRoom(playerId);

      // Notify remaining players
      socket.to(roomId).emit('playerLeft', { playerId, displayName });

      const updatedGame = roomManager.getRoom(roomId);
      if (updatedGame) {
        // If game was reset, broadcast new state to all players
        if (result.gameReset) {
          io.to(roomId).emit('gameReset', { message: `${displayName} left - game reset` });
        }

        io.to(roomId).emit('roomUpdate', {
          players: updatedGame.players.map(p => ({ id: p.id, name: p.name, seatIndex: p.seatIndex })),
          phase: updatedGame.phase
        });

        // Broadcast updated game state to remaining players
        for (const player of updatedGame.players) {
          const playerSocket = findSocketByPlayerId(player.id);
          if (playerSocket) {
            playerSocket.emit('gameState', updatedGame.getStateForPlayer(player.id));
          }
        }
      }
    }

    socketUsers.delete(socket.id);
  });

  function findSocketByPlayerId(playerId) {
    for (const [socketId, userInfo] of socketUsers) {
      if ('user_' + userInfo.dbId === playerId) {
        return io.sockets.sockets.get(socketId);
      }
    }
    return null;
  }

  function getPlayerScores(game) {
    const scores = {};
    for (const player of game.players) {
      const dbUserId = parseInt(player.id.replace('user_', ''));
      const scoreSummary = User.getScoreSummary(dbUserId);
      scores[player.id] = scoreSummary;
    }
    return scores;
  }

  function broadcastGameState(game) {
    const playerScores = getPlayerScores(game);

    // Send state to players
    for (const player of game.players) {
      const playerSocket = findSocketByPlayerId(player.id);
      if (playerSocket) {
        const state = game.getStateForPlayer(player.id);
        state.playerScores = playerScores;
        playerSocket.emit('gameState', state);
      }
    }

    // Send state to kibbitzers
    for (const kibbitzer of game.kibbitzers) {
      const kibitzerSocket = findSocketByPlayerId(kibbitzer.id);
      if (kibitzerSocket) {
        const state = game.getStateForKibbitzer(kibbitzer.id);
        state.playerScores = playerScores;
        kibitzerSocket.emit('gameState', state);
      }
    }
  }

  function updatePlayerStats(game, results) {
    for (const player of game.players) {
      const dbUserId = parseInt(player.id.replace('user_', ''));
      const scoreChange = results.scores[player.id] || 0;

      const handResult = {
        wasPicker: player.id === results.picker,
        wonAsPicker: player.id === results.picker && results.pickersWin,
        wonAsPartner: player.id === results.partner && results.pickersWin,
        wonAsDefender: results.defendingTeam && results.defendingTeam.includes(player.id) && !results.pickersWin,
        isSchwanzer: results.type === 'schwanzer',
        wonSchwanzer: results.type === 'schwanzer' && player.id === results.winner,
        scoreChange,
        schneider: results.schneider && (player.id === results.picker || player.id === results.partner) && results.pickersWin,
        schwarz: results.schwarz && (player.id === results.picker || player.id === results.partner) && results.pickersWin
      };

      User.updateStats(dbUserId, handResult);
    }
  }
});

// Initialize database and start server
async function start() {
  try {
    await db.initDb();
    console.log('Database initialized');

    server.listen(PORT, () => {
      console.log('Sheepshead server running on port ' + PORT);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
