/**
 * Modèle Admin — PostgreSQL (Supabase)
 */
import { queryOne, queryAll } from '../database/db.js';

class AdminRecord {
  constructor(row) {
    this.id = row.id;
    this._id = row.id;
    this.telegramId = Number(row.telegram_id);
    this.username = row.username;
    this.firstName = row.first_name;
    this.addedBy = row.added_by ? Number(row.added_by) : null;
    this.isSuperAdmin = row.is_super_admin;
    this.createdAt = row.created_at;
  }
}

function toRecord(row) {
  return row ? new AdminRecord(row) : null;
}

const Admin = {
  async findOne(filter) {
    if (filter.telegramId !== undefined) {
      return toRecord(await queryOne('SELECT * FROM admins WHERE telegram_id=$1', [filter.telegramId]));
    }
    throw new Error('Admin.findOne: filtre non supporté');
  },

  async create(data) {
    const row = await queryOne(
      `INSERT INTO admins (telegram_id, username, first_name, added_by, is_super_admin)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (telegram_id) DO UPDATE SET username=$2, first_name=$3
       RETURNING *`,
      [data.telegramId, data.username ?? null, data.firstName ?? '', data.addedBy ?? null, data.isSuperAdmin ?? false]
    );
    return toRecord(row);
  },

  async find() {
    const rows = await queryAll('SELECT * FROM admins ORDER BY created_at ASC', []);
    return rows.map(toRecord);
  },

  async deleteOne(filter) {
    if (filter.telegramId !== undefined) {
      await queryOne('DELETE FROM admins WHERE telegram_id=$1', [filter.telegramId]);
    }
  },
};

export default Admin;
