/**
 * Sheepshead Game Logic
 *
 * This module implements the core game logic for 5-player Sheepshead.
 *
 * Game Flow:
 * 1. WAITING - Waiting for 5 players to join
 * 2. DEALING - Cards dealt (6 per player, 2 to blind)
 * 3. PICKING - Players decide to pick or pass (clockwise from dealer's left)
 * 4. CALLING - Picker calls a partner (ace or goes alone) with full 8-card hand
 * 5. BURYING - Picker buries 2 cards (must keep 1 of called suit)
 * 6. PLAYING - 6 tricks are played
 * 7. SCORING - Points tallied, scores assigned
 * Note: If everyone passes, goes directly to SCHWANZER (leasters)
 *
 * Key Rules:
 * - Trump: All Queens, all Jacks, all Diamonds (in that order of power)
 * - Picker vs Defenders: Picker + Partner need 61+ points to win
 * - Under: When picker has all aces of a fail suit, they must call "under"
 * - Schwanzer: When everyone passes, player with most "Schwanzer points" loses
 */

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
    this.kibbitzers = [];       // Array of {id, name} - spectators
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
    this.calledRank = 'A';      // Usually Ace, but can be 10 if picker has all 3 fail aces
    this.isUnderCall = false;   // True if picker is calling "under"
    this.underCardId = null;    // ID of card designated as "under" (stays in hand, marked)
    this.underCardPlayed = false; // Has the under card been played yet?
    this.calledSuitFirstTrick = true; // Has the called suit been led yet?

    // Trick state
    this.currentTrick = [];     // Array of {playerId, card, isUnderCard}
    this.tricks = [];           // Completed tricks with winner info
    this.tricksWon = {};        // playerId -> array of tricks won
    this.lastTrick = null;      // Last completed trick for review

    // Schwanzer (leasters) state
    this.isSchwanzer = false;

    // Scoring
    this.handResults = null;    // Results of the completed hand

    // Session management - end-of-hand voting
    this.playersLeaving = [];   // Player IDs who clicked "Leave Table"
    this.playersLeavingNames = []; // Names of players who left (persists after removal)
    this.playersNextHand = [];  // Players who clicked "Next Hand"
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
   * Add a kibbitzer (spectator) to the game
   */
  addKibbitzer(kibitzerId, kibitzerName) {
    if (this.kibbitzers.find(k => k.id === kibitzerId)) {
      return { success: false, error: 'Already kibbitzing' };
    }
    if (this.players.find(p => p.id === kibitzerId)) {
      return { success: false, error: 'Already a player' };
    }

    this.kibbitzers.push({ id: kibitzerId, name: kibitzerName });

    return { success: true };
  }

  /**
   * Remove a kibbitzer from the game
   */
  removeKibbitzer(kibitzerId) {
    const index = this.kibbitzers.findIndex(k => k.id === kibitzerId);
    if (index === -1) return { success: false, error: 'Kibbitzer not found' };

    this.kibbitzers.splice(index, 1);
    return { success: true };
  }

  /**
   * Remove a player from the game
   */
  removePlayer(playerId) {
    const index = this.players.findIndex(p => p.id === playerId);
    if (index === -1) return { success: false, error: 'Player not found' };

    const wasInGame = this.phase !== PHASES.WAITING;

    this.players.splice(index, 1);
    delete this.hands[playerId];
    delete this.tricksWon[playerId];

    // Reindex seats
    this.players.forEach((p, i) => p.seatIndex = i);

    // If game was in progress, reset to waiting state
    if (wasInGame) {
      this.resetToWaiting();
    }

    return { success: true, gameReset: wasInGame };
  }

  /**
   * Reset game to waiting state (when a player leaves mid-game)
   */
  resetToWaiting() {
    this.phase = PHASES.WAITING;
    this.blind = [];
    this.buried = [];
    this.picker = null;
    this.partner = null;
    this.calledSuit = null;
    this.calledRank = 'A';
    this.isUnderCall = false;
    this.underCardId = null;
    this.underCardPlayed = false;
    this.calledSuitFirstTrick = true;
    this.currentTrick = [];
    this.tricks = [];
    this.lastTrick = null;
    this.passedPlayers = [];
    this.isSchwanzer = false;
    this.handResults = null;
    this.currentPlayerIndex = 0;
    this.pickingIndex = 0;

    // Clear hands and tricks for remaining players
    for (const p of this.players) {
      this.hands[p.id] = [];
      this.tricksWon[p.id] = [];
    }
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
    this.calledRank = 'A';
    this.isUnderCall = false;
    this.underCardId = null;
    this.underCardPlayed = false;
    this.calledSuitFirstTrick = true;
    this.currentTrick = [];
    this.tricks = [];
    this.lastTrick = null;
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
      // Go to calling phase first (picker calls with full 8-card hand)
      this.phase = PHASES.CALLING;
      return { success: true, picked: true };
    } else {
      // Player passes
      this.passedPlayers.push(playerId);
      this.pickingIndex = (this.pickingIndex + 1) % NUM_PLAYERS;
      this.currentPlayerIndex = this.pickingIndex;

      // Check if everyone passed
      if (this.passedPlayers.length === NUM_PLAYERS) {
        // Schwanzer! Hand ends immediately
        this.isSchwanzer = true;
        this.phase = PHASES.SCORING;
        const results = this._scoreSchwanzer();
        this.handResults = results;
        // Advance dealer for next hand
        this.dealerIndex = (this.dealerIndex + 1) % NUM_PLAYERS;
        return { success: true, schwanzer: true, handComplete: true, results };
      }

      return { success: true, passed: true };
    }
  }

  /**
   * Handle the picker burying cards
   *
   * Bury validation rules (simplified - calling happens first):
   * 1. Cannot bury Queens or Jacks if you have other options
   * 2. Must keep at least 1 card of the called suit (hold card)
   * 3. Cannot bury the under card if this is an under call
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

    // Rule: Can't bury the under card if this is an under call
    if (this.underCardId && cardIds.includes(this.underCardId)) {
      return { success: false, error: 'Cannot bury your under card' };
    }

    // Rule: Can't bury queens or jacks unless no choice
    const nonPointTrump = toBury.filter(c => (c.rank === 'Q' || c.rank === 'J'));
    if (nonPointTrump.length > 0) {
      const otherCards = hand.filter(c =>
        !cardIds.includes(c.id) && c.rank !== 'Q' && c.rank !== 'J'
      );
      if (otherCards.length >= BLIND_SIZE) {
        return { success: false, error: 'Cannot bury Queens or Jacks if you have other options' };
      }
    }

    // Calculate what remains after burying
    const remainingHand = hand.filter(c => !cardIds.includes(c.id));

    // Rule: Must keep at least 1 card of the called suit (hold card requirement)
    if (this.calledSuit) {
      const remainingInCalledSuit = remainingHand.filter(c =>
        c.suit === this.calledSuit && !isTrump(c)
      );
      if (remainingInCalledSuit.length === 0) {
        return { success: false, error: `Must keep at least one ${this.calledSuit} card (hold card for called suit)` };
      }
    }

    // Remove buried cards from hand
    this.hands[playerId] = remainingHand;
    this.buried = toBury;

    // Move to playing phase
    this.phase = PHASES.PLAYING;
    this.currentPlayerIndex = (this.dealerIndex + 1) % NUM_PLAYERS;
    return { success: true };
  }

  /**
   * Get the suits/ranks the picker can call
   *
   * Under Rules:
   * Under is allowed ONLY if the picker has NO fail suit where they don't have the ace.
   * In other words: every fail suit they hold must include that suit's ace.
   *
   * Examples:
   * - No fail cards (all trump): Under allowed - call any ace
   * - Only hearts fail, but have ace of hearts: Under allowed - call clubs/spades ace
   * - Hearts fail without ace of hearts: Normal call - must call hearts ace
   * - Have all 3 fail aces: Can call a 10 instead (special case)
   *
   * The under card stays in hand, marked, and must be manually played when called suit is led.
   */
  getCallableOptions(playerId) {
    const hand = this.hands[playerId];
    const options = [];

    // Analyze the hand by suit
    const acesHeld = [];  // Fail aces in hand
    const tensHeld = [];  // Fail 10s in hand
    const failSuitsWithoutAce = []; // Fail suits where we have cards but NOT the ace

    for (const suit of FAIL_SUITS) {
      const hasThisAce = hasAce(hand, suit);
      const hasThis10 = hand.some(card => card.suit === suit && card.rank === '10' && !isTrump(card));

      // Check if we have ANY fail cards in this suit
      const hasFailInThisSuit = hand.some(card =>
        card.suit === suit && !isTrump(card)
      );

      if (hasThisAce) {
        acesHeld.push(suit);
      }
      if (hasThis10) {
        tensHeld.push(suit);
      }

      // If we have fail cards in this suit but NOT the ace, it's a "fail suit without ace"
      if (hasFailInThisSuit && !hasThisAce) {
        failSuitsWithoutAce.push(suit);
      }
    }

    // Case 1: Picker has all 3 fail aces - special case, can call a 10
    if (acesHeld.length === 3) {
      // Can call a 10 of any fail suit they DON'T have the 10 of
      for (const suit of FAIL_SUITS) {
        if (!tensHeld.includes(suit)) {
          options.push({ suit, rank: '10', type: 'under' });
        }
      }
      // If they have all 3 fail 10s too, must go alone
      if (options.length === 0) {
        return { goAlone: true, options: [], reason: 'Have all 3 fail aces and all fail 10s' };
      }
      return { goAlone: false, options, mustSelectUnderCard: true };
    }

    // Case 2: Picker has at least one fail suit WITHOUT the ace - normal call
    // They can only call suits where they have at least one card (hold card requirement)
    if (failSuitsWithoutAce.length > 0) {
      for (const suit of failSuitsWithoutAce) {
        options.push({ suit, rank: 'A', type: 'normal' });
      }
      return { goAlone: false, options, mustSelectUnderCard: false };
    }

    // Case 3: Picker has NO fail suit without ace (under required)
    // Every fail suit they have includes the ace, OR they have no fail at all
    // Must call under - call any ace they DON'T have
    for (const suit of FAIL_SUITS) {
      if (!acesHeld.includes(suit)) {
        options.push({ suit, rank: 'A', type: 'under' });
      }
    }

    if (options.length === 0) {
      // Has all aces - should have been caught in Case 1
      return { goAlone: true, options: [], reason: 'No valid call options' };
    }

    return { goAlone: false, options, mustSelectUnderCard: true };
  }

  /**
   * Handle the picker calling a card (Ace or 10 in some cases)
   * For under calls, an under card must also be selected (stays in hand, marked)
   */
  callAce(playerId, suit, goAlone = false, underCardId = null) {
    if (this.phase !== PHASES.CALLING) {
      return { success: false, error: 'Not in calling phase' };
    }
    if (this.picker !== playerId) {
      return { success: false, error: 'You are not the picker' };
    }

    if (goAlone) {
      // Picker goes alone - no partner
      this.calledSuit = null;
      this.calledRank = 'A';
      this.partner = null;
      this.isUnderCall = false;
      this.underCardId = null;
      // Go to burying phase next
      this.phase = PHASES.BURYING;
      return { success: true, goAlone: true };
    }

    const callableOptions = this.getCallableOptions(playerId);

    if (callableOptions.goAlone) {
      return { success: false, error: 'You must go alone - ' + (callableOptions.reason || 'no valid card to call') };
    }

    const validOption = callableOptions.options.find(o => o.suit === suit);
    if (!validOption) {
      return { success: false, error: 'Cannot call that suit' };
    }

    // Check if this is an under call requiring an under card selection
    if (validOption.type === 'under' || callableOptions.mustSelectUnderCard) {
      if (!underCardId) {
        return { success: false, error: 'Under call requires selecting an under card', needsUnderCard: true };
      }

      // Validate under card is in picker's hand
      const hand = this.hands[playerId];
      const underCardIndex = hand.findIndex(c => c.id === underCardId);
      if (underCardIndex === -1) {
        return { success: false, error: 'Under card not in hand' };
      }

      // Store the under card ID - card stays in hand, just marked
      this.underCardId = underCardId;
      this.isUnderCall = true;
    } else {
      this.isUnderCall = false;
      this.underCardId = null;
    }

    this.calledSuit = suit;
    this.calledRank = validOption.rank || 'A';
    // Partner is not revealed until they play the called card
    // For under call, partner is revealed when under card is played
    this.partner = null;

    // Move to burying phase next
    this.phase = PHASES.BURYING;

    return {
      success: true,
      calledSuit: suit,
      calledRank: this.calledRank,
      isUnderCall: this.isUnderCall,
      underCardId: this.underCardId
    };
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
    const isLeading = this.currentTrick.length === 0;
    const leadSuit = isLeading ? null : getEffectiveSuit(this.currentTrick[0].card);

    // Check if this is the under card being played
    const isPlayingUnderCard = this.isUnderCall &&
      this.underCardId &&
      !this.underCardPlayed &&
      playerId === this.picker &&
      cardId === this.underCardId;

    // Check if picker MUST play under card (called suit is led and under card not yet played)
    const mustPlayUnderCard = this.isUnderCall &&
      this.underCardId &&
      !this.underCardPlayed &&
      playerId === this.picker &&
      !isLeading &&
      leadSuit === this.calledSuit;

    // If must play under card but player selected a different card, reject
    if (mustPlayUnderCard && cardId !== this.underCardId) {
      return { success: false, error: 'You must play your under card when the called suit is led' };
    }

    // Validate the selected card is in hand
    const cardIndex = hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      return { success: false, error: 'Card not in hand' };
    }

    const card = hand[cardIndex];
    let isUnderCard = false;

    if (isPlayingUnderCard) {
      // Mark this as the under card play
      isUnderCard = true;
      this.underCardPlayed = true;
    }

    // Check if card is playable (unless it's the forced under card play)
    if (!mustPlayUnderCard) {
      // Determine if this player is the picker
      const isPicker = playerId === this.picker;
      // Determine if this player has the called ace (is the partner)
      const hasCalledAce = this.calledSuit && !isPicker &&
        hand.some(c => c.suit === this.calledSuit && c.rank === this.calledRank);

      const playableCards = getPlayableCards(
        hand,
        this.currentTrick,
        this.calledSuit,
        !this.calledSuitFirstTrick, // calledSuitHasBeenLed
        isPicker,
        hasCalledAce
      );

      if (!playableCards.find(c => c.id === cardId)) {
        return { success: false, error: 'Cannot play that card' };
      }
    }

    // Remove card from hand
    this.hands[playerId].splice(cardIndex, 1);

    // Add card to current trick (mark if it's the under card - played face-down)
    this.currentTrick.push({ playerId, card, isUnderCard });

    // Check if partner is revealed (played the called card)
    let partnerRevealed = false;
    if (this.calledSuit && !this.partner && !isUnderCard &&
        card.suit === this.calledSuit && card.rank === this.calledRank) {
      this.partner = playerId;
      partnerRevealed = true;
    }

    // For under calls, when picker plays the under card, they become their own partner
    // The under card is treated as if it's the called card for partnership purposes
    if (isUnderCard && !this.partner) {
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
      isUnderCard,
      partnerRevealed: partnerRevealed ? playerId : null,
      trickComplete: false
    };
  }

  /**
   * Complete a trick and determine winner
   */
  _completeTrick(partnerRevealed) {
    // Filter out under cards when determining winner - under cards can't win
    const eligiblePlays = this.currentTrick.filter(t => !t.isUnderCard);
    const winner = determineTrickWinner(eligiblePlays);

    // All cards count for points though (including hole card)
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
    this.lastTrick = [...this.currentTrick]; // Store for review
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

    // Calculate tricks won by each team
    const pickingTeamTricks = pickingTeam.reduce((sum, id) => sum + this.tricksWon[id].length, 0);
    const defendingTeamTricks = defendingTeam.reduce((sum, id) => sum + this.tricksWon[id].length, 0);

    return {
      type: 'normal',
      picker: this.picker,
      partner: this.partner,
      calledSuit: this.calledSuit,
      pickingTeam,
      defendingTeam,
      pickingPoints,
      defendingPoints,
      pickingTeamTricks,
      defendingTeamTricks,
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
   * Calculate fail points for a hand (Queens=3, Jacks=2, all other diamonds=1)
   */
  _calculateFailPoints(hand) {
    let points = 0;
    for (const card of hand) {
      if (card.rank === 'Q') {
        points += 3;
      } else if (card.rank === 'J') {
        points += 2;
      } else if (card.suit === 'diamonds') {
        points += 1;
      }
    }
    return points;
  }

  /**
   * Score a Schwanzer hand
   * Everyone passed - hand ends immediately
   * Loser = player(s) with most Schwanzer Points (Q=3, J=2, diamonds=1)
   *
   * Scoring:
   * - 1 loser: -4, everyone else +1
   * - 2 losers tied: -3 each, everyone else +2
   * - 3 losers tied: -2 each, everyone else +3
   * - 4 losers tied: -1 each, 1 winner gets +4
   * - 5 losers tied: 0 each (draw)
   */
  _scoreSchwanzer() {
    // Calculate Schwanzer points for each player's dealt hand
    const playerSchwanzerPoints = {};
    for (const player of this.players) {
      playerSchwanzerPoints[player.id] = this._calculateFailPoints(this.hands[player.id]);
    }

    // Find max Schwanzer points
    const maxSchwanzerPoints = Math.max(...Object.values(playerSchwanzerPoints));

    // Find all players with max Schwanzer points (losers)
    const losers = this.players.filter(p => playerSchwanzerPoints[p.id] === maxSchwanzerPoints);
    const winners = this.players.filter(p => playerSchwanzerPoints[p.id] < maxSchwanzerPoints);

    // Calculate scores based on number of losers
    const scores = {};
    const numLosers = losers.length;

    // Scoring table based on number of losers (total always sums to zero)
    let loserScore, winnerScore;

    switch (numLosers) {
      case 1:
        loserScore = -4;
        winnerScore = 1;
        break;
      case 2:
        loserScore = -3;
        winnerScore = 2;
        break;
      case 3:
        loserScore = -2;
        winnerScore = 3;
        break;
      case 4:
        loserScore = -1;
        winnerScore = 4;
        break;
      case 5:
        // All tied - draw
        loserScore = 0;
        winnerScore = 0;
        break;
      default:
        loserScore = 0;
        winnerScore = 0;
    }

    for (const player of this.players) {
      if (playerSchwanzerPoints[player.id] === maxSchwanzerPoints) {
        scores[player.id] = loserScore;
      } else {
        scores[player.id] = winnerScore;
      }
    }

    return {
      type: 'schwanzer',
      losers: losers.map(p => p.id),
      winners: winners.map(p => p.id),
      maxSchwanzerPoints,
      scores,
      playerSchwanzerPoints
    };
  }

  /**
   * Get the current game state for a kibbitzer (spectator)
   * Kibbitzers can see played cards but not players' hands
   */
  getStateForKibbitzer(kibitzerId) {
    const kibbitzer = this.kibbitzers.find(k => k.id === kibitzerId);
    if (!kibbitzer) return null;

    const state = {
      roomId: this.roomId,
      phase: this.phase,
      isKibbitzer: true,
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
      hand: [], // Kibbitzers don't have cards
      currentTrick: this.currentTrick,
      lastTrick: this.lastTrick,
      tricks: this.tricks,
      currentPlayerIndex: this.currentPlayerIndex,
      dealerIndex: this.dealerIndex,
      picker: this.picker,
      partner: this.partner,
      calledSuit: this.calledSuit,
      calledRank: this.calledRank,
      isUnderCall: this.isUnderCall,
      isSchwanzer: this.isSchwanzer,
      myIndex: 0 // Kibbitzers have no seat
    };

    // Voting state for scoring phase
    if (this.phase === PHASES.SCORING) {
      state.playersLeaving = this.getLeavingPlayerNames();
      state.playersNextHand = this.getNextHandPlayerNames();
    }

    return state;
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
      lastTrick: this.lastTrick,
      tricks: this.tricks,
      currentPlayerIndex: this.currentPlayerIndex,
      dealerIndex: this.dealerIndex,
      picker: this.picker,
      partner: this.partner, // Only set once revealed
      calledSuit: this.calledSuit,
      calledRank: this.calledRank,
      isUnderCall: this.isUnderCall,
      underCardPlayed: this.underCardPlayed,
      isSchwanzer: this.isSchwanzer,
      myIndex: player.seatIndex
    };

    // Only show under card info to the picker
    if (playerId === this.picker && this.underCardId && !this.underCardPlayed) {
      state.underCardId = this.underCardId;
    }

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
        // Check if picker must play under card this turn (called suit is led)
        const isLeading = this.currentTrick.length === 0;
        const leadSuit = isLeading ? null : getEffectiveSuit(this.currentTrick[0].card);
        const mustPlayUnderCard = this.isUnderCall &&
          this.underCardId &&
          !this.underCardPlayed &&
          playerId === this.picker &&
          !isLeading &&
          leadSuit === this.calledSuit;

        if (mustPlayUnderCard) {
          // Picker must play their under card - it's the only playable card
          state.mustPlayUnderCard = true;
          state.playableCards = [this.underCardId];
        } else {
          // Determine if this player is the picker
          const isPicker = playerId === this.picker;
          // Determine if this player has the called ace (is the partner)
          const hasCalledAce = this.calledSuit && !isPicker &&
            this.hands[playerId].some(c => c.suit === this.calledSuit && c.rank === this.calledRank);

          state.playableCards = getPlayableCards(
            this.hands[playerId],
            this.currentTrick,
            this.calledSuit,
            !this.calledSuitFirstTrick, // calledSuitHasBeenLed (inverted from calledSuitFirstTrick)
            isPicker,
            hasCalledAce
          ).map(c => c.id);
        }
      }
    }

    if (this.phase === PHASES.SCORING) {
      state.results = this.handResults;
      state.playersLeaving = this.getLeavingPlayerNames();
      state.playersNextHand = this.getNextHandPlayerNames();
      state.allVoted = this.haveAllPlayersVoted();
      state.hasVoted = this.playersLeaving.includes(playerId) || this.playersNextHand.includes(playerId);
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

  /**
   * Mark a player as wanting to leave after this hand
   */
  markPlayerLeaving(playerId) {
    if (!this.playersLeaving.includes(playerId)) {
      this.playersLeaving.push(playerId);
      // Store name for display after player is removed
      const player = this.players.find(p => p.id === playerId);
      if (player && !this.playersLeavingNames.includes(player.name)) {
        this.playersLeavingNames.push(player.name);
      }
    }
    // Remove from nextHand if they were there
    this.playersNextHand = this.playersNextHand.filter(id => id !== playerId);

    return {
      success: true,
      playersLeaving: this.playersLeaving,
      allVoted: this.haveAllPlayersVoted()
    };
  }

  /**
   * Mark a player as wanting to continue to the next hand
   */
  markPlayerNextHand(playerId) {
    if (!this.playersNextHand.includes(playerId)) {
      this.playersNextHand.push(playerId);
    }
    // Remove from leaving if they were there (changed mind)
    this.playersLeaving = this.playersLeaving.filter(id => id !== playerId);

    return {
      success: true,
      playersNextHand: this.playersNextHand,
      allVoted: this.haveAllPlayersVoted()
    };
  }

  /**
   * Check if all players have voted (either leave or next hand)
   */
  haveAllPlayersVoted() {
    return (this.playersLeaving.length + this.playersNextHand.length) >= this.players.length;
  }

  /**
   * Check if any players are leaving and should end the session
   */
  hasPlayersLeaving() {
    return this.playersLeaving.length > 0;
  }

  /**
   * Check if all players voted to continue
   */
  allVotedNextHand() {
    return this.playersNextHand.length === this.players.length;
  }

  /**
   * Get list of leaving players' names
   */
  getLeavingPlayerNames() {
    // Return persisted names (includes players who already left)
    return this.playersLeavingNames;
  }

  /**
   * Get list of players waiting for next hand
   */
  getNextHandPlayerNames() {
    return this.playersNextHand
      .map(id => this.players.find(p => p.id === id)?.name)
      .filter(Boolean);
  }

  /**
   * Reset voting state for next hand
   */
  resetVoting() {
    this.playersLeaving = [];
    this.playersLeavingNames = [];
    this.playersNextHand = [];
  }
}

module.exports = { SheepsheadGame, PHASES };
