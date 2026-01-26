// Main server entry point

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
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;

// Trust proxy for Railway (needed for secure cookies behind reverse proxy)
if (IS_PRODUCTION) {
  app.set('trust proxy', 1);
}

// Session configuration with memory store
const sessionMiddleware = session({
  store: new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: IS_PRODUCTION, // Use secure cookies in production (HTTPS)
    httpOnly: true,
    sameSite: 'lax', // 'lax' works for same-site requests
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

  req.session.userId = result.userId;
  req.session.displayName = displayName;

  // Explicitly save session before responding
  req.session.save((err) => {
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

const socketUsers = new Map();

io.on('connection', (socket) => {
  const sess = socket.request.session;

  if (!sess || !sess.userId) {
    socket.emit('error', { message: 'Not authenticated' });
    socket.disconnect();
    return;
  }

  const oderId = sess.userId;
  const displayName = sess.displayName;

  socketUsers.set(socket.id, { oderId: 'user_' + oderId, displayName, dbId: oderId });

  console.log('User connected: ' + displayName);

  socket.on('joinRoom', (roomId) => {
    const playerId = 'user_' + oderId;

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

    io.to(roomId).emit('roomUpdate', {
      players: game.players.map(p => ({ id: p.id, name: p.name, seatIndex: p.seatIndex })),
      phase: game.phase
    });
  });

  socket.on('leaveRoom', () => {
    const playerId = 'user_' + oderId;
    const game = roomManager.getPlayerRoom(playerId);

    if (game) {
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

    const result = game.callAce(playerId, data.suit, data.goAlone);

    if (!result.success) {
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

    const result = game.startHand();

    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    broadcastGameState(game);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected: ' + displayName);
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

  function broadcastGameState(game) {
    for (const player of game.players) {
      const playerSocket = findSocketByPlayerId(player.id);
      if (playerSocket) {
        playerSocket.emit('gameState', game.getStateForPlayer(player.id));
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
