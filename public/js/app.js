// Main application entry point

let socket = null;
let gameUI = null;

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');

// Check if already logged in
async function checkAuth() {
  try {
    const res = await fetch('/api/me');
    if (res.ok) {
      const data = await res.json();
      showLobby(data.user.displayName, data.stats);
    }
  } catch (err) {
    console.log('Not logged in');
  }
}

// Auth handlers
document.getElementById('show-register').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('register-form').classList.remove('hidden');
});

document.getElementById('show-login').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('register-form').classList.add('hidden');
  document.getElementById('login-form').classList.remove('hidden');
});

document.getElementById('login-btn').addEventListener('click', async () => {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok) {
      showLobby(data.displayName);
    } else {
      showAuthError(data.error);
    }
  } catch (err) {
    showAuthError('Connection error');
  }
});

document.getElementById('register-btn').addEventListener('click', async () => {
  const username = document.getElementById('register-username').value;
  const displayName = document.getElementById('register-displayname').value;
  const password = document.getElementById('register-password').value;

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, displayName })
    });

    const data = await res.json();

    if (res.ok) {
      showLobby(data.displayName);
    } else {
      showAuthError(data.error);
    }
  } catch (err) {
    showAuthError('Connection error');
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  lobbyScreen.classList.add('hidden');
  gameScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
});

function showAuthError(message) {
  const el = document.getElementById('auth-error');
  el.textContent = message;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

// Lobby
async function showLobby(displayName, stats = null) {
  authScreen.classList.add('hidden');
  gameScreen.classList.add('hidden');
  lobbyScreen.classList.remove('hidden');

  document.getElementById('user-display-name').textContent = displayName;

  // Disconnect old socket if exists
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  // Longer delay to ensure session is fully saved before connecting WebSocket
  await new Promise(resolve => setTimeout(resolve, 500));

  // Connect socket
  socket = io();

  // Wait for socket to connect before creating GameUI
  await new Promise((resolve) => {
    socket.on('connect', resolve);
    // Timeout after 5 seconds
    setTimeout(resolve, 5000);
  });

  gameUI = new GameUI(socket);

  // Load stats and rooms
  if (!stats) {
    const res = await fetch('/api/me');
    if (res.ok) {
      const data = await res.json();
      stats = data.stats;
    }
  }

  renderStats(stats);
  loadRooms();
  loadLeaderboard();
}

function renderStats(stats) {
  if (!stats) return;

  const container = document.getElementById('player-stats');
  container.innerHTML = `
    <div class="stat-item">
      <div class="stat-value">${stats.handsPlayed}</div>
      <div class="stat-label">Hands Played</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${stats.winRate}%</div>
      <div class="stat-label">Win Rate</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${stats.totalScore}</div>
      <div class="stat-label">Total Score</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${stats.handsPicked}</div>
      <div class="stat-label">Times Picked</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${stats.pickerWinRate}%</div>
      <div class="stat-label">Picker Win Rate</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${stats.schwanzersWon}</div>
      <div class="stat-label">Schwanzers Won</div>
    </div>
  `;
}

async function loadRooms() {
  try {
    const res = await fetch('/api/rooms');
    const rooms = await res.json();

    const container = document.getElementById('room-list');

    if (rooms.length === 0) {
      container.innerHTML = '<p class="no-rooms">No active rooms. Create one!</p>';
      return;
    }

    container.innerHTML = rooms.map(room => `
      <div class="room-item">
        <div class="room-info">
          <span class="room-name">${room.roomId}</span>
          <span class="room-players">${room.players.join(', ')} (${room.playerCount}/5)</span>
        </div>
        <button class="btn small" onclick="joinRoom('${room.roomId}')">Join</button>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load rooms:', err);
  }
}

async function loadLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard');
    const leaders = await res.json();

    const container = document.getElementById('leaderboard');

    if (leaders.length === 0) {
      container.innerHTML = '<p class="no-rooms">No games played yet!</p>';
      return;
    }

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Score</th>
            <th>Hands</th>
          </tr>
        </thead>
        <tbody>
          ${leaders.map((l, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${l.displayName}</td>
              <td>${l.totalScore}</td>
              <td>${l.handsPlayed}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error('Failed to load leaderboard:', err);
  }
}

// Room joining
document.getElementById('join-room-btn').addEventListener('click', () => {
  const roomCode = document.getElementById('room-code').value.trim();
  if (roomCode) {
    joinRoom(roomCode);
  }
});

document.getElementById('room-code').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const roomCode = document.getElementById('room-code').value.trim();
    if (roomCode) {
      joinRoom(roomCode);
    }
  }
});

function joinRoom(roomId) {
  if (!socket) return;

  socket.emit('joinRoom', roomId);

  // Switch to game screen
  lobbyScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
}

// Refresh rooms periodically
setInterval(loadRooms, 10000);

// Initialize
checkAuth();
