# Test Cases: Card Fundamentals

These test cases verify core card identification and comparison logic.

## Trump Identification

All Queens, all Jacks, and all Diamonds are trump.

| Card | Is Trump? | Notes |
|------|-----------|-------|
| Queen of Clubs | Yes | Highest trump |
| Queen of Spades | Yes | Second highest trump |
| Queen of Hearts | Yes | Third highest trump |
| Queen of Diamonds | Yes | Fourth highest trump |
| Jack of Clubs | Yes | Highest jack |
| Jack of Spades | Yes | |
| Jack of Hearts | Yes | |
| Jack of Diamonds | Yes | Lowest jack |
| Ace of Diamonds | Yes | Highest diamond (non-face) |
| 10 of Diamonds | Yes | |
| King of Diamonds | Yes | |
| 9 of Diamonds | Yes | |
| 8 of Diamonds | Yes | |
| 7 of Diamonds | Yes | Lowest trump |
| Ace of Hearts | No | Fail card |
| Ace of Spades | No | Fail card |
| Ace of Clubs | No | Fail card |
| 10 of Hearts | No | Fail card |
| King of Spades | No | Fail card |
| 7 of Clubs | No | Lowest fail card |

## Trump Power Rankings

Higher number = more powerful. Used to determine which trump wins a trick.

| Card | Power Rank | Notes |
|------|------------|-------|
| Queen of Clubs | 13 | Highest |
| Queen of Spades | 12 | |
| Queen of Hearts | 11 | |
| Queen of Diamonds | 10 | |
| Jack of Clubs | 9 | |
| Jack of Spades | 8 | |
| Jack of Hearts | 7 | |
| Jack of Diamonds | 6 | |
| Ace of Diamonds | 5 | |
| 10 of Diamonds | 4 | |
| King of Diamonds | 3 | |
| 9 of Diamonds | 2 | |
| 8 of Diamonds | 1 | |
| 7 of Diamonds | 0 | Lowest trump |
| Ace of Hearts | -1 | Not trump (returns -1) |

## Fail Power Rankings

Within a fail suit, cards rank: A > 10 > K > 9 > 8 > 7

| Card | Power Rank | Notes |
|------|------------|-------|
| Ace of Hearts | 5 | Highest in suit |
| 10 of Hearts | 4 | |
| King of Hearts | 3 | |
| 9 of Hearts | 2 | |
| 8 of Hearts | 1 | |
| 7 of Hearts | 0 | Lowest in suit |
| Queen of Hearts | -1 | Not a fail card (it's trump) |
| Jack of Hearts | -1 | Not a fail card (it's trump) |

## Card Point Values

Points for scoring purposes.

| Rank | Points |
|------|--------|
| Ace | 11 |
| 10 | 10 |
| King | 4 |
| Queen | 3 |
| Jack | 2 |
| 9 | 0 |
| 8 | 0 |
| 7 | 0 |

**Total points in deck**: 120 (verifiable: 4 suits × (11+10+4+3+2+0+0+0) = 4 × 30 = 120)

## Card Comparisons

Given two cards and a lead suit, determine which wins.

### Trump vs Trump

| Card 1 | Card 2 | Winner | Notes |
|--------|--------|--------|-------|
| Queen of Clubs | Queen of Spades | Card 1 | Higher queen wins |
| Jack of Diamonds | Queen of Diamonds | Card 2 | Queens beat jacks |
| Jack of Clubs | Jack of Hearts | Card 1 | Club jack > Heart jack |
| Ace of Diamonds | 10 of Diamonds | Card 1 | Ace > 10 in diamonds |
| 7 of Diamonds | Jack of Diamonds | Card 2 | Any jack beats any diamond pip |
| 7 of Diamonds | 8 of Diamonds | Card 2 | Higher pip wins |

### Trump vs Fail

| Card 1 | Card 2 | Lead Suit | Winner | Notes |
|--------|--------|-----------|--------|-------|
| 7 of Diamonds | Ace of Hearts | Hearts | Card 1 | Lowest trump beats highest fail |
| Queen of Clubs | Ace of Spades | Spades | Card 1 | Trump always wins |
| Jack of Hearts | King of Hearts | Hearts | Card 1 | Jack is trump, not fail |

### Fail vs Fail (Same Suit)

| Card 1 | Card 2 | Lead Suit | Winner | Notes |
|--------|--------|-----------|--------|-------|
| Ace of Hearts | King of Hearts | Hearts | Card 1 | Ace beats king |
| 10 of Hearts | King of Hearts | Hearts | Card 1 | 10 beats king |
| 7 of Hearts | 8 of Hearts | Hearts | Card 2 | 8 beats 7 |

### Fail vs Fail (Different Suits)

| Card 1 | Card 2 | Lead Suit | Winner | Notes |
|--------|--------|-----------|--------|-------|
| Ace of Hearts | Ace of Spades | Hearts | Card 1 | Followed lead suit |
| 7 of Hearts | Ace of Spades | Hearts | Card 1 | Lead suit wins even with low card |
| King of Clubs | Ace of Spades | Hearts | Card 1 | Neither follows; first card wins |

## Effective Suit

The "effective suit" determines what suit a card plays as (for following suit rules).

| Card | Effective Suit | Notes |
|------|----------------|-------|
| Queen of Clubs | Trump | Queens are trump |
| Jack of Hearts | Trump | Jacks are trump |
| Ace of Diamonds | Trump | Diamonds are trump |
| 7 of Diamonds | Trump | Diamonds are trump |
| Ace of Hearts | Hearts | Fail card |
| King of Spades | Spades | Fail card |
| 10 of Clubs | Clubs | Fail card |

## Deck Composition

A standard Sheepshead deck has 32 cards.

| Verification | Expected |
|--------------|----------|
| Total cards | 32 |
| Trump cards | 14 (4 Queens + 4 Jacks + 6 Diamonds) |
| Fail cards | 18 (6 each in Hearts, Spades, Clubs) |
| Total points | 120 |
| Cards per suit | 8 (7, 8, 9, 10, J, Q, K, A) |
