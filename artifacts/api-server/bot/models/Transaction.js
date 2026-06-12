/**
 * Modèle Transaction — PostgreSQL (Supabase)
 */
import { queryOne, queryScalar } from '../database/db.js';

class TransactionRecord {
  constructor(row) {
    this.id = row.id;
    this._id = row.id;
    this.userId = Number(row.user_id);
    this.type = row.type;
    this.amount = parseFloat(row.amount) || 0;
    this.balanceBefore = parseFloat(row.balance_before) || 0;
    this.balanceAfter = parseFloat(row.balance_after) || 0;
    this.description = row.description;
    this.referenceId = row.reference_id;
    this.createdAt = row.created_at;
  }
}

function toRecord(row) {
  return row ? new TransactionRecord(row) : null;
}

const Transaction = {
  async create(data) {
    const row = await queryOne(
      `INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description, reference_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [data.userId, data.type, data.amount,
       data.balanceBefore ?? 0, data.balanceAfter ?? 0,
       data.description ?? '', data.referenceId ?? null]
    );
    return toRecord(row);
  },

  // Remplace Transaction.aggregate pour la somme des bonus
  async sumBonuses() {
    const val = await queryScalar(
      `SELECT COALESCE(SUM(amount),0)::int FROM transactions WHERE type IN ('daily_bonus','referral_bonus')`
    );
    return Number(val) || 0;
  },
};

export default Transaction;
