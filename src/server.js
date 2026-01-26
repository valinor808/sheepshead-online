// Main server entry point

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');

const User = require('./models/User');
const roomManager = require('./game/RoomManager');
const { PHASES } = require('./game/SheepsheadGame');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'sheepshead-secret-change-in-production';

// Session configuration
const sessionMiddleware = session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: path.join(__dirname, '../data')
  }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
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

  // Auto-login after registration
  req.session.userId = result.userId;
  req.session.displayName = displayName;

  res.json({ success: true, displayName });
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

  res.json({ success: true, displayName: result.user.displayName });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Get current user
app.get('/api/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const user = User.getById(req.session.userId);
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

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
  const leaderboard = User.getLeaderboard(20);
  res.json(leaderboard);
});

// Get rooms
app.get('/api/rooms', (req, res) => {
  const rooms = roomManager.getPublicRooms();
  res.json(rooms);
});

// ============== Socket.IO ==============

// Map socket ID to user info
const socketUsers = new Map();

io.on('connection', (socket) => {
  const session = socket.request.session;

  if (!session || !session.userId) {
    socket.emit('error', { message: 'Not authenticated' });
    socket.disconnect();
    return;
  }

  const userId = session.userId;
  const displayName = session.displayName;

  socketUsers.set(socket.id, { oderId: `user_${userId}`, displayName, dbId: userId });

  console.log(`User connected: ${displayName} (${userId})`);

  // Join a room
  socket.on('joinRoom', (roomId) => {
    const playerId = `user_${userId}`;

    // Leave previous room socket
    const currentRooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    currentRooms.forEach(r => socket.leave(r));

    const result = roomManager.joinRoom(roomId, playerId, displayName);

    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    socket.join(roomId);

    const game = roomManager.getRoom(roomId);
    socket.emit('gameState', game.getStateForPlayer(playerId));
    socket.to(roomId).emit('playerJoined', { playerId, displayName, seatIndex: result.seatIndex });

    // Broadcast updated player list
    io.to(roomId).emit('roomUpdate', {
      players: game.players.map(p => ({
        id: p.id,
        name: p.name,
        seatIndex: p.seatIndex
      })),
      phase: game.phase
    });
  });

  // Leave room
  socket.on('leaveRoom', () => {
    const playerId = `user_${userId}`;
    const game = roomManager.getPlayerRoom(playerId);

    if (game) {
      const roomId = game.roomId;
      roomManager.leaveRoom(playerId);
      socket.leave(roomId);
      socket.to(roomId).emit('playerLeft', { playerId, displayName });

      // Broadcast updated state if game still exists
      const updatedGame = roomManager.getRoom(roomId);
      if (updatedGame) {
        io.to(roomId).emit('roomUpdate', {
          players: updatedGame.players.map(p => ({
            id: p.id,
            name: p.name,
            seatIndex: p.seatIndex
          })),
          phase: updatedGame.phase
        });
      }
    }
  });

  // Start game
  socket.on('startGame', () => {
    const playerId = `user_${userId}`;
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

    // Send each player their own state
    for (const player of game.players) {
      const playerSocket = findSocketByPlayerId(player.id);
      if (playerSocket) {
        playerSocket.emit('gameState', game.getStateForPlayer(player.id));
      }
    }
  });

  // Pick or pass
  socket.on('pick', (wantsToPick) => {
    const playerId = `user_${userId}`;
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

    // Broadcast updated state
    broadcastGameState(game);
  });

  // Bury cards
  socket.on('bury', (cardIds) => {
    const playerId = `user_${userId}`;
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

  // Call ace
  socket.on('callAce', ({ suit, goAlone }) => {
    const playerId = `user_${userId}`;
    const game = roomManager.getPlayerRoom(playerId);

    if (!game) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }

    const result = game.callAce(playerId, suit, goAlone);

    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    broadcastGameState(game);
  });

  // Play a card
  socket.on('playCard', (cardId) => {
    const playerId = `user_${userId}`;
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

    // Broadcast the card played
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
        // Update stats for all players
        updatePlayerStats(game, result.results);

        io.to(game.roomId).emit('handComplete', result.results);
      }
    }

    // Send updated state to each player
    broadcastGameState(game);
  });

  // New hand (after scoring)
  socket.on('newHand', () => {
    const playerId = `user_${userId}`;
    const game = roomManager.getPlayerRoom(playerId);

    if (!game) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }

    if (game.phase !== PHASES.SCORING) {
      socket.emit('error', { message: 'Game not in scoring phase' });
      return;
    }

    const result = game.startHand();

    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    broadcastGameState(game);
  });

  // Disconnect
  socket.on('disconnect', () => {
    const playerId = `user_${userId}`;
    console.log(`User disconnected: ${displayName}`);

    // Note: We don't automatically remove from game on disconnect
    // This allows reconnection. Room cleanup happens when players explicitly leave.
    socketUsers.delete(socket.id);
  });

  // Helper: Find socket by player ID
  function findSocketByPlayerId(playerId) {
    for (const [socketId, userInfo] of socketUsers) {
      if (`user_${userInfo.dbId}` === playerId) {
        return io.sockets.sockets.get(socketId);
      }
    }
    return null;
  }

  // Helper: Broadcast game state to all players
  function broadcastGameState(game) {
    for (const player of game.players) {
      const playerSocket = findSocketByPlayerId(player.id);
      if (playerSocket) {
        playerSocket.emit('gameState', game.getStateForPlayer(player.id));
      }
    }
  }

  // Helper: Update player stats after hand
  function updatePlayerStats(game, results) {
    for (const player of game.players) {
      // Extract numeric user ID from player ID
      const dbUserId = parseInt(player.id.replace('user_', ''));

      const scoreChange = results.scores[player.id] || 0;

      const handResult = {
        wasPicker: player.id === results.picker,
        wonAsPicker: player.id === results.picker && results.pickersWin,
        wonAsPartner: player.id === results.partner && results.pickersWin,
        wonAsDefender: results.defendingTeam?.includes(player.id) && !results.pickersWin,
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

// Start server
server.listen(PORT, () => {
  console.log(`Sheepshead server running on port ${PORT}`);
});
