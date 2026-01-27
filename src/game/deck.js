// Deck creation and card utilities

const { SUITS, RANKS, POINT_VALUES, TRUMP_ORDER, FAIL_ORDER, FAIL_SUITS } = require('./constants');

/**
 * Create a unique card ID
 */
function cardId(suit, rank) {
  return `${rank}_${suit}`;
}

/**
 * Parse a card ID back to suit and rank
 */
function parseCardId(id) {
  const [rank, suit] = id.split('_');
  return { suit, rank };
}

/**
 * Create a full Sheepshead deck (32 cards)
 */
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: cardId(suit, rank),
        suit,
        rank,
        points: POINT_VALUES[rank]
      });
    }
  }
  return deck;
}

/**
 * Shuffle an array in place using Fisher-Yates
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Check if a card is trump
 */
function isTrump(card) {
  // All Queens and Jacks are trump
  if (card.rank === 'Q' || card.rank === 'J') {
    return true;
  }
  // All diamonds are trump
  if (card.suit === 'diamonds') {
    return true;
  }
  return false;
}

/**
 * Get the trump power of a card (higher = stronger)
 * Returns -1 if not trump
 */
function getTrumpPower(card) {
  for (let i = 0; i < TRUMP_ORDER.length; i++) {
    if (TRUMP_ORDER[i].suit === card.suit && TRUMP_ORDER[i].rank === card.rank) {
      return i;
    }
  }
  return -1;
}

/**
 * Get the fail power of a card within its suit
 * Returns -1 if trump
 */
function getFailPower(card) {
  if (isTrump(card)) return -1;
  return FAIL_ORDER.indexOf(card.rank);
}

/**
 * Get the effective suit of a card (trump cards are all 'trump' suit)
 */
function getEffectiveSuit(card) {
  if (isTrump(card)) return 'trump';
  return card.suit;
}

/**
 * Compare two cards given a lead suit
 * Returns positive if card1 wins, negative if card2 wins
 */
function compareCards(card1, card2, leadSuit) {
  const trump1 = isTrump(card1);
  const trump2 = isTrump(card2);

  // Trump beats non-trump
  if (trump1 && !trump2) return 1;
  if (!trump1 && trump2) return -1;

  // Both trump - compare trump power
  if (trump1 && trump2) {
    return getTrumpPower(card1) - getTrumpPower(card2);
  }

  // Neither trump - must follow lead suit
  const eff1 = getEffectiveSuit(card1);
  const eff2 = getEffectiveSuit(card2);

  // Card that follows lead suit beats one that doesn't
  if (eff1 === leadSuit && eff2 !== leadSuit) return 1;
  if (eff1 !== leadSuit && eff2 === leadSuit) return -1;

  // Both follow lead suit - compare fail power
  if (eff1 === leadSuit && eff2 === leadSuit) {
    return getFailPower(card1) - getFailPower(card2);
  }

  // Neither follows lead suit - first card played wins
  return 1;
}

/**
 * Determine the winner of a trick
 * @param {Array} trick - Array of {playerId, card} objects in play order
 * @returns {string} - The playerId of the winner
 */
function determineTrickWinner(trick) {
  if (trick.length === 0) return null;

  const leadCard = trick[0].card;
  const leadSuit = getEffectiveSuit(leadCard);

  let winner = trick[0];
  for (let i = 1; i < trick.length; i++) {
    if (compareCards(trick[i].card, winner.card, leadSuit) > 0) {
      winner = trick[i];
    }
  }

  return winner.playerId;
}

/**
 * Calculate points in a set of cards
 */
function calculatePoints(cards) {
  return cards.reduce((sum, card) => sum + card.points, 0);
}

/**
 * Get all aces that can be called as partner (fail aces only)
 * Returns array of suit names
 */
function getCallableAces() {
  return FAIL_SUITS; // hearts, spades, clubs
}

/**
 * Check if a player has a specific ace
 */
function hasAce(hand, suit) {
  return hand.some(card => card.suit === suit && card.rank === 'A' && !isTrump(card));
}

/**
 * Check if a player has any fail cards in a suit
 */
function hasFailInSuit(hand, suit) {
  return hand.some(card => getEffectiveSuit(card) === suit);
}

/**
 * Get valid cards that can be played given the current trick
 *
 * @param {Array} hand - Player's current hand
 * @param {Array} currentTrick - Cards played so far in current trick
 * @param {string} calledSuit - The suit that was called (null if going alone)
 * @param {boolean} calledSuitHasBeenLed - Whether the called suit has been led yet
 * @param {boolean} isPicker - Whether this player is the picker
 * @param {boolean} hasCalledAce - Whether this player has the called ace (is the partner)
 */
function getPlayableCards(hand, currentTrick, calledSuit = null, calledSuitHasBeenLed = false, isPicker = false, hasCalledAce = false) {
  if (currentTrick.length === 0) {
    // LEADING - special rules apply

    if (calledSuit) {
      const cardsInCalledSuit = hand.filter(c => getEffectiveSuit(c) === calledSuit);
      const calledAceCard = hand.find(c => c.suit === calledSuit && c.rank === 'A');

      // PARTNER RULE: If you have the called ace, you cannot lead the called suit
      // unless you lead with the ace itself, or you have 4+ cards in the suit ("running")
      if (calledAceCard && cardsInCalledSuit.length > 0 && cardsInCalledSuit.length < 4) {
        // Can't lead called suit unless playing the ace
        return hand.filter(c => {
          if (getEffectiveSuit(c) === calledSuit) {
            return c.rank === 'A';
          }
          return true;
        });
      }

      // PICKER RULE: Picker must keep at least one card of the called suit
      // until the called suit is led. They can play other cards from that suit,
      // but must retain at least one.
      if (isPicker && !calledSuitHasBeenLed && cardsInCalledSuit.length > 0) {
        // If picker only has 1 card in called suit, they can't play it yet
        if (cardsInCalledSuit.length === 1) {
          return hand.filter(c => getEffectiveSuit(c) !== calledSuit);
        }
        // If picker has multiple cards in called suit, they can play all but must keep one
        // When leading, just prevent leading the called suit entirely if they'd be left with 0
        // Actually for leading, they CAN lead the called suit as long as they keep one
        // But simpler: they can lead anything, just enforce on non-leading plays
      }
    }
    return hand;
  }

  const leadCard = currentTrick[0].card;
  const leadSuit = getEffectiveSuit(leadCard);

  // Must follow suit if possible
  const cardsInSuit = hand.filter(c => getEffectiveSuit(c) === leadSuit);

  if (cardsInSuit.length > 0) {
    // PARTNER RULE: If called suit is led and you have the called ace, you MUST play it
    if (calledSuit && leadSuit === calledSuit && hasCalledAce) {
      const calledAce = cardsInSuit.find(c => c.rank === 'A');
      if (calledAce) {
        return [calledAce];
      }
    }
    return cardsInSuit;
  }

  // Can't follow suit - can play anything
  // BUT: Picker must keep at least one card of called suit until it's been led
  if (calledSuit && isPicker && !calledSuitHasBeenLed) {
    const cardsInCalledSuit = hand.filter(c => getEffectiveSuit(c) === calledSuit);
    if (cardsInCalledSuit.length === 1) {
      // Can't play the last card of called suit - must keep it
      return hand.filter(c => getEffectiveSuit(c) !== calledSuit);
    }
    // If they have 2+, they can play one but must keep one
    // This is tricky - we need to allow all cards EXCEPT if playing would leave them with 0
    // Since we're not following suit here, we need to exclude one card from called suit
    // Actually, let them play any non-called-suit card, or any called-suit card except if it's the last one
    // The simplest rule: if they have exactly 1 in called suit, exclude it. Otherwise, allow all.
  }

  return hand;
}

/**
 * Sort a hand for display (trump first, then by suit)
 */
function sortHand(hand) {
  return [...hand].sort((a, b) => {
    const trumpA = isTrump(a);
    const trumpB = isTrump(b);

    // Trump first
    if (trumpA && !trumpB) return -1;
    if (!trumpA && trumpB) return 1;

    if (trumpA && trumpB) {
      // Sort trump by power (highest first)
      return getTrumpPower(b) - getTrumpPower(a);
    }

    // Sort fail by suit, then by power
    if (a.suit !== b.suit) {
      return FAIL_SUITS.indexOf(a.suit) - FAIL_SUITS.indexOf(b.suit);
    }
    return getFailPower(b) - getFailPower(a);
  });
}

module.exports = {
  cardId,
  parseCardId,
  createDeck,
  shuffle,
  isTrump,
  getTrumpPower,
  getFailPower,
  getEffectiveSuit,
  compareCards,
  determineTrickWinner,
  calculatePoints,
  getCallableAces,
  hasAce,
  hasFailInSuit,
  getPlayableCards,
  sortHand
};
