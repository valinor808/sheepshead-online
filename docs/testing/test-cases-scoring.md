# Scoring Test Cases (Normal Hand)

## Overview

After all 6 tricks are played, the hand is scored. Card points are totaled per player, buried card points are added to the picker, and teams are compared. The picker always needs one more point than the defenders for the same outcome (asymmetric thresholds).

Total card points in deck: **120**

## Card Point Values

| Rank | Points |
|------|--------|
| A | 11 |
| 10 | 10 |
| K | 4 |
| Q | 3 |
| J | 2 |
| 9 | 0 |
| 8 | 0 |
| 7 | 0 |

---

## A. Win Threshold

The picking team (picker + partner) needs 61+ points to win. Defenders win with 60+.

| # | Picking Points | Defending Points | Winner | Why |
|---|---------------|-----------------|--------|-----|
| A1 | 61 | 59 | Picker | Picker has 61 — minimum to win |
| A2 | 60 | 60 | Defenders | Picker needs 61+; 60 is not enough |
| A3 | 80 | 40 | Picker | Comfortable picker win, no schneider |
| A4 | 40 | 80 | Defenders | Comfortable defender win, no schneider |

---

## B. Schneider (2x multiplier)

Schneider is triggered when the losing team scores very few points. The asymmetry applies here too: picker needs 91+ for Schneider, defenders need 90+.

**Note:** The current code has a bug — it uses `losingPoints < 31` for both sides. It should be:
- Picker wins Schneider: defending points ≤ 29 (picker has 91+)
- Defenders win Schneider: picking points ≤ 30 (defenders have 90+)

| # | Picking Points | Defending Points | Winner | Schneider? | Why |
|---|---------------|-----------------|--------|------------|-----|
| B1 | 91 | 29 | Picker | Yes | Picker has 91 — minimum for picker Schneider |
| B2 | 90 | 30 | Picker | No | Picker has 90 — one short of Schneider |
| B3 | 30 | 90 | Defenders | Yes | Defenders have 90 — minimum for defender Schneider |
| B4 | 31 | 89 | Defenders | No | Picking has 31 — one too many for defender Schneider |

---

## C. Schwarz (3x multiplier)

Schwarz is triggered when the losing team wins zero tricks. Schwarz overrides Schneider.

| # | Scenario | Winner | Schwarz? | Schneider? | Why |
|---|----------|--------|----------|------------|-----|
| C1 | Defenders win 0 tricks | Picker | Yes | — | Losing team took no tricks |
| C2 | Picking team wins 0 tricks | Defenders | Yes | — | Losing team took no tricks |
| C3 | Defenders win 1 trick (with 0 points) | Picker | No | Yes | Won a trick — not Schwarz, but 0 points is Schneider |

---

## D. Score Distribution

Scores are based on role and multiplier. The picker's multiplier is 2x (or 4x when alone).

### Normal Call (picker + partner vs 3 defenders)

| # | Result | Multiplier | Picker | Partner | Each Defender | Sum |
|---|--------|-----------|--------|---------|--------------|-----|
| D1 | Picker wins | 1x (base) | +2 | +1 | -1 | 0 |
| D2 | Defenders win | 1x (base) | -2 | -1 | +1 | 0 |
| D3 | Picker wins Schneider | 2x | +4 | +2 | -2 | 0 |
| D4 | Defenders win Schneider | 2x | -4 | -2 | +2 | 0 |
| D5 | Picker wins Schwarz | 3x | +6 | +3 | -3 | 0 |
| D6 | Defenders win Schwarz | 3x | -6 | -3 | +3 | 0 |

### Going Alone (picker vs 4 defenders)

| # | Result | Multiplier | Picker | Each Defender | Sum |
|---|--------|-----------|--------|--------------|-----|
| D7 | Picker wins | 1x | +4 | -1 | 0 |
| D8 | Defenders win | 1x | -4 | +1 | 0 |
| D9 | Picker wins Schneider | 2x | +8 | -2 | 0 |
| D10 | Defenders win Schneider | 2x | -8 | +2 | 0 |
| D11 | Picker wins Schwarz | 3x | +12 | -3 | 0 |
| D12 | Defenders win Schwarz | 3x | -12 | +3 | 0 |

---

## E. Zero-Sum

Every hand's scores must sum to exactly 0 across all 5 players. This is implicitly tested in all D tests above, but we add an explicit check.

| # | Scenario | Check |
|---|----------|-------|
| E1 | Any normal call result | Sum of all 5 player scores === 0 |
| E2 | Any going-alone result | Sum of all 5 player scores === 0 |

---

## F. Buried Points

Buried card points are added to the picker's total before determining the winner.

| # | Trick Points (picker) | Buried Points | Total Picking Points | Winner | Why |
|---|----------------------|---------------|---------------------|--------|-----|
| F1 | 55 | 6 | 61 | Picker | Buried points push picker to 61 — wins |
| F2 | 55 | 5 | 60 | Defenders | Buried points not enough — picker has 60, defenders win |
