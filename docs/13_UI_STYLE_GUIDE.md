# MyStockAlert UI Style Guide

## Direction
Clean financial dashboard, glass-card visual language, Thai-first copy, compact technical data.

## Main Layout
Sidebar + top header + content cards. Desktop-first but tables use horizontal overflow on narrow screens.

## Dashboard Structure
1. Summary cards
2. Portfolio card
3. TH market card
4. US market card
5. Watchlist card

## Portfolio Consistency
Portfolio market cards intentionally reuse Dashboard market-card styling:
- same card radius/border/header
- same table treatment
- Portfolio retains Actions and Currency columns
- Dashboard hides redundant Market/Currency columns inside separated market cards

## Components
- cards
- data tables
- status pills
- action links
- forms
- settings rows
- transaction panel
- optional fee panel
- market status indicator

## Color Semantics
Use semantic CSS tokens for positive, negative, warning, error and muted states. Do not encode meaning by color alone.

## Typography
Short headings. English technical terms may appear in parentheses: `จำนวน (Qty)`, `ต้นทุนเฉลี่ย (Avg Cost)`.

## Design Tokens
Centralized in `frontend/styles/theme.css` under `--ms-*` variables.

## Product Constraints
- transaction base form stays simple
- detailed fees are optional/collapsed
- current quote and stale state must remain understandable
- destructive actions require confirmation
- UI should not expose internal provider errors unless useful for diagnosis
