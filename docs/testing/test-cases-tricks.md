# Test Cases: Trick-Taking

These test cases verify trick-taking rules, including determining winners, following suit, and special partner/picker rules.

## Determining Trick Winner

The winner of a trick is determined by:
1. If any trump was played, highest trump wins
2. Otherwise, highest card of the lead suit wins
3. Cards that don't follow lead suit (and aren't trump) can never win

### Basic Trick Winners (5 players)

| Lead Card | Player 2 | Player 3 | Player 4 | Player 5 | Winner | Notes |
|-----------|----------|----------|----------|----------|--------|-------|
| A♥ | K♥ | 10♥ | 9♥ | 8♥ | Player 1 | Ace is highest fail |
| 7♥ | 8♥ | 9♥ | K♥ | A♥ | Player 5 | Ace wins even played last |
| A♥ | 7♦ | K♥ | 10♥ | 9♥ | Player 2 | Lowest trump beats highest fail |
| Q♣ | Q♠ | Q♥ | Q♦ | J♣ | Player 1 | Q♣ is highest trump |
| 7♦ | 8♦ | 9♦ | K♦ | A♦ | Player 5 | A♦ highest non-face trump |
| A♥ | A♠ | A♣ | K♥ | 10♥ | Player 1 | Only hearts follow suit |
| A♠ | K♣ | 10♥ | 9♣ | 8♥ | Player 1 | No one followed suit, lead wins |

### Trump Always Wins

| Scenario | Lead | Other Cards | Winner | Notes |
|----------|------|-------------|--------|-------|
| Single trump in trick | A♥ | K♥, 7♦, 10♥, 9♥ | 7♦ player | Lowest trump beats all fail |
| Multiple trump, one higher | 7♦ | A♥, J♦, K♥, 10♥ | J♦ player | J♦ beats 7♦ |
| Lead trump, all follow fail | Q♣ | A♥, A♠, A♣, K♥ | Q♣ player | No fail can beat trump |

### Lead Suit Matters

| Scenario | Lead | Other Cards | Winner | Notes |
|----------|------|-------------|--------|-------|
| Hearts led, hearts wins | 7♥ | A♠, A♣, K♥, 8♥ | K♥ player | K beats 8, 7; others didn't follow |
| Spades led, only one follows | 7♠ | A♥, 8♠, A♣, K♥ | 8♠ player | 8♠ only one that followed |
| Trump led (effective suit) | 7♦ | A♥, 8♦, A♣, K♥ | 8♦ player | 8♦ follows trump suit, beats 7♦ |

## Following Suit Rules

Players must follow the lead suit if they can. If they cannot, they may play any card.

### Must Follow Suit

| Hand | Lead Suit | Playable Cards | Notes |
|------|-----------|----------------|-------|
| A♥, K♥, 10♠, 9♣ | Hearts | A♥, K♥ | Must play hearts |
| Q♣, J♥, 7♦, A♠ | Trump | Q♣, J♥, 7♦ | Q, J, and diamonds are all trump |
| A♠, K♠, 10♠, 7♠ | Spades | A♠, K♠, 10♠, 7♠ | All cards follow suit |
| A♥, K♠, 10♣, 9♣ | Clubs | 10♣, 9♣ | Only clubs playable |

### Cannot Follow Suit

| Hand | Lead Suit | Playable Cards | Notes |
|------|-----------|----------------|-------|
| A♥, K♥, 10♠, 9♠ | Clubs | A♥, K♥, 10♠, 9♠ | No clubs, play anything |
| A♥, K♠, 10♣ | Trump | A♥, K♠, 10♣ | No trump, play anything |
| Q♣, J♥, 7♦ | Hearts | Q♣, J♥, 7♦ | J♥ is trump not hearts, play anything |

### Edge Case: Jacks and Queens

| Hand | Lead Suit | Playable Cards | Notes |
|------|-----------|----------------|-------|
| Q♥, J♥, A♥, K♥ | Hearts | A♥, K♥ | Q♥ and J♥ are trump, not hearts |
| Q♥, J♥, 7♦ | Hearts | Q♥, J♥, 7♦ | No hearts (Q/J are trump), play anything |
| Q♥, J♥, 7♦ | Trump | Q♥, J♥, 7♦ | All three are trump |

## Leading a Trick

When leading (playing first), normally any card can be played. Special rules apply for partner and picker.

### Basic Leading

| Hand | Called Suit | Is Picker | Is Partner | Playable Cards | Notes |
|------|-------------|-----------|------------|----------------|-------|
| A♥, K♥, Q♣, 7♦ | None | No | No | All | No restrictions |
| A♥, K♥, Q♣, 7♦ | Spades | No | No | All | Not involved in called suit |

## Partner Rules

The partner holds the called ace. Special restrictions apply.

### Partner Must Lead Ace If Leading Called Suit (Unless Running)

**Running**: If the partner has 4 or more cards in the called suit, they can lead any of them — not just the ace. This is called "running" the suit.

| Hand | Called Suit | Playable Cards | Notes |
|------|-------------|----------------|-------|
| A♥, K♥, 10♥, Q♣ | Hearts | A♥, Q♣ | Has ace + 2 others (3 total) - can't lead K or 10 |
| A♥, K♥, Q♣, 7♦ | Hearts | A♥, Q♣, 7♦ | Has ace + 1 other (2 total) - can't lead K |
| A♥, Q♣, 7♦, 8♦ | Hearts | All | Only 1 heart (the ace) - can lead it |
| A♥, K♥, 10♥, 9♥, Q♣ | Hearts | All | Has 4+ hearts - "running", can lead any |

### Partner Must Play Ace When Called Suit Led

| Hand | Lead Suit | Called Suit | Has Ace | Playable Cards | Notes |
|------|-----------|-------------|---------|----------------|-------|
| A♥, K♥, 10♥ | Hearts | Hearts | Yes | A♥ only | Must play called ace |
| K♥, 10♥, 9♥ | Hearts | Hearts | No | K♥, 10♥, 9♥ | Normal following suit |
| A♥, K♥, 10♥ | Hearts | Spades | Yes (wrong suit) | A♥, K♥, 10♥ | Called suit is spades, normal follow |

## Picker Rules

The picker must retain at least one card of the called suit until that suit is led.

### Picker Must Keep Called Suit Card (Until Led)

| Hand | Called Suit | Suit Has Been Led | Playable When Not Following | Notes |
|------|-------------|-------------------|----------------------------|-------|
| K♠, K♥, 10♥ | Spades | No | K♥, 10♥ | Only 1 spade, can't play it |
| K♠, 10♠, 10♥ | Spades | No | All | 2 spades, can play one |
| K♠, K♥, 10♥ | Spades | Yes | All | Suit has been led, no restriction |

### Picker Leading

The picker can always lead the called suit — doing so draws out the partner's ace.

| Hand | Called Suit | Suit Has Been Led | Playable Cards | Notes |
|------|-------------|-------------------|----------------|-------|
| K♠, K♥, Q♣ | Spades | No | All | Can lead spade (draws out ace) |
| K♠, 10♠, Q♣ | Spades | No | All | Can lead either spade |
| K♠, K♥, Q♣ | Spades | Yes | All | Suit already led, no restriction |

## Under Card Rules

In an under call, the picker designates one of their cards as the "under card." This card:
- Must be played when the called suit is led
- Cannot win the trick (filtered out when determining winner)
- Reveals the picker as their own partner when played

### Under Card Must Be Played

| Scenario | Lead Suit | Called Suit | Under Card | Must Play | Notes |
|----------|-----------|-------------|------------|-----------|-------|
| Called suit led | Hearts | Hearts | 7♦ | 7♦ | Must play under card |
| Different suit led | Spades | Hearts | 7♦ | No | Normal play |
| Under card already played | Hearts | Hearts | (already played) | No | Normal following suit |

### Under Card Cannot Win

| Trick (with under card) | Under Card | Eligible Cards | Winner | Notes |
|------------------------|------------|----------------|--------|-------|
| A♥, K♥, 7♦*, 10♥, 9♥ | 7♦ | A♥, K♥, 10♥, 9♥ | A♥ | 7♦ excluded despite being trump |
| 7♥, 8♥, Q♣*, 9♥, K♥ | Q♣ | 7♥, 8♥, 9♥, K♥ | K♥ | Q♣ excluded despite being highest |
| 7♦, 8♦*, 9♦, K♦, A♦ | 8♦ | 7♦, 9♦, K♦, A♦ | A♦ | Under card excluded from comparison |

*Card marked with * is the under card

## Points Calculation

Points are summed from all cards in tricks won.

| Cards Won | Points | Notes |
|-----------|--------|-------|
| A♥, A♠, A♣ | 33 | 11 × 3 |
| 10♥, 10♠, 10♣, 10♦ | 40 | 10 × 4 |
| Q♣, Q♠, J♣, J♠ | 10 | 3 + 3 + 2 + 2 |
| 7♥, 8♥, 9♥, 7♠, 8♠, 9♠ | 0 | All zero-point cards |
| K♥, K♠, K♣, K♦ | 16 | 4 × 4 |
| A♦, 10♦, K♦, Q♦, J♦ | 30 | 11 + 10 + 4 + 3 + 2 |
