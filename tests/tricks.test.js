/**
 * Trick-Taking Tests
 * Generated from: docs/testing/test-cases-tricks.md
 */

const {
  determineTrickWinner,
  getPlayableCards,
  getEffectiveSuit
} = require('../src/game/deck');

const { POINT_VALUES } = require('../src/game/constants');

// Helper to create a card object
function card(rank, suit) {
  return { rank, suit, id: `${rank}_${suit}`, points: POINT_VALUES[rank] };
}

// Helper to create a trick play
function play(playerId, rank, suit) {
  return { playerId, card: card(rank, suit) };
}

describe('Determining Trick Winner', () => {
  describe('Basic Trick Winners (5 players)', () => {
    test('A♥ leads, all follow hearts - A♥ wins (ace is highest fail)', () => {
      const trick = [
        play('player1', 'A', 'hearts'),
        play('player2', 'K', 'hearts'),
        play('player3', '10', 'hearts'),
        play('player4', '9', 'hearts'),
        play('player5', '8', 'hearts'),
      ];
      expect(determineTrickWinner(trick)).toBe('player1');
    });

    test('7♥ leads, A♥ played last - A♥ wins', () => {
      const trick = [
        play('player1', '7', 'hearts'),
        play('player2', '8', 'hearts'),
        play('player3', '9', 'hearts'),
        play('player4', 'K', 'hearts'),
        play('player5', 'A', 'hearts'),
      ];
      expect(determineTrickWinner(trick)).toBe('player5');
    });

    test('A♥ leads, 7♦ (trump) played - 7♦ wins (lowest trump beats highest fail)', () => {
      const trick = [
        play('player1', 'A', 'hearts'),
        play('player2', '7', 'diamonds'),
        play('player3', 'K', 'hearts'),
        play('player4', '10', 'hearts'),
        play('player5', '9', 'hearts'),
      ];
      expect(determineTrickWinner(trick)).toBe('player2');
    });

    test('Q♣ leads, all queens and J♣ - Q♣ wins (highest trump)', () => {
      const trick = [
        play('player1', 'Q', 'clubs'),
        play('player2', 'Q', 'spades'),
        play('player3', 'Q', 'hearts'),
        play('player4', 'Q', 'diamonds'),
        play('player5', 'J', 'clubs'),
      ];
      expect(determineTrickWinner(trick)).toBe('player1');
    });

    test('7♦ leads trump, A♦ played - A♦ wins (highest non-face trump)', () => {
      const trick = [
        play('player1', '7', 'diamonds'),
        play('player2', '8', 'diamonds'),
        play('player3', '9', 'diamonds'),
        play('player4', 'K', 'diamonds'),
        play('player5', 'A', 'diamonds'),
      ];
      expect(determineTrickWinner(trick)).toBe('player5');
    });

    test('A♥ leads, others play off-suit aces - A♥ wins (only hearts follow suit)', () => {
      const trick = [
        play('player1', 'A', 'hearts'),
        play('player2', 'A', 'spades'),
        play('player3', 'A', 'clubs'),
        play('player4', 'K', 'hearts'),
        play('player5', '10', 'hearts'),
      ];
      expect(determineTrickWinner(trick)).toBe('player1');
    });

    test('A♠ leads, no one follows suit - lead wins', () => {
      const trick = [
        play('player1', 'A', 'spades'),
        play('player2', 'K', 'clubs'),
        play('player3', '10', 'hearts'),
        play('player4', '9', 'clubs'),
        play('player5', '8', 'hearts'),
      ];
      expect(determineTrickWinner(trick)).toBe('player1');
    });
  });

  describe('Trump Always Wins', () => {
    test('Single trump in trick - 7♦ beats all fail', () => {
      const trick = [
        play('player1', 'A', 'hearts'),
        play('player2', 'K', 'hearts'),
        play('player3', '7', 'diamonds'),
        play('player4', '10', 'hearts'),
        play('player5', '9', 'hearts'),
      ];
      expect(determineTrickWinner(trick)).toBe('player3');
    });

    test('Multiple trump - J♦ beats 7♦', () => {
      const trick = [
        play('player1', '7', 'diamonds'),
        play('player2', 'A', 'hearts'),
        play('player3', 'J', 'diamonds'),
        play('player4', 'K', 'hearts'),
        play('player5', '10', 'hearts'),
      ];
      expect(determineTrickWinner(trick)).toBe('player3');
    });

    test('Lead trump, all follow fail - Q♣ wins', () => {
      const trick = [
        play('player1', 'Q', 'clubs'),
        play('player2', 'A', 'hearts'),
        play('player3', 'A', 'spades'),
        play('player4', 'A', 'clubs'),
        play('player5', 'K', 'hearts'),
      ];
      expect(determineTrickWinner(trick)).toBe('player1');
    });
  });

  describe('Lead Suit Matters', () => {
    test('Hearts led - K♥ beats others who didnt follow', () => {
      const trick = [
        play('player1', '7', 'hearts'),
        play('player2', 'A', 'spades'),
        play('player3', 'A', 'clubs'),
        play('player4', 'K', 'hearts'),
        play('player5', '8', 'hearts'),
      ];
      expect(determineTrickWinner(trick)).toBe('player4');
    });

    test('Spades led, only 8♠ follows - 8♠ wins', () => {
      const trick = [
        play('player1', '7', 'spades'),
        play('player2', 'A', 'hearts'),
        play('player3', '8', 'spades'),
        play('player4', 'A', 'clubs'),
        play('player5', 'K', 'hearts'),
      ];
      expect(determineTrickWinner(trick)).toBe('player3');
    });

    test('Trump led (7♦), 8♦ follows - 8♦ wins', () => {
      const trick = [
        play('player1', '7', 'diamonds'),
        play('player2', 'A', 'hearts'),
        play('player3', '8', 'diamonds'),
        play('player4', 'A', 'clubs'),
        play('player5', 'K', 'hearts'),
      ];
      expect(determineTrickWinner(trick)).toBe('player3');
    });
  });
});

describe('Following Suit Rules', () => {
  describe('Must Follow Suit', () => {
    test('Hand has hearts, hearts led - must play hearts', () => {
      const hand = [card('A', 'hearts'), card('K', 'hearts'), card('10', 'spades'), card('9', 'clubs')];
      const trick = [play('other', 'Q', 'hearts')]; // Q♥ is trump, but let's use a fail lead
      // Actually Q♥ is trump. Let me use 7♥ as lead
      const trickFail = [{ playerId: 'other', card: card('7', 'hearts') }];
      const playable = getPlayableCards(hand, trickFail);

      expect(playable.map(c => c.id)).toContain('A_hearts');
      expect(playable.map(c => c.id)).toContain('K_hearts');
      expect(playable.length).toBe(2);
    });

    test('Hand has trump, trump led - must play trump', () => {
      const hand = [card('Q', 'clubs'), card('J', 'hearts'), card('7', 'diamonds'), card('A', 'spades')];
      const trick = [{ playerId: 'other', card: card('8', 'diamonds') }];
      const playable = getPlayableCards(hand, trick);

      expect(playable.map(c => c.id)).toContain('Q_clubs');
      expect(playable.map(c => c.id)).toContain('J_hearts');
      expect(playable.map(c => c.id)).toContain('7_diamonds');
      expect(playable.length).toBe(3);
    });

    test('Hand all spades, spades led - all playable', () => {
      const hand = [card('A', 'spades'), card('K', 'spades'), card('10', 'spades'), card('7', 'spades')];
      const trick = [{ playerId: 'other', card: card('9', 'spades') }];
      const playable = getPlayableCards(hand, trick);

      expect(playable.length).toBe(4);
    });

    test('Hand has clubs, clubs led - only clubs playable', () => {
      const hand = [card('A', 'hearts'), card('K', 'spades'), card('10', 'clubs'), card('9', 'clubs')];
      const trick = [{ playerId: 'other', card: card('7', 'clubs') }];
      const playable = getPlayableCards(hand, trick);

      expect(playable.map(c => c.id)).toContain('10_clubs');
      expect(playable.map(c => c.id)).toContain('9_clubs');
      expect(playable.length).toBe(2);
    });
  });

  describe('Cannot Follow Suit', () => {
    test('No clubs in hand, clubs led - play anything', () => {
      const hand = [card('A', 'hearts'), card('K', 'hearts'), card('10', 'spades'), card('9', 'spades')];
      const trick = [{ playerId: 'other', card: card('7', 'clubs') }];
      const playable = getPlayableCards(hand, trick);

      expect(playable.length).toBe(4);
    });

    test('No trump in hand, trump led - play anything', () => {
      const hand = [card('A', 'hearts'), card('K', 'spades'), card('10', 'clubs')];
      const trick = [{ playerId: 'other', card: card('7', 'diamonds') }];
      const playable = getPlayableCards(hand, trick);

      expect(playable.length).toBe(3);
    });

    test('J♥ is trump not hearts - no hearts to follow', () => {
      const hand = [card('Q', 'clubs'), card('J', 'hearts'), card('7', 'diamonds')];
      const trick = [{ playerId: 'other', card: card('A', 'hearts') }];
      const playable = getPlayableCards(hand, trick);

      // All cards are trump, none are hearts - can play anything
      expect(playable.length).toBe(3);
    });
  });

  describe('Edge Case: Jacks and Queens', () => {
    test('Q♥ and J♥ are trump, not hearts - only A♥, K♥ follow hearts', () => {
      const hand = [card('Q', 'hearts'), card('J', 'hearts'), card('A', 'hearts'), card('K', 'hearts')];
      const trick = [{ playerId: 'other', card: card('10', 'hearts') }];
      const playable = getPlayableCards(hand, trick);

      expect(playable.map(c => c.id)).toContain('A_hearts');
      expect(playable.map(c => c.id)).toContain('K_hearts');
      expect(playable.length).toBe(2);
    });

    test('Only Q♥, J♥, 7♦ in hand, hearts led - no actual hearts, play anything', () => {
      const hand = [card('Q', 'hearts'), card('J', 'hearts'), card('7', 'diamonds')];
      const trick = [{ playerId: 'other', card: card('A', 'hearts') }];
      const playable = getPlayableCards(hand, trick);

      expect(playable.length).toBe(3);
    });

    test('Q♥, J♥, 7♦ in hand, trump led - all are trump, all playable', () => {
      const hand = [card('Q', 'hearts'), card('J', 'hearts'), card('7', 'diamonds')];
      const trick = [{ playerId: 'other', card: card('8', 'diamonds') }];
      const playable = getPlayableCards(hand, trick);

      expect(playable.length).toBe(3);
    });
  });
});

describe('Leading a Trick', () => {
  test('No called suit, not picker/partner - can lead anything', () => {
    const hand = [card('A', 'hearts'), card('K', 'hearts'), card('Q', 'clubs'), card('7', 'diamonds')];
    const trick = []; // Leading
    const playable = getPlayableCards(hand, trick, null, false, false, false);

    expect(playable.length).toBe(4);
  });

  test('Called suit is spades, not picker/partner - can lead anything', () => {
    const hand = [card('A', 'hearts'), card('K', 'hearts'), card('Q', 'clubs'), card('7', 'diamonds')];
    const trick = []; // Leading
    const playable = getPlayableCards(hand, trick, 'spades', false, false, false);

    expect(playable.length).toBe(4);
  });
});

describe('Partner Rules', () => {
  describe('Partner Must Lead Ace If Leading Called Suit (Unless Running)', () => {
    test('Has ace + 2 others (3 total) - can only lead ace or non-hearts', () => {
      const hand = [card('A', 'hearts'), card('K', 'hearts'), card('10', 'hearts'), card('Q', 'clubs')];
      const trick = []; // Leading
      // Partner has called ace, called suit is hearts
      const playable = getPlayableCards(hand, trick, 'hearts', false, false, true);

      // Can lead A♥ or Q♣, but NOT K♥ or 10♥
      expect(playable.map(c => c.id)).toContain('A_hearts');
      expect(playable.map(c => c.id)).toContain('Q_clubs');
      expect(playable.map(c => c.id)).not.toContain('K_hearts');
      expect(playable.map(c => c.id)).not.toContain('10_hearts');
    });

    test('Has ace + 1 other (2 total) - can only lead ace or non-hearts', () => {
      const hand = [card('A', 'hearts'), card('K', 'hearts'), card('Q', 'clubs'), card('7', 'diamonds')];
      const trick = []; // Leading
      const playable = getPlayableCards(hand, trick, 'hearts', false, false, true);

      expect(playable.map(c => c.id)).toContain('A_hearts');
      expect(playable.map(c => c.id)).toContain('Q_clubs');
      expect(playable.map(c => c.id)).toContain('7_diamonds');
      expect(playable.map(c => c.id)).not.toContain('K_hearts');
    });

    test('Has only ace (1 heart) - can lead anything', () => {
      const hand = [card('A', 'hearts'), card('Q', 'clubs'), card('7', 'diamonds'), card('8', 'diamonds')];
      const trick = []; // Leading
      const playable = getPlayableCards(hand, trick, 'hearts', false, false, true);

      expect(playable.length).toBe(4);
    });

    test('Has 4+ hearts (running) - can lead any heart', () => {
      const hand = [card('A', 'hearts'), card('K', 'hearts'), card('10', 'hearts'), card('9', 'hearts'), card('Q', 'clubs')];
      const trick = []; // Leading
      const playable = getPlayableCards(hand, trick, 'hearts', false, false, true);

      expect(playable.length).toBe(5);
    });
  });

  describe('Partner Must Play Ace When Called Suit Led', () => {
    test('Has called ace, called suit led - must play ace', () => {
      const hand = [card('A', 'hearts'), card('K', 'hearts'), card('10', 'hearts')];
      const trick = [{ playerId: 'other', card: card('7', 'hearts') }];
      // Partner has called ace, hearts is called suit
      const playable = getPlayableCards(hand, trick, 'hearts', true, false, true);

      expect(playable.length).toBe(1);
      expect(playable[0].id).toBe('A_hearts');
    });

    test('Does not have called ace, called suit led - normal follow', () => {
      const hand = [card('K', 'hearts'), card('10', 'hearts'), card('9', 'hearts')];
      const trick = [{ playerId: 'other', card: card('7', 'hearts') }];
      const playable = getPlayableCards(hand, trick, 'hearts', true, false, false);

      expect(playable.length).toBe(3);
    });

    test('Has ace but called suit is different - normal follow', () => {
      const hand = [card('A', 'hearts'), card('K', 'hearts'), card('10', 'hearts')];
      const trick = [{ playerId: 'other', card: card('7', 'hearts') }];
      // Called suit is spades, not hearts
      const playable = getPlayableCards(hand, trick, 'spades', false, false, false);

      expect(playable.length).toBe(3);
    });
  });
});

describe('Picker Rules', () => {
  describe('Picker Must Keep Called Suit Card (Until Led)', () => {
    test('Only 1 card in called suit, suit not led - cannot play it', () => {
      const hand = [card('K', 'spades'), card('K', 'hearts'), card('10', 'hearts')];
      const trick = [{ playerId: 'other', card: card('7', 'diamonds') }]; // Trump led, picker can't follow
      // Picker, called suit is spades, not yet led
      const playable = getPlayableCards(hand, trick, 'spades', false, true, false);

      // Can't play K♠ (only spade, must keep it)
      expect(playable.map(c => c.id)).not.toContain('K_spades');
      expect(playable.map(c => c.id)).toContain('K_hearts');
      expect(playable.map(c => c.id)).toContain('10_hearts');
    });

    test('2 cards in called suit, suit not led - can play one', () => {
      const hand = [card('K', 'spades'), card('10', 'spades'), card('10', 'hearts')];
      const trick = [{ playerId: 'other', card: card('7', 'diamonds') }];
      const playable = getPlayableCards(hand, trick, 'spades', false, true, false);

      // Can play all - has 2 spades so can afford to play one
      expect(playable.length).toBe(3);
    });

    test('Called suit has been led - no restriction', () => {
      const hand = [card('K', 'spades'), card('K', 'hearts'), card('10', 'hearts')];
      const trick = [{ playerId: 'other', card: card('7', 'diamonds') }];
      // Called suit already led (calledSuitHasBeenLed = true)
      const playable = getPlayableCards(hand, trick, 'spades', true, true, false);

      expect(playable.length).toBe(3);
    });
  });

  describe('Picker Leading', () => {
    test('Picker can lead called suit (draws out ace)', () => {
      const hand = [card('K', 'spades'), card('K', 'hearts'), card('Q', 'clubs')];
      const trick = []; // Leading
      const playable = getPlayableCards(hand, trick, 'spades', false, true, false);

      // Picker CAN lead spades
      expect(playable.map(c => c.id)).toContain('K_spades');
      expect(playable.length).toBe(3);
    });

    test('Picker can lead either spade', () => {
      const hand = [card('K', 'spades'), card('10', 'spades'), card('Q', 'clubs')];
      const trick = []; // Leading
      const playable = getPlayableCards(hand, trick, 'spades', false, true, false);

      expect(playable.length).toBe(3);
    });

    test('Suit already led - no restriction', () => {
      const hand = [card('K', 'spades'), card('K', 'hearts'), card('Q', 'clubs')];
      const trick = []; // Leading
      const playable = getPlayableCards(hand, trick, 'spades', true, true, false);

      expect(playable.length).toBe(3);
    });
  });
});
