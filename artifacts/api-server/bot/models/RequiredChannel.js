/**
 * Modèle RequiredChannel — Canaux obligatoires multi-entrées avec filtre langue
 * language = NULL  → s'applique à tous les utilisateurs
 * language = 'fr'/'en'/'de'/'zh' → s'applique uniquement à cette langue
 */
import { queryOne, queryAll, query, queryScalar } from '../database/db.js';

export class RequiredChannelRecord {
  constructor(row) {
    this.id = row.id;
    this.label = row.label;
    this.type = row.type;
    this.chatIdOrUrl = row.chat_id_or_url;
    this.displayOrder = Number(row.display_order);
    this.isActive = row.is_active;
    this.language = row.language || null; // null = toutes les langues
    this.createdAt = row.created_at;
    this.subscribers = row.subscribers !== undefined ? Number(row.subscribers) : undefined;
  }
}

// ─── Cache en mémoire ──────────────────────────────────────────────────────────
let _channelsCache = null;
let _channelsCacheExpiresAt = 0;
const CHANNELS_TTL = 60_000;

export function invalidateChannelsCache() {
  _channelsCache = null;
  _channelsCacheExpiresAt = 0;
}

const RequiredChannel = {
  /**
   * Récupère tous les canaux actifs (sans filtre langue — pour cache global)
   */
  async findAll() {
    if (_channelsCache && Date.now() < _channelsCacheExpiresAt) return _channelsCache;
    const rows = await queryAll(
      'SELECT * FROM required_channels WHERE is_active = TRUE ORDER BY display_order ASC, created_at ASC',
      []
    );
    _channelsCache = rows.map(r => new RequiredChannelRecord(r));
    _channelsCacheExpiresAt = Date.now() + CHANNELS_TTL;
    return _channelsCache;
  },

  /**
   * Récupère les canaux applicables à une langue donnée :
   * - canaux sans langue (language IS NULL) → s'applique à tous
   * - canaux avec la même langue que l'utilisateur
   */
  async findAllForLang(userLang) {
    const all = await this.findAll();
    return all.filter(ch => ch.language === null || ch.language === userLang);
  },

  async findAllAdmin() {
    const rows = await queryAll(
      `SELECT rc.*,
        (SELECT COUNT(*) FROM channel_verifications cv WHERE cv.channel_id = rc.id) AS subscribers
       FROM required_channels rc
       ORDER BY rc.display_order ASC, rc.created_at ASC`,
      []
    );
    return rows.map(r => new RequiredChannelRecord(r));
  },

  async findById(id) {
    const row = await queryOne('SELECT * FROM required_channels WHERE id = $1', [id]);
    return row ? new RequiredChannelRecord(row) : null;
  },

  async create(data) {
    invalidateChannelsCache();
    const row = await queryOne(
      `INSERT INTO required_channels (label, type, chat_id_or_url, display_order, language)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.label, data.type || 'channel', data.chatIdOrUrl, data.displayOrder ?? 0, data.language ?? null]
    );
    return row ? new RequiredChannelRecord(row) : null;
  },

  async update(id, data) {
    invalidateChannelsCache();
    const row = await queryOne(
      `UPDATE required_channels
       SET label=$1, type=$2, chat_id_or_url=$3, display_order=$4, is_active=$5, language=$6
       WHERE id=$7 RETURNING *`,
      [data.label, data.type, data.chatIdOrUrl, data.displayOrder ?? 0, data.isActive ?? true, data.language ?? null, id]
    );
    return row ? new RequiredChannelRecord(row) : null;
  },

  async delete(id) {
    invalidateChannelsCache();
    await query('DELETE FROM channel_verifications WHERE channel_id = $1', [id]);
    await query('DELETE FROM required_channels WHERE id = $1', [id]);
  },

  async toggleActive(id, isActive) {
    invalidateChannelsCache();
    await query('UPDATE required_channels SET is_active=$1 WHERE id=$2', [isActive, id]);
  },

  // ─── Vérifications utilisateur ───────────────────────────────────────────────
  async addVerification(channelId, userTelegramId) {
    await query(
      'INSERT INTO channel_verifications (channel_id, user_telegram_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [channelId, userTelegramId]
    );
  },

  async getUserVerifiedIds(userTelegramId) {
    const rows = await queryAll(
      'SELECT channel_id FROM channel_verifications WHERE user_telegram_id = $1',
      [userTelegramId]
    );
    return rows.map(r => Number(r.channel_id));
  },

  async countAll() {
    return Number(await queryScalar('SELECT COUNT(*) FROM required_channels WHERE is_active = TRUE', []));
  },
};

export default RequiredChannel;
