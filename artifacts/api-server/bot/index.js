/**
 * NeoCash Bot — Point d'entrée principal
 * Démarre le bot Telegram + serveur Express (healthcheck)
 */
import 'dotenv/config';
import express from 'express';
import connectDB from './database/connect.js';
import { createBot } from './bot.js';
import { initSettings } from './models/Settings.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 5000;

async function main() {
  logger.info('🚀 Démarrage de NeoCash Bot...');

  // ─── Connexion MongoDB ──────────────────────────────────────────────────────
  await connectDB();
  await initSettings();
  logger.info('⚙️  Paramètres initialisés');

  // ─── Créer et lancer le bot ─────────────────────────────────────────────────
  const bot = createBot();

  // Lancement en mode long-polling
  await bot.launch();
  logger.info('🤖 Bot Telegram démarré en mode polling');

  // ─── Serveur Express (healthcheck + webhook potentiel) ──────────────────────
  const app = express();
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      bot: 'NeoCash',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/stats', async (req, res) => {
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

  app.listen(PORT, () => {
    logger.info(`🌐 Serveur HTTP démarré sur le port ${PORT}`);
    logger.info(`✅ NeoCash Bot opérationnel !`);
    logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    logger.info(`📋 Commandes disponibles :`);
    logger.info(`  /start       — Démarrer le bot`);
    logger.info(`  /admin       — Panel administrateur`);
    logger.info(`  /menu        — Afficher le menu`);
    logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  });

  // ─── Arrêt propre ───────────────────────────────────────────────────────────
  const shutdown = () => {
    logger.info('🛑 Arrêt du bot...');
    bot.stop('SIGTERM');
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('❌ Erreur fatale au démarrage :', err);
  process.exit(1);
});
