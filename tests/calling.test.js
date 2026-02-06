/**
 * Calling Tests (Under and Call 10)
 * Generated from: docs/testing/test-cases-tricks.md
 */

const { SheepsheadGame } = require('../src/game/SheepsheadGame');
const { determineTrickWinner } = require('../src/game/deck');
const { POINT_VALUES } = require('../src/game/constants');

// Helper to create a card object
function card(rank, suit) {
  return { rank, suit, id: `${rank}_${suit}`, points: POINT_VALUES[rank] };
}

// Helper to set up a game with a specific picker hand
function setupGameWithHand(pickerHand) {
  const game = new SheepsheadGame('test-room');

  // Add 5 players
  for (let i = 0; i < 5; i++) {
    game.addPlayer(`player${i}`, `Player ${i}`);
  }

  // Manually set up game state
  game.phase = 'calling';
  game.picker = 'player0';
  game.hands['player0'] = pickerHand;

  return game;
}

describe('Calling Options - Normal Call', () => {
  test('Can call hearts or spades with K♥, 10♥, 9♠ (fail suits without aces)', () => {
    const hand = [
      card('K', 'hearts'),
      card('10', 'hearts'),
      card('9', 'spades'),
      card('Q', 'clubs'),
      card('J', 'hearts'),
      card('7', 'diamonds'),
    ];
    const game = setupGameWithHand(hand);
    const options = game.getCallableOptions('player0');

    expect(options.goAlone).toBe(false);
    expect(options.mustSelectUnderCard).toBe(false);
    expect(options.options.length).toBe(2);
    expect(options.options.some(o => o.suit === 'hearts' && o.rank === 'A' && o.type === 'normal')).toBe(true);
    expect(options.options.some(o => o.suit === 'spades' && o.rank === 'A' && o.type === 'normal')).toBe(true);
  });

  test('Can only call spades with A♥, K♥, 9♠ (hearts has ace)', () => {
    const hand = [
      card('A', 'hearts'),
      card('K', 'hearts'),
      card('9', 'spades'),
      card('Q', 'clubs'),
      card('J', 'hearts'),
      card('7', 'diamonds'),
    ];
    const game = setupGameWithHand(hand);
    const options = game.getCallableOptions('player0');

    expect(options.goAlone).toBe(false);
    expect(options.mustSelectUnderCard).toBe(false);
    expect(options.options.length).toBe(1);
    expect(options.options[0].suit).toBe('spades');
    expect(options.options[0].rank).toBe('A');
    expect(options.options[0].type).toBe('normal');
  });
});

describe('Calling Options - Under Required', () => {
  test('Must call under (clubs) with A♥, A♠ and no clubs', () => {
    const hand = [
      card('A', 'hearts'),
      card('A', 'spades'),
      card('Q', 'clubs'),
      card('J', 'hearts'),
      card('7', 'diamonds'),
      card('8', 'diamonds'),
    ];
    const game = setupGameWithHand(hand);
    const options = game.getCallableOptions('player0');

    expect(options.goAlone).toBe(false);
    expect(options.mustSelectUnderCard).toBe(true);
    expect(options.options.length).toBe(1);
    expect(options.options[0].suit).toBe('clubs');
    expect(options.options[0].rank).toBe('A');
    expect(options.options[0].type).toBe('under');
  });

  test('Must call under (spades or clubs) with only A♥ as fail', () => {
    const hand = [
      card('A', 'hearts'),
      card('Q', 'clubs'),
      card('Q', 'spades'),
      card('J', 'hearts'),
      card('J', 'diamonds'),
      card('7', 'diamonds'),
      card('8', 'diamonds'),
      card('9', 'diamonds'),
    ];
    const game = setupGameWithHand(hand);
    const options = game.getCallableOptions('player0');

    expect(options.goAlone).toBe(false);
    expect(options.mustSelectUnderCard).toBe(true);
    expect(options.options.length).toBe(2);
    expect(options.options.some(o => o.suit === 'spades' && o.type === 'under')).toBe(true);
    expect(options.options.some(o => o.suit === 'clubs' && o.type === 'under')).toBe(true);
    // Should NOT be able to call hearts (has the ace)
    expect(options.options.some(o => o.suit === 'hearts')).toBe(false);
  });

  test('All trump hand - must call under any suit', () => {
    const hand = [
      card('Q', 'clubs'),
      card('Q', 'spades'),
      card('Q', 'hearts'),
      card('J', 'clubs'),
      card('J', 'spades'),
      card('A', 'diamonds'),
      card('10', 'diamonds'),
      card('K', 'diamonds'),
    ];
    const game = setupGameWithHand(hand);
    const options = game.getCallableOptions('player0');

    expect(options.goAlone).toBe(false);
    expect(options.mustSelectUnderCard).toBe(true);
    expect(options.options.length).toBe(3);
    expect(options.options.some(o => o.suit === 'hearts' && o.type === 'under')).toBe(true);
    expect(options.options.some(o => o.suit === 'spades' && o.type === 'under')).toBe(true);
    expect(options.options.some(o => o.suit === 'clubs' && o.type === 'under')).toBe(true);
  });
});

describe('Calling Options - Call 10', () => {
  test('Must call 10 with all 3 fail aces (no 10s)', () => {
    const hand = [
      card('A', 'hearts'),
      card('A', 'spades'),
      card('A', 'clubs'),
      card('Q', 'clubs'),
      card('J', 'hearts'),
      card('7', 'diamonds'),
      card('8', 'diamonds'),
      card('9', 'diamonds'),
    ];
    const game = setupGameWithHand(hand);
    const options = game.getCallableOptions('player0');

    expect(options.goAlone).toBe(false);
    expect(options.mustSelectUnderCard).toBe(false); // No under card for Call 10
    expect(options.options.length).toBe(3);
    // All options should be for 10s, not aces
    expect(options.options.every(o => o.rank === '10')).toBe(true);
    expect(options.options.every(o => o.type === 'normal')).toBe(true);
    expect(options.options.some(o => o.suit === 'hearts')).toBe(true);
    expect(options.options.some(o => o.suit === 'spades')).toBe(true);
    expect(options.options.some(o => o.suit === 'clubs')).toBe(true);
  });

  test('Must call 10 of spades or clubs with all 3 aces and 10♥', () => {
    const hand = [
      card('A', 'hearts'),
      card('A', 'spades'),
      card('A', 'clubs'),
      card('10', 'hearts'),
      card('Q', 'clubs'),
      card('J', 'hearts'),
      card('7', 'diamonds'),
      card('8', 'diamonds'),
    ];
    const game = setupGameWithHand(hand);
    const options = game.getCallableOptions('player0');

    expect(options.goAlone).toBe(false);
    expect(options.mustSelectUnderCard).toBe(false);
    expect(options.options.length).toBe(2);
    expect(options.options.some(o => o.suit === 'spades' && o.rank === '10')).toBe(true);
    expect(options.options.some(o => o.suit === 'clubs' && o.rank === '10')).toBe(true);
    // Should NOT be able to call 10 of hearts (has it)
    expect(options.options.some(o => o.suit === 'hearts')).toBe(false);
  });
});

describe('Calling Options - Go Alone', () => {
  test('Must go alone with all 3 fail aces and all 3 fail 10s', () => {
    const hand = [
      card('A', 'hearts'),
      card('A', 'spades'),
      card('A', 'clubs'),
      card('10', 'hearts'),
      card('10', 'spades'),
      card('10', 'clubs'),
      card('Q', 'clubs'),
      card('J', 'hearts'),
    ];
    const game = setupGameWithHand(hand);
    const options = game.getCallableOptions('player0');

    expect(options.goAlone).toBe(true);
    expect(options.options.length).toBe(0);
    expect(options.reason).toContain('all 3 fail aces');
  });
});

describe('Under Card Cannot Win Trick', () => {
  // These tests verify that when under cards are filtered out, they can't win

  test('Under card (7♦ trump) excluded - A♣ wins', () => {
    // Simulating: K♣ leads, picker plays 7♦ (under), partner plays A♣, others play 10♣, 9♣
    // The under card is filtered out before determining winner
    const trickWithoutUnder = [
      { playerId: 'player1', card: card('K', 'clubs') },
      // 7♦ (under card) is filtered out
      { playerId: 'player3', card: card('A', 'clubs') },
      { playerId: 'player4', card: card('10', 'clubs') },
      { playerId: 'player0', card: card('9', 'clubs') },
    ];

    const winner = determineTrickWinner(trickWithoutUnder);
    expect(winner).toBe('player3'); // A♣ wins
  });

  test('Under card (Q♠ highest trump) excluded - A♥ wins', () => {
    // Simulating: 10♥ leads, picker plays Q♠ (under), partner plays A♥, others play K♥, 9♥
    const trickWithoutUnder = [
      { playerId: 'player1', card: card('10', 'hearts') },
      // Q♠ (under card) is filtered out
      { playerId: 'player3', card: card('A', 'hearts') },
      { playerId: 'player4', card: card('K', 'hearts') },
      { playerId: 'player0', card: card('9', 'hearts') },
    ];

    const winner = determineTrickWinner(trickWithoutUnder);
    expect(winner).toBe('player3'); // A♥ wins
  });

  test('Under card (Q♣ highest trump!) excluded - J♦ wins instead', () => {
    // Simulating: 10♠ leads, picker plays Q♣ (under), partner plays A♠, others play K♠, J♦
    // Even Q♣ (highest trump) can't win if it's the under card
    const trickWithoutUnder = [
      { playerId: 'player1', card: card('10', 'spades') },
      // Q♣ (under card) is filtered out - even though it's highest trump!
      { playerId: 'player3', card: card('A', 'spades') },
      { playerId: 'player4', card: card('K', 'spades') },
      { playerId: 'player0', card: card('J', 'diamonds') }, // Trump, but lower than Q♣
    ];

    const winner = determineTrickWinner(trickWithoutUnder);
    expect(winner).toBe('player0'); // J♦ wins because Q♣ is excluded
  });

  test('Without filtering, trump would win (sanity check)', () => {
    // Same trick but WITH the Q♣ included - Q♣ should win
    const trickWithUnder = [
      { playerId: 'player1', card: card('10', 'spades') },
      { playerId: 'player2', card: card('Q', 'clubs') }, // Q♣ included
      { playerId: 'player3', card: card('A', 'spades') },
      { playerId: 'player4', card: card('K', 'spades') },
      { playerId: 'player0', card: card('J', 'diamonds') },
    ];

    const winner = determineTrickWinner(trickWithUnder);
    expect(winner).toBe('player2'); // Q♣ wins when not excluded
  });
});
