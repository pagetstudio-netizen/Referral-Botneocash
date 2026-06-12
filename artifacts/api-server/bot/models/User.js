/**
 * Modèle User — PostgreSQL (Supabase)
 */
import { query, queryOne, queryAll, queryScalar } from '../database/db.js';

class UserRecord {
  constructor(row) {
    this.id = row.id;
    this._id = row.id;
    this.telegramId = Number(row.telegram_id);
    this.username = row.username;
    this.firstName = row.first_name;
    this.lastName = row.last_name;
    this.balance = row.balance;
    this.referralCode = row.referral_code;
    this.referredBy = row.referred_by ? Number(row.referred_by) : null;
    this.referralCount = row.referral_count;
    this.referralEarnings = row.referral_earnings;
    this.bonusEarnings = row.bonus_earnings;
    this.totalWithdrawn = row.total_withdrawn;
    this.lastBonusAt = row.last_bonus_at;
    this.banned = row.banned;
    this.bannedReason = row.banned_reason;
    this.bannedAt = row.banned_at;
    this.withdrawalUnlocked = row.withdrawal_unlocked ?? false;
    this.isVerified = row.is_verified;
    this.lastActivityAt = row.last_activity_at;
    this.waitingForSupport = row.waiting_for_support;
    this.language = row.language || 'fr';
    this.createdAt = row.created_at;
    this.updatedAt = row.updated_at;
  }

  getFullName() {
    return `${this.firstName} ${this.lastName || ''}`.trim();
  }

  canClaimBonus() {
    if (!this.lastBonusAt) return true;
    return Date.now() - new Date(this.lastBonusAt).getTime() >= 24 * 60 * 60 * 1000;
  }

  timeUntilNextBonus() {
    if (!this.lastBonusAt) return 0;
    const next = new Date(this.lastBonusAt).getTime() + 24 * 60 * 60 * 1000;
    const diff = next - Date.now();
    return diff > 0 ? diff : 0;
  }

  async save() {
    await query(
      `UPDATE users SET
        username=$1, first_name=$2, last_name=$3, balance=$4,
        referral_code=$5, referred_by=$6, referral_count=$7,
        referral_earnings=$8, bonus_earnings=$9, total_withdrawn=$10,
        last_bonus_at=$11, banned=$12, banned_reason=$13, banned_at=$14,
        withdrawal_unlocked=$15, is_verified=$16, last_activity_at=$17,
        waiting_for_support=$18, language=$19, updated_at=NOW()
       WHERE telegram_id=$20`,
      [
        this.username, this.firstName, this.lastName, this.balance,
        this.referralCode, this.referredBy, this.referralCount,
        this.referralEarnings, this.bonusEarnings, this.totalWithdrawn,
        this.lastBonusAt, this.banned, this.bannedReason, this.bannedAt,
        this.withdrawalUnlocked, this.isVerified, this.lastActivityAt,
        this.waitingForSupport, this.language, this.telegramId,
      ]
    );
  }
}

function toRecord(row) {
  return row ? new UserRecord(row) : null;
}

const User = {
  async findOne(filter) {
    if (filter.telegramId !== undefined) {
      return toRecord(await queryOne('SELECT * FROM users WHERE telegram_id=$1', [filter.telegramId]));
    }
    if (filter.referralCode !== undefined) {
      return toRecord(await queryOne('SELECT * FROM users WHERE referral_code=$1', [filter.referralCode]));
    }
    if (filter.username !== undefined) {
      return toRecord(await queryOne('SELECT * FROM users WHERE username=$1', [filter.username]));
    }
    throw new Error('User.findOne: filtre non supporté');
  },

  async create(data) {
    const row = await queryOne(
      `INSERT INTO users
        (telegram_id, username, first_name, last_name, referral_code, referred_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (telegram_id) DO UPDATE SET last_activity_at=NOW()
       RETURNING *`,
      [data.telegramId, data.username ?? null, data.firstName ?? '', data.lastName ?? '', data.referralCode, data.referredBy ?? null]
    );
    return toRecord(row);
  },

  async countDocuments(filter = {}) {
    let sql = 'SELECT COUNT(*) FROM users WHERE 1=1';
    const params = [];
    let i = 1;

    if (filter.banned !== undefined) {
      sql += ` AND banned=$${i++}`;
      params.push(filter.banned);
    }
    if (filter.createdAt?.$gte) {
      sql += ` AND created_at >= $${i++}`;
      params.push(filter.createdAt.$gte);
    }
    if (filter.lastActivityAt?.$gte) {
      sql += ` AND last_activity_at >= $${i++}`;
      params.push(filter.lastActivityAt.$gte);
    }

    return Number(await queryScalar(sql, params));
  },

  find(filter = {}) {
    let sql = 'SELECT * FROM users WHERE 1=1';
    const params = [];
    let i = 1;

    if (filter.banned !== undefined) {
      sql += ` AND banned=$${i++}`;
      params.push(filter.banned);
    }
    if (filter.telegramId?.$ne !== undefined) {
      sql += ` AND telegram_id != $${i++}`;
      params.push(filter.telegramId.$ne);
    }

    const meta = { _sql: sql, _params: params, _order: 'created_at DESC', _limit: 100 };
    return {
      sort(s) {
        if (s.balance === -1) meta._order = 'balance DESC';
        else if (s.createdAt === -1) meta._order = 'created_at DESC';
        else if (s.createdAt === 1) meta._order = 'created_at ASC';
        return this;
      },
      async limit(n) {
        meta._limit = n;
        const res = await queryAll(`${meta._sql} ORDER BY ${meta._order} LIMIT $${meta._params.length + 1}`, [...meta._params, n]);
        return res.map(toRecord);
      },
      select(_fields) { return this; },
    };
  },

  async findAll() {
    const rows = await queryAll('SELECT * FROM users ORDER BY created_at ASC', []);
    return rows.map(toRecord);
  },

  async updateMany(filter, update) {
    if (filter.telegramId?.$ne !== undefined && update.$set) {
      const sets = Object.entries(update.$set).map(([k, v], idx) => `${k}=$${idx + 1}`).join(', ');
      const vals = Object.values(update.$set);
      vals.push(filter.telegramId.$ne);
      await query(`UPDATE users SET ${sets} WHERE telegram_id != $${vals.length}`, vals);
    }
  },
};

export default User;
