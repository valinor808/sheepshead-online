/**
 * Scoring Tests (Normal Hand)
 * Generated from: docs/testing/test-cases-scoring.md
 */

const { SheepsheadGame } = require('../src/game/SheepsheadGame');
const { POINT_VALUES } = require('../src/game/constants');

// Helper to create a card object
function card(rank, suit) {
  return { rank, suit, id: `${rank}_${suit}`, points: POINT_VALUES[rank] };
}

/**
 * Set up a game ready for scoring with controlled trick results.
 *
 * @param {Object} options
 * @param {string} options.picker - picker player id
 * @param {string|null} options.partner - partner player id (null = alone)
 * @param {Object} options.trickPoints - { playerId: totalPoints } for points won from tricks
 * @param {number} options.trickCounts - { playerId: numberOfTricksWon }
 * @param {Array} options.buried - cards in the buried pile
 */
function setupScoringGame({ picker, partner = null, trickPoints, trickCounts, buried = [] }) {
  const game = new SheepsheadGame('test-room');

  for (let i = 0; i < 5; i++) {
    game.addPlayer(`player${i}`, `Player ${i}`);
  }

  game.phase = 'scoring';
  game.picker = picker;
  game.partner = partner;
  game.buried = buried;

  // Set up tricksWon with fake trick objects that have the right points and counts
  game.tricksWon = {};
  for (const player of game.players) {
    const pts = trickPoints[player.id] || 0;
    const count = trickCounts[player.id] || 0;
    game.tricksWon[player.id] = [];
    // Distribute points across tricks (put all points in first trick if any)
    for (let i = 0; i < count; i++) {
      game.tricksWon[player.id].push({ points: i === 0 ? pts : 0 });
    }
  }

  return game;
}

// Helper: sum all scores
function sumScores(scores) {
  return Object.values(scores).reduce((sum, s) => sum + s, 0);
}

// --- A. Win Threshold ---

describe('Scoring - Win Threshold', () => {
  test('A1: Picker wins with exactly 61 points', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: 'player1',
      trickPoints: { player0: 51, player1: 10, player2: 20, player3: 20, player4: 19 },
      trickCounts: { player0: 2, player1: 1, player2: 1, player3: 1, player4: 1 },
    });
    const result = game._scoreNormalHand();
    expect(result.pickersWin).toBe(true);
    expect(result.pickingPoints).toBe(61);
  });

  test('A2: Defenders win when picker has exactly 60', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: 'player1',
      trickPoints: { player0: 50, player1: 10, player2: 20, player3: 20, player4: 20 },
      trickCounts: { player0: 2, player1: 1, player2: 1, player3: 1, player4: 1 },
    });
    const result = game._scoreNormalHand();
    expect(result.pickersWin).toBe(false);
    expect(result.pickingPoints).toBe(60);
  });

  test('A3: Picker wins comfortably, no schneider', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: 'player1',
      trickPoints: { player0: 60, player1: 20, player2: 15, player3: 15, player4: 10 },
      trickCounts: { player0: 2, player1: 1, player2: 1, player3: 1, player4: 1 },
    });
    const result = game._scoreNormalHand();
    expect(result.pickersWin).toBe(true);
    expect(result.schneider).toBe(false);
    expect(result.pickingPoints).toBe(80);
  });

  test('A4: Defenders win comfortably, no schneider', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: 'player1',
      trickPoints: { player0: 30, player1: 10, player2: 30, player3: 30, player4: 20 },
      trickCounts: { player0: 1, player1: 1, player2: 2, player3: 1, player4: 1 },
    });
    const result = game._scoreNormalHand();
    expect(result.pickersWin).toBe(false);
    expect(result.schneider).toBe(false);
    expect(result.defendingPoints).toBe(80);
  });
});

// --- B. Schneider ---

describe('Scoring - Schneider', () => {
  test('B1: Picker Schneider at 91 points (defenders have 29)', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: 'player1',
      trickPoints: { player0: 71, player1: 20, player2: 15, player3: 10, player4: 4 },
      trickCounts: { player0: 3, player1: 1, player2: 1, player3: 1, player4: 0 },
    });
    const result = game._scoreNormalHand();
    expect(result.pickersWin).toBe(true);
    expect(result.schneider).toBe(true);
    expect(result.multiplier).toBe(2);
    expect(result.pickingPoints).toBe(91);
  });

  test('B2: Picker wins with 90 — no Schneider', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: 'player1',
      trickPoints: { player0: 70, player1: 20, player2: 15, player3: 10, player4: 5 },
      trickCounts: { player0: 3, player1: 1, player2: 1, player3: 1, player4: 0 },
    });
    const result = game._scoreNormalHand();
    expect(result.pickersWin).toBe(true);
    expect(result.schneider).toBe(false);
    expect(result.multiplier).toBe(1);
    expect(result.pickingPoints).toBe(90);
  });

  test('B3: Defender Schneider at 90 points (picker has 30)', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: 'player1',
      trickPoints: { player0: 20, player1: 10, player2: 30, player3: 30, player4: 30 },
      trickCounts: { player0: 1, player1: 1, player2: 2, player3: 1, player4: 1 },
    });
    const result = game._scoreNormalHand();
    expect(result.pickersWin).toBe(false);
    expect(result.schneider).toBe(true);
    expect(result.multiplier).toBe(2);
    expect(result.defendingPoints).toBe(90);
  });

  test('B4: Defenders win with 89 — no Schneider (picker has 31)', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: 'player1',
      trickPoints: { player0: 21, player1: 10, player2: 30, player3: 30, player4: 29 },
      trickCounts: { player0: 1, player1: 1, player2: 2, player3: 1, player4: 1 },
    });
    const result = game._scoreNormalHand();
    expect(result.pickersWin).toBe(false);
    expect(result.schneider).toBe(false);
    expect(result.multiplier).toBe(1);
    expect(result.defendingPoints).toBe(89);
  });
});

// --- C. Schwarz ---

describe('Scoring - Schwarz', () => {
  test('C1: Picker Schwarz — defenders win 0 tricks', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: 'player1',
      trickPoints: { player0: 80, player1: 40 },
      trickCounts: { player0: 4, player1: 2 },
    });
    const result = game._scoreNormalHand();
    expect(result.pickersWin).toBe(true);
    expect(result.schwarz).toBe(true);
    expect(result.multiplier).toBe(3);
  });

  test('C2: Defender Schwarz — picking team wins 0 tricks', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: 'player1',
      trickPoints: { player2: 50, player3: 40, player4: 30 },
      trickCounts: { player2: 3, player3: 2, player4: 1 },
    });
    const result = game._scoreNormalHand();
    expect(result.pickersWin).toBe(false);
    expect(result.schwarz).toBe(true);
    expect(result.multiplier).toBe(3);
  });

  test('C3: Defenders win 1 trick with 0 points — Schneider but not Schwarz', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: 'player1',
      trickPoints: { player0: 80, player1: 40, player2: 0 },
      trickCounts: { player0: 3, player1: 2, player2: 1 },
    });
    const result = game._scoreNormalHand();
    expect(result.pickersWin).toBe(true);
    expect(result.schwarz).toBe(false);
    expect(result.schneider).toBe(true);
    expect(result.multiplier).toBe(2);
  });
});

// --- D. Score Distribution ---

describe('Scoring - Normal Call Distribution', () => {
  test('D1: Picker wins base — picker +2, partner +1, defenders -1', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: 'player1',
      trickPoints: { player0: 51, player1: 10, player2: 20, player3: 20, player4: 19 },
      trickCounts: { player0: 2, player1: 1, player2: 1, player3: 1, player4: 1 },
    });
    const result = game._scoreNormalHand();
    expect(result.scores.player0).toBe(2);
    expect(result.scores.player1).toBe(1);
    expect(result.scores.player2).toBe(-1);
    expect(result.scores.player3).toBe(-1);
    expect(result.scores.player4).toBe(-1);
  });

  test('D2: Defenders win base — picker -2, partner -1, defenders +1', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: 'player1',
      trickPoints: { player0: 40, player1: 10, player2: 30, player3: 20, player4: 20 },
      trickCounts: { player0: 2, player1: 1, player2: 1, player3: 1, player4: 1 },
    });
    const result = game._scoreNormalHand();
    expect(result.scores.player0).toBe(-2);
    expect(result.scores.player1).toBe(-1);
    expect(result.scores.player2).toBe(1);
    expect(result.scores.player3).toBe(1);
    expect(result.scores.player4).toBe(1);
  });

  test('D3: Picker wins Schneider — picker +4, partner +2, defenders -2', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: 'player1',
      trickPoints: { player0: 71, player1: 20, player2: 15, player3: 10, player4: 4 },
      trickCounts: { player0: 3, player1: 1, player2: 1, player3: 1, player4: 0 },
    });
    const result = game._scoreNormalHand();
    expect(result.scores.player0).toBe(4);
    expect(result.scores.player1).toBe(2);
    expect(result.scores.player2).toBe(-2);
    expect(result.scores.player3).toBe(-2);
    expect(result.scores.player4).toBe(-2);
  });

  test('D4: Defenders win Schneider — picker -4, partner -2, defenders +2', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: 'player1',
      trickPoints: { player0: 20, player1: 10, player2: 30, player3: 30, player4: 30 },
      trickCounts: { player0: 1, player1: 1, player2: 2, player3: 1, player4: 1 },
    });
    const result = game._scoreNormalHand();
    expect(result.scores.player0).toBe(-4);
    expect(result.scores.player1).toBe(-2);
    expect(result.scores.player2).toBe(2);
    expect(result.scores.player3).toBe(2);
    expect(result.scores.player4).toBe(2);
  });

  test('D5: Picker wins Schwarz — picker +6, partner +3, defenders -3', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: 'player1',
      trickPoints: { player0: 80, player1: 40 },
      trickCounts: { player0: 4, player1: 2 },
    });
    const result = game._scoreNormalHand();
    expect(result.scores.player0).toBe(6);
    expect(result.scores.player1).toBe(3);
    expect(result.scores.player2).toBe(-3);
    expect(result.scores.player3).toBe(-3);
    expect(result.scores.player4).toBe(-3);
  });

  test('D6: Defenders win Schwarz — picker -6, partner -3, defenders +3', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: 'player1',
      trickPoints: { player2: 50, player3: 40, player4: 30 },
      trickCounts: { player2: 3, player3: 2, player4: 1 },
    });
    const result = game._scoreNormalHand();
    expect(result.scores.player0).toBe(-6);
    expect(result.scores.player1).toBe(-3);
    expect(result.scores.player2).toBe(3);
    expect(result.scores.player3).toBe(3);
    expect(result.scores.player4).toBe(3);
  });
});

describe('Scoring - Going Alone Distribution', () => {
  test('D7: Picker alone wins base — picker +4, defenders -1 each', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: null,
      trickPoints: { player0: 70, player1: 10, player2: 15, player3: 15, player4: 10 },
      trickCounts: { player0: 3, player1: 1, player2: 1, player3: 1, player4: 0 },
    });
    const result = game._scoreNormalHand();
    expect(result.scores.player0).toBe(4);
    expect(result.scores.player1).toBe(-1);
    expect(result.scores.player2).toBe(-1);
    expect(result.scores.player3).toBe(-1);
    expect(result.scores.player4).toBe(-1);
  });

  test('D8: Picker alone loses base — picker -4, defenders +1 each', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: null,
      trickPoints: { player0: 40, player1: 20, player2: 20, player3: 20, player4: 20 },
      trickCounts: { player0: 2, player1: 1, player2: 1, player3: 1, player4: 1 },
    });
    const result = game._scoreNormalHand();
    expect(result.scores.player0).toBe(-4);
    expect(result.scores.player1).toBe(1);
    expect(result.scores.player2).toBe(1);
    expect(result.scores.player3).toBe(1);
    expect(result.scores.player4).toBe(1);
  });

  test('D9: Picker alone wins Schneider — picker +8, defenders -2 each', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: null,
      trickPoints: { player0: 91, player1: 10, player2: 10, player3: 5, player4: 4 },
      trickCounts: { player0: 4, player1: 1, player2: 1, player3: 0, player4: 0 },
    });
    const result = game._scoreNormalHand();
    expect(result.scores.player0).toBe(8);
    expect(result.scores.player1).toBe(-2);
    expect(result.scores.player2).toBe(-2);
    expect(result.scores.player3).toBe(-2);
    expect(result.scores.player4).toBe(-2);
  });

  test('D10: Picker alone loses Schneider — picker -8, defenders +2 each', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: null,
      trickPoints: { player0: 30, player1: 30, player2: 30, player3: 20, player4: 10 },
      trickCounts: { player0: 1, player1: 2, player2: 2, player3: 1, player4: 0 },
    });
    const result = game._scoreNormalHand();
    expect(result.scores.player0).toBe(-8);
    expect(result.scores.player1).toBe(2);
    expect(result.scores.player2).toBe(2);
    expect(result.scores.player3).toBe(2);
    expect(result.scores.player4).toBe(2);
  });

  test('D11: Picker alone wins Schwarz — picker +12, defenders -3 each', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: null,
      trickPoints: { player0: 120 },
      trickCounts: { player0: 6 },
    });
    const result = game._scoreNormalHand();
    expect(result.scores.player0).toBe(12);
    expect(result.scores.player1).toBe(-3);
    expect(result.scores.player2).toBe(-3);
    expect(result.scores.player3).toBe(-3);
    expect(result.scores.player4).toBe(-3);
  });

  test('D12: Picker alone loses Schwarz — picker -12, defenders +3 each', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: null,
      trickPoints: { player1: 40, player2: 30, player3: 30, player4: 20 },
      trickCounts: { player1: 2, player2: 2, player3: 1, player4: 1 },
    });
    const result = game._scoreNormalHand();
    expect(result.scores.player0).toBe(-12);
    expect(result.scores.player1).toBe(3);
    expect(result.scores.player2).toBe(3);
    expect(result.scores.player3).toBe(3);
    expect(result.scores.player4).toBe(3);
  });
});

// --- E. Zero-Sum ---

describe('Scoring - Zero-Sum', () => {
  test('E1: Normal call scores sum to zero', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: 'player1',
      trickPoints: { player0: 51, player1: 10, player2: 20, player3: 20, player4: 19 },
      trickCounts: { player0: 2, player1: 1, player2: 1, player3: 1, player4: 1 },
    });
    const result = game._scoreNormalHand();
    expect(sumScores(result.scores)).toBe(0);
  });

  test('E2: Going alone scores sum to zero', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: null,
      trickPoints: { player0: 91, player1: 10, player2: 10, player3: 5, player4: 4 },
      trickCounts: { player0: 4, player1: 1, player2: 1, player3: 0, player4: 0 },
    });
    const result = game._scoreNormalHand();
    expect(sumScores(result.scores)).toBe(0);
  });
});

// --- F. Buried Points ---

describe('Scoring - Buried Points', () => {
  test('F1: Buried points push picker to 61 — wins', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: 'player1',
      trickPoints: { player0: 45, player1: 10, player2: 25, player3: 20, player4: 20 },
      trickCounts: { player0: 2, player1: 1, player2: 1, player3: 1, player4: 1 },
      buried: [card('K', 'hearts'), card('J', 'spades')], // 4 + 2 = 6 points
    });
    const result = game._scoreNormalHand();
    expect(result.buriedPoints).toBe(6);
    expect(result.pickingPoints).toBe(61); // 45 + 10 + 6 = 61
    expect(result.pickersWin).toBe(true);
  });

  test('F2: Buried points not enough — picker has 60, defenders win', () => {
    const game = setupScoringGame({
      picker: 'player0',
      partner: 'player1',
      trickPoints: { player0: 45, player1: 10, player2: 25, player3: 20, player4: 20 },
      trickCounts: { player0: 2, player1: 1, player2: 1, player3: 1, player4: 1 },
      buried: [card('Q', 'hearts'), card('J', 'spades')], // 3 + 2 = 5 points
    });
    const result = game._scoreNormalHand();
    expect(result.buriedPoints).toBe(5);
    expect(result.pickingPoints).toBe(60); // 45 + 10 + 5 = 60
    expect(result.pickersWin).toBe(false);
  });
});
