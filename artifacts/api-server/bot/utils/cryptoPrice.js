/**
 * Utilitaire — Prix crypto en temps réel via CoinGecko (sans clé API)
 * Cache de 60 secondes pour respecter les limites de l'API
 */
import https from 'https';
import logger from './logger.js';

const _priceCache = new Map();
const CACHE_TTL = 60_000;

function fetchFromCoinGecko(coingeckoId) {
  return new Promise((resolve, reject) => {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coingeckoId)}&vs_currencies=usd`;
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Moon CryptoBot/1.0',
        'Accept': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const price = json[coingeckoId]?.usd;
          if (!price || price <= 0) {
            reject(new Error(`Price not found for ${coingeckoId}`));
          } else {
            resolve(Number(price));
          }
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10_000, () => {
      req.destroy();
      reject(new Error('CoinGecko timeout'));
    });
  });
}

/**
 * Obtenir le prix en USD d'une cryptomonnaie (1 coin = X USD)
 * Utilise le cache pour éviter les appels répétés
 */
export async function getCryptoUsdPrice(symbol, coingeckoId) {
  if (symbol === 'USDT' || symbol === 'USDC' || !coingeckoId) return 1;

  const cached = _priceCache.get(symbol);
  if (cached && Date.now() < cached.expiresAt) return cached.price;

  try {
    const price = await fetchFromCoinGecko(coingeckoId);
    _priceCache.set(symbol, { price, expiresAt: Date.now() + CACHE_TTL });
    logger.info('CoinGecko price fetched', { symbol, price });
    return price;
  } catch (err) {
    logger.warn('CoinGecko price fetch failed', { symbol, err: err.message });
    const stale = _priceCache.get(symbol);
    if (stale) return stale.price;
    throw err;
  }
}

/**
 * Convertir un montant USDT en équivalent crypto
 * @returns {{ cryptoAmount: number, rate: number, rateAge: 'fresh'|'cached'|'stale' }}
 */
export async function convertUsdtToCrypto(usdtAmount, symbol, coingeckoId) {
  if (symbol === 'USDT' || symbol === 'USDC') {
    return { cryptoAmount: usdtAmount, rate: 1, rateAge: 'fresh' };
  }

  const cached = _priceCache.get(symbol);
  const now = Date.now();

  try {
    const price = await getCryptoUsdPrice(symbol, coingeckoId);
    const cryptoAmount = usdtAmount / price;
    return {
      cryptoAmount,
      rate: price,
      rateAge: (cached && now < cached.expiresAt) ? 'cached' : 'fresh',
    };
  } catch (err) {
    if (cached) {
      const cryptoAmount = usdtAmount / cached.price;
      return { cryptoAmount, rate: cached.price, rateAge: 'stale' };
    }
    throw err;
  }
}
