/**
 * Modèle Referral — PostgreSQL (Supabase)
 */
import { queryOne, queryAll, queryScalar, query } from '../database/db.js';

class ReferralRecord {
  constructor(row) {
    this.id = row.id;
    this._id = row.id;
    this.referrerId = Number(row.referrer_id);
    this.referredId = Number(row.referred_id);
    this.referredUsername = row.referred_username;
    this.referredFirstName = row.referred_first_name;
    this.amount = parseFloat(row.amount) || 0;
    this.status = row.status;
    this.creditedAt = row.credited_at;
    this.createdAt = row.created_at;
  }

  async save() {
    await query(
      `UPDATE referrals SET status=$1, credited_at=$2 WHERE id=$3`,
      [this.status, this.creditedAt, this.id]
    );
  }
}

function toRecord(row) {
  return row ? new ReferralRecord(row) : null;
}

const Referral = {
  async create(data) {
    const row = await queryOne(
      `INSERT INTO referrals (referrer_id, referred_id, referred_username, referred_first_name, amount, status)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (referred_id) DO NOTHING
       RETURNING *`,
      [data.referrerId, data.referredId, data.referredUsername ?? null,
       data.referredFirstName ?? '', data.amount, data.status ?? 'pending']
    );
    return toRecord(row);
  },

  async findOne(filter) {
    let sql = 'SELECT * FROM referrals WHERE 1=1';
    const params = [];
    let i = 1;
    if (filter.referredId !== undefined) { sql += ` AND referred_id=$${i++}`; params.push(filter.referredId); }
    if (filter.referrerId !== undefined) { sql += ` AND referrer_id=$${i++}`; params.push(filter.referrerId); }
    if (filter.status !== undefined) { sql += ` AND status=$${i++}`; params.push(filter.status); }
    const row = await queryOne(sql + ' LIMIT 1', params);
    return toRecord(row);
  },

  async countDocuments(filter = {}) {
    let sql = 'SELECT COUNT(*) FROM referrals WHERE 1=1';
    const params = [];
    let i = 1;
    if (filter.referrerId !== undefined) { sql += ` AND referrer_id=$${i++}`; params.push(filter.referrerId); }
    if (filter.status !== undefined) { sql += ` AND status=$${i++}`; params.push(filter.status); }
    return Number(await queryScalar(sql, params));
  },

  async find(filter = {}) {
    let sql = 'SELECT * FROM referrals WHERE 1=1';
    const params = [];
    let i = 1;
    if (filter.referrerId !== undefined) { sql += ` AND referrer_id=$${i++}`; params.push(filter.referrerId); }
    if (filter.status !== undefined) { sql += ` AND status=$${i++}`; params.push(filter.status); }
    const meta = { _sql: sql, _params: params, _order: 'created_at DESC' };
    return {
      sort(s) {
        meta._order = s.createdAt === 1 ? 'created_at ASC' : 'created_at DESC';
        return this;
      },
      async limit(n) {
        const res = await queryAll(
          `${meta._sql} ORDER BY ${meta._order} LIMIT $${meta._params.length + 1}`,
          [...meta._params, n]
        );
        return res.map(toRecord);
      },
    };
  },
};

export default Referral;
