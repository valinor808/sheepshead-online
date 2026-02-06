/**
 * Schwanzer Tests
 * Generated from: docs/testing/test-cases-schwanzer.md
 */

const { SheepsheadGame } = require('../src/game/SheepsheadGame');
const { POINT_VALUES } = require('../src/game/constants');

// Helper to create a card object
function card(rank, suit) {
  return { rank, suit, id: `${rank}_${suit}`, points: POINT_VALUES[rank] };
}

/**
 * Set up a game in Schwanzer state with controlled hands.
 *
 * @param {Object} hands - { playerId: [card, card, ...] }
 */
function setupSchwanzerGame(hands) {
  const game = new SheepsheadGame('test-room');

  for (let i = 0; i < 5; i++) {
    game.addPlayer(`player${i}`, `Player ${i}`);
  }

  game.phase = 'scoring';
  game.isSchwanzer = true;

  for (const player of game.players) {
    game.hands[player.id] = hands[player.id] || [];
  }

  return game;
}

// Helper: sum all scores
function sumScores(scores) {
  return Object.values(scores).reduce((sum, s) => sum + s, 0);
}

// --- A. Schwanzer Point Calculation ---

describe('Schwanzer - Point Calculation', () => {
  test('A1: Queen of Hearts is worth 3 Schwanzer points', () => {
    const game = new SheepsheadGame('test-room');
    expect(game._calculateFailPoints([card('Q', 'hearts')])).toBe(3);
  });

  test('A2: Queen of Diamonds is worth 3 (not 3+1)', () => {
    const game = new SheepsheadGame('test-room');
    expect(game._calculateFailPoints([card('Q', 'diamonds')])).toBe(3);
  });

  test('A3: Jack of Spades is worth 2 Schwanzer points', () => {
    const game = new SheepsheadGame('test-room');
    expect(game._calculateFailPoints([card('J', 'spades')])).toBe(2);
  });

  test('A4: Jack of Diamonds is worth 2 (not 2+1)', () => {
    const game = new SheepsheadGame('test-room');
    expect(game._calculateFailPoints([card('J', 'diamonds')])).toBe(2);
  });

  test('A5: Ace of Diamonds is worth 1 Schwanzer point', () => {
    const game = new SheepsheadGame('test-room');
    expect(game._calculateFailPoints([card('A', 'diamonds')])).toBe(1);
  });

  test('A6: 7 of Diamonds is worth 1 Schwanzer point', () => {
    const game = new SheepsheadGame('test-room');
    expect(game._calculateFailPoints([card('7', 'diamonds')])).toBe(1);
  });

  test('A7: Ace of Hearts is worth 0 Schwanzer points', () => {
    const game = new SheepsheadGame('test-room');
    expect(game._calculateFailPoints([card('A', 'hearts')])).toBe(0);
  });

  test('A8: 10 of Spades is worth 0 Schwanzer points', () => {
    const game = new SheepsheadGame('test-room');
    expect(game._calculateFailPoints([card('10', 'spades')])).toBe(0);
  });

  test('A9: Full hand point calculation', () => {
    const game = new SheepsheadGame('test-room');
    // Q(3) + J(2) + diamond A(1) + diamond 7(1) + heart A(0) + spade 10(0) = 7
    const hand = [
      card('Q', 'hearts'),
      card('J', 'clubs'),
      card('A', 'diamonds'),
      card('7', 'diamonds'),
      card('A', 'hearts'),
      card('10', 'spades'),
    ];
    expect(game._calculateFailPoints(hand)).toBe(7);
  });
});

// --- B. Schwanzer Triggering ---

describe('Schwanzer - Triggering', () => {
  test('B1: Schwanzer triggered when all 5 players pass', () => {
    const game = new SheepsheadGame('test-room');
    for (let i = 0; i < 5; i++) {
      game.addPlayer(`player${i}`, `Player ${i}`);
    }
    game.startHand();

    // All 5 players pass in picking order
    const pickOrder = [];
    for (let i = 0; i < 5; i++) {
      const idx = (game.dealerIndex + 1 + i) % 5;
      pickOrder.push(game.players[idx].id);
    }

    for (let i = 0; i < 4; i++) {
      const result = game.pick(pickOrder[i], false);
      expect(result.success).toBe(true);
      expect(result.schwanzer).toBeUndefined();
    }

    const result = game.pick(pickOrder[4], false);
    expect(result.success).toBe(true);
    expect(result.schwanzer).toBe(true);
    expect(result.handComplete).toBe(true);
    expect(game.isSchwanzer).toBe(true);
    expect(game.phase).toBe('scoring');
  });

  test('B2: Schwanzer not triggered when a player picks', () => {
    const game = new SheepsheadGame('test-room');
    for (let i = 0; i < 5; i++) {
      game.addPlayer(`player${i}`, `Player ${i}`);
    }
    game.startHand();

    const firstPicker = game.players[(game.dealerIndex + 1) % 5].id;
    const result = game.pick(firstPicker, true);
    expect(result.success).toBe(true);
    expect(result.picked).toBe(true);
    expect(game.isSchwanzer).toBe(false);
    expect(game.phase).toBe('calling');
  });
});

// --- C. Schwanzer Scoring by Number of Losers ---

describe('Schwanzer - Scoring (1 loser)', () => {
  test('C1: 1 loser gets -4, each winner gets +1', () => {
    const game = setupSchwanzerGame({
      // player0: Q(3)+Q(3)+J(2)+J(2)+diamond(1)+diamond(1) = 12
      player0: [card('Q', 'hearts'), card('Q', 'spades'), card('J', 'hearts'), card('J', 'spades'), card('A', 'diamonds'), card('7', 'diamonds')],
      // player1-3: 0 points each (all fail cards)
      player1: [card('A', 'hearts'), card('10', 'hearts'), card('K', 'hearts'), card('9', 'hearts'), card('8', 'hearts'), card('7', 'hearts')],
      player2: [card('A', 'spades'), card('10', 'spades'), card('K', 'spades'), card('9', 'spades'), card('8', 'spades'), card('7', 'spades')],
      player3: [card('A', 'clubs'), card('10', 'clubs'), card('K', 'clubs'), card('9', 'clubs'), card('8', 'clubs'), card('7', 'clubs')],
      // player4: 5 points
      player4: [card('Q', 'clubs'), card('J', 'clubs'), card('K', 'hearts'), card('K', 'spades'), card('9', 'hearts'), card('9', 'spades')],
    });
    const result = game._scoreSchwanzer();
    expect(result.losers).toEqual(['player0']);
    expect(result.winners).toHaveLength(4);
    expect(result.scores.player0).toBe(-4);
    expect(result.scores.player1).toBe(1);
    expect(result.scores.player2).toBe(1);
    expect(result.scores.player3).toBe(1);
    expect(result.scores.player4).toBe(1);
  });
});

describe('Schwanzer - Scoring (2 losers)', () => {
  test('C2: 2 losers tied get -3 each, each winner gets +2', () => {
    const game = setupSchwanzerGame({
      // player0 and player1 tied at 8 points each: Q(3)+Q(3)+J(2)
      player0: [card('Q', 'hearts'), card('Q', 'spades'), card('J', 'hearts'), card('A', 'hearts'), card('10', 'hearts'), card('9', 'hearts')],
      player1: [card('Q', 'clubs'), card('Q', 'diamonds'), card('J', 'spades'), card('A', 'spades'), card('10', 'spades'), card('9', 'spades')],
      // player2-4: 0 points each
      player2: [card('7', 'hearts'), card('8', 'hearts'), card('K', 'hearts'), card('7', 'spades'), card('8', 'spades'), card('K', 'spades')],
      player3: [card('7', 'clubs'), card('8', 'clubs'), card('9', 'clubs'), card('10', 'clubs'), card('K', 'clubs'), card('A', 'clubs')],
      player4: [card('9', 'hearts'), card('9', 'spades'), card('9', 'clubs'), card('K', 'hearts'), card('K', 'spades'), card('K', 'clubs')],
    });
    const result = game._scoreSchwanzer();
    expect(result.losers).toHaveLength(2);
    expect(result.losers).toContain('player0');
    expect(result.losers).toContain('player1');
    expect(result.scores.player0).toBe(-3);
    expect(result.scores.player1).toBe(-3);
    expect(result.scores.player2).toBe(2);
    expect(result.scores.player3).toBe(2);
    expect(result.scores.player4).toBe(2);
  });
});

describe('Schwanzer - Scoring (3 losers)', () => {
  test('C3: 3 losers tied get -2 each, each winner gets +3', () => {
    const game = setupSchwanzerGame({
      // player0-2 tied at 5 points each: Q(3)+J(2)
      player0: [card('Q', 'hearts'), card('J', 'hearts'), card('A', 'hearts'), card('10', 'hearts'), card('9', 'hearts'), card('8', 'hearts')],
      player1: [card('Q', 'spades'), card('J', 'spades'), card('A', 'spades'), card('10', 'spades'), card('9', 'spades'), card('8', 'spades')],
      player2: [card('Q', 'clubs'), card('J', 'clubs'), card('A', 'clubs'), card('10', 'clubs'), card('9', 'clubs'), card('8', 'clubs')],
      // player3-4: 0 points each
      player3: [card('7', 'hearts'), card('7', 'spades'), card('7', 'clubs'), card('K', 'hearts'), card('K', 'spades'), card('K', 'clubs')],
      player4: [card('9', 'hearts'), card('9', 'spades'), card('9', 'clubs'), card('8', 'hearts'), card('8', 'spades'), card('8', 'clubs')],
    });
    const result = game._scoreSchwanzer();
    expect(result.losers).toHaveLength(3);
    expect(result.scores.player0).toBe(-2);
    expect(result.scores.player1).toBe(-2);
    expect(result.scores.player2).toBe(-2);
    expect(result.scores.player3).toBe(3);
    expect(result.scores.player4).toBe(3);
  });
});

describe('Schwanzer - Scoring (4 losers)', () => {
  test('C4: 4 losers tied get -1 each, 1 winner gets +4', () => {
    const game = setupSchwanzerGame({
      // player0-3 tied at 1 point each (one diamond card)
      player0: [card('7', 'diamonds'), card('A', 'hearts'), card('10', 'hearts'), card('9', 'hearts'), card('8', 'hearts'), card('7', 'hearts')],
      player1: [card('8', 'diamonds'), card('A', 'spades'), card('10', 'spades'), card('9', 'spades'), card('8', 'spades'), card('7', 'spades')],
      player2: [card('9', 'diamonds'), card('A', 'clubs'), card('10', 'clubs'), card('9', 'clubs'), card('8', 'clubs'), card('7', 'clubs')],
      player3: [card('10', 'diamonds'), card('K', 'hearts'), card('K', 'spades'), card('K', 'clubs'), card('9', 'hearts'), card('9', 'spades')],
      // player4: 0 points
      player4: [card('A', 'hearts'), card('10', 'hearts'), card('K', 'hearts'), card('9', 'hearts'), card('8', 'hearts'), card('7', 'hearts')],
    });
    const result = game._scoreSchwanzer();
    expect(result.losers).toHaveLength(4);
    expect(result.winners).toHaveLength(1);
    expect(result.scores.player0).toBe(-1);
    expect(result.scores.player1).toBe(-1);
    expect(result.scores.player2).toBe(-1);
    expect(result.scores.player3).toBe(-1);
    expect(result.scores.player4).toBe(4);
  });
});

describe('Schwanzer - Scoring (5-way tie)', () => {
  test('C5: All 5 players tied — everyone gets 0', () => {
    const game = setupSchwanzerGame({
      // All players have 0 Schwanzer points (only fail cards)
      player0: [card('A', 'hearts'), card('10', 'hearts'), card('K', 'hearts'), card('9', 'hearts'), card('8', 'hearts'), card('7', 'hearts')],
      player1: [card('A', 'spades'), card('10', 'spades'), card('K', 'spades'), card('9', 'spades'), card('8', 'spades'), card('7', 'spades')],
      player2: [card('A', 'clubs'), card('10', 'clubs'), card('K', 'clubs'), card('9', 'clubs'), card('8', 'clubs'), card('7', 'clubs')],
      player3: [card('K', 'hearts'), card('K', 'spades'), card('K', 'clubs'), card('9', 'hearts'), card('9', 'spades'), card('9', 'clubs')],
      player4: [card('8', 'hearts'), card('8', 'spades'), card('8', 'clubs'), card('7', 'hearts'), card('7', 'spades'), card('7', 'clubs')],
    });
    const result = game._scoreSchwanzer();
    expect(result.losers).toHaveLength(5);
    expect(result.winners).toHaveLength(0);
    expect(result.scores.player0).toBe(0);
    expect(result.scores.player1).toBe(0);
    expect(result.scores.player2).toBe(0);
    expect(result.scores.player3).toBe(0);
    expect(result.scores.player4).toBe(0);
  });
});

// --- D. Zero-Sum Verification ---

describe('Schwanzer - Zero-Sum', () => {
  test('D1: 1 loser — scores sum to zero', () => {
    const game = setupSchwanzerGame({
      player0: [card('Q', 'hearts'), card('Q', 'spades'), card('J', 'hearts'), card('J', 'spades'), card('A', 'diamonds'), card('7', 'diamonds')],
      player1: [card('A', 'hearts'), card('10', 'hearts'), card('K', 'hearts'), card('9', 'hearts'), card('8', 'hearts'), card('7', 'hearts')],
      player2: [card('A', 'spades'), card('10', 'spades'), card('K', 'spades'), card('9', 'spades'), card('8', 'spades'), card('7', 'spades')],
      player3: [card('A', 'clubs'), card('10', 'clubs'), card('K', 'clubs'), card('9', 'clubs'), card('8', 'clubs'), card('7', 'clubs')],
      player4: [card('7', 'diamonds'), card('8', 'diamonds'), card('9', 'hearts'), card('9', 'spades'), card('9', 'clubs'), card('K', 'diamonds')],
    });
    const result = game._scoreSchwanzer();
    expect(sumScores(result.scores)).toBe(0);
  });

  test('D2: 2 losers — scores sum to zero', () => {
    const game = setupSchwanzerGame({
      player0: [card('Q', 'hearts'), card('Q', 'spades'), card('J', 'hearts'), card('A', 'hearts'), card('10', 'hearts'), card('9', 'hearts')],
      player1: [card('Q', 'clubs'), card('Q', 'diamonds'), card('J', 'spades'), card('A', 'spades'), card('10', 'spades'), card('9', 'spades')],
      player2: [card('7', 'hearts'), card('8', 'hearts'), card('K', 'hearts'), card('7', 'spades'), card('8', 'spades'), card('K', 'spades')],
      player3: [card('7', 'clubs'), card('8', 'clubs'), card('9', 'clubs'), card('10', 'clubs'), card('K', 'clubs'), card('A', 'clubs')],
      player4: [card('9', 'hearts'), card('9', 'spades'), card('9', 'clubs'), card('K', 'hearts'), card('K', 'spades'), card('K', 'clubs')],
    });
    const result = game._scoreSchwanzer();
    expect(sumScores(result.scores)).toBe(0);
  });

  test('D3: 5-way tie — scores sum to zero', () => {
    const game = setupSchwanzerGame({
      player0: [card('A', 'hearts'), card('10', 'hearts'), card('K', 'hearts'), card('9', 'hearts'), card('8', 'hearts'), card('7', 'hearts')],
      player1: [card('A', 'spades'), card('10', 'spades'), card('K', 'spades'), card('9', 'spades'), card('8', 'spades'), card('7', 'spades')],
      player2: [card('A', 'clubs'), card('10', 'clubs'), card('K', 'clubs'), card('9', 'clubs'), card('8', 'clubs'), card('7', 'clubs')],
      player3: [card('K', 'hearts'), card('K', 'spades'), card('K', 'clubs'), card('9', 'hearts'), card('9', 'spades'), card('9', 'clubs')],
      player4: [card('8', 'hearts'), card('8', 'spades'), card('8', 'clubs'), card('7', 'hearts'), card('7', 'spades'), card('7', 'clubs')],
    });
    const result = game._scoreSchwanzer();
    expect(sumScores(result.scores)).toBe(0);
  });
});

// --- E. Result Structure ---

describe('Schwanzer - Result Structure', () => {
  let result;

  beforeAll(() => {
    const game = setupSchwanzerGame({
      // player0 is sole loser: Q(3)+Q(3)+J(2)+J(2)+diamond(1)+diamond(1) = 12
      player0: [card('Q', 'hearts'), card('Q', 'spades'), card('J', 'hearts'), card('J', 'spades'), card('A', 'diamonds'), card('7', 'diamonds')],
      // player1: diamond(1) = 1
      player1: [card('8', 'diamonds'), card('10', 'hearts'), card('K', 'hearts'), card('9', 'hearts'), card('8', 'hearts'), card('7', 'hearts')],
      // player2-4: 0 points
      player2: [card('A', 'spades'), card('10', 'spades'), card('K', 'spades'), card('9', 'spades'), card('8', 'spades'), card('7', 'spades')],
      player3: [card('A', 'clubs'), card('10', 'clubs'), card('K', 'clubs'), card('9', 'clubs'), card('8', 'clubs'), card('7', 'clubs')],
      player4: [card('A', 'hearts'), card('K', 'hearts'), card('9', 'hearts'), card('K', 'spades'), card('9', 'spades'), card('7', 'spades')],
    });
    result = game._scoreSchwanzer();
  });

  test('E1: Result type is "schwanzer"', () => {
    expect(result.type).toBe('schwanzer');
  });

  test('E2: Losers array contains player(s) with max points', () => {
    expect(result.losers).toEqual(['player0']);
  });

  test('E3: Winners array contains all other players', () => {
    expect(result.winners).toHaveLength(4);
    expect(result.winners).toContain('player1');
    expect(result.winners).toContain('player2');
    expect(result.winners).toContain('player3');
    expect(result.winners).toContain('player4');
  });

  test('E4: playerSchwanzerPoints has per-player totals', () => {
    expect(result.playerSchwanzerPoints.player0).toBe(12);
    expect(result.playerSchwanzerPoints.player1).toBe(1);
    expect(result.playerSchwanzerPoints.player2).toBe(0);
    expect(result.playerSchwanzerPoints.player3).toBe(0);
    expect(result.playerSchwanzerPoints.player4).toBe(0);
  });

  test('E5: maxSchwanzerPoints is the highest total', () => {
    expect(result.maxSchwanzerPoints).toBe(12);
  });

  test('E6: scores maps each player to their +/- score', () => {
    expect(result.scores.player0).toBe(-4);
    expect(result.scores.player1).toBe(1);
    expect(result.scores.player2).toBe(1);
    expect(result.scores.player3).toBe(1);
    expect(result.scores.player4).toBe(1);
  });
});
