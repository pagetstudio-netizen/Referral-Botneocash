/**
 * Modèle Notification — PostgreSQL (Supabase)
 */
import { queryOne } from '../database/db.js';

class NotificationRecord {
  constructor(row) {
    this.id = row.id;
    this._id = row.id;
    this.type = row.type;
    this.message = row.message;
    this.userId = row.user_id ? Number(row.user_id) : null;
    this.sent = row.sent;
    this.sentAt = row.sent_at;
    this.createdAt = row.created_at;
  }
}

function toRecord(row) {
  return row ? new NotificationRecord(row) : null;
}

const Notification = {
  async create(data) {
    const row = await queryOne(
      `INSERT INTO notifications (type, message, user_id, sent)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.type, data.message ?? '', data.userId ?? null, data.sent ?? false]
    );
    return toRecord(row);
  },
};

export default Notification;
