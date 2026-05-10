/**
 * Modèle Withdrawal — PostgreSQL (Supabase)
 */
import { query, queryOne, queryAll, queryScalar } from '../database/db.js';

class WithdrawalRecord {
  constructor(row) {
    this.id = row.id;
    this._id = row.id;
    this.userId = Number(row.user_id);
    this.telegramId = Number(row.telegram_id);
    this.firstName = row.first_name;
    this.beneficiaryName = row.beneficiary_name ?? '';
    this.username = row.username;
    this.country = row.country;
    this.countryName = row.country_name;
    this.operator = row.operator;
    this.phone = row.phone;
    this.amount = row.amount;
    this.status = row.status;
    this.adminNote = row.admin_note;
    this.processedAt = row.processed_at;
    this.processedBy = row.processed_by ? Number(row.processed_by) : null;
    this.createdAt = row.created_at;
    this.updatedAt = row.updated_at;
  }

  async save() {
    await query(
      `UPDATE withdrawals SET
        status=$1, admin_note=$2, processed_at=$3, processed_by=$4, updated_at=NOW()
       WHERE id=$5`,
      [this.status, this.adminNote, this.processedAt, this.processedBy, this.id]
    );
  }
}

function toRecord(row) {
  return row ? new WithdrawalRecord(row) : null;
}

const Withdrawal = {
  async create(data) {
    const row = await queryOne(
      `INSERT INTO withdrawals
        (user_id, telegram_id, first_name, beneficiary_name, username, country, country_name, operator, phone, amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [data.userId, data.telegramId, data.firstName ?? '', data.beneficiaryName ?? '',
       data.username ?? null, data.country, data.countryName, data.operator, data.phone, data.amount]
    );
    return toRecord(row);
  },

  async findById(id) {
    return toRecord(await queryOne('SELECT * FROM withdrawals WHERE id=$1', [id]));
  },

  async findOne(filter) {
    if (filter._id !== undefined) return this.findById(filter._id);
    if (filter.id !== undefined) return this.findById(filter.id);
    throw new Error('Withdrawal.findOne: filtre non supporté');
  },

  async countDocuments(filter = {}) {
    let sql = 'SELECT COUNT(*) FROM withdrawals WHERE 1=1';
    const params = [];
    let i = 1;
    if (filter.status) { sql += ` AND status=$${i++}`; params.push(filter.status); }
    return Number(await queryScalar(sql, params));
  },

  async find(filter = {}) {
    let sql = 'SELECT * FROM withdrawals WHERE 1=1';
    const params = [];
    let i = 1;
    if (filter.status) { sql += ` AND status=$${i++}`; params.push(filter.status); }
    if (filter.userId) { sql += ` AND user_id=$${i++}`; params.push(filter.userId); }

    const meta = { _sql: sql, _params: params, _order: 'created_at DESC', _limit: 20 };
    return {
      sort(s) {
        if (s.createdAt === 1) meta._order = 'created_at ASC';
        else if (s.createdAt === -1) meta._order = 'created_at DESC';
        return this;
      },
      async limit(n) {
        meta._limit = n;
        const res = await queryAll(
          `${meta._sql} ORDER BY ${meta._order} LIMIT $${meta._params.length + 1}`,
          [...meta._params, n]
        );
        return res.map(toRecord);
      },
    };
  },

  // Remplace Withdrawal.aggregate pour les stats par statut
  async sumByStatus() {
    const rows = await queryAll('SELECT status, SUM(amount)::int as total FROM withdrawals GROUP BY status', []);
    const result = {};
    rows.forEach(r => { result[r.status] = r.total; });
    return result;
  },
};

export default Withdrawal;
