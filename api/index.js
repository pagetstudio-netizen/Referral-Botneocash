/**
 * Moon Crypto Bot — Point d'entrée Vercel (serverless)
 * API admin + webhook Telegram
 */
import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let app;
let botInitialized = false;

async function getApp() {
  if (app) return app;

  app = express();
  app.use(express.json({ limit: '10mb' }));

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  // ─── Routes admin ─────────────────────────────────────────────────────────
  const { default: adminRouter } = await import('../artifacts/api-server/bot/routes/admin.js');
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

  // ─── Webhook Telegram ──────────────────────────────────────────────────────
  app.post('/api/webhook', async (req, res) => {
    if (!botInitialized) {
      await initBot();
    }
    if (global.moonCryptoBot) {
      try {
        await global.moonCryptoBot.handleUpdate(req.body);
      } catch (err) {
        console.error('Webhook error:', err.message);
      }
    }
    res.sendStatus(200);
  });

  return app;
}

async function initBot() {
  if (botInitialized) return;

  const missingVars = [];
  if (!process.env.BOT_TOKEN) missingVars.push('BOT_TOKEN');
  if (!process.env.DATABASE_URL && !process.env.SUPABASE_DB_URL) missingVars.push('DATABASE_URL');

  if (missingVars.length > 0) {
    console.warn(`⚠️ Variables manquantes : ${missingVars.join(', ')}`);
    return;
  }

  try {
    const { default: connectDB } = await import('../artifacts/api-server/bot/database/connect.js');
    await connectDB();
    global.dbConnected = true;

    const { initSettings } = await import('../artifacts/api-server/bot/models/Settings.js');
    await initSettings();

    const { createBot } = await import('../artifacts/api-server/bot/bot.js');
    const bot = createBot();
    global.moonCryptoBot = bot;
    global.botRunning = true;

    botInitialized = true;
    console.log('✅ Bot initialisé (mode webhook)');
  } catch (err) {
    console.error('❌ Erreur init bot:', err.message);
  }
}

export default async function handler(req, res) {
  const application = await getApp();
  application(req, res);
}
