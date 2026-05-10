/**
 * Pool PostgreSQL — Supabase
 */
import pg from 'pg';
const { Pool } = pg;

let pool;

export function getPool() {
  if (!pool) {
    const connStr = process.env.SUPABASE_DB_URL;
    if (!connStr) throw new Error('SUPABASE_DB_URL non définie');
    pool = new Pool({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
    pool.on('error', (err) => {
      console.error('PG Pool error:', err.message);
    });
  }
  return pool;
}

export async function query(text, params = []) {
  const p = getPool();
  return p.query(text, params);
}

export async function queryOne(text, params = []) {
  const res = await query(text, params);
  return res.rows[0] ?? null;
}

export async function queryAll(text, params = []) {
  const res = await query(text, params);
  return res.rows;
}

export async function queryScalar(text, params = []) {
  const row = await queryOne(text, params);
  if (!row) return null;
  return Object.values(row)[0];
}
