/**
 * Modèle RequiredChannel — Canaux obligatoires multi-entrées
 */
import { queryOne, queryAll, query, queryScalar } from '../database/db.js';

class RequiredChannelRecord {
  constructor(row) {
    this.id = row.id;
    this.label = row.label;
    this.type = row.type;
    this.chatIdOrUrl = row.chat_id_or_url;
    this.displayOrder = Number(row.display_order);
    this.isActive = row.is_active;
    this.createdAt = row.created_at;
    this.subscribers = row.subscribers !== undefined ? Number(row.subscribers) : undefined;
  }
}

let _channelsCache = null;
let _channelsCacheExpiresAt = 0;
const CHANNELS_TTL = 60_000;

function _invalidateChannelsCache() {
  _channelsCache = null;
  _channelsCacheExpiresAt = 0;
}

const RequiredChannel = {
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
    _invalidateChannelsCache();
    const row = await queryOne(
      `INSERT INTO required_channels (label, type, chat_id_or_url, display_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.label, data.type || 'channel', data.chatIdOrUrl, data.displayOrder ?? 0]
    );
    return row ? new RequiredChannelRecord(row) : null;
  },

  async update(id, data) {
    _invalidateChannelsCache();
    const row = await queryOne(
      `UPDATE required_channels
       SET label=$1, type=$2, chat_id_or_url=$3, display_order=$4, is_active=$5
       WHERE id=$6 RETURNING *`,
      [data.label, data.type, data.chatIdOrUrl, data.displayOrder ?? 0, data.isActive ?? true, id]
    );
    return row ? new RequiredChannelRecord(row) : null;
  },

  async delete(id) {
    _invalidateChannelsCache();
    await query('DELETE FROM channel_verifications WHERE channel_id = $1', [id]);
    await query('DELETE FROM required_channels WHERE id = $1', [id]);
  },

  // ─── Vérifications utilisateur ─────────────────────────────────────────────
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
