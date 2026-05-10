/**
 * Connexion Supabase (PostgreSQL) + initialisation du schéma
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getPool } from './db.js';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function connectDB() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error('SUPABASE_DB_URL non définie dans les variables d\'environnement');

  const pool = getPool();

  // Test de connexion
  await pool.query('SELECT NOW()');
  logger.info('✅ Connecté à Supabase (PostgreSQL)');

  // Initialisation du schéma (CREATE IF NOT EXISTS — idempotent)
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  await pool.query(schema);
  logger.info('✅ Schéma PostgreSQL initialisé');
}
