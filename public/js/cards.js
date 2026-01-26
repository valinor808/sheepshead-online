// Card rendering utilities

const SUIT_SYMBOLS = {
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
  clubs: '♣'
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

// Check if a card is trump
function isTrump(card) {
  if (card.rank === 'Q' || card.rank === 'J') return true;
  if (card.suit === 'diamonds') return true;
  return false;
}

// Create a card element
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

  div.innerHTML = `
    <span class="card-rank">${RANK_DISPLAY[card.rank]}</span>
    <span class="card-suit">${SUIT_SYMBOLS[card.suit]}</span>
  `;

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
