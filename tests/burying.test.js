/**
 * Burying Tests
 * Generated from: docs/testing/test-cases-burying.md
 */

const { SheepsheadGame } = require('../src/game/SheepsheadGame');
const { POINT_VALUES } = require('../src/game/constants');

// Helper to create a card object
function card(rank, suit) {
  return { rank, suit, id: `${rank}_${suit}`, points: POINT_VALUES[rank] };
}

// Helper to set up a game in burying phase with a specific picker hand
function setupBuryGame(pickerHand, { calledSuit = null, underCardId = null } = {}) {
  const game = new SheepsheadGame('test-room');

  for (let i = 0; i < 5; i++) {
    game.addPlayer(`player${i}`, `Player ${i}`);
  }

  game.phase = 'burying';
  game.picker = 'player0';
  game.dealerIndex = 0;
  game.hands['player0'] = pickerHand;
  game.calledSuit = calledSuit;
  game.underCardId = underCardId;

  return game;
}

// --- A. Basic Validation ---

describe('Burying - Basic Validation', () => {
  const hand = [
    card('Q', 'clubs'), card('J', 'hearts'), card('7', 'diamonds'), card('8', 'diamonds'),
    card('A', 'hearts'), card('K', 'hearts'), card('9', 'spades'), card('10', 'spades'),
  ];

  test('A1: Rejects bury during wrong phase', () => {
    const game = setupBuryGame([...hand]);
    game.phase = 'calling';
    const result = game.bury('player0', ['A_hearts', 'K_hearts']);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not in burying phase');
  });

  test('A2: Rejects bury from non-picker', () => {
    const game = setupBuryGame([...hand]);
    const result = game.bury('player1', ['A_hearts', 'K_hearts']);
    expect(result.success).toBe(false);
    expect(result.error).toBe('You are not the picker');
  });

  test('A3: Rejects burying 1 card', () => {
    const game = setupBuryGame([...hand]);
    const result = game.bury('player0', ['A_hearts']);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Must bury exactly 2');
  });

  test('A4: Rejects burying 3 cards', () => {
    const game = setupBuryGame([...hand]);
    const result = game.bury('player0', ['A_hearts', 'K_hearts', '9_spades']);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Must bury exactly 2');
  });

  test('A5: Rejects burying a card not in hand', () => {
    const game = setupBuryGame([...hand]);
    const result = game.bury('player0', ['A_hearts', 'A_clubs']);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Card not in hand');
  });
});

// --- B. Can Bury Any Card (Including Queens and Jacks) ---

describe('Burying - Can Bury Any Card', () => {
  test('B1: Can bury Queens', () => {
    const hand = [
      card('Q', 'clubs'), card('Q', 'spades'), card('J', 'clubs'), card('J', 'spades'),
      card('J', 'hearts'), card('J', 'diamonds'), card('A', 'hearts'), card('K', 'hearts'),
    ];
    const game = setupBuryGame(hand);
    const result = game.bury('player0', ['Q_clubs', 'Q_spades']);
    expect(result.success).toBe(true);
  });

  test('B2: Can bury Jacks', () => {
    const hand = [
      card('Q', 'clubs'), card('Q', 'spades'), card('J', 'clubs'), card('J', 'spades'),
      card('J', 'hearts'), card('J', 'diamonds'), card('A', 'hearts'), card('K', 'hearts'),
    ];
    const game = setupBuryGame(hand);
    const result = game.bury('player0', ['J_clubs', 'J_spades']);
    expect(result.success).toBe(true);
  });

  test('B3: Can bury non-trump fail cards', () => {
    const hand = [
      card('Q', 'clubs'), card('Q', 'spades'), card('J', 'clubs'), card('J', 'spades'),
      card('J', 'hearts'), card('J', 'diamonds'), card('A', 'hearts'), card('K', 'hearts'),
    ];
    const game = setupBuryGame(hand);
    const result = game.bury('player0', ['A_hearts', 'K_hearts']);
    expect(result.success).toBe(true);
  });

  test('B4: Can bury low trump (diamonds)', () => {
    const hand = [
      card('Q', 'clubs'), card('J', 'hearts'), card('7', 'diamonds'), card('8', 'diamonds'),
      card('9', 'diamonds'), card('A', 'hearts'), card('K', 'spades'), card('10', 'spades'),
    ];
    const game = setupBuryGame(hand);
    const result = game.bury('player0', ['7_diamonds', '8_diamonds']);
    expect(result.success).toBe(true);
  });
});

// --- C. Hold Card Requirement ---

describe('Burying - Hold Card Requirement', () => {
  test('C1: Rejects burying all cards of called suit', () => {
    const hand = [
      card('Q', 'clubs'), card('J', 'hearts'), card('7', 'diamonds'), card('8', 'diamonds'),
      card('A', 'hearts'), card('K', 'hearts'), card('9', 'spades'), card('10', 'spades'),
    ];
    const game = setupBuryGame(hand, { calledSuit: 'hearts' });
    const result = game.bury('player0', ['A_hearts', 'K_hearts']);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Must keep at least one hearts');
  });

  test('C2: Allows burying one of called suit if another remains', () => {
    const hand = [
      card('Q', 'clubs'), card('J', 'hearts'), card('7', 'diamonds'), card('8', 'diamonds'),
      card('A', 'hearts'), card('K', 'hearts'), card('9', 'spades'), card('10', 'spades'),
    ];
    const game = setupBuryGame(hand, { calledSuit: 'hearts' });
    const result = game.bury('player0', ['A_hearts', '9_spades']);
    expect(result.success).toBe(true);
  });

  test('C3: Allows burying when multiple called suit cards remain', () => {
    const hand = [
      card('Q', 'clubs'), card('J', 'hearts'), card('7', 'diamonds'), card('8', 'diamonds'),
      card('A', 'hearts'), card('K', 'hearts'), card('9', 'hearts'), card('10', 'spades'),
    ];
    const game = setupBuryGame(hand, { calledSuit: 'hearts' });
    const result = game.bury('player0', ['A_hearts', '10_spades']);
    expect(result.success).toBe(true);
  });

  test('C4: No hold card needed when going alone', () => {
    const hand = [
      card('Q', 'clubs'), card('J', 'hearts'), card('7', 'diamonds'), card('8', 'diamonds'),
      card('A', 'hearts'), card('K', 'hearts'), card('9', 'spades'), card('10', 'spades'),
    ];
    const game = setupBuryGame(hand); // no calledSuit
    const result = game.bury('player0', ['A_hearts', 'K_hearts']);
    expect(result.success).toBe(true);
  });

  test('C5: Alone picker can bury all fail cards and play with all trump', () => {
    const hand = [
      card('Q', 'clubs'), card('Q', 'spades'), card('J', 'clubs'), card('J', 'spades'),
      card('J', 'hearts'), card('J', 'diamonds'), card('A', 'hearts'), card('9', 'spades'),
    ];
    const game = setupBuryGame(hand); // no calledSuit
    const result = game.bury('player0', ['A_hearts', '9_spades']);
    expect(result.success).toBe(true);
    // Remaining hand should be all trump
    expect(game.hands['player0'].length).toBe(6);
    expect(game.hands['player0'].every(c => c.rank === 'Q' || c.rank === 'J')).toBe(true);
  });
});

// --- D. Cannot Bury the Under Card ---

describe('Burying - Under Card', () => {
  const hand = [
    card('Q', 'clubs'), card('Q', 'spades'), card('J', 'clubs'), card('J', 'spades'),
    card('A', 'hearts'), card('A', 'spades'), card('7', 'diamonds'), card('8', 'diamonds'),
  ];

  test('D1: Rejects burying the under card', () => {
    const game = setupBuryGame([...hand], { underCardId: '7_diamonds' });
    const result = game.bury('player0', ['7_diamonds', '8_diamonds']);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Cannot bury your under card');
  });

  test('D2: Allows burying other cards when under call is active', () => {
    const game = setupBuryGame([...hand], { underCardId: '7_diamonds' });
    const result = game.bury('player0', ['A_hearts', 'A_spades']);
    expect(result.success).toBe(true);
  });
});

// --- E. Successful Bury State Changes ---

describe('Burying - Successful State Changes', () => {
  test('E1: Hand reduced to 6 cards after burying', () => {
    const hand = [
      card('Q', 'clubs'), card('J', 'hearts'), card('7', 'diamonds'), card('8', 'diamonds'),
      card('A', 'hearts'), card('K', 'hearts'), card('9', 'spades'), card('10', 'spades'),
    ];
    const game = setupBuryGame(hand);
    const result = game.bury('player0', ['9_spades', '10_spades']);
    expect(result.success).toBe(true);
    expect(game.hands['player0'].length).toBe(6);
  });

  test('E2: Buried cards stored in game.buried', () => {
    const hand = [
      card('Q', 'clubs'), card('J', 'hearts'), card('7', 'diamonds'), card('8', 'diamonds'),
      card('A', 'hearts'), card('K', 'hearts'), card('9', 'spades'), card('10', 'spades'),
    ];
    const game = setupBuryGame(hand);
    game.bury('player0', ['9_spades', '10_spades']);
    expect(game.buried.length).toBe(2);
    expect(game.buried.some(c => c.id === '9_spades')).toBe(true);
    expect(game.buried.some(c => c.id === '10_spades')).toBe(true);
  });

  test('E3: Phase advances to playing', () => {
    const hand = [
      card('Q', 'clubs'), card('J', 'hearts'), card('7', 'diamonds'), card('8', 'diamonds'),
      card('A', 'hearts'), card('K', 'hearts'), card('9', 'spades'), card('10', 'spades'),
    ];
    const game = setupBuryGame(hand);
    game.bury('player0', ['9_spades', '10_spades']);
    expect(game.phase).toBe('playing');
  });
});
