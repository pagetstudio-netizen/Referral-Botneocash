-- NeoCash Bot — Schéma PostgreSQL (Supabase)
-- Exécuté automatiquement au démarrage du bot (CREATE IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  balance INTEGER NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by BIGINT,
  referral_count INTEGER NOT NULL DEFAULT 0,
  referral_earnings INTEGER NOT NULL DEFAULT 0,
  bonus_earnings INTEGER NOT NULL DEFAULT 0,
  total_withdrawn INTEGER NOT NULL DEFAULT 0,
  last_bonus_at TIMESTAMPTZ,
  banned BOOLEAN NOT NULL DEFAULT FALSE,
  banned_reason TEXT,
  banned_at TIMESTAMPTZ,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  waiting_for_support BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

CREATE TABLE IF NOT EXISTS withdrawals (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  telegram_id BIGINT NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  username TEXT,
  country TEXT NOT NULL,
  country_name TEXT NOT NULL,
  operator TEXT NOT NULL,
  phone TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  processed_at TIMESTAMPTZ,
  processed_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS beneficiary_name TEXT NOT NULL DEFAULT '';

-- Anti-triche : déblocage retrait par admin
ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawal_unlocked BOOLEAN NOT NULL DEFAULT FALSE;

-- Langue préférée de l'utilisateur
ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'fr';

CREATE TABLE IF NOT EXISTS referrals (
  id BIGSERIAL PRIMARY KEY,
  referrer_id BIGINT NOT NULL,
  referred_id BIGINT UNIQUE NOT NULL,
  referred_username TEXT,
  referred_first_name TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'credited')),
  credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);

CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('referral_bonus', 'daily_bonus', 'withdrawal', 'admin_credit', 'admin_debit')),
  amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL DEFAULT 0,
  balance_after INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT NOT NULL DEFAULT '',
  added_by BIGINT,
  is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  user_id BIGINT,
  sent BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_sent ON notifications(sent);

-- ─── Canaux obligatoires multi-canaux ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS required_channels (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'channel' CHECK (type IN ('channel', 'group', 'website')),
  chat_id_or_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Filtre par langue : NULL = toutes les langues, sinon 'fr'/'en'/'de'/'zh'
ALTER TABLE required_channels ADD COLUMN IF NOT EXISTS language TEXT DEFAULT NULL;

CREATE TABLE IF NOT EXISTS channel_verifications (
  id BIGSERIAL PRIMARY KEY,
  channel_id INTEGER NOT NULL,
  user_telegram_id BIGINT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(channel_id, user_telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_verif_user ON channel_verifications(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_channel_verif_channel ON channel_verifications(channel_id);

-- ─── Migration vers USDT/crypto ───────────────────────────────────────────────
-- Convertir les colonnes monétaires de INTEGER en DECIMAL pour USDT
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns WHERE table_name='users' AND column_name='balance' AND table_schema='public') = 'integer' THEN
    ALTER TABLE users ALTER COLUMN balance TYPE DECIMAL(18,8) USING balance::DECIMAL(18,8);
    ALTER TABLE users ALTER COLUMN referral_earnings TYPE DECIMAL(18,8) USING referral_earnings::DECIMAL(18,8);
    ALTER TABLE users ALTER COLUMN bonus_earnings TYPE DECIMAL(18,8) USING bonus_earnings::DECIMAL(18,8);
    ALTER TABLE users ALTER COLUMN total_withdrawn TYPE DECIMAL(18,8) USING total_withdrawn::DECIMAL(18,8);
  END IF;
END $$;

DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns WHERE table_name='withdrawals' AND column_name='amount' AND table_schema='public') = 'integer' THEN
    ALTER TABLE withdrawals ALTER COLUMN amount TYPE DECIMAL(18,8) USING amount::DECIMAL(18,8);
  END IF;
END $$;

DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns WHERE table_name='referrals' AND column_name='amount' AND table_schema='public') = 'integer' THEN
    ALTER TABLE referrals ALTER COLUMN amount TYPE DECIMAL(18,8) USING amount::DECIMAL(18,8);
  END IF;
END $$;

DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns WHERE table_name='transactions' AND column_name='amount' AND table_schema='public') = 'integer' THEN
    ALTER TABLE transactions ALTER COLUMN amount TYPE DECIMAL(18,8) USING amount::DECIMAL(18,8);
    ALTER TABLE transactions ALTER COLUMN balance_before TYPE DECIMAL(18,8) USING balance_before::DECIMAL(18,8);
    ALTER TABLE transactions ALTER COLUMN balance_after TYPE DECIMAL(18,8) USING balance_after::DECIMAL(18,8);
  END IF;
END $$;

-- Rendre nullable les colonnes pays/opérateur/téléphone de withdrawals (remplacés par crypto/wallet/réseau)
ALTER TABLE withdrawals ALTER COLUMN country DROP NOT NULL;
ALTER TABLE withdrawals ALTER COLUMN country_name DROP NOT NULL;
ALTER TABLE withdrawals ALTER COLUMN operator DROP NOT NULL;
ALTER TABLE withdrawals ALTER COLUMN phone DROP NOT NULL;

-- Nouvelles colonnes pour le retrait crypto
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS crypto TEXT DEFAULT 'USDT';
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS wallet_address TEXT;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS network TEXT;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(20,8) DEFAULT 1;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS crypto_amount DECIMAL(20,8);

-- ─── Table des cryptomonnaies disponibles pour le retrait ────────────────────
CREATE TABLE IF NOT EXISTS cryptos (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  coingecko_id TEXT NOT NULL,
  networks TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cryptos par défaut
INSERT INTO cryptos (symbol, name, coingecko_id, networks, display_order) VALUES
  ('USDT', 'Tether USDT', 'tether', ARRAY['TRC20', 'ERC20', 'BEP20'], 0),
  ('BNB', 'BNB', 'binancecoin', ARRAY['BEP20'], 1),
  ('BTC', 'Bitcoin', 'bitcoin', ARRAY['Bitcoin', 'Lightning'], 2),
  ('ETH', 'Ethereum', 'ethereum', ARRAY['ERC20', 'BEP20'], 3),
  ('SOL', 'Solana', 'solana', ARRAY['Solana'], 4),
  ('TRX', 'TRON', 'tron', ARRAY['TRC20'], 5),
  ('MATIC', 'Polygon', 'matic-network', ARRAY['Polygon'], 6)
ON CONFLICT (symbol) DO NOTHING;

-- ─── Mise à jour des paramètres par défaut vers USDT ─────────────────────────
INSERT INTO settings (key, value, description) VALUES
  ('daily_bonus',    '0.5',  'Bonus quotidien en USDT'),
  ('referral_bonus', '1.5',  'Bonus de parrainage en USDT'),
  ('min_withdraw',   '15',   'Retrait minimum en USDT')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = NOW();
