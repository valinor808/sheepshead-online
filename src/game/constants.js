// Sheepshead card constants and rankings

// Suits
const SUITS = ['diamonds', 'hearts', 'spades', 'clubs'];
const FAIL_SUITS = ['hearts', 'spades', 'clubs']; // Non-trump suits for fail cards

// Card values in a standard Sheepshead deck (7-10, J, Q, K, A)
const RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Point values for cards
const POINT_VALUES = {
  '7': 0,
  '8': 0,
  '9': 0,
  '10': 10,
  'J': 2,
  'Q': 3,
  'K': 4,
  'A': 11
};

// Trump cards in order from lowest to highest
// All Queens, all Jacks, then all Diamonds (7-10, K, A)
const TRUMP_ORDER = [
  // Diamonds (lowest trump)
  { suit: 'diamonds', rank: '7' },
  { suit: 'diamonds', rank: '8' },
  { suit: 'diamonds', rank: '9' },
  { suit: 'diamonds', rank: 'K' },
  { suit: 'diamonds', rank: '10' },
  { suit: 'diamonds', rank: 'A' },
  // Jacks (middle trump)
  { suit: 'diamonds', rank: 'J' },
  { suit: 'hearts', rank: 'J' },
  { suit: 'spades', rank: 'J' },
  { suit: 'clubs', rank: 'J' },
  // Queens (highest trump)
  { suit: 'diamonds', rank: 'Q' },
  { suit: 'hearts', rank: 'Q' },
  { suit: 'spades', rank: 'Q' },
  { suit: 'clubs', rank: 'Q' }
];

// Fail card order within a suit (lowest to highest)
const FAIL_ORDER = ['7', '8', '9', 'K', '10', 'A'];

// Game constants
const NUM_PLAYERS = 5;
const CARDS_PER_PLAYER = 6;
const BLIND_SIZE = 2;
const TOTAL_POINTS = 120;
const WIN_THRESHOLD = 61; // Points needed to win
const SCHNEIDER_THRESHOLD = 91; // Points for schneider
const SCHWARZ_THRESHOLD = 120; // All points (no tricks for opponents)

module.exports = {
  SUITS,
  FAIL_SUITS,
  RANKS,
  POINT_VALUES,
  TRUMP_ORDER,
  FAIL_ORDER,
  NUM_PLAYERS,
  CARDS_PER_PLAYER,
  BLIND_SIZE,
  TOTAL_POINTS,
  WIN_THRESHOLD,
  SCHNEIDER_THRESHOLD,
  SCHWARZ_THRESHOLD
};
