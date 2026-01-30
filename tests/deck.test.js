/**
 * Card Fundamentals Tests
 * Generated from: docs/testing/test-cases-cards.md
 */

const {
  createDeck,
  isTrump,
  getTrumpPower,
  getFailPower,
  getEffectiveSuit,
  compareCards,
  calculatePoints
} = require('../src/game/deck');

const { POINT_VALUES } = require('../src/game/constants');

// Helper to create a card object
function card(rank, suit) {
  return { rank, suit, id: `${rank}_${suit}`, points: POINT_VALUES[rank] };
}

describe('Trump Identification', () => {
  describe('Queens are trump', () => {
    test('Queen of Clubs is trump', () => {
      expect(isTrump(card('Q', 'clubs'))).toBe(true);
    });
    test('Queen of Spades is trump', () => {
      expect(isTrump(card('Q', 'spades'))).toBe(true);
    });
    test('Queen of Hearts is trump', () => {
      expect(isTrump(card('Q', 'hearts'))).toBe(true);
    });
    test('Queen of Diamonds is trump', () => {
      expect(isTrump(card('Q', 'diamonds'))).toBe(true);
    });
  });

  describe('Jacks are trump', () => {
    test('Jack of Clubs is trump', () => {
      expect(isTrump(card('J', 'clubs'))).toBe(true);
    });
    test('Jack of Spades is trump', () => {
      expect(isTrump(card('J', 'spades'))).toBe(true);
    });
    test('Jack of Hearts is trump', () => {
      expect(isTrump(card('J', 'hearts'))).toBe(true);
    });
    test('Jack of Diamonds is trump', () => {
      expect(isTrump(card('J', 'diamonds'))).toBe(true);
    });
  });

  describe('Diamonds are trump', () => {
    test('Ace of Diamonds is trump', () => {
      expect(isTrump(card('A', 'diamonds'))).toBe(true);
    });
    test('10 of Diamonds is trump', () => {
      expect(isTrump(card('10', 'diamonds'))).toBe(true);
    });
    test('King of Diamonds is trump', () => {
      expect(isTrump(card('K', 'diamonds'))).toBe(true);
    });
    test('9 of Diamonds is trump', () => {
      expect(isTrump(card('9', 'diamonds'))).toBe(true);
    });
    test('8 of Diamonds is trump', () => {
      expect(isTrump(card('8', 'diamonds'))).toBe(true);
    });
    test('7 of Diamonds is trump', () => {
      expect(isTrump(card('7', 'diamonds'))).toBe(true);
    });
  });

  describe('Fail cards are not trump', () => {
    test('Ace of Hearts is not trump', () => {
      expect(isTrump(card('A', 'hearts'))).toBe(false);
    });
    test('Ace of Spades is not trump', () => {
      expect(isTrump(card('A', 'spades'))).toBe(false);
    });
    test('Ace of Clubs is not trump', () => {
      expect(isTrump(card('A', 'clubs'))).toBe(false);
    });
    test('10 of Hearts is not trump', () => {
      expect(isTrump(card('10', 'hearts'))).toBe(false);
    });
    test('King of Spades is not trump', () => {
      expect(isTrump(card('K', 'spades'))).toBe(false);
    });
    test('7 of Clubs is not trump', () => {
      expect(isTrump(card('7', 'clubs'))).toBe(false);
    });
  });
});

describe('Trump Power Rankings', () => {
  test('Queen of Clubs has power 13 (highest)', () => {
    expect(getTrumpPower(card('Q', 'clubs'))).toBe(13);
  });
  test('Queen of Spades has power 12', () => {
    expect(getTrumpPower(card('Q', 'spades'))).toBe(12);
  });
  test('Queen of Hearts has power 11', () => {
    expect(getTrumpPower(card('Q', 'hearts'))).toBe(11);
  });
  test('Queen of Diamonds has power 10', () => {
    expect(getTrumpPower(card('Q', 'diamonds'))).toBe(10);
  });
  test('Jack of Clubs has power 9', () => {
    expect(getTrumpPower(card('J', 'clubs'))).toBe(9);
  });
  test('Jack of Spades has power 8', () => {
    expect(getTrumpPower(card('J', 'spades'))).toBe(8);
  });
  test('Jack of Hearts has power 7', () => {
    expect(getTrumpPower(card('J', 'hearts'))).toBe(7);
  });
  test('Jack of Diamonds has power 6', () => {
    expect(getTrumpPower(card('J', 'diamonds'))).toBe(6);
  });
  test('Ace of Diamonds has power 5', () => {
    expect(getTrumpPower(card('A', 'diamonds'))).toBe(5);
  });
  test('10 of Diamonds has power 4', () => {
    expect(getTrumpPower(card('10', 'diamonds'))).toBe(4);
  });
  test('King of Diamonds has power 3', () => {
    expect(getTrumpPower(card('K', 'diamonds'))).toBe(3);
  });
  test('9 of Diamonds has power 2', () => {
    expect(getTrumpPower(card('9', 'diamonds'))).toBe(2);
  });
  test('8 of Diamonds has power 1', () => {
    expect(getTrumpPower(card('8', 'diamonds'))).toBe(1);
  });
  test('7 of Diamonds has power 0 (lowest trump)', () => {
    expect(getTrumpPower(card('7', 'diamonds'))).toBe(0);
  });
  test('Ace of Hearts returns -1 (not trump)', () => {
    expect(getTrumpPower(card('A', 'hearts'))).toBe(-1);
  });
});

describe('Fail Power Rankings', () => {
  test('Ace of Hearts has power 5 (highest in suit)', () => {
    expect(getFailPower(card('A', 'hearts'))).toBe(5);
  });
  test('10 of Hearts has power 4', () => {
    expect(getFailPower(card('10', 'hearts'))).toBe(4);
  });
  test('King of Hearts has power 3', () => {
    expect(getFailPower(card('K', 'hearts'))).toBe(3);
  });
  test('9 of Hearts has power 2', () => {
    expect(getFailPower(card('9', 'hearts'))).toBe(2);
  });
  test('8 of Hearts has power 1', () => {
    expect(getFailPower(card('8', 'hearts'))).toBe(1);
  });
  test('7 of Hearts has power 0 (lowest in suit)', () => {
    expect(getFailPower(card('7', 'hearts'))).toBe(0);
  });
  test('Queen of Hearts returns -1 (trump, not fail)', () => {
    expect(getFailPower(card('Q', 'hearts'))).toBe(-1);
  });
  test('Jack of Hearts returns -1 (trump, not fail)', () => {
    expect(getFailPower(card('J', 'hearts'))).toBe(-1);
  });
});

describe('Card Point Values', () => {
  test('Ace is worth 11 points', () => {
    expect(POINT_VALUES['A']).toBe(11);
  });
  test('10 is worth 10 points', () => {
    expect(POINT_VALUES['10']).toBe(10);
  });
  test('King is worth 4 points', () => {
    expect(POINT_VALUES['K']).toBe(4);
  });
  test('Queen is worth 3 points', () => {
    expect(POINT_VALUES['Q']).toBe(3);
  });
  test('Jack is worth 2 points', () => {
    expect(POINT_VALUES['J']).toBe(2);
  });
  test('9 is worth 0 points', () => {
    expect(POINT_VALUES['9']).toBe(0);
  });
  test('8 is worth 0 points', () => {
    expect(POINT_VALUES['8']).toBe(0);
  });
  test('7 is worth 0 points', () => {
    expect(POINT_VALUES['7']).toBe(0);
  });
});

describe('Card Comparisons', () => {
  describe('Trump vs Trump', () => {
    test('Queen of Clubs beats Queen of Spades', () => {
      expect(compareCards(card('Q', 'clubs'), card('Q', 'spades'), 'trump')).toBeGreaterThan(0);
    });
    test('Queen of Diamonds beats Jack of Diamonds', () => {
      expect(compareCards(card('Q', 'diamonds'), card('J', 'diamonds'), 'trump')).toBeGreaterThan(0);
    });
    test('Jack of Clubs beats Jack of Hearts', () => {
      expect(compareCards(card('J', 'clubs'), card('J', 'hearts'), 'trump')).toBeGreaterThan(0);
    });
    test('Ace of Diamonds beats 10 of Diamonds', () => {
      expect(compareCards(card('A', 'diamonds'), card('10', 'diamonds'), 'trump')).toBeGreaterThan(0);
    });
    test('Jack of Diamonds beats 7 of Diamonds', () => {
      expect(compareCards(card('J', 'diamonds'), card('7', 'diamonds'), 'trump')).toBeGreaterThan(0);
    });
    test('8 of Diamonds beats 7 of Diamonds', () => {
      expect(compareCards(card('8', 'diamonds'), card('7', 'diamonds'), 'trump')).toBeGreaterThan(0);
    });
  });

  describe('Trump vs Fail', () => {
    test('7 of Diamonds (lowest trump) beats Ace of Hearts', () => {
      expect(compareCards(card('7', 'diamonds'), card('A', 'hearts'), 'hearts')).toBeGreaterThan(0);
    });
    test('Queen of Clubs beats Ace of Spades', () => {
      expect(compareCards(card('Q', 'clubs'), card('A', 'spades'), 'spades')).toBeGreaterThan(0);
    });
    test('Jack of Hearts (trump) beats King of Hearts (fail)', () => {
      expect(compareCards(card('J', 'hearts'), card('K', 'hearts'), 'hearts')).toBeGreaterThan(0);
    });
  });

  describe('Fail vs Fail (Same Suit)', () => {
    test('Ace of Hearts beats King of Hearts', () => {
      expect(compareCards(card('A', 'hearts'), card('K', 'hearts'), 'hearts')).toBeGreaterThan(0);
    });
    test('10 of Hearts beats King of Hearts', () => {
      expect(compareCards(card('10', 'hearts'), card('K', 'hearts'), 'hearts')).toBeGreaterThan(0);
    });
    test('8 of Hearts beats 7 of Hearts', () => {
      expect(compareCards(card('8', 'hearts'), card('7', 'hearts'), 'hearts')).toBeGreaterThan(0);
    });
  });

  describe('Fail vs Fail (Different Suits)', () => {
    test('Ace of Hearts beats Ace of Spades when Hearts led', () => {
      expect(compareCards(card('A', 'hearts'), card('A', 'spades'), 'hearts')).toBeGreaterThan(0);
    });
    test('7 of Hearts beats Ace of Spades when Hearts led', () => {
      expect(compareCards(card('7', 'hearts'), card('A', 'spades'), 'hearts')).toBeGreaterThan(0);
    });
    test('First card wins when neither follows lead suit', () => {
      expect(compareCards(card('K', 'clubs'), card('A', 'spades'), 'hearts')).toBeGreaterThan(0);
    });
  });
});

describe('Effective Suit', () => {
  test('Queen of Clubs has effective suit trump', () => {
    expect(getEffectiveSuit(card('Q', 'clubs'))).toBe('trump');
  });
  test('Jack of Hearts has effective suit trump', () => {
    expect(getEffectiveSuit(card('J', 'hearts'))).toBe('trump');
  });
  test('Ace of Diamonds has effective suit trump', () => {
    expect(getEffectiveSuit(card('A', 'diamonds'))).toBe('trump');
  });
  test('7 of Diamonds has effective suit trump', () => {
    expect(getEffectiveSuit(card('7', 'diamonds'))).toBe('trump');
  });
  test('Ace of Hearts has effective suit hearts', () => {
    expect(getEffectiveSuit(card('A', 'hearts'))).toBe('hearts');
  });
  test('King of Spades has effective suit spades', () => {
    expect(getEffectiveSuit(card('K', 'spades'))).toBe('spades');
  });
  test('10 of Clubs has effective suit clubs', () => {
    expect(getEffectiveSuit(card('10', 'clubs'))).toBe('clubs');
  });
});

describe('Deck Composition', () => {
  const deck = createDeck();

  test('Deck has 32 cards', () => {
    expect(deck.length).toBe(32);
  });

  test('Deck has 14 trump cards', () => {
    const trumpCards = deck.filter(c => isTrump(c));
    expect(trumpCards.length).toBe(14);
  });

  test('Deck has 18 fail cards', () => {
    const failCards = deck.filter(c => !isTrump(c));
    expect(failCards.length).toBe(18);
  });

  test('Deck has 120 total points', () => {
    const totalPoints = calculatePoints(deck);
    expect(totalPoints).toBe(120);
  });

  test('Each suit has 8 cards', () => {
    const suits = ['diamonds', 'hearts', 'spades', 'clubs'];
    for (const suit of suits) {
      const suitCards = deck.filter(c => c.suit === suit);
      expect(suitCards.length).toBe(8);
    }
  });
});
