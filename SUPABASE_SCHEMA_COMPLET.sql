-- ============================================================
--  Moon Crypto Bot — Schéma complet Supabase
--  Coller intégralement dans : Supabase → SQL Editor → Run
--  Idempotent : sûr à relancer plusieurs fois
-- ============================================================

-- ─── 1. TABLE USERS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                  BIGSERIAL PRIMARY KEY,
  telegram_id         BIGINT UNIQUE NOT NULL,
  username            TEXT,
  first_name          TEXT NOT NULL DEFAULT '',
  last_name           TEXT NOT NULL DEFAULT '',
  balance             DECIMAL(18,8) NOT NULL DEFAULT 0,
  referral_code       TEXT UNIQUE NOT NULL,
  referred_by         BIGINT,
  referral_count      INTEGER NOT NULL DEFAULT 0,
  referral_earnings   DECIMAL(18,8) NOT NULL DEFAULT 0,
  bonus_earnings      DECIMAL(18,8) NOT NULL DEFAULT 0,
  total_withdrawn     DECIMAL(18,8) NOT NULL DEFAULT 0,
  last_bonus_at       TIMESTAMPTZ,
  banned              BOOLEAN NOT NULL DEFAULT FALSE,
  banned_reason       TEXT,
  banned_at           TIMESTAMPTZ,
  withdrawal_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified         BOOLEAN NOT NULL DEFAULT FALSE,
  last_activity_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  waiting_for_support BOOLEAN NOT NULL DEFAULT FALSE,
  language            TEXT NOT NULL DEFAULT 'fr',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id   ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- Colonnes ajoutées après la création initiale (idempotent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawal_unlocked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS language            TEXT NOT NULL DEFAULT 'fr';

-- Conversion INTEGER → DECIMAL si ancienne base
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema='public' AND table_name='users' AND column_name='balance') = 'integer' THEN
    ALTER TABLE users ALTER COLUMN balance           TYPE DECIMAL(18,8) USING balance::DECIMAL(18,8);
    ALTER TABLE users ALTER COLUMN referral_earnings TYPE DECIMAL(18,8) USING referral_earnings::DECIMAL(18,8);
    ALTER TABLE users ALTER COLUMN bonus_earnings    TYPE DECIMAL(18,8) USING bonus_earnings::DECIMAL(18,8);
    ALTER TABLE users ALTER COLUMN total_withdrawn   TYPE DECIMAL(18,8) USING total_withdrawn::DECIMAL(18,8);
  END IF;
END $$;


-- ─── 2. TABLE WITHDRAWALS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS withdrawals (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL,
  telegram_id     BIGINT NOT NULL,
  first_name      TEXT NOT NULL DEFAULT '',
  beneficiary_name TEXT NOT NULL DEFAULT '',
  username        TEXT,
  country         TEXT,
  country_name    TEXT,
  operator        TEXT,
  phone           TEXT,
  amount          DECIMAL(18,8) NOT NULL,
  crypto          TEXT DEFAULT 'USDT',
  wallet_address  TEXT,
  network         TEXT,
  conversion_rate DECIMAL(20,8) DEFAULT 1,
  crypto_amount   DECIMAL(20,8),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note      TEXT,
  processed_at    TIMESTAMPTZ,
  processed_by    BIGINT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status  ON withdrawals(status);

-- Colonnes ajoutées progressivement
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS beneficiary_name TEXT NOT NULL DEFAULT '';
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS crypto          TEXT DEFAULT 'USDT';
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS wallet_address  TEXT;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS network         TEXT;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(20,8) DEFAULT 1;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS crypto_amount   DECIMAL(20,8);

-- Rendre nullable les anciennes colonnes obligatoires
ALTER TABLE withdrawals ALTER COLUMN country      DROP NOT NULL;
ALTER TABLE withdrawals ALTER COLUMN country_name DROP NOT NULL;
ALTER TABLE withdrawals ALTER COLUMN operator     DROP NOT NULL;
ALTER TABLE withdrawals ALTER COLUMN phone        DROP NOT NULL;

-- Conversion INTEGER → DECIMAL si ancienne base
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema='public' AND table_name='withdrawals' AND column_name='amount') = 'integer' THEN
    ALTER TABLE withdrawals ALTER COLUMN amount TYPE DECIMAL(18,8) USING amount::DECIMAL(18,8);
  END IF;
END $$;


-- ─── 3. TABLE REFERRALS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id                 BIGSERIAL PRIMARY KEY,
  referrer_id        BIGINT NOT NULL,
  referred_id        BIGINT UNIQUE NOT NULL,
  referred_username  TEXT,
  referred_first_name TEXT NOT NULL DEFAULT '',
  amount             DECIMAL(18,8) NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'credited')),
  credited_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);

DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema='public' AND table_name='referrals' AND column_name='amount') = 'integer' THEN
    ALTER TABLE referrals ALTER COLUMN amount TYPE DECIMAL(18,8) USING amount::DECIMAL(18,8);
  END IF;
END $$;


-- ─── 4. TABLE TRANSACTIONS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL,
  type           TEXT NOT NULL,
  amount         DECIMAL(18,8) NOT NULL,
  balance_before DECIMAL(18,8) NOT NULL DEFAULT 0,
  balance_after  DECIMAL(18,8) NOT NULL DEFAULT 0,
  description    TEXT NOT NULL DEFAULT '',
  reference_id   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- Mise à jour du CHECK pour inclure ad_reward (DROP + ADD car PostgreSQL
-- ne supporte pas ALTER CONSTRAINT directement sur les CHECK inline)
DO $$
BEGIN
  BEGIN
    ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
      CHECK (type IN ('referral_bonus', 'daily_bonus', 'withdrawal', 'admin_credit', 'admin_debit', 'ad_reward'));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema='public' AND table_name='transactions' AND column_name='amount') = 'integer' THEN
    ALTER TABLE transactions ALTER COLUMN amount        TYPE DECIMAL(18,8) USING amount::DECIMAL(18,8);
    ALTER TABLE transactions ALTER COLUMN balance_before TYPE DECIMAL(18,8) USING balance_before::DECIMAL(18,8);
    ALTER TABLE transactions ALTER COLUMN balance_after  TYPE DECIMAL(18,8) USING balance_after::DECIMAL(18,8);
  END IF;
END $$;


-- ─── 5. TABLE SETTINGS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id          SERIAL PRIMARY KEY,
  key         TEXT UNIQUE NOT NULL,
  value       TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Valeurs par défaut (ON CONFLICT = ne pas écraser les valeurs existantes)
INSERT INTO settings (key, value, description) VALUES
  ('referral_bonus',     '0.5',        'Bonus de parrainage en USDT'),
  ('daily_bonus',        '0.2',        'Bonus quotidien en USDT'),
  ('min_withdraw',       '15',         'Retrait minimum en USDT'),
  ('ad_reward_usdt',     '0.002',      'Récompense par publicité Adsgram (USDT)'),
  ('ad_daily_limit',     '10',         'Nombre max de pubs par jour par utilisateur'),
  ('ad_cooldown_min',    '5',          'Délai minimum entre deux pubs (minutes)'),
  ('required_channel',   '',           'ID ou username du canal obligatoire'),
  ('required_group',     '',           'ID ou username du groupe obligatoire'),
  ('required_site',      '',           'URL du site obligatoire'),
  ('support_link',       '',           'Lien vers le support Telegram'),
  ('support_message',    '',           'Message personnalisé section support'),
  ('admin_group_id',     '',           'ID du groupe admin pour notifications'),
  ('withdrawal_channel', '',           'Canal de retrait (notifications publiques)'),
  ('maintenance_mode',   'false',      'Mode maintenance activé/désactivé'),
  ('bot_name',           'Moon Crypto','Nom du bot')
ON CONFLICT (key) DO NOTHING;


-- ─── 6. TABLE ADMINS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  telegram_id   BIGINT UNIQUE NOT NULL,
  username      TEXT,
  first_name    TEXT NOT NULL DEFAULT '',
  added_by      BIGINT,
  is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── 7. TABLE NOTIFICATIONS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         BIGSERIAL PRIMARY KEY,
  type       TEXT NOT NULL,
  message    TEXT NOT NULL DEFAULT '',
  user_id    BIGINT,
  sent       BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_sent ON notifications(sent);


-- ─── 8. TABLE REQUIRED_CHANNELS ──────────────────────────────
CREATE TABLE IF NOT EXISTS required_channels (
  id            SERIAL PRIMARY KEY,
  label         TEXT NOT NULL DEFAULT '',
  type          TEXT NOT NULL DEFAULT 'channel'
                CHECK (type IN ('channel', 'group', 'website')),
  chat_id_or_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  language      TEXT DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE required_channels ADD COLUMN IF NOT EXISTS language TEXT DEFAULT NULL;


-- ─── 9. TABLE CHANNEL_VERIFICATIONS ──────────────────────────
CREATE TABLE IF NOT EXISTS channel_verifications (
  id               BIGSERIAL PRIMARY KEY,
  channel_id       INTEGER NOT NULL,
  user_telegram_id BIGINT NOT NULL,
  verified_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(channel_id, user_telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_verif_user    ON channel_verifications(user_telegram_id);
CREATE INDEX IF NOT EXISTS idx_channel_verif_channel ON channel_verifications(channel_id);


-- ─── 10. TABLE CRYPTOS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS cryptos (
  id           SERIAL PRIMARY KEY,
  symbol       TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  coingecko_id TEXT NOT NULL,
  networks     TEXT[] NOT NULL DEFAULT '{}',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cryptos par défaut
INSERT INTO cryptos (symbol, name, coingecko_id, networks, display_order) VALUES
  ('USDT',  'Tether USDT', 'tether',        ARRAY['TRC20', 'ERC20', 'BEP20'],    0),
  ('BNB',   'BNB',         'binancecoin',   ARRAY['BEP20'],                      1),
  ('BTC',   'Bitcoin',     'bitcoin',       ARRAY['Bitcoin', 'Lightning'],        2),
  ('ETH',   'Ethereum',    'ethereum',      ARRAY['ERC20', 'BEP20'],             3),
  ('SOL',   'Solana',      'solana',        ARRAY['Solana'],                     4),
  ('TRX',   'TRON',        'tron',          ARRAY['TRC20'],                      5),
  ('MATIC', 'Polygon',     'matic-network', ARRAY['Polygon'],                    6)
ON CONFLICT (symbol) DO NOTHING;


-- ─── VÉRIFICATION FINALE ─────────────────────────────────────
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns c 
        WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS colonnes
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
