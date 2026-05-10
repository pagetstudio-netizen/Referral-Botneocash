/**
 * NeoCash Bot — Point d'entrée principal
 * Démarre le bot Telegram + serveur Express (healthcheck)
 */
import 'dotenv/config';
import express from 'express';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 5000;

// ─── Serveur Express (toujours démarré) ────────────────────────────────────────
const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    bot: 'NeoCash',
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

// Page de statut si les secrets ne sont pas configurés
app.get('/', (req, res) => {
  const missing = [];
  if (!process.env.BOT_TOKEN) missing.push('BOT_TOKEN');
  if (!process.env.SUPABASE_DB_URL) missing.push('SUPABASE_DB_URL');
  if (!process.env.ADMIN_IDS) missing.push('ADMIN_IDS');

  if (missing.length > 0) {
    return res.send(`
      <html><body style="font-family:monospace;padding:20px;background:#1a1a2e;color:#e0e0e0">
        <h1>🤖 NeoCash Bot</h1>
        <p style="color:#ff6b6b">⚠️ Variables manquantes : <strong>${missing.join(', ')}</strong></p>
        <p>Configure ces secrets dans l'onglet <strong>Secrets</strong> de Replit.</p>
        <hr/>
        <h3>Variables requises :</h3>
        <ul>
          <li><code>BOT_TOKEN</code> — Token du bot (@BotFather)</li>
          <li><code>SUPABASE_DB_URL</code> — URL de connexion PostgreSQL Supabase</li>
          <li><code>ADMIN_IDS</code> — Ton ID Telegram (@userinfobot)</li>
        </ul>
        <p style="color:#4ecdc4">✅ <a href="/api/health" style="color:#4ecdc4">GET /api/health</a></p>
      </body></html>
    `);
  }

  res.json({ status: 'ok', message: 'NeoCash Bot opérationnel' });
});

app.listen(PORT, () => {
  logger.info(`🌐 Serveur HTTP démarré sur le port ${PORT}`);
});

// ─── Démarrage asynchrone bot + Supabase ───────────────────────────────────────
async function startBot() {
  const missingVars = [];
  if (!process.env.BOT_TOKEN) missingVars.push('BOT_TOKEN');
  if (!process.env.SUPABASE_DB_URL) missingVars.push('SUPABASE_DB_URL');

  if (missingVars.length > 0) {
    logger.warn(`⚠️  Variables d'environnement manquantes : ${missingVars.join(', ')}`);
    logger.warn('   → Configure les secrets dans Replit puis redémarre le workflow.');
    logger.warn('   → Le serveur HTTP reste actif en attendant.');
    return;
  }

  try {
    // Connexion Supabase (PostgreSQL)
    const connectDB = (await import('./database/connect.js')).default;
    await connectDB();
    global.dbConnected = true;

    // Initialisation des paramètres
    const { initSettings } = await import('./models/Settings.js');
    await initSettings();
    logger.info('⚙️  Paramètres initialisés');

    // Lancement du bot (sans await — bot.launch() est une boucle infinie en long-polling)
    const { createBot } = await import('./bot.js');
    const bot = createBot();
    bot.launch().catch((err) => {
      logger.error(`❌ Bot polling erreur : ${err.message}`);
    });
    global.botRunning = true;

    logger.info('🤖 Bot Telegram @neomcashbot démarré en mode polling');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('📋 Commandes disponibles :');
    logger.info('  /start       — Démarrer le bot');
    logger.info('  /admin       — Panel administrateur');
    logger.info('  /menu        — Afficher le menu');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Arrêt propre
    const shutdown = () => {
      logger.info('🛑 Arrêt du bot...');
      bot.stop('SIGTERM');
      process.exit(0);
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);

  } catch (err) {
    logger.error(`❌ Erreur au démarrage du bot : ${err.message}`);
    logger.warn('   → Le serveur HTTP reste actif. Corrige l\'erreur et redémarre.');
  }
}

logger.info('🚀 Démarrage de NeoCash Bot...');
startBot();
