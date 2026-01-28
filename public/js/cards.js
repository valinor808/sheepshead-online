/**
 * Card Rendering Utilities
 *
 * Creates card elements for display using SVG images.
 * Provides helpers for trump detection and suit display.
 *
 * Card Images:
 * - Located in /images/cards/
 * - Naming convention: {Rank}{SuitCode}.svg (e.g., "QH.svg" for Queen of Hearts)
 */

const SUIT_SYMBOLS = {
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
  clubs: '♣'
};

const SUIT_CODES = {
  diamonds: 'D',
  hearts: 'H',
  spades: 'S',
  clubs: 'C'
};

const RANK_DISPLAY = {
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  'J': 'J',
  'Q': 'Q',
  'K': 'K',
  'A': 'A'
};

// Preload all card images to prevent white boxes during initial render
(function preloadCardImages() {
  const ranks = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const suits = ['D', 'H', 'S', 'C'];

  ranks.forEach(rank => {
    suits.forEach(suit => {
      const img = new Image();
      img.src = `/images/cards/${rank}${suit}.svg`;
    });
  });
})();

// Check if a card is trump
function isTrump(card) {
  if (card.rank === 'Q' || card.rank === 'J') return true;
  if (card.suit === 'diamonds') return true;
  return false;
}

// Get the SVG file path for a card
function getCardImagePath(card) {
  const suitCode = SUIT_CODES[card.suit];
  const rank = card.rank;
  return `/images/cards/${rank}${suitCode}.svg`;
}

// Create a card element with SVG image
function createCardElement(card, options = {}) {
  const div = document.createElement('div');
  div.className = 'card ' + card.suit;
  div.dataset.cardId = card.id;

  if (isTrump(card)) {
    div.classList.add('trump');
  }

  if (options.small) {
    div.classList.add('small');
  }

  if (options.playable) {
    div.classList.add('playable');
  }

  if (options.selected) {
    div.classList.add('selected');
  }

  // Use SVG image
  const img = document.createElement('img');
  img.src = getCardImagePath(card);
  img.alt = `${card.rank} of ${card.suit}`;
  img.className = 'card-image';
  img.draggable = false;
  div.appendChild(img);

  return div;
}

// Create a card back element
function createCardBack(options = {}) {
  const div = document.createElement('div');
  div.className = 'card card-back';
  if (options.small) {
    div.classList.add('small');
  }
  return div;
}

// Create a trick card with player label
function createTrickCard(card, playerName) {
  const wrapper = document.createElement('div');
  wrapper.className = 'trick-card';

  const cardEl = createCardElement(card, { small: true });
  wrapper.appendChild(cardEl);

  const label = document.createElement('span');
  label.className = 'card-owner';
  label.textContent = playerName;
  wrapper.appendChild(label);

  return wrapper;
}

// Get suit display name
function getSuitDisplay(suit) {
  return SUIT_SYMBOLS[suit] + ' ' + suit.charAt(0).toUpperCase() + suit.slice(1);
}
