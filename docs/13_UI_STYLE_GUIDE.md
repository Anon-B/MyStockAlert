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


## UX Rules — v1.0.0 dev refinement
- Primary navigation contains only Dashboard, Portfolio, Watchlist, Alerts and Settings.
- Each main page has one primary action: `+ เพิ่มหุ้น`, `+ เพิ่ม Watchlist`, or transaction save inside the selected holding.
- Portfolio and Watchlist share the same StockPicker autocomplete backed by Stock Master/search API.
- Forms use explicit labels; placeholder text is supplementary only.
- Mobile forms collapse to one column.
- Empty states explain the next action instead of saying only “No data”.
- Delete uses an application dialog rather than browser `confirm()`.
- Alert history shows user-facing statuses: `รอส่ง`, `ส่งแล้ว`, `ส่งไม่สำเร็จ`; retry/internal state is hidden from the primary table.
- Settings is grouped into `การแจ้งเตือน`, `การแสดงผล`, and `ระบบ`; technical details remain secondary.
- Technical implementation details are not exposed in primary user workflows.
