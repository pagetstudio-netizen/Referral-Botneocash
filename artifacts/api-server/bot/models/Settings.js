/**
 * Modèle Settings — PostgreSQL (Supabase)
 */
import { queryOne, query } from '../database/db.js';

const DEFAULT_SETTINGS = {
  referral_bonus:     { value: '120',    description: 'Bonus par parrainage en FCFA' },
  daily_bonus:        { value: '0.2',    description: 'Bonus quotidien en USDT' },
  min_withdraw:       { value: '800',    description: 'Retrait minimum en FCFA' },
  ad_reward_usdt:     { value: '0.002',  description: 'Récompense par publicité Adsgram (USDT)' },
  ad_daily_limit:     { value: '10',     description: 'Nombre max de pubs par jour par utilisateur' },
  ad_cooldown_min:    { value: '5',      description: 'Délai minimum entre deux pubs (minutes)' },
  required_channel:   { value: '',       description: 'ID ou username du canal obligatoire' },
  required_group:     { value: '',       description: 'ID ou username du groupe obligatoire' },
  required_site:      { value: '',       description: 'URL du site obligatoire' },
  support_link:       { value: '',       description: 'Lien vers le support Telegram' },
  support_message:    { value: '',       description: 'Message personnalisé section support' },
  admin_group_id:     { value: '',       description: 'ID du groupe admin pour notifications' },
  withdrawal_channel: { value: '',       description: 'Canal de retrait (notifications publiques)' },
  maintenance_mode:   { value: 'false',  description: 'Mode maintenance activé/désactivé' },
  bot_name:           { value: 'Moon Crypto',description: 'Nom du bot' },
};

export async function initSettings() {
  for (const [key, data] of Object.entries(DEFAULT_SETTINGS)) {
    await query(
      `INSERT INTO settings (key, value, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO NOTHING`,
      [key, String(data.value), data.description]
    );
  }
}

const _settingsCache = new Map();
const SETTINGS_TTL = 60_000;

function _processRaw(key, raw) {
  if (raw === null) return null;
  if (['referral_bonus', 'daily_bonus', 'min_withdraw', 'ad_reward_usdt', 'ad_daily_limit', 'ad_cooldown_min'].includes(key)) return Number(raw);
  if (key === 'maintenance_mode') return raw === 'true' || raw === true;
  return raw;
}

export async function getSetting(key) {
  const cached = _settingsCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  const row = await queryOne('SELECT value FROM settings WHERE key=$1', [key]);
  const raw = row ? row.value : (DEFAULT_SETTINGS[key]?.value ?? null);
  const value = _processRaw(key, raw);
  _settingsCache.set(key, { value, expiresAt: Date.now() + SETTINGS_TTL });
  return value;
}

export async function setSetting(key, value) {
  _settingsCache.delete(key);
  await query(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
    [key, String(value)]
  );
}

// Compatibilité avec le code existant
const Settings = {
  async findOne(filter) {
    const row = await queryOne('SELECT * FROM settings WHERE key=$1', [filter.key]);
    return row ? { key: row.key, value: row.value } : null;
  },
  async findOneAndUpdate(filter, update, opts = {}) {
    const val = update.value ?? update.$set?.value ?? '';
    if (opts.upsert) {
      await setSetting(filter.key, val);
    } else {
      await query('UPDATE settings SET value=$1, updated_at=NOW() WHERE key=$2', [String(val), filter.key]);
    }
  },
};

export default Settings;
