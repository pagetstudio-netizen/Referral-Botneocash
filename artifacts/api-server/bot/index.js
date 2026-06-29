/**
 * Moon Crypto Bot — Point d'entrée principal
 * Démarre le bot Telegram + serveur Express (healthcheck + admin dashboard statique)
 */
import 'dotenv/config';
import express from 'express';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import logger from './utils/logger.js';
import adminRouter from './routes/admin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 8080;

// ─── Serveur Express (toujours démarré) ────────────────────────────────────────
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ─── Routes API (toujours en premier) ────────────────────────────────────────
app.use('/api', adminRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    bot: 'Moon Crypto',
    dbConnected: global.dbConnected || false,
    botRunning: global.botRunning || false,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/stats', async (req, res) => {
  if (!global.dbConnected) {
    return res.status(503).json({ error: 'Base de données non connectée' });
  }
  try {
    const User = (await import('./models/User.js')).default;
    const Withdrawal = (await import('./models/Withdrawal.js')).default;
    const [users, withdrawals] = await Promise.all([
      User.countDocuments(),
      Withdrawal.countDocuments({ status: 'pending' }),
    ]);
    res.json({ users, pendingWithdrawals: withdrawals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Tableau de bord admin (SPA — servi à la racine /) ───────────────────────
const ADMIN_DIST = join(__dirname, '..', '..', 'admin-dashboard', 'dist', 'public');
if (existsSync(ADMIN_DIST)) {
  app.use(express.static(ADMIN_DIST, { index: false }));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(join(ADMIN_DIST, 'index.html'));
  });
  logger.info('📊 Tableau de bord admin servi depuis /');
}

app.listen(PORT, () => {
  logger.info(`🌐 Serveur HTTP démarré sur le port ${PORT}`);
});

// ─── Keep-alive : ping externe toutes les 3 minutes ──────────────────────────
//
// ROOT CAUSE du bug "bot se rendort" :
//   L'ancien selfPing() ciblait 127.0.0.1 (localhost). Les gestionnaires de
//   processus comme Passenger (Plesk) détectent l'inactivité uniquement sur le
//   trafic HTTP EXTERNE. Un ping interne est invisible pour eux → l'app dormait.
//
// CORRECTIF :
//   On ping l'URL publique (APP_URL ou détection automatique Replit).
//   Si l'URL externe n'est pas connue, on garde le fallback local EN PLUS.
//
function buildExternalUrl() {
  // Priorité 1 : variable explicite (ex. https://cotedor.online)
  if (process.env.APP_URL) return process.env.APP_URL + '/api/health';

  // Priorité 2 : domaine Replit automatique
  const replitDomain = process.env.REPLIT_DEV_DOMAIN || process.env.REPL_SLUG;
  if (replitDomain && !replitDomain.includes('localhost')) {
    const host = process.env.REPLIT_DEV_DOMAIN
      ? process.env.REPLIT_DEV_DOMAIN
      : `${replitDomain}.${process.env.REPL_OWNER}.repl.co`;
    return `https://${host}/api/health`;
  }

  return null;
}

function pingUrl(urlString) {
  try {
    const url = new URL(urlString);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? httpsRequest : httpRequest;
    const req = lib(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'GET',
        timeout: 10000,
        headers: { 'User-Agent': 'MoonCrypto-KeepAlive/1.0' },
        // Ne pas vérifier le cert auto-signé sur Replit dev
        rejectUnauthorized: false,
      },
      (res) => {
        logger.info(`💓 Keep-alive → ${urlString} [${res.statusCode}]`);
      }
    );
    req.on('error', (err) => {
      logger.warn(`⚠️  Keep-alive ping échoué (${urlString}) : ${err.message}`);
    });
    req.end();
  } catch (err) {
    logger.warn(`⚠️  Keep-alive URL invalide : ${err.message}`);
  }
}

function pingLocalhost() {
  const req = httpRequest(
    { hostname: '127.0.0.1', port: PORT, path: '/api/health', method: 'GET', timeout: 8000 },
    () => {}
  );
  req.on('error', () => {});
  req.end();
}

const KEEPALIVE_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

setInterval(() => {
  // Toujours pinger en local (maintient la boucle d'événements active)
  pingLocalhost();

  // Pinger aussi l'URL externe pour garder le processus visible du proxy
  const externalUrl = buildExternalUrl();
  if (externalUrl) {
    pingUrl(externalUrl);
  }
}, KEEPALIVE_INTERVAL_MS);

logger.info(`💓 Keep-alive activé (ping externe + local toutes les ${KEEPALIVE_INTERVAL_MS / 60000} min)`);

// ─── Watchdog bot polling : redémarre automatiquement si le polling plante ───
const BOT_WATCHDOG_INTERVAL_MS = 60 * 1000; // vérifie toutes les 60 s

setInterval(async () => {
  if (!global.dbConnected) return; // DB pas encore prête, rien à faire
  if (global.botRunning) return;   // tout va bien

  logger.warn('🔁 Watchdog : bot polling inactif — tentative de redémarrage…');
  try {
    const { createBot } = await import('./bot.js');
    const bot = createBot();
    global.moonCryptoBot = bot;
    bot.launch({
      dropPendingUpdates: false,
      allowedUpdates: ['message', 'callback_query', 'my_chat_member'],
    }).catch((err) => {
      logger.error(`❌ Bot polling erreur (watchdog) : ${err.message}`);
      global.botRunning = false;
    });
    global.botRunning = true;
    logger.info('✅ Watchdog : bot polling redémarré avec succès');
  } catch (err) {
    logger.error(`❌ Watchdog redémarrage échoué : ${err.message}`);
  }
}, BOT_WATCHDOG_INTERVAL_MS);

// ─── Démarrage asynchrone bot + base de données ────────────────────────────────
async function startBot() {
  const missingVars = [];
  if (!process.env.BOT_TOKEN) missingVars.push('BOT_TOKEN');
  if (!process.env.DATABASE_URL && !process.env.SUPABASE_DB_URL) missingVars.push('DATABASE_URL');

  if (missingVars.length > 0) {
    logger.warn(`⚠️  Variables d'environnement manquantes : ${missingVars.join(', ')}`);
    logger.warn('   → Configure les secrets puis redémarre le workflow.');
    logger.warn('   → Le serveur HTTP reste actif en attendant.');
    return;
  }

  try {
    const connectDB = (await import('./database/connect.js')).default;
    await connectDB();
    global.dbConnected = true;

    const { initSettings } = await import('./models/Settings.js');
    await initSettings();
    logger.info('⚙️  Paramètres initialisés');

    const { createBot } = await import('./bot.js');
    const bot = createBot();
    global.moonCryptoBot = bot;

    bot.launch({
      dropPendingUpdates: true,
      allowedUpdates: ['message', 'callback_query', 'my_chat_member'],
    }).catch((err) => {
      logger.error(`❌ Bot polling erreur : ${err.message}`);
      global.botRunning = false; // le watchdog prendra le relais
    });
    global.botRunning = true;

    logger.info('🤖 Bot Telegram @neomcashbot démarré en mode polling');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('📋 Commandes disponibles :');
    logger.info('  /start       — Démarrer le bot');
    logger.info('  /admin       — Panel administrateur');
    logger.info('  /menu        — Afficher le menu');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const shutdown = () => {
      logger.info('🛑 Arrêt du bot...');
      global.botRunning = false;
      if (global.moonCryptoBot) global.moonCryptoBot.stop('SIGTERM');
      process.exit(0);
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);

  } catch (err) {
    logger.error(`❌ Erreur au démarrage du bot : ${err.message}`);
    logger.warn('   → Le serveur HTTP reste actif. Corrige l\'erreur et redémarre.');
  }
}

logger.info('🚀 Démarrage de Moon Crypto Bot...');
startBot();
