# Session Summary — February 6, 2026

## What Was Accomplished

### Added Test F3 for Under Card Edge Case
- Added new test to `tests/calling.test.js`: "Under card cannot be played when different suit is led (picker must save it)"
- Tests that picker cannot waste their under card on non-called-suit tricks
- Under card must be saved for when the called suit is actually led

### Bug Fix: Under Card Can Only Be Played When Called Suit Is Led
- **Bug discovered:** Game was allowing picker to play under card on any trick
- **Expected behavior:** Under card should only be playable when the called suit is led
- **Fix location:** `src/game/SheepsheadGame.js` lines 572-580
- Added validation to reject under card play when called suit is NOT led
- Error message: "Under card can only be played when the called suit is led"

**Total tests: 205 passing (up from 204)**

---

## Files Changed

**Modified:**
- `tests/calling.test.js` — Added test F3 for under card edge case (18 calling tests now)
- `src/game/SheepsheadGame.js` — Added under card validation to prevent wasting it on wrong tricks

---

## Test Coverage Status

All unit test categories remain complete:

| Category | Tests | Status |
|----------|-------|--------|
| Card Fundamentals | 78 | ✅ |
| Trick-Taking | 38 | ✅ |
| Partner Calling | 18 | ✅ (was 17) |
| Burying | 19 | ✅ |
| Scoring | 27 | ✅ |
| Schwanzer | 25 | ✅ |
| **Total** | **205** | ✅ |

---

## Bug Details

### Under Card Logic Bug
The under card is a special card designated by the picker during an "under" call. It acts as a substitute for a card of the called suit that the picker doesn't have. The rules are:
1. Under card MUST be played when the called suit is led
2. Under card CANNOT be played on other tricks (must be saved)
3. Under card CANNOT win the trick (filtered out from winner determination)

The code was correctly enforcing rules #1 and #3, but was missing rule #2. Picker could waste their under card on any trick, which shouldn't be allowed.

---

## Quick Commands

```bash
npm test              # Run all tests (205 passing)
npm test -- --watch   # Watch mode
npm run dev           # Start dev server
```
