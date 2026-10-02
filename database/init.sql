CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market VARCHAR(10) NOT NULL,
  symbol VARCHAR(32) NOT NULL,
  quantity NUMERIC(20,8) NOT NULL,
  average_cost NUMERIC(20,8) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market VARCHAR(10) NOT NULL,
  symbol VARCHAR(32) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, market, symbol)
);

CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_item_id UUID UNIQUE NOT NULL REFERENCES watchlist_items(id) ON DELETE CASCADE,
  upper_percent NUMERIC(10,4),
  lower_percent NUMERIC(10,4),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol VARCHAR(32) NOT NULL,
  market VARCHAR(10) NOT NULL,
  alert_type VARCHAR(64) NOT NULL,
  reference_price NUMERIC(20,8),
  trigger_price NUMERIC(20,8),
  change_percent NUMERIC(12,6),
  message TEXT,
  sent_at TIMESTAMPTZ,
  status VARCHAR(32) NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS market_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market VARCHAR(10) NOT NULL,
  session_date DATE NOT NULL,
  timezone VARCHAR(64) NOT NULL,
  open_at TIMESTAMPTZ,
  close_at TIMESTAMPTZ,
  is_trading_day BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (market, session_date)
);

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,
  value_encrypted_or_json JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, key)
);
