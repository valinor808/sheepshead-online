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

## Under Call Rules

### When is Under Required?

Under is required when **all of the picker's fail suits include the ace of that suit** (after picking up the blind). The picker cannot call a suit where they hold the ace, so they must call a suit they have no cards in.

| Picker's Fail Cards | Can Call Normally?     | Must Call Under?      | Reason                         |
| ------------------- | ---------------------- | --------------------- | ------------------------------ |
| K♥, 10♥, 9♠         | Yes (hearts or spades) | No                    | Has hearts without ace         |
| A♥, K♥, 9♠          | Yes (spades)           | No                    | Has spades without ace         |
| A♥, A♠ (no clubs)   | No                     | Yes (clubs)           | All fail suits have their aces |
| A♥ only             | No                     | Yes (spades or clubs) | Only fail suit has its ace     |

### How Under Works

1. Picker calls an ace of a suit they have **no cards in** (e.g., clubs)
2. Picker designates one of their cards as the "under card"
3. When the called suit is led, picker **must play the under card**
4. The under card **cannot win** the trick (excluded from winner determination)
5. Partner is whoever holds the called ace — revealed when they play it

### Under Card Must Be Played

| Scenario | Lead Suit | Called Suit | Under Card | Must Play | Notes |
|----------|-----------|-------------|------------|-----------|-------|
| Called suit led | Clubs | Clubs | 7♦ | 7♦ | Must play under card |
| Different suit led | Spades | Clubs | 7♦ | No | Normal play rules |
| Under card already played | Clubs | Clubs | (played earlier) | No | Normal following suit |

### Under Card Cannot Win

When the called suit is led, both the under card and the called ace will be in the trick.

| Called Suit | Trick | Under Card | Eligible Cards | Winner | Notes |
|-------------|-------|------------|----------------|--------|-------|
| Clubs | K♣, 7♦*, A♣, 10♣, 9♣ | 7♦ | K♣, A♣, 10♣, 9♣ | A♣ | 7♦ excluded despite being trump |
| Hearts | 10♥, Q♠*, A♥, K♥, 9♥ | Q♠ | 10♥, A♥, K♥, 9♥ | A♥ | Q♠ excluded despite being highest trump |
| Spades | 10♠, Q♣*, A♠, K♠, J♦ | Q♣ | 10♠, A♠, K♠, J♦ | J♦ | Q♣ (highest trump!) excluded; J♦ wins |

*Card marked with * is the under card

### Under Call Example

**Picker's hand after picking:** Q♣, J♥, J♦, A♥, A♠, 7♦, 8♦, 9♦

- Fail suits: hearts (A♥), spades (A♠) — both include aces
- No clubs in hand
- **Must call under:** Calls A♣, designates 7♦ as under card
- **Partner:** Whoever has A♣
- When clubs is led, picker plays 7♦ (cannot win)
- Partner revealed when they play A♣

---

## Call 10 Rules

### When is Call 10 Required?

Call 10 is required when the picker has **all three fail aces** (A♥, A♠, A♣). Since they can't call any ace, they must call a 10 instead.

| Picker's Fail Aces | Call Type | Notes |
|--------------------|-----------|-------|
| 0, 1, or 2 aces | Normal or Under | Call an ace |
| All 3 aces | Call 10 | Must call a 10 they don't have |
| All 3 aces + all 3 tens | Go Alone | No valid card to call |

### How Call 10 Works

1. Picker calls a 10 of a suit they **don't have the 10 of**
2. **No under card needed** — picker can follow suit normally with their ace
3. Partner is whoever holds the called 10 — revealed when they play it

### Call 10 Example

**Picker's hand after picking:** Q♣, J♥, A♥, A♠, A♣, 7♦, 8♦, 9♦

- Has all 3 fail aces
- Has no fail 10s
- **Calls:** 10♥ (or 10♠ or 10♣)
- **Partner:** Whoever has 10♥
- When hearts is led, picker follows with A♥ (normal play)
- Partner revealed when they play 10♥

### Call 10 vs Under Comparison

| Aspect | Under | Call 10 |
|--------|-------|---------|
| Condition | All fail suits have their aces | Have all 3 fail aces |
| Called card | Ace (of suit with no cards) | 10 (of suit without the 10) |
| Under card needed? | Yes | No |
| Following called suit | Play under card | Play ace normally |
| Partner | Has called ace | Has called 10 |

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
