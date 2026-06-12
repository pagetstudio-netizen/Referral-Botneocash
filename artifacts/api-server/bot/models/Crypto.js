/**
 * Modèle Crypto — Cryptomonnaies disponibles pour les retraits
 * Géré par l'admin : symbole, nom, ID CoinGecko, réseaux disponibles
 */
import { query, queryOne, queryAll } from '../database/db.js';

export class CryptoRecord {
  constructor(row) {
    this.id = row.id;
    this.symbol = row.symbol;
    this.name = row.name;
    this.coingeckoId = row.coingecko_id;
    this.networks = Array.isArray(row.networks) ? row.networks : (row.networks || []);
    this.isActive = row.is_active;
    this.displayOrder = Number(row.display_order || 0);
    this.createdAt = row.created_at;
  }
}

let _cache = null;
let _cacheExpiresAt = 0;
const CACHE_TTL = 30_000;

const Crypto = {
  invalidateCache() {
    _cache = null;
    _cacheExpiresAt = 0;
  },

  async findAll() {
    if (_cache && Date.now() < _cacheExpiresAt) return _cache;
    const rows = await queryAll(
      'SELECT * FROM cryptos WHERE is_active = TRUE ORDER BY display_order ASC, id ASC',
      []
    );
    _cache = rows.map(r => new CryptoRecord(r));
    _cacheExpiresAt = Date.now() + CACHE_TTL;
    return _cache;
  },

  async findAllAdmin() {
    const rows = await queryAll('SELECT * FROM cryptos ORDER BY display_order ASC, id ASC', []);
    return rows.map(r => new CryptoRecord(r));
  },

  async findBySymbol(symbol) {
    const row = await queryOne('SELECT * FROM cryptos WHERE symbol = $1', [symbol.toUpperCase()]);
    return row ? new CryptoRecord(row) : null;
  },

  async findById(id) {
    const row = await queryOne('SELECT * FROM cryptos WHERE id = $1', [id]);
    return row ? new CryptoRecord(row) : null;
  },

  async create(data) {
    this.invalidateCache();
    const row = await queryOne(
      `INSERT INTO cryptos (symbol, name, coingecko_id, networks, display_order)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        data.symbol.toUpperCase().trim(),
        data.name,
        data.coingeckoId || data.symbol.toLowerCase(),
        data.networks || [],
        data.displayOrder ?? 99,
      ]
    );
    return row ? new CryptoRecord(row) : null;
  },

  async toggleActive(id, isActive) {
    this.invalidateCache();
    await query('UPDATE cryptos SET is_active = $1 WHERE id = $2', [isActive, id]);
  },

  async delete(id) {
    this.invalidateCache();
    await query('DELETE FROM cryptos WHERE id = $1', [id]);
  },

  async deleteBySymbol(symbol) {
    this.invalidateCache();
    await query('DELETE FROM cryptos WHERE symbol = $1', [symbol.toUpperCase()]);
  },
};

export default Crypto;
