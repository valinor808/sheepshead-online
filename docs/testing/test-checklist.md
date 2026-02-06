# Test Coverage Checklist

This checklist tracks all test coverage for Sheepshead Online, organized by testing level and category.

## Legend

- [ ] Not started
- [D] Documented (test cases written in .md)
- [x] Implemented (Jest tests generated and passing)

---

## Unit Tests (Pure Logic)

These test game logic functions directly, without needing a server or database.

### Card Fundamentals
Documentation: [test-cases-cards.md](test-cases-cards.md)
Tests: [tests/deck.test.js](../../tests/deck.test.js)

- [x] Trump identification
- [x] Trump power rankings
- [x] Fail power rankings
- [x] Card point values
- [x] Card comparisons (trump vs trump, trump vs fail, fail vs fail)
- [x] Effective suit detection
- [x] Deck composition verification

### Trick-Taking
Documentation: [test-cases-tricks.md](test-cases-tricks.md)
Tests: [tests/tricks.test.js](../../tests/tricks.test.js)

- [x] Determining trick winner
- [x] Following suit rules
- [x] Playable cards calculation
- [x] Lead card determines suit
- [x] Trump beats fail
- [x] Under card cannot win tricks
- [x] First card wins when neither follows suit
- [x] Partner leading restrictions (must lead ace unless running)
- [x] Partner must play ace when called suit led
- [x] Picker hold card rule (keep one card of called suit)
- [x] Picker can lead called suit

### Partner Calling
Documentation: [test-cases-tricks.md](test-cases-tricks.md) (Under Call Rules, Call 10 Rules sections)
Tests: [tests/calling.test.js](../../tests/calling.test.js)

- [x] Normal call (call ace you don't have)
- [x] Under call (have ace of every fail suit you hold)
- [x] Call 10 (have all 3 fail aces)
- [x] Go alone - voluntary
- [x] Go alone - forced (have all aces and 10s)
- [x] Partner revealed when called card played
- [x] Under card must be played when called suit led
- [x] Under card cannot win trick
- [x] Picker must keep one card of called suit until led

### Burying
Documentation: [test-cases-calling.md](test-cases-calling.md) (or separate file)

- [ ] Cannot bury Queens or Jacks (if other options exist)
- [ ] Must keep at least 1 card of called suit
- [ ] Cannot bury the under card
- [ ] Buried points count for picker's team

### Scoring
Documentation: [test-cases-scoring.md](test-cases-scoring.md)

- [ ] Win threshold: Picker needs 61, Defenders need 60
- [ ] Schneider: Picker needs 91, Defenders need 90 (2x)
- [ ] Schwarz: Losing team takes no tricks (3x)
- [ ] Picker multiplier: 2x (or 4x if alone)
- [ ] Partner multiplier: 1x
- [ ] Defender multiplier: 1x each
- [ ] Total points always sum to zero

### Schwanzer
Documentation: [test-cases-scoring.md](test-cases-scoring.md)

- [ ] Triggered when all 5 players pass
- [ ] Schwanzer points: Queens=3, Jacks=2, Diamonds=1
- [ ] Player(s) with most Schwanzer points loses
- [ ] Scoring: 1 loser=-4, 2 losers=-3 each, 3=-2, 4=-1, 5=draw
- [ ] Winners split positive points evenly

---

## Integration Tests (Server/Database)

These require the server and/or database to be running.

### Session/Auth

- [ ] User registration
- [ ] User login
- [ ] Password hashing (bcrypt)
- [ ] Multiple tabs with same user
- [ ] Session expiration handling
- [ ] Logout clears all sessions
- [ ] Tab-isolated sessions (X-Tab-ID header)

### Database/Stats

- [ ] Score calculation and aggregation
- [ ] Daily stats tracking
- [ ] Lifetime stats tracking
- [ ] Daily vs lifetime stats separation
- [ ] Leaderboard accuracy
- [ ] Stats update after hand completion
- [ ] New stat columns: hands_called_as_partner, hands_alone, hands_won_as_alone

---

## End-to-End Tests (Full System)

These test the complete system with multiple simulated clients.

### Multiplayer

- [ ] Room creation
- [ ] Room joining (5 players max)
- [ ] Kibbitzer (spectator) functionality
- [ ] Players leaving mid-game (game resets)
- [ ] Voting at end of hand (Next Hand / Leave Table)
- [ ] Game state sync across all clients
- [ ] Reconnection handling

### Game Flow

- [ ] Full hand: pick, call, bury, play 6 tricks, score
- [ ] Full hand: everyone passes, Schwanzer scored
- [ ] Full hand: picker goes alone
- [ ] Full hand: under call scenario
- [ ] Dealer rotation after each hand
- [ ] Multiple hands in sequence

---

## Progress Summary

| Category | Documented | Implemented |
|----------|------------|-------------|
| Card Fundamentals | [x] | [x] |
| Trick-Taking | [x] | [x] |
| Partner Calling | [x] | [x] |
| Burying | [ ] | [ ] |
| Scoring | [ ] | [ ] |
| Schwanzer | [ ] | [ ] |
| Session/Auth | [ ] | [ ] |
| Database/Stats | [ ] | [ ] |
| Multiplayer | [ ] | [ ] |
| Game Flow | [ ] | [ ] |

---

## Next Steps

1. Complete unit test documentation (tricks, calling, scoring)
2. Generate Jest tests from documented cases
3. Set up Jest and run unit tests
4. Plan integration test approach
5. Plan E2E test approach (may need test harness)
