R# Test Documentation

This directory contains test case documentation for Sheepshead Online. These markdown files serve two purposes:

1. **Living Documentation** — Defines how the game *should* work, serving as a reference for game rules
2. **Test Generation Source** — Used to generate automated Jest tests that verify the implementation

## Workflow

1. **Document first** — Write test cases in markdown tables (easy to review and edit)
2. **Review** — Ensure the documented behavior matches intended game rules
3. **Generate tests** — Convert markdown cases into Jest test files
4. **Run tests** — `npm test` to verify implementation matches documentation

## File Structure

| File | Description |
|------|-------------|
| `test-cases-cards.md` | Card fundamentals: trump identification, card power rankings, comparisons |
| `test-cases-tricks.md` | Trick-taking: who wins, following suit, playable cards |
| `test-cases-calling.md` | Partner calling: normal call, under, call-10, go alone |
| `test-cases-scoring.md` | Scoring: points, schneider, schwarz, schwanzer |

## Markdown Format

Test cases are documented in tables for easy reading and editing:

```markdown
## Section Name

| Input | Expected Output | Notes |
|-------|-----------------|-------|
| Queen of Clubs | Trump | Highest trump card |
| Ace of Hearts | Not Trump | Fail card |
```

For complex scenarios, use descriptive sections:

```markdown
## Scenario: Picker has all three fail aces

**Setup:**
- Picker's hand: [cards...]
- Called suit: N/A (must call 10 or go alone)

**Expected behavior:**
- Cannot call an ace (has all three)
- Can call a 10 of a suit where they don't have the 10
- If has all 10s too, must go alone
```

## Running Tests

Once test files are generated:

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode (re-run on file changes)
npm test deck         # Run only deck tests
```

## Adding New Test Cases

1. Edit the relevant `.md` file in this directory
2. Add your test case to the appropriate table or section
3. Re-generate the Jest test file (or ask Claude to update it)
4. Run `npm test` to verify

## Key Game Rules Reference

- **Trump order** (high to low): Q♣ Q♠ Q♥ Q♦ J♣ J♠ J♥ J♦ A♦ 10♦ K♦ 9♦ 8♦ 7♦
- **Fail order** (high to low within suit): A, 10, K, 9, 8, 7
- **Win threshold**: Picker needs 61 points to win; Defenders need only 60 (ties go to defenders)
- **Schneider**: Picker needs 91 to schneider defenders; Defenders need only 90 to schneider picker (2x multiplier)
- **Schwarz**: Losing team takes no tricks (3x multiplier)
- **Schwanzer**: When all 5 players pass (nobody picks), it's a Schwanzer. No tricks are played — the hand ends immediately. The player(s) with the most "Schwanzer points" in their dealt hand loses. Schwanzer points: Queens=3, Jacks=2, Diamonds=1. Scoring: 1 loser gets -4 (others +1), 2 losers get -3 each (others +2), etc.
- **Total points in deck**: 120
