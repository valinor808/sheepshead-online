// Game state and rendering

class GameUI {
  constructor(socket) {
    this.socket = socket;
    this.state = null;
    this.selectedCards = [];

    this.setupEventListeners();
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

    // UI events
    document.getElementById('start-game-btn').addEventListener('click', () => {
      this.socket.emit('startGame');
    });

    document.getElementById('new-hand-btn').addEventListener('click', () => {
      this.socket.emit('newHand');
      document.getElementById('scoring-overlay').classList.add('hidden');
    });

    document.getElementById('leave-room-btn').addEventListener('click', () => {
      this.socket.emit('leaveRoom');
      this.showLobby();
    });

    document.getElementById('cancel-room-btn').addEventListener('click', () => {
      this.socket.emit('leaveRoom');
      this.showLobby();
    });
  }

  handleGameState(state) {
    console.log('Game state received:', state);
    console.log('Players in state:', state?.players?.length, state?.players);
    this.state = state;
    this.selectedCards = [];
    this.render();
  }

  handleCardPlayed(data) {
    // Animation could go here
    console.log('Card played:', data);
  }

  handleTrickComplete(data) {
    console.log('Trick complete:', data);
    // Could show animation of trick being collected
  }

  handleHandComplete(results) {
    console.log('Hand complete:', results);
    this.showScoringOverlay(results);
  }

  handlePlayerJoined(data) {
    console.log('Player joined:', data);
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
    console.log('Player left:', data);
    // Remove player from state if we have state
    if (this.state && this.state.players) {
      this.state.players = this.state.players.filter(p => p.id !== data.playerId);
      this.render();
    }
  }

  handleRoomUpdate(data) {
    console.log('Room update:', data);
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

  render() {
    if (!this.state) return;

    // Update header
    document.getElementById('room-name').textContent = `Room: ${this.state.roomId}`;
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
    } else {
      waitingOverlay.classList.add('hidden');
      scoringOverlay.classList.add('hidden');
      this.renderGameTable();
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
    console.log('renderWaitingState: playerCount =', playerCount);
    countEl.textContent = playerCount + ' / 5 players';

    const players = this.state.players || [];
    for (let i = 0; i < 5; i++) {
      const player = players.find(p => p.seatIndex === i);
      const div = document.createElement('div');
      div.className = 'waiting-player' + (player ? '' : ' empty');
      div.textContent = player ? player.name : 'Waiting...';
      container.appendChild(div);
    }

    // Show start button if we have 5 players
    const startBtn = document.getElementById('start-game-btn');
    if (players.length === 5) {
      startBtn.classList.remove('hidden');
    } else {
      startBtn.classList.add('hidden');
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
    // My seat is always at the bottom center conceptually
    // Other players wrap around

    const myIndex = this.state.myIndex;
    const positions = ['top', 'left', 'right', 'bottom-left', 'bottom-right'];

    // Clear all positions
    for (let i = 0; i < 5; i++) {
      const el = document.getElementById(`player-pos-${i}`);
      el.innerHTML = '';
    }

    // Place players relative to me
    for (const player of this.state.players) {
      // Calculate relative position (0 = me, 1 = left, 2 = across-left, etc.)
      let relPos = (player.seatIndex - myIndex + 5) % 5;

      // Skip position 0 (that's me, shown in hand area)
      if (relPos === 0) continue;

      // Map to visual positions
      const positionMap = {
        1: 3,  // bottom-left
        2: 1,  // left
        3: 0,  // top
        4: 2   // right
      };

      const posIndex = positionMap[relPos];
      const el = document.getElementById(`player-pos-${posIndex}`);

      const isCurrentPlayer = this.state.players[this.state.currentPlayerIndex]?.id === player.id;

      let roleText = '';
      if (player.isPicker) roleText = 'Picker';
      else if (player.isPartner) roleText = 'Partner';

      el.innerHTML = `
        <div class="player-box ${isCurrentPlayer ? 'current-turn' : ''} ${player.isPicker ? 'is-picker' : ''} ${player.isPartner ? 'is-partner' : ''}">
          <div class="player-name">
            ${player.name}
            ${player.isDealer ? '<span class="dealer-chip">D</span>' : ''}
          </div>
          <div class="player-cards-count">${player.cardCount} cards</div>
          ${roleText ? `<div class="player-role">${roleText}</div>` : ''}
          <div class="player-tricks">${player.tricksWon} tricks</div>
        </div>
      `;
    }
  }

  renderTrick() {
    const container = document.getElementById('trick-area');
    container.innerHTML = '';

    for (const play of this.state.currentTrick) {
      const player = this.state.players.find(p => p.id === play.playerId);
      const cardEl = createTrickCard(play.card, player?.name || 'Unknown');
      container.appendChild(cardEl);
    }
  }

  renderHand() {
    const container = document.getElementById('player-hand');
    container.innerHTML = '';

    const playable = this.state.playableCards || [];
    const isMyTurn = this.state.players[this.state.currentPlayerIndex]?.seatIndex === this.state.myIndex;
    const inPlayPhase = this.state.phase === 'playing' || this.state.phase === 'schwanzer';

    for (const card of this.state.hand) {
      const isPlayable = inPlayPhase && isMyTurn && playable.includes(card.id);
      const isSelected = this.selectedCards.includes(card.id);

      const cardEl = createCardElement(card, {
        playable: isPlayable,
        selected: isSelected
      });

      cardEl.addEventListener('click', () => this.handleCardClick(card, isPlayable));
      container.appendChild(cardEl);
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
    } else if (isPlayable) {
      // Play the card
      this.socket.emit('playCard', card.id);
    }
  }

  renderGameInfo() {
    const pickerInfo = document.getElementById('picker-info');
    const calledInfo = document.getElementById('called-suit-info');
    const trickCount = document.getElementById('trick-count');

    if (this.state.picker) {
      const picker = this.state.players.find(p => p.id === this.state.picker);
      pickerInfo.textContent = `Picker: ${picker?.name || 'Unknown'}`;
    } else if (this.state.isSchwanzer) {
      pickerInfo.textContent = 'Schwanzer!';
    } else {
      pickerInfo.textContent = '';
    }

    if (this.state.calledSuit) {
      calledInfo.innerHTML = `Called: ${getSuitDisplay(this.state.calledSuit)}`;
      if (this.state.partner) {
        const partner = this.state.players.find(p => p.id === this.state.partner);
        calledInfo.innerHTML += ` (${partner?.name})`;
      }
    } else {
      calledInfo.textContent = '';
    }

    trickCount.textContent = `Tricks: ${this.state.tricks.length}/6`;
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

      let buttonsHtml = '';
      for (const opt of this.state.callableOptions.options) {
        const symbol = SUIT_SYMBOLS[opt.suit];
        const warning = opt.type === 'under' ? ' (Under)' : '';
        buttonsHtml += `
          <button class="btn suit-btn ${opt.suit}" data-suit="${opt.suit}">
            ${symbol} Ace${warning}
          </button>
        `;
      }

      if (!this.state.callableOptions.goAlone) {
        buttonsHtml += `<button class="btn" id="go-alone-btn">Go Alone</button>`;
      }

      container.innerHTML = `
        <div class="action-message">Call an Ace</div>
        <div class="action-buttons">${buttonsHtml}</div>
      `;

      container.querySelectorAll('.suit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.socket.emit('callAce', { suit: btn.dataset.suit, goAlone: false });
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

    overlay.classList.remove('hidden');

    if (results.type === 'schwanzer') {
      const winner = this.state.players.find(p => p.id === results.winner);
      title.textContent = 'Schwanzer Complete!';
      details.innerHTML = `
        <p><strong>${winner?.name}</strong> wins with ${results.winningPoints} points!</p>
        <p>Blind (${results.blindPoints} pts) went to last trick winner.</p>
      `;
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
        <p><strong>Picking Team:</strong> ${results.pickingPoints} points</p>
        <p><strong>Defenders:</strong> ${results.defendingPoints} points</p>
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

  showLobby() {
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('lobby-screen').classList.remove('hidden');
    this.state = null;
    // Refresh room list when returning to lobby
    if (typeof loadRooms === 'function') {
      loadRooms();
    }
  }
}
