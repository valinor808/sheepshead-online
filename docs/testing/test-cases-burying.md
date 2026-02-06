# Burying Test Cases

## Overview

After picking and calling, the picker must bury exactly 2 cards from their 8-card hand (6 dealt + 2 from blind). Buried card points count toward the picker's team at scoring.

## Rules Summary

| Rule | Description | Code Reference |
|------|-------------|----------------|
| **Count** | Must bury exactly 2 cards | `BLIND_SIZE` constant |
| **Any card** | Any card in hand may be buried (including Q/J) | — |
| **Hold card** | Must keep ≥1 non-trump card of called suit | Lines 361-369 |
| **Under card** | Cannot bury the designated under card | Lines 342-345 |

---

## A. Basic Validation

These tests verify the bury method rejects invalid calls before checking card-specific rules.

| # | Scenario | Expected | Error |
|---|----------|----------|-------|
| A1 | Bury called during wrong phase (e.g. 'calling') | Reject | "Not in burying phase" |
| A2 | Non-picker tries to bury | Reject | "You are not the picker" |
| A3 | Bury 1 card instead of 2 | Reject | "Must bury exactly 2 cards" |
| A4 | Bury 3 cards instead of 2 | Reject | "Must bury exactly 2 cards" |
| A5 | Bury a card not in hand | Reject | "Card not in hand" |

---

## B. Can Bury Any Card (Including Queens and Jacks)

The picker may bury any cards from their hand, including Queens, Jacks, and other trump. Burying high trump is not recommended strategy, but it is allowed.

**Note:** This is a code fix — the current implementation incorrectly rejects burying Q/J when alternatives exist. That validation should be removed.

| # | Hand (8 cards) | Bury | Expected | Why |
|---|----------------|------|----------|-----|
| B1 | Q♣, Q♠, J♣, J♠, J♥, J♦, A♥, K♥ | Q♣, Q♠ | Accept | Picker is allowed to bury Queens |
| B2 | Q♣, Q♠, J♣, J♠, J♥, J♦, A♥, K♥ | J♣, J♠ | Accept | Picker is allowed to bury Jacks |
| B3 | Q♣, Q♠, J♣, J♠, J♥, J♦, A♥, K♥ | A♥, K♥ | Accept | Burying non-trump fail cards is fine |
| B4 | Q♣, J♥, 7♦, 8♦, 9♦, A♥, K♠, 10♠ | 7♦, 8♦ | Accept | Burying low trump (diamonds) is fine |

---

## C. Hold Card Requirement

When a suit is called, the picker must keep at least 1 non-trump card of that suit in their hand after burying. This ensures the picker can follow suit when the called suit is led (the "hold card").

**Note:** Diamonds of any rank are trump, so they don't count as "cards of that suit" even though diamonds is technically a suit.

| # | Called Suit | Hand (8 cards) | Bury | Expected | Why |
|---|------------|----------------|------|----------|-----|
| C1 | Hearts | Q♣, J♥, 7♦, 8♦, A♥, K♥, 9♠, 10♠ | A♥, K♥ | Reject | Would leave 0 hearts — must keep ≥1 |
| C2 | Hearts | Q♣, J♥, 7♦, 8♦, A♥, K♥, 9♠, 10♠ | A♥, 9♠ | Accept | K♥ remains as hold card |
| C3 | Hearts | Q♣, J♥, 7♦, 8♦, A♥, K♥, 9♥, 10♠ | A♥, 10♠ | Accept | K♥ and 9♥ remain |
| C4 | None (alone) | Q♣, J♥, 7♦, 8♦, A♥, K♥, 9♠, 10♠ | A♥, K♥ | Accept | No called suit — no hold card needed |
| C5 | None (alone) | Q♣, Q♠, J♣, J♠, J♥, J♦, A♥, 9♠ | A♥, 9♠ | Accept | Alone picker can bury all fail cards and play with all trump |

---

## D. Cannot Bury the Under Card

When an "under" call is made, the picker designates a non-trump card as the under card. This card cannot be buried — the picker needs it in hand to play when the called suit is led.

| # | Under Card | Hand (8 cards) | Bury | Expected | Why |
|---|-----------|----------------|------|----------|-----|
| D1 | 7♦ (id: `7_diamonds`) | Q♣, Q♠, J♣, J♠, A♥, A♠, 7♦, 8♦ | 7♦, 8♦ | Reject | Cannot bury the under card |
| D2 | 7♦ (id: `7_diamonds`) | Q♣, Q♠, J♣, J♠, A♥, A♠, 7♦, 8♦ | A♥, A♠ | Accept | Burying other cards is fine |

---

## E. Successful Bury

After a valid bury, verify the game state transitions correctly.

| # | Scenario | Checks |
|---|----------|--------|
| E1 | Valid 2-card bury | `success: true`, hand reduced to 6 cards |
| E2 | Valid 2-card bury | `game.buried` contains the 2 buried cards |
| E3 | Valid 2-card bury | `game.phase` advances to `'playing'` |
