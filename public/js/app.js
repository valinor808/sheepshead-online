/**
 * Main Application Entry Point
 *
 * Handles authentication (login/register), lobby display, and socket connection setup.
 * Manages transitions between auth screen, lobby, and game screens.
 *
 * Global Dependencies:
 * - Socket.IO client (loaded via CDN)
 * - GameUI class from game.js
 */

let socket = null;
let gameUI = null;

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');

// Generate unique tab ID for session isolation
// This allows multiple users to be logged in from different tabs
function getTabId() {
  let tabId = sessionStorage.getItem('tabId');
  if (!tabId) {
    tabId = 'tab_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem('tabId', tabId);
  }
  return tabId;
}

const TAB_ID = getTabId();

// Check if already logged in
async function checkAuth() {
  try {
    const res = await fetch('/api/me', {
      credentials: 'include',
      headers: { 'X-Tab-ID': TAB_ID }
    });
    if (res.ok) {
      const data = await res.json();
      showLobby(data.user.displayName, data.stats);
    }
    // 401 is expected when not logged in - no action needed
  } catch (err) {
    // Network error - user is likely offline
    console.log('Auth check failed:', err.message);
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

// Handle login form submission
document.getElementById('login-form-element').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tab-ID': TAB_ID
      },
      body: JSON.stringify({ username, password }),
      credentials: 'include'
    });

    const data = await res.json();

    if (res.ok) {
      // Remember username for next login
      localStorage.setItem('lastUsername', username);
      showLobby(data.displayName);
    } else {
      showAuthError(data.error || 'Login failed');
    }
  } catch (err) {
    showAuthError('Connection error');
  }
});

// Keep button click handler for backwards compatibility
document.getElementById('login-btn').addEventListener('click', async (e) => {
  e.preventDefault();
  document.getElementById('login-form-element').requestSubmit();
});

// Handle registration form submission
document.getElementById('register-form-element').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('register-username').value.trim();
  const displayName = document.getElementById('register-displayname').value.trim();
  const password = document.getElementById('register-password').value;
  const passwordConfirm = document.getElementById('register-password-confirm').value;

  // Validate passwords match (no trim - passwords can intentionally have spaces)
  if (password !== passwordConfirm) {
    showAuthError('Passwords do not match');
    return;
  }

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tab-ID': TAB_ID
      },
      body: JSON.stringify({ username, password, displayName }),
      credentials: 'include'
    });

    const data = await res.json();

    if (res.ok) {
      showLobby(data.displayName);
    } else {
      showAuthError(data.error || 'Registration failed');
    }
  } catch (err) {
    showAuthError('Connection error');
  }
});

// Keep button click handler for backwards compatibility
document.getElementById('register-btn').addEventListener('click', async (e) => {
  e.preventDefault();
  document.getElementById('register-form-element').requestSubmit();
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/logout', {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-Tab-ID': TAB_ID }
  });
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  lobbyScreen.classList.add('hidden');
  gameScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');

  // Clear all form fields for security
  document.getElementById('login-password').value = '';
  document.getElementById('register-username').value = '';
  document.getElementById('register-displayname').value = '';
  document.getElementById('register-password').value = '';
  document.getElementById('register-password-confirm').value = '';

  // Always show login form (not registration)
  document.getElementById('register-form').classList.add('hidden');
  document.getElementById('login-form').classList.remove('hidden');
});

function showAuthError(message) {
  const el = document.getElementById('auth-error');
  el.textContent = message || 'An error occurred';
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

  // Connect socket with credentials and tab ID for session isolation
  socket = io({
    withCredentials: true,
    auth: {
      tabId: TAB_ID
    }
  });

  // Wait for socket to connect before creating GameUI
  await new Promise((resolve) => {
    socket.on('connect', resolve);
    // Timeout after 5 seconds
    setTimeout(resolve, 5000);
  });

  gameUI = new GameUI(socket);

  // Cache lifetime stats if provided
  if (stats) {
    cachedLifetimeStats = stats;
  }

  // Setup toggle button listeners
  setupStatsToggle();

  // Load stats and rooms - default to daily view
  loadStats('daily');
  loadRooms();
  loadLeaderboard('daily');
}

function setupStatsToggle() {
  // Stats toggle buttons
  const statsDailyBtn = document.getElementById('stats-daily-btn');
  const statsLifetimeBtn = document.getElementById('stats-lifetime-btn');

  if (statsDailyBtn && statsLifetimeBtn) {
    statsDailyBtn.onclick = () => {
      statsViewMode = 'daily';
      statsDailyBtn.classList.add('active');
      statsLifetimeBtn.classList.remove('active');
      if (cachedDailyStats) {
        renderStats(cachedDailyStats, true);
      } else {
        loadStats('daily');
      }
    };

    statsLifetimeBtn.onclick = () => {
      statsViewMode = 'lifetime';
      statsLifetimeBtn.classList.add('active');
      statsDailyBtn.classList.remove('active');
      if (cachedLifetimeStats) {
        renderStats(cachedLifetimeStats, false);
      } else {
        loadStats('lifetime');
      }
    };
  }

  // Leaderboard toggle buttons
  const lbDailyBtn = document.getElementById('lb-daily-btn');
  const lbLifetimeBtn = document.getElementById('lb-lifetime-btn');

  if (lbDailyBtn && lbLifetimeBtn) {
    lbDailyBtn.onclick = () => {
      leaderboardViewMode = 'daily';
      lbDailyBtn.classList.add('active');
      lbLifetimeBtn.classList.remove('active');
      loadLeaderboard('daily');
    };

    lbLifetimeBtn.onclick = () => {
      leaderboardViewMode = 'lifetime';
      lbLifetimeBtn.classList.add('active');
      lbDailyBtn.classList.remove('active');
      loadLeaderboard('lifetime');
    };
  }
}

// Track current stats view mode
let statsViewMode = 'daily';
let leaderboardViewMode = 'daily';
let cachedLifetimeStats = null;
let cachedDailyStats = null;

function renderStats(stats, isDaily = true) {
  if (!stats) return;

  const container = document.getElementById('player-stats');
  const scoreLabel = isDaily ? 'Today\'s Score' : 'Total Score';
  const score = isDaily ? (stats.score !== undefined ? stats.score : 0) : (stats.totalScore !== undefined ? stats.totalScore : 0);

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
      <div class="stat-value">${score}</div>
      <div class="stat-label">${scoreLabel}</div>
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

async function loadStats(mode = 'daily') {
  try {
    if (mode === 'daily') {
      const res = await fetch('/api/stats/daily', {
        credentials: 'include',
        headers: { 'X-Tab-ID': TAB_ID }
      });
      if (res.ok) {
        cachedDailyStats = await res.json();
        renderStats(cachedDailyStats, true);
      }
    } else {
      const res = await fetch('/api/me', {
        credentials: 'include',
        headers: { 'X-Tab-ID': TAB_ID }
      });
      if (res.ok) {
        const data = await res.json();
        cachedLifetimeStats = data.stats;
        renderStats(cachedLifetimeStats, false);
      }
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

async function loadRooms() {
  try {
    const res = await fetch('/api/rooms', {
      credentials: 'include',
      headers: { 'X-Tab-ID': TAB_ID }
    });
    const rooms = await res.json();

    const container = document.getElementById('room-list');

    if (rooms.length === 0) {
      container.innerHTML = '<p class="no-rooms">No active tables. Create one!</p>';
      return;
    }

    container.innerHTML = rooms.map(room => {
      // Escape room ID for use in HTML attribute
      const escapedRoomId = room.roomId.replace(/'/g, "\\'").replace(/"/g, '&quot;');
      const displayRoomId = room.roomId.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const isFull = room.playerCount >= 5;

      return `
        <div class="room-item">
          <div class="room-info">
            <span class="room-name">${displayRoomId}</span>
            <span class="room-players">${room.players.join(', ')} (${room.playerCount}/5)</span>
          </div>
          <div class="room-buttons">
            <button class="btn small" onclick="joinRoom('${escapedRoomId}')" ${isFull ? 'disabled' : ''}>Join Table</button>
            ${isFull ? `<button class="btn small kibitz-btn" onclick="joinRoomAsKibbitzer('${escapedRoomId}')">Kibitz</button>` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load rooms:', err);
  }
}

async function loadLeaderboard(mode = 'daily') {
  try {
    const url = mode === 'daily' ? '/api/leaderboard?type=daily' : '/api/leaderboard';
    const res = await fetch(url, {
      credentials: 'include',
      headers: { 'X-Tab-ID': TAB_ID }
    });
    const leaders = await res.json();

    const container = document.getElementById('leaderboard');
    const scoreLabel = mode === 'daily' ? 'Today' : 'Total';

    if (leaders.length === 0) {
      const message = mode === 'daily' ? 'No games played today!' : 'No games played yet!';
      container.innerHTML = `<p class="no-rooms">${message}</p>`;
      return;
    }

    container.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>${scoreLabel}</th>
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

  socket.emit('joinRoom', { roomId, asKibbitzer: false });

  // Switch to game screen
  lobbyScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
}

function joinRoomAsKibbitzer(roomId) {
  if (!socket) return;

  socket.emit('joinRoom', { roomId, asKibbitzer: true });

  // Switch to game screen
  lobbyScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
}

// Refresh rooms periodically (every 3 seconds)
setInterval(loadRooms, 3000);

// Load remembered username
const lastUsername = localStorage.getItem('lastUsername');
if (lastUsername) {
  document.getElementById('login-username').value = lastUsername;
}

// Initialize
checkAuth();
