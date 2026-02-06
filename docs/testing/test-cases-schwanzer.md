# Schwanzer Test Cases

## Overview

When all 5 players pass during the picking phase, the hand is a **Schwanzer**. No one picks, no tricks are played — the hand is scored immediately based on each player's dealt hand.

Each player's hand is evaluated for **Schwanzer points**:
- Queens = 3 points each
- Jacks = 2 points each
- Diamonds (non-Q, non-J) = 1 point each
- All other cards = 0 points

The player(s) with the **most** Schwanzer points lose. Scores always sum to zero.

---

## A. Schwanzer Point Calculation

| # | Card | Schwanzer Points | Why |
|---|------|-----------------|-----|
| A1 | Queen of Hearts | 3 | Queens are worth 3 |
| A2 | Queen of Diamonds | 3 | Queens are always 3, not 3+1 for diamond |
| A3 | Jack of Spades | 2 | Jacks are worth 2 |
| A4 | Jack of Diamonds | 2 | Jacks are always 2, not 2+1 for diamond |
| A5 | Ace of Diamonds | 1 | Non-Q/J diamond = 1 |
| A6 | 7 of Diamonds | 1 | Non-Q/J diamond = 1 |
| A7 | Ace of Hearts | 0 | Non-trump fail card = 0 |
| A8 | 10 of Spades | 0 | Non-trump fail card = 0 |

---

## B. Schwanzer Triggering

| # | Scenario | Result | Why |
|---|----------|--------|-----|
| B1 | All 5 players pass | Schwanzer triggered | No one picked |
| B2 | 4 players pass, 5th picks | Normal hand | Someone picked |

---

## C. Schwanzer Scoring by Number of Losers

Loser = player(s) with the highest Schwanzer point total.

| # | Losers | Loser Score | Winner Score | Example Hands | Sum |
|---|--------|-------------|-------------|---------------|-----|
| C1 | 1 loser | -4 | +1 each | One player has 10 pts, others have less | 0 |
| C2 | 2 losers tied | -3 each | +2 each | Two players tied at 8 pts, others lower | 0 |
| C3 | 3 losers tied | -2 each | +3 each | Three players tied at 6 pts, others lower | 0 |
| C4 | 4 losers tied | -1 each | +4 | Four players tied at 5 pts, one lower | 0 |
| C5 | 5-way tie | 0 each | — | All players have same points | 0 |

---

## D. Zero-Sum Verification

| # | Scenario | Check |
|---|----------|-------|
| D1 | 1 loser | Sum of all 5 scores === 0 |
| D2 | 2 losers | Sum of all 5 scores === 0 |
| D3 | 5-way tie | Sum of all 5 scores === 0 |

---

## E. Result Structure

| # | Field | Expected |
|---|-------|----------|
| E1 | result.type | 'schwanzer' |
| E2 | result.losers | Array of player IDs with max Schwanzer points |
| E3 | result.winners | Array of player IDs with less than max points |
| E4 | result.playerSchwanzerPoints | Object mapping each player ID to their point total |
| E5 | result.maxSchwanzerPoints | The highest Schwanzer point total |
| E6 | result.scores | Object mapping each player ID to their score (+/-) |
