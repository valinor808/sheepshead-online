/**
 * Game UI Controller
 *
 * Manages all in-game rendering and user interactions for Sheepshead.
 * Handles socket events for real-time game state updates and player actions.
 *
 * Player Positioning:
 * - Players are arranged in a pentagon with "me" at the bottom
 * - Positions 0-4 wrap clockwise: bottom, lower-left, upper-left, upper-right, lower-right
 *
 * Dependencies:
 * - cards.js (createCardElement, SUIT_SYMBOLS, etc.)
 * - Socket.IO connection passed to constructor
 */

class GameUI {
  constructor(socket) {
    this.socket = socket;
    this.state = null;
    this.selectedCards = [];
    this.pendingUnderCall = null; // {suit, rank} when selecting hole card

    this.setupEventListeners();
    this.setupBeforeUnloadWarning();
  }

  setupBeforeUnloadWarning() {
    window.addEventListener('beforeunload', (e) => {
      // Only warn if in an active game (not waiting, not scoring)
      if (this.state && this.state.phase &&
          this.state.phase !== 'waiting' && this.state.phase !== 'scoring') {
        e.preventDefault();
        // Modern browsers ignore custom messages, but this triggers the dialog
        e.returnValue = 'Game in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    });
  }

  setupEventListeners() {
    // Socket events
    this.socket.on('gameState', (state) => this.handleGameState(state));
    this.socket.on('cardPlayed', (data) => this.handleCardPlayed(data));
    this.socket.on('trickComplete', (data) => this.handleTrickComplete(data));
    this.socket.on('handComplete', (results) => this.handleHandComplete(results));
    this.socket.on('playerJoined', (data) => this.handlePlayerJoined(data));
    this.socket.on('playerLeft', (data) => this.handlePlayerLeft(data));
    this.socket.on('roomUpdate', (data) => this.handleRoomUpdate(data));
    this.socket.on('error', (data) => this.handleError(data));
    this.socket.on('gameReset', (data) => this.handleGameReset(data));
    this.socket.on('playerLeavingTable', (data) => this.handlePlayerLeavingTable(data));
    this.socket.on('sessionEnded', (data) => this.handleSessionEnded(data));
    this.socket.on('votingUpdate', (data) => this.handleVotingUpdate(data));
    this.socket.on('returnToLobby', (data) => this.handleReturnToLobby(data));

    // UI events
    document.getElementById('start-game-btn').addEventListener('click', () => {
      this.socket.emit('startGame');
    });

    document.getElementById('new-hand-btn').addEventListener('click', () => {
      this.socket.emit('newHand');
      // Don't hide scoring overlay - wait for server to confirm all players ready
      // The overlay will be hidden when new game state is received
    });

    document.getElementById('leave-table-btn').addEventListener('click', () => {
      this.socket.emit('leaveTable');
    });

    document.getElementById('cancel-room-btn').addEventListener('click', () => {
      this.socket.emit('leaveRoom');
      this.showLobby();
    });

    document.getElementById('show-last-trick-btn').addEventListener('click', () => {
      this.showLastTrick();
    });

    document.getElementById('close-last-trick-btn').addEventListener('click', () => {
      document.getElementById('last-trick-overlay').classList.add('hidden');
    });
  }

  handleGameState(state) {
    this.state = state;
    this.selectedCards = [];
    // Reset pending under call if we moved past calling phase
    if (state.phase !== 'calling') {
      this.pendingUnderCall = null;
    }
    // Clear voting display when not in scoring phase
    if (state.phase !== 'scoring') {
      this.updateVotingDisplay([], []);
    }
    this.render();
  }

  handleCardPlayed(data) {
    // Animation could go here
  }

  handleTrickComplete(data) {
    // Could show animation of trick being collected
  }

  handleHandComplete(results) {
    this.showScoringOverlay(results);
  }

  handlePlayerJoined(data) {
    // Add player to state if we have state
    if (this.state && this.state.players) {
      // Check if player already exists
      const exists = this.state.players.find(p => p.id === data.playerId);
      if (!exists) {
        this.state.players.push({
          id: data.playerId,
          name: data.displayName,
          seatIndex: data.seatIndex,
          cardCount: 0,
          isDealer: false,
          isPicker: false,
          isPartner: false,
          tricksWon: 0
        });
        this.render();
      }
    }
  }

  handlePlayerLeft(data) {
    // Remove player from state if we have state
    if (this.state && this.state.players) {
      this.state.players = this.state.players.filter(p => p.id !== data.playerId);
      this.render();
    }
  }

  handleRoomUpdate(data) {
    if (this.state) {
      // Update player list from room update
      this.state.players = data.players.map(p => ({
        ...p,
        cardCount: 0,
        isDealer: false,
        isPicker: false,
        isPartner: false,
        tricksWon: 0
      }));
      this.state.phase = data.phase;
      this.render();
    }
  }

  handleError(data) {
    // Don't show alert for authentication errors - just log them
    if (data.message === 'Not authenticated') {
      console.log('Socket not authenticated, will retry on next action');
      return;
    }
    alert(data.message);
  }

  handleGameReset(data) {
    alert(data.message);
    // Hide scoring overlay if visible
    document.getElementById('scoring-overlay').classList.add('hidden');
  }

  handlePlayerLeavingTable(data) {
    // This is now handled by votingUpdate
  }

  handleVotingUpdate(data) {
    // Update the voting display in the scoring overlay
    // Show "Left the Table" notifications in red
    this.updateVotingDisplay(data.playersNextHand, data.playersLeaving);
  }

  handleReturnToLobby(data) {
    // Only hide scoring overlay and return to lobby for this player
    document.getElementById('scoring-overlay').classList.add('hidden');
    this.showLobby();
  }

  handleSessionEnded(data) {
    // Player voted "Next Hand" but game can't continue (not enough players)
    // Hide scoring overlay and show waiting screen
    document.getElementById('scoring-overlay').classList.add('hidden');
    // State will be updated by gameState event to show waiting screen
  }

  updateVotingDisplay(playersNextHand = [], playersLeaving = []) {
    const leavingEl = document.getElementById('players-leaving');
    const waitingEl = document.getElementById('players-waiting-next');

    // Show players leaving with individual notifications
    if (leavingEl) {
      if (playersLeaving.length > 0) {
        // Show each player who left with "Left the Table: <name>" format
        leavingEl.innerHTML = playersLeaving.map(name =>
          `<div class="player-left-notification">Left the Table: ${name}</div>`
        ).join('');
        leavingEl.classList.remove('hidden');
      } else {
        leavingEl.classList.add('hidden');
      }
    }

    // Show players waiting for next hand
    if (waitingEl) {
      if (playersNextHand.length > 0) {
        waitingEl.textContent = `Waiting for next hand: ${playersNextHand.join(', ')}`;
        waitingEl.classList.remove('hidden');
      } else {
        waitingEl.classList.add('hidden');
      }
    }
  }

  render() {
    if (!this.state) return;

    // Update header
    document.getElementById('room-name').textContent = `Table: ${this.state.roomId}`;
    document.getElementById('game-phase').textContent = this.getPhaseDisplay();

    // Render based on phase
    const waitingOverlay = document.getElementById('waiting-overlay');
    const scoringOverlay = document.getElementById('scoring-overlay');

    if (this.state.phase === 'waiting') {
      waitingOverlay.classList.remove('hidden');
      scoringOverlay.classList.add('hidden');
      this.renderWaitingState();
    } else if (this.state.phase === 'scoring') {
      waitingOverlay.classList.add('hidden');
      // Scoring overlay is shown by handleHandComplete
      // Update voting display from state
      this.updateVotingDisplay(this.state.playersNextHand || [], this.state.playersLeaving || []);
      // Update buttons based on voting state
      this.updateScoringButtons();
    } else {
      waitingOverlay.classList.add('hidden');
      scoringOverlay.classList.add('hidden');
      this.renderGameTable();
    }
  }

  updateScoringButtons() {
    const newHandBtn = document.getElementById('new-hand-btn');
    const leaveTableBtn = document.getElementById('leave-table-btn');

    if (!this.state) return;

    // Kibbitzers only see Leave Table button
    if (this.state.isKibbitzer) {
      newHandBtn.style.display = 'none';
      leaveTableBtn.style.display = 'block';
      leaveTableBtn.disabled = false;
      return;
    }

    // Show both buttons for players
    newHandBtn.style.display = 'block';
    leaveTableBtn.style.display = 'block';

    // Disable buttons if player has already voted
    if (this.state.hasVoted) {
      newHandBtn.disabled = true;
      leaveTableBtn.disabled = true;
      newHandBtn.textContent = 'Waiting...';
    } else {
      newHandBtn.disabled = false;
      leaveTableBtn.disabled = false;
      newHandBtn.textContent = 'Next Hand';
    }
  }

  getPhaseDisplay() {
    const phases = {
      waiting: 'Waiting for players',
      dealing: 'Dealing...',
      picking: 'Pick or Pass',
      burying: 'Burying cards',
      calling: 'Calling partner',
      playing: 'Playing',
      schwanzer: 'Schwanzer (Leasters)',
      scoring: 'Scoring'
    };
    return phases[this.state.phase] || this.state.phase;
  }

  renderWaitingState() {
    const container = document.getElementById('waiting-players');
    container.innerHTML = '';

    // Update player count display
    const countEl = document.getElementById('waiting-count');
    const playerCount = this.state.players ? this.state.players.length : 0;
    countEl.textContent = playerCount + ' / 5 players';

    const players = this.state.players || [];
    for (let i = 0; i < 5; i++) {
      const player = players.find(p => p.seatIndex === i);
      const div = document.createElement('div');
      div.className = 'waiting-player' + (player ? '' : ' empty');
      div.textContent = player ? player.name : 'Waiting...';
      container.appendChild(div);
    }

    // Show start button if we have 5 players (not for kibbitzers)
    const startBtn = document.getElementById('start-game-btn');
    if (players.length === 5 && !this.state.isKibbitzer) {
      startBtn.classList.remove('hidden');
    } else {
      startBtn.classList.add('hidden');
    }

    // Update cancel button text for kibbitzers
    const cancelBtn = document.getElementById('cancel-room-btn');
    if (this.state.isKibbitzer) {
      cancelBtn.textContent = 'Join Table';
      // For kibbitzers, this button should try to join as player instead of leaving
      cancelBtn.onclick = () => {
        // If there's space, attempt to join as player
        if (players.length < 5) {
          this.socket.emit('leaveRoom'); // Leave as kibbitzer first
          setTimeout(() => {
            this.socket.emit('joinRoom', { roomId: this.state.roomId, asKibbitzer: false });
          }, 100);
        } else {
          // Still full, just leave
          this.socket.emit('leaveRoom');
          this.showLobby();
        }
      };
    } else {
      cancelBtn.textContent = 'Leave Table';
      cancelBtn.onclick = () => {
        this.socket.emit('leaveRoom');
        this.showLobby();
      };
    }
  }

  renderGameTable() {
    this.renderPlayers();
    this.renderTrick();
    this.renderHand();
    this.renderGameInfo();
    this.renderActionArea();
  }

  renderPlayers() {
    // Map seat indices to position elements
    // My seat is always at the bottom (position 0)
    // Other players wrap around clockwise in pentagon formation

    const myIndex = this.state.myIndex;
    const playerScores = this.state.playerScores || {};

    // Clear all positions
    for (let i = 0; i < 5; i++) {
      const el = document.getElementById(`player-pos-${i}`);
      if (el) el.innerHTML = '';
    }

    // Place players relative to me
    for (const player of this.state.players) {
      // Calculate relative position (0 = me, 1-4 = others clockwise)
      let relPos = (player.seatIndex - myIndex + 5) % 5;

      // Map relative position to visual position
      // 0 = bottom (me), 1 = lower-left, 2 = upper-left, 3 = upper-right, 4 = lower-right
      const posIndex = relPos;

      const el = document.getElementById(`player-pos-${posIndex}`);
      if (!el) continue;

      const isCurrentPlayer = this.state.players[this.state.currentPlayerIndex]?.id === player.id;
      const isMe = relPos === 0;

      let roleText = '';
      if (player.isPicker) roleText = 'Picker';
      else if (player.isPartner) roleText = 'Partner';

      // Get player scores
      const scores = playerScores[player.id] || { daily: 0, lifetime: 0 };
      const dailyScore = scores.daily;
      const lifetimeScore = scores.lifetime;

      el.innerHTML = `
        <div class="player-box ${isCurrentPlayer ? 'current-turn' : ''} ${player.isPicker ? 'is-picker' : ''} ${player.isPartner ? 'is-partner' : ''} ${isMe ? 'is-me' : ''}">
          <div class="player-name">
            ${player.name}${isMe ? ' (You)' : ''}
            ${player.isDealer ? '<span class="dealer-chip">D</span>' : ''}
          </div>
          ${roleText ? `<div class="player-role">${roleText}</div>` : ''}
          <div class="player-scores">
            <span class="score-daily" title="Today's score">${dailyScore >= 0 ? '+' : ''}${dailyScore}</span>
            <span class="score-sep">/</span>
            <span class="score-lifetime" title="Lifetime score">${lifetimeScore >= 0 ? '+' : ''}${lifetimeScore}</span>
          </div>
          <div class="player-tricks">${player.tricksWon} tricks</div>
        </div>
      `;
    }
  }

  renderTrick() {
    // Clear any existing played cards from player positions
    document.querySelectorAll('.played-card-area').forEach(el => el.remove());

    const myIndex = this.state.myIndex;

    for (const play of this.state.currentTrick) {
      const player = this.state.players.find(p => p.id === play.playerId);
      if (!player) continue;

      // Calculate relative position
      const relPos = (player.seatIndex - myIndex + 5) % 5;

      // Find the player position element
      const playerPosEl = document.getElementById(`player-pos-${relPos}`);
      if (!playerPosEl) continue;

      // Create card element for the played card
      const cardWrapper = document.createElement('div');
      cardWrapper.className = 'played-card-area';

      let cardEl;
      if (play.isUnderCard) {
        // Under card is shown face-down
        cardEl = createCardBack({ small: true });
        cardEl.classList.add('under-card-played');
        cardEl.title = 'Under card (face down)';
      } else {
        cardEl = createCardElement(play.card, { small: true });
      }
      cardWrapper.appendChild(cardEl);

      // Position the card near the player
      playerPosEl.appendChild(cardWrapper);
    }
  }

  renderHand() {
    const container = document.getElementById('player-hand');
    container.innerHTML = '';

    const playable = this.state.playableCards || [];
    const isMyTurn = this.state.players[this.state.currentPlayerIndex]?.seatIndex === this.state.myIndex;
    const inPlayPhase = this.state.phase === 'playing' || this.state.phase === 'schwanzer';
    const inCallingPhase = this.state.phase === 'calling';
    const selectingUnderCard = inCallingPhase && this.pendingUnderCall;

    // Get the under card ID if picker has one that hasn't been played
    const underCardId = this.state.underCardId;
    const underCardPlayed = this.state.underCardPlayed;

    for (const card of this.state.hand) {
      let isPlayable = false;
      let isClickable = false;
      const isUnderCard = underCardId && card.id === underCardId && !underCardPlayed;

      if (selectingUnderCard) {
        // All cards are clickable when selecting under card
        isClickable = true;
        isPlayable = true; // Show as playable for visual feedback
      } else if (inPlayPhase && isMyTurn) {
        isPlayable = playable.includes(card.id);
        isClickable = isPlayable;
      }

      const isSelected = this.selectedCards.includes(card.id);

      const cardEl = createCardElement(card, {
        playable: isPlayable,
        selected: isSelected
      });

      // Mark the under card visually
      if (isUnderCard) {
        cardEl.classList.add('under-card');
        const underLabel = document.createElement('div');
        underLabel.className = 'under-label';
        underLabel.textContent = 'UNDER';
        cardEl.appendChild(underLabel);
      }

      cardEl.addEventListener('click', () => this.handleCardClick(card, isClickable));
      container.appendChild(cardEl);
    }

    // Show message if must play under card this turn
    if (this.state.mustPlayUnderCard) {
      const underMsg = document.createElement('div');
      underMsg.className = 'under-card-message';
      underMsg.textContent = 'You must play your under card (called suit was led)';
      container.appendChild(underMsg);
    }
  }

  handleCardClick(card, isPlayable) {
    if (this.state.phase === 'burying') {
      // Toggle selection for burying
      const index = this.selectedCards.indexOf(card.id);
      if (index >= 0) {
        this.selectedCards.splice(index, 1);
      } else if (this.selectedCards.length < 2) {
        this.selectedCards.push(card.id);
      }
      this.renderHand();
      this.renderActionArea();
    } else if (this.state.phase === 'calling' && this.pendingUnderCall) {
      // Selecting under card for under call
      this.socket.emit('callAce', {
        suit: this.pendingUnderCall.suit,
        goAlone: false,
        underCardId: card.id
      });
      this.pendingUnderCall = null;
      this.selectedCards = [];
    } else if (isPlayable) {
      // Play the card
      this.socket.emit('playCard', card.id);
    }
  }

  renderGameInfo() {
    const pickerInfo = document.getElementById('picker-info');
    const calledInfo = document.getElementById('called-suit-info');
    const trickCount = document.getElementById('trick-count');
    const lastTrickBtn = document.getElementById('show-last-trick-btn');

    if (this.state.picker) {
      const picker = this.state.players.find(p => p.id === this.state.picker);
      pickerInfo.textContent = `Picker: ${picker?.name || 'Unknown'}`;
    } else if (this.state.isSchwanzer) {
      pickerInfo.textContent = 'Schwanzer!';
    } else {
      pickerInfo.textContent = '';
    }

    if (this.state.calledSuit) {
      const underLabel = this.state.isUnderCall ? ' (Under)' : '';
      calledInfo.innerHTML = `Called: ${getSuitDisplay(this.state.calledSuit)}${underLabel}`;
      if (this.state.partner) {
        const partner = this.state.players.find(p => p.id === this.state.partner);
        calledInfo.innerHTML += ` - ${partner?.name}`;
      }
    } else {
      calledInfo.textContent = '';
    }

    trickCount.textContent = `Tricks: ${this.state.tricks.length}/6`;

    // Show/hide last trick button
    if (this.state.lastTrick && this.state.lastTrick.length > 0) {
      lastTrickBtn.classList.remove('hidden');
    } else {
      lastTrickBtn.classList.add('hidden');
    }
  }

  renderActionArea() {
    const container = document.getElementById('action-area');
    const blindArea = document.getElementById('blind-area');

    container.classList.add('hidden');
    blindArea.classList.add('hidden');

    const myPlayer = this.state.players.find(p => p.seatIndex === this.state.myIndex);
    if (!myPlayer) return;

    const isMyTurn = this.state.players[this.state.currentPlayerIndex]?.id === myPlayer.id;

    if (this.state.phase === 'picking' && isMyTurn) {
      container.classList.remove('hidden');
      container.innerHTML = `
        <div class="action-message">Pick up the blind?</div>
        <div class="action-buttons">
          <button class="btn primary" id="pick-btn">Pick</button>
          <button class="btn danger" id="pass-btn">Pass</button>
        </div>
      `;

      document.getElementById('pick-btn').addEventListener('click', () => {
        this.socket.emit('pick', true);
      });
      document.getElementById('pass-btn').addEventListener('click', () => {
        this.socket.emit('pick', false);
      });
    }

    if (this.state.phase === 'burying' && myPlayer.id === this.state.picker) {
      container.classList.remove('hidden');
      blindArea.classList.remove('hidden');

      // Show blind cards in hand (they're already added)
      container.innerHTML = `
        <div class="action-message">Select 2 cards to bury (${this.selectedCards.length}/2)</div>
        <div class="action-buttons">
          <button class="btn primary" id="bury-btn" ${this.selectedCards.length !== 2 ? 'disabled' : ''}>Bury Cards</button>
        </div>
      `;

      if (this.selectedCards.length === 2) {
        document.getElementById('bury-btn').addEventListener('click', () => {
          this.socket.emit('bury', this.selectedCards);
          this.selectedCards = [];
        });
      }
    }

    if (this.state.phase === 'calling' && this.state.callableOptions && myPlayer.id === this.state.picker) {
      container.classList.remove('hidden');

      // Check if we're in under card selection mode
      if (this.pendingUnderCall) {
        container.innerHTML = `
          <div class="action-message">Select a card to be your "under" card</div>
          <div class="action-hint">This card will be played face-down when ${SUIT_SYMBOLS[this.pendingUnderCall.suit]} is led and cannot win the trick</div>
        `;
        return;
      }

      let buttonsHtml = '';
      for (const opt of this.state.callableOptions.options) {
        const symbol = SUIT_SYMBOLS[opt.suit];
        const rankLabel = opt.rank || 'A';
        const warning = opt.type === 'under' ? ' (Under)' : '';
        buttonsHtml += `
          <button class="btn suit-btn ${opt.suit}" data-suit="${opt.suit}" data-rank="${rankLabel}" data-type="${opt.type}">
            ${symbol} ${rankLabel === '10' ? '10' : 'Ace'}${warning}
          </button>
        `;
      }

      // Always show Go Alone button (unless forced to go alone with no other options)
      if (!this.state.callableOptions.goAlone || this.state.callableOptions.options.length > 0) {
        buttonsHtml += `<button class="btn" id="go-alone-btn">Go Alone</button>`;
      }

      const mustSelectUnderCard = this.state.callableOptions.mustSelectUnderCard;
      const messageText = mustSelectUnderCard ?
        'Call a card (Under - you must select an under card after)' :
        'Call an Ace';

      container.innerHTML = `
        <div class="action-message">${messageText}</div>
        <div class="action-buttons">${buttonsHtml}</div>
      `;

      container.querySelectorAll('.suit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const isUnder = btn.dataset.type === 'under' || mustSelectUnderCard;
          if (isUnder) {
            // Need to select under card first
            this.pendingUnderCall = { suit: btn.dataset.suit, rank: btn.dataset.rank };
            this.selectedCards = [];
            this.renderActionArea();
            this.renderHand(); // Re-render to enable card selection
          } else {
            this.socket.emit('callAce', { suit: btn.dataset.suit, goAlone: false });
          }
        });
      });

      const goAloneBtn = document.getElementById('go-alone-btn');
      if (goAloneBtn) {
        goAloneBtn.addEventListener('click', () => {
          this.socket.emit('callAce', { suit: null, goAlone: true });
        });
      }
    }
  }

  showScoringOverlay(results) {
    const overlay = document.getElementById('scoring-overlay');
    const title = document.getElementById('scoring-title');
    const details = document.getElementById('scoring-details');
    const scores = document.getElementById('scoring-scores');
    const leavingEl = document.getElementById('players-leaving');
    const waitingEl = document.getElementById('players-waiting-next');
    const buttonsContainer = document.querySelector('.scoring-buttons');

    overlay.classList.remove('hidden');

    // Reset voting displays
    if (leavingEl) {
      leavingEl.classList.add('hidden');
      leavingEl.textContent = '';
    }
    if (waitingEl) {
      waitingEl.classList.add('hidden');
      waitingEl.textContent = '';
    }

    // Show buttons (will be updated based on state)
    if (buttonsContainer) {
      buttonsContainer.classList.remove('hidden');
    }

    if (results.type === 'schwanzer') {
      const losers = results.losers.map(id => this.state.players.find(p => p.id === id)?.name).join(', ');
      const numLosers = results.losers.length;
      const maxPoints = results.maxSchwanzerPoints;

      title.textContent = 'Schwanzer!';

      // Determine if current player won or lost
      const myPlayer = this.state.players.find(p => p.seatIndex === this.state.myIndex);
      const iWon = myPlayer && !results.losers.includes(myPlayer.id);

      let detailsHtml = '<p>Everyone passed</p>';

      // Add personal win/loss message
      if (myPlayer) {
        if (numLosers === 5) {
          detailsHtml += '<p class="personal-result draw">Draw - Everyone Tied!</p>';
        } else {
          detailsHtml += iWon ?
            '<p class="personal-result win">You Win!</p>' :
            '<p class="personal-result lose">You Lost</p>';
        }
      }

      if (numLosers === 5) {
        detailsHtml += `<p><strong>All players tied with ${maxPoints} Schwanzer Points - Draw!</strong></p>`;
      } else if (numLosers === 1) {
        detailsHtml += `<p><strong>Loser:</strong> ${losers} (${maxPoints} Schwanzer Points)</p>`;
      } else {
        detailsHtml += `<p><strong>Tied losers (${maxPoints} Schwanzer Points):</strong> ${losers}</p>`;
      }

      detailsHtml += `<p class="schwanzer-note"><em>Schwanzer Points: Queens=3, Jacks=2, Diamonds=1</em></p>`;

      // Show Schwanzer points breakdown
      detailsHtml += '<div class="schwanzer-points-breakdown"><strong>Schwanzer Points:</strong><br>';
      for (const player of this.state.players) {
        const sp = results.playerSchwanzerPoints[player.id];
        detailsHtml += `${player.name}: ${sp} | `;
      }
      detailsHtml = detailsHtml.slice(0, -3) + '</div>';

      details.innerHTML = detailsHtml;
    } else {
      const picker = this.state.players.find(p => p.id === results.picker);
      const partner = results.partner ? this.state.players.find(p => p.id === results.partner) : null;

      let titleText = results.pickersWin ? 'Picking Team Wins!' : 'Defenders Win!';
      if (results.schwarz) titleText += ' (Schwarz!)';
      else if (results.schneider) titleText += ' (Schneider!)';

      title.textContent = titleText;

      let detailsHtml = `
        <p><strong>Picker:</strong> ${picker?.name}</p>
        ${partner ? `<p><strong>Partner:</strong> ${partner.name} (${results.calledSuit} Ace)</p>` : '<p><strong>Going Alone</strong></p>'}
        <p><strong>Picking Team:</strong> ${results.pickingPoints} points (${results.pickingTeamTricks} tricks)</p>
        <p><strong>Defenders:</strong> ${results.defendingPoints} points (${results.defendingTeamTricks} tricks)</p>
        <p><strong>Buried:</strong> ${results.buriedPoints} points</p>
      `;
      details.innerHTML = detailsHtml;
    }

    // Show scores
    scores.innerHTML = '';
    for (const player of this.state.players) {
      const score = results.scores[player.id] || 0;
      const div = document.createElement('div');
      div.className = 'score-item';
      div.innerHTML = `
        <div class="player-name">${player.name}</div>
        <div class="score-value ${score >= 0 ? 'positive' : 'negative'}">
          ${score >= 0 ? '+' : ''}${score}
        </div>
      `;
      scores.appendChild(div);
    }
  }

  showLastTrick() {
    if (!this.state || !this.state.lastTrick) return;

    const overlay = document.getElementById('last-trick-overlay');
    const container = document.getElementById('last-trick-cards');
    container.innerHTML = '';

    const myIndex = this.state.myIndex;

    for (const play of this.state.lastTrick) {
      const player = this.state.players.find(p => p.id === play.playerId);
      if (!player) continue;

      const wrapper = document.createElement('div');
      wrapper.className = 'trick-card';

      let cardEl;
      if (play.isUnderCard) {
        // Under card is shown face-down
        cardEl = createCardBack({ small: true });
        cardEl.classList.add('under-card-played');
        cardEl.title = 'Under card (face down)';
      } else {
        cardEl = createCardElement(play.card, { small: true });
      }
      wrapper.appendChild(cardEl);

      const label = document.createElement('span');
      label.className = 'card-owner';
      const relPos = (player.seatIndex - myIndex + 5) % 5;
      label.textContent = player.name + (relPos === 0 ? ' (You)' : '');
      wrapper.appendChild(label);

      container.appendChild(wrapper);
    }

    overlay.classList.remove('hidden');
  }

  showLobby() {
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('lobby-screen').classList.remove('hidden');
    this.state = null;
    // Refresh all lobby data when returning
    if (typeof loadRooms === 'function') {
      loadRooms();
    }
    if (typeof loadStats === 'function') {
      // Refresh stats based on current view mode
      loadStats(typeof statsViewMode !== 'undefined' ? statsViewMode : 'daily');
    }
    if (typeof loadLeaderboard === 'function') {
      loadLeaderboard(typeof leaderboardViewMode !== 'undefined' ? leaderboardViewMode : 'daily');
    }
  }
}
