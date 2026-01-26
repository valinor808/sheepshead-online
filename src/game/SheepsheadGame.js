// Main Sheepshead game logic

const {
  NUM_PLAYERS,
  CARDS_PER_PLAYER,
  BLIND_SIZE,
  TOTAL_POINTS,
  WIN_THRESHOLD,
  SCHNEIDER_THRESHOLD,
  SCHWARZ_THRESHOLD,
  FAIL_SUITS
} = require('./constants');

const {
  createDeck,
  shuffle,
  isTrump,
  getEffectiveSuit,
  determineTrickWinner,
  calculatePoints,
  hasAce,
  hasFailInSuit,
  getPlayableCards,
  sortHand
} = require('./deck');

// Game phases
const PHASES = {
  WAITING: 'waiting',           // Waiting for players
  DEALING: 'dealing',           // Cards being dealt
  PICKING: 'picking',           // Players deciding to pick or pass
  BURYING: 'burying',           // Picker burying cards
  CALLING: 'calling',           // Picker calling partner ace
  PLAYING: 'playing',           // Trick-taking phase
  SCORING: 'scoring',           // Hand complete, showing results
  SCHWANZER: 'schwanzer'        // Leasters - everyone passed
};

class SheepsheadGame {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = [];          // Array of {id, name, seatIndex}
    this.hands = {};            // playerId -> array of cards
    this.blind = [];            // The blind (2 cards)
    this.buried = [];           // Cards buried by picker

    this.phase = PHASES.WAITING;
    this.dealerIndex = 0;       // Index in players array
    this.currentPlayerIndex = 0;

    // Picking phase
    this.pickingIndex = 0;      // Who is currently deciding to pick
    this.passedPlayers = [];    // Players who passed

    // Game state
    this.picker = null;         // Player ID of picker
    this.partner = null;        // Player ID of partner (null until revealed)
    this.calledSuit = null;     // The suit of the called ace
    this.calledSuitFirstTrick = true; // Has the called suit been led yet?

    // Trick state
    this.currentTrick = [];     // Array of {playerId, card}
    this.tricks = [];           // Completed tricks with winner info
    this.tricksWon = {};        // playerId -> array of tricks won

    // Schwanzer (leasters) state
    this.isSchwanzer = false;

    // Scoring
    this.handResults = null;    // Results of the completed hand
  }

  /**
   * Add a player to the game
   */
  addPlayer(playerId, playerName) {
    if (this.players.length >= NUM_PLAYERS) {
      return { success: false, error: 'Game is full' };
    }
    if (this.players.find(p => p.id === playerId)) {
      return { success: false, error: 'Already in game' };
    }
    if (this.phase !== PHASES.WAITING) {
      return { success: false, error: 'Game already started' };
    }

    const seatIndex = this.players.length;
    this.players.push({ id: playerId, name: playerName, seatIndex });
    this.hands[playerId] = [];
    this.tricksWon[playerId] = [];

    return { success: true, seatIndex };
  }

  /**
   * Remove a player from the game
   */
  removePlayer(playerId) {
    const index = this.players.findIndex(p => p.id === playerId);
    if (index === -1) return { success: false, error: 'Player not found' };

    if (this.phase !== PHASES.WAITING) {
      return { success: false, error: 'Cannot leave during game' };
    }

    this.players.splice(index, 1);
    delete this.hands[playerId];
    delete this.tricksWon[playerId];

    // Reindex seats
    this.players.forEach((p, i) => p.seatIndex = i);

    return { success: true };
  }

  /**
   * Start a new hand
   */
  startHand() {
    if (this.players.length !== NUM_PLAYERS) {
      return { success: false, error: `Need ${NUM_PLAYERS} players` };
    }

    // Reset hand state
    this.phase = PHASES.DEALING;
    this.blind = [];
    this.buried = [];
    this.picker = null;
    this.partner = null;
    this.calledSuit = null;
    this.calledSuitFirstTrick = true;
    this.currentTrick = [];
    this.tricks = [];
    this.passedPlayers = [];
    this.isSchwanzer = false;
    this.handResults = null;

    for (const p of this.players) {
      this.hands[p.id] = [];
      this.tricksWon[p.id] = [];
    }

    // Deal cards
    const deck = shuffle(createDeck());

    // Deal 6 cards to each player
    let cardIndex = 0;
    for (let i = 0; i < CARDS_PER_PLAYER; i++) {
      for (const player of this.players) {
        this.hands[player.id].push(deck[cardIndex++]);
      }
    }

    // Remaining 2 cards go to blind
    this.blind = [deck[cardIndex++], deck[cardIndex++]];

    // Sort hands
    for (const player of this.players) {
      this.hands[player.id] = sortHand(this.hands[player.id]);
    }

    // Move to picking phase
    this.phase = PHASES.PICKING;
    // Player to left of dealer picks first
    this.pickingIndex = (this.dealerIndex + 1) % NUM_PLAYERS;
    this.currentPlayerIndex = this.pickingIndex;

    return { success: true };
  }

  /**
   * Handle a player's pick/pass decision
   */
  pick(playerId, wantsToPick) {
    if (this.phase !== PHASES.PICKING) {
      return { success: false, error: 'Not in picking phase' };
    }

    const currentPlayer = this.players[this.pickingIndex];
    if (currentPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn to pick' };
    }

    if (wantsToPick) {
      // Player picks up the blind
      this.picker = playerId;
      this.hands[playerId] = [...this.hands[playerId], ...this.blind];
      this.hands[playerId] = sortHand(this.hands[playerId]);
      this.blind = [];
      this.phase = PHASES.BURYING;
      return { success: true, picked: true };
    } else {
      // Player passes
      this.passedPlayers.push(playerId);
      this.pickingIndex = (this.pickingIndex + 1) % NUM_PLAYERS;
      this.currentPlayerIndex = this.pickingIndex;

      // Check if everyone passed
      if (this.passedPlayers.length === NUM_PLAYERS) {
        // Schwanzer (leasters)!
        this.isSchwanzer = true;
        this.phase = PHASES.SCHWANZER;
        // In schwanzer, player to left of dealer leads
        this.currentPlayerIndex = (this.dealerIndex + 1) % NUM_PLAYERS;
        return { success: true, schwanzer: true };
      }

      return { success: true, passed: true };
    }
  }

  /**
   * Handle the picker burying cards
   */
  bury(playerId, cardIds) {
    if (this.phase !== PHASES.BURYING) {
      return { success: false, error: 'Not in burying phase' };
    }
    if (this.picker !== playerId) {
      return { success: false, error: 'You are not the picker' };
    }
    if (cardIds.length !== BLIND_SIZE) {
      return { success: false, error: `Must bury exactly ${BLIND_SIZE} cards` };
    }

    const hand = this.hands[playerId];
    const toBury = [];

    for (const cardId of cardIds) {
      const cardIndex = hand.findIndex(c => c.id === cardId);
      if (cardIndex === -1) {
        return { success: false, error: 'Card not in hand' };
      }
      toBury.push(hand[cardIndex]);
    }

    // Check for invalid bury (can't bury queens or jacks unless no choice)
    const nonPointTrump = toBury.filter(c => (c.rank === 'Q' || c.rank === 'J'));
    if (nonPointTrump.length > 0) {
      // Check if player has any other cards they could bury
      const otherCards = hand.filter(c =>
        !cardIds.includes(c.id) && c.rank !== 'Q' && c.rank !== 'J'
      );
      if (otherCards.length >= BLIND_SIZE) {
        return { success: false, error: 'Cannot bury Queens or Jacks if you have other options' };
      }
    }

    // Remove buried cards from hand
    this.hands[playerId] = hand.filter(c => !cardIds.includes(c.id));
    this.buried = toBury;

    // Move to calling phase
    this.phase = PHASES.CALLING;
    return { success: true };
  }

  /**
   * Get the suits the picker can call
   * Can call a suit if: they don't have that ace, OR they have the ONLY ace of that suit
   * (under-suit call when they have the only relevant ace)
   */
  getCallableOptions(playerId) {
    const hand = this.hands[playerId];
    const options = [];

    for (const suit of FAIL_SUITS) {
      const hasThisAce = hasAce(hand, suit);
      const hasFailCards = hasFailInSuit(hand, suit);

      if (!hasThisAce) {
        // Normal call - don't have the ace
        options.push({ suit, type: 'normal' });
      } else if (hasFailCards) {
        // Under-suit call - have the ace and other cards in suit
        // This is allowed when you're the only one who COULD have the ace
        // (i.e., you have it, so no one else does)
        options.push({ suit, type: 'under', warning: 'You have this ace - calling under' });
      }
    }

    // If no options (has all three fail aces with no fail), must go alone
    if (options.length === 0) {
      return { goAlone: true, options: [] };
    }

    return { goAlone: false, options };
  }

  /**
   * Handle the picker calling an ace
   */
  callAce(playerId, suit, goAlone = false) {
    if (this.phase !== PHASES.CALLING) {
      return { success: false, error: 'Not in calling phase' };
    }
    if (this.picker !== playerId) {
      return { success: false, error: 'You are not the picker' };
    }

    if (goAlone) {
      // Picker goes alone - no partner
      this.calledSuit = null;
      this.partner = null;
      this.phase = PHASES.PLAYING;
      this.currentPlayerIndex = (this.dealerIndex + 1) % NUM_PLAYERS;
      return { success: true, goAlone: true };
    }

    const callableOptions = this.getCallableOptions(playerId);

    if (callableOptions.goAlone) {
      return { success: false, error: 'You must go alone - no valid ace to call' };
    }

    const validOption = callableOptions.options.find(o => o.suit === suit);
    if (!validOption) {
      return { success: false, error: 'Cannot call that suit' };
    }

    this.calledSuit = suit;
    // Partner is not revealed until they play the called ace
    this.partner = null;

    // Move to playing phase
    this.phase = PHASES.PLAYING;
    this.currentPlayerIndex = (this.dealerIndex + 1) % NUM_PLAYERS;

    return { success: true, calledSuit: suit, isUnderCall: validOption.type === 'under' };
  }

  /**
   * Handle a player playing a card
   */
  playCard(playerId, cardId) {
    if (this.phase !== PHASES.PLAYING && this.phase !== PHASES.SCHWANZER) {
      return { success: false, error: 'Not in playing phase' };
    }

    const currentPlayer = this.players[this.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    const hand = this.hands[playerId];
    const cardIndex = hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      return { success: false, error: 'Card not in hand' };
    }

    const card = hand[cardIndex];

    // Check if card is playable
    const isLeading = this.currentTrick.length === 0;
    const leadSuit = isLeading ? null : getEffectiveSuit(this.currentTrick[0].card);
    const isFirstCalledSuitTrick = this.calledSuit && this.calledSuitFirstTrick &&
      (isLeading ? getEffectiveSuit(card) === this.calledSuit : leadSuit === this.calledSuit);

    const playableCards = getPlayableCards(
      hand,
      this.currentTrick,
      this.calledSuit,
      isFirstCalledSuitTrick && !isLeading
    );

    if (!playableCards.find(c => c.id === cardId)) {
      return { success: false, error: 'Cannot play that card' };
    }

    // Play the card
    this.hands[playerId].splice(cardIndex, 1);
    this.currentTrick.push({ playerId, card });

    // Check if partner is revealed
    let partnerRevealed = false;
    if (this.calledSuit && !this.partner &&
        card.suit === this.calledSuit && card.rank === 'A') {
      this.partner = playerId;
      partnerRevealed = true;
    }

    // Track if called suit has been led
    if (this.calledSuit && isLeading && getEffectiveSuit(card) === this.calledSuit) {
      this.calledSuitFirstTrick = false;
    }

    // Check if trick is complete
    if (this.currentTrick.length === NUM_PLAYERS) {
      return this._completeTrick(partnerRevealed);
    }

    // Next player
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % NUM_PLAYERS;

    return {
      success: true,
      card,
      partnerRevealed: partnerRevealed ? playerId : null,
      trickComplete: false
    };
  }

  /**
   * Complete a trick and determine winner
   */
  _completeTrick(partnerRevealed) {
    const winner = determineTrickWinner(this.currentTrick);
    const trickCards = this.currentTrick.map(t => t.card);
    const points = calculatePoints(trickCards);

    const completedTrick = {
      cards: [...this.currentTrick],
      winner,
      points
    };

    this.tricks.push(completedTrick);
    this.tricksWon[winner].push(completedTrick);

    const previousTrick = [...this.currentTrick];
    this.currentTrick = [];

    // Winner leads next trick
    const winnerIndex = this.players.findIndex(p => p.id === winner);
    this.currentPlayerIndex = winnerIndex;

    // Check if hand is complete
    if (this.hands[this.players[0].id].length === 0) {
      return this._completeHand(previousTrick, partnerRevealed);
    }

    return {
      success: true,
      trickComplete: true,
      trick: previousTrick,
      winner,
      points,
      partnerRevealed: partnerRevealed ? this.partner : null,
      handComplete: false
    };
  }

  /**
   * Complete the hand and calculate scores
   */
  _completeHand(lastTrick, partnerRevealed) {
    this.phase = PHASES.SCORING;

    let results;

    if (this.isSchwanzer) {
      results = this._scoreSchwanzer();
    } else {
      results = this._scoreNormalHand();
    }

    this.handResults = results;

    // Advance dealer for next hand
    this.dealerIndex = (this.dealerIndex + 1) % NUM_PLAYERS;

    return {
      success: true,
      trickComplete: true,
      trick: lastTrick,
      winner: determineTrickWinner(lastTrick),
      points: calculatePoints(lastTrick.map(t => t.card)),
      partnerRevealed: partnerRevealed ? this.partner : null,
      handComplete: true,
      results
    };
  }

  /**
   * Score a normal hand (picker vs defenders)
   */
  _scoreNormalHand() {
    // Calculate points for each player
    const playerPoints = {};
    for (const player of this.players) {
      playerPoints[player.id] = this.tricksWon[player.id].reduce(
        (sum, trick) => sum + trick.points, 0
      );
    }

    // Add buried cards to picker's points
    const buriedPoints = calculatePoints(this.buried);
    playerPoints[this.picker] += buriedPoints;

    // Determine teams
    const pickingTeam = [this.picker];
    if (this.partner && this.partner !== this.picker) {
      pickingTeam.push(this.partner);
    }
    const defendingTeam = this.players
      .filter(p => !pickingTeam.includes(p.id))
      .map(p => p.id);

    // Calculate team points
    const pickingPoints = pickingTeam.reduce((sum, id) => sum + playerPoints[id], 0);
    const defendingPoints = TOTAL_POINTS - pickingPoints;

    // Determine winner and multiplier
    let pickersWin = pickingPoints >= WIN_THRESHOLD;
    let multiplier = 1;
    let schneider = false;
    let schwarz = false;

    const losingPoints = pickersWin ? defendingPoints : pickingPoints;
    const winningTeamTricks = pickersWin ?
      pickingTeam.flatMap(id => this.tricksWon[id]) :
      defendingTeam.flatMap(id => this.tricksWon[id]);
    const losingTeamTricks = pickersWin ?
      defendingTeam.flatMap(id => this.tricksWon[id]) :
      pickingTeam.flatMap(id => this.tricksWon[id]);

    if (losingPoints < WIN_THRESHOLD - 30) { // Less than 31
      schneider = true;
      multiplier = 2;
    }
    if (losingTeamTricks.length === 0) {
      schwarz = true;
      multiplier = 3;
    }

    // Calculate actual scores
    // Picker gets/loses 2x (or 4x if alone), partner gets/loses 1x
    const isAlone = !this.partner || this.partner === this.picker;
    const pickerMultiplier = isAlone ? 4 : 2;

    const scores = {};
    for (const player of this.players) {
      if (player.id === this.picker) {
        scores[player.id] = pickersWin ?
          multiplier * pickerMultiplier :
          -multiplier * pickerMultiplier;
      } else if (player.id === this.partner) {
        scores[player.id] = pickersWin ? multiplier : -multiplier;
      } else {
        // Defenders
        scores[player.id] = pickersWin ? -multiplier : multiplier;
      }
    }

    return {
      type: 'normal',
      picker: this.picker,
      partner: this.partner,
      calledSuit: this.calledSuit,
      pickingTeam,
      defendingTeam,
      pickingPoints,
      defendingPoints,
      buriedPoints,
      pickersWin,
      schneider,
      schwarz,
      multiplier,
      scores,
      playerPoints,
      tricksWon: { ...this.tricksWon }
    };
  }

  /**
   * Score a Schwanzer (leasters) hand
   * Player with fewest points wins, but must take at least one trick
   */
  _scoreSchwanzer() {
    // Calculate points for each player
    const playerPoints = {};
    const playerTrickCounts = {};

    for (const player of this.players) {
      const tricks = this.tricksWon[player.id];
      playerTrickCounts[player.id] = tricks.length;
      playerPoints[player.id] = tricks.reduce((sum, trick) => sum + trick.points, 0);
    }

    // Blind points go to whoever takes the last trick
    const lastTrick = this.tricks[this.tricks.length - 1];
    const blindPoints = calculatePoints(this.blind);
    playerPoints[lastTrick.winner] += blindPoints;

    // Find winner (lowest points, but must have taken at least one trick)
    let winner = null;
    let lowestPoints = Infinity;

    for (const player of this.players) {
      if (playerTrickCounts[player.id] > 0 && playerPoints[player.id] < lowestPoints) {
        lowestPoints = playerPoints[player.id];
        winner = player.id;
      }
    }

    // If no one took a trick (impossible but handle it), dealer loses
    if (!winner) {
      winner = this.players[this.dealerIndex].id;
    }

    // Scoring: winner gets +4, everyone else gets -1
    const scores = {};
    for (const player of this.players) {
      scores[player.id] = player.id === winner ? 4 : -1;
    }

    return {
      type: 'schwanzer',
      winner,
      winningPoints: lowestPoints,
      blindPoints,
      lastTrickWinner: lastTrick.winner,
      scores,
      playerPoints,
      playerTrickCounts,
      tricksWon: { ...this.tricksWon }
    };
  }

  /**
   * Get the current game state for a specific player
   */
  getStateForPlayer(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return null;

    const state = {
      roomId: this.roomId,
      phase: this.phase,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        seatIndex: p.seatIndex,
        cardCount: this.hands[p.id]?.length || 0,
        isDealer: p.seatIndex === this.dealerIndex,
        isPicker: p.id === this.picker,
        isPartner: p.id === this.partner,
        tricksWon: this.tricksWon[p.id]?.length || 0
      })),
      hand: this.hands[playerId] || [],
      currentTrick: this.currentTrick,
      tricks: this.tricks,
      currentPlayerIndex: this.currentPlayerIndex,
      dealerIndex: this.dealerIndex,
      picker: this.picker,
      partner: this.partner, // Only set once revealed
      calledSuit: this.calledSuit,
      isSchwanzer: this.isSchwanzer,
      myIndex: player.seatIndex
    };

    // Phase-specific data
    if (this.phase === PHASES.PICKING) {
      state.pickingIndex = this.pickingIndex;
      state.passedPlayers = this.passedPlayers;
    }

    if (this.phase === PHASES.BURYING && playerId === this.picker) {
      state.needToBury = BLIND_SIZE;
    }

    if (this.phase === PHASES.CALLING && playerId === this.picker) {
      state.callableOptions = this.getCallableOptions(playerId);
    }

    if (this.phase === PHASES.PLAYING || this.phase === PHASES.SCHWANZER) {
      const isMyTurn = this.players[this.currentPlayerIndex]?.id === playerId;
      if (isMyTurn) {
        state.playableCards = getPlayableCards(
          this.hands[playerId],
          this.currentTrick,
          this.calledSuit,
          this.calledSuit && this.calledSuitFirstTrick &&
            this.currentTrick.length > 0 &&
            getEffectiveSuit(this.currentTrick[0].card) === this.calledSuit
        ).map(c => c.id);
      }
    }

    if (this.phase === PHASES.SCORING) {
      state.results = this.handResults;
    }

    return state;
  }

  /**
   * Get minimal public state (for observers)
   */
  getPublicState() {
    return {
      roomId: this.roomId,
      phase: this.phase,
      playerCount: this.players.length,
      players: this.players.map(p => ({
        name: p.name,
        seatIndex: p.seatIndex
      }))
    };
  }
}

module.exports = { SheepsheadGame, PHASES };
