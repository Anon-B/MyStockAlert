# MyStockAlert UI Style Guide

## Direction
The UI should take the Fox Stocks Dashboard as visual inspiration rather than copy it directly. The reference is a clean stock-investing dashboard with a structured, information-dense layout. citeturn0search0

## Visual Language
- Light fintech dashboard
- White cards on a soft gray page background
- Rounded cards with subtle borders and shadows
- Strong black/dark primary text
- Green for positive movement
- Red for negative movement
- Compact data tables
- Clear spacing and hierarchy
- Minimal decorative elements

## Main Layout
Desktop:
- Fixed left sidebar
- Top page header
- Main content with 4-column summary cards
- Large chart/card area
- Portfolio/watchlist tables below

Mobile:
- Collapsible navigation
- One-column cards
- Horizontally scrollable data tables
- Touch-friendly controls

## Dashboard Structure
1. Sidebar navigation
2. Header with page title and system/market status
3. Portfolio summary cards
4. Thai Portfolio section
5. US Portfolio section
6. Watchlist section
7. Recent alerts
8. Last data update

## Color Semantics
Positive = green.
Negative = red.
Neutral = gray.
Warning = amber.
Information = blue.

These colors are semantic only; they should not be used to imply a trading recommendation.

## Components
Required reusable components:
- Sidebar
- Header
- SummaryCard
- MarketStatusBadge
- PortfolioCard
- StockTable
- StockRow
- PerformanceBadge
- AlertCard
- ChartCard
- EmptyState
- LoadingState
- ConfirmDialog
- Modal
- FormField

## Typography
Use Inter or a system sans-serif fallback.
Keep headings bold and compact.
Use tabular/numeric alignment for financial figures.

## Design Tokens
The implementation source of truth is:
frontend/styles/theme.css

Do not hard-code colors, radii, spacing, or shadows inside individual components when a token already exists.

## Important Product Constraint
MyStockAlert is a monitoring and notification application, not an order-execution interface. The UI therefore prioritizes portfolio status, watchlists, alerts, and history rather than Buy/Sell controls.
