/**
 * loader.cjs — Point d'entrée CommonJS pour Plesk/Passenger
 *
 * 1. Vérifie que les dépendances sont installées (npm install auto si manquant)
 * 2. Démarre l'application ES module (index.js)
 *
 * Startup file à configurer dans Plesk :
 *   artifacts/api-server/bot/loader.cjs
 */
'use strict';

const path      = require('path');
const fs        = require('fs');
const { execSync } = require('child_process');

const BOT_DIR  = path.join(__dirname, '..');   // artifacts/api-server/
const LOG_FILE = path.join(BOT_DIR, 'startup.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch (_) {}
}

function writeFatalLog(err) {
  const line = `[${new Date().toISOString()}] FATAL: ${err.message}\n${err.stack}\n`;
  console.error(line);
  try { fs.writeFileSync(path.join(BOT_DIR, 'startup-error.log'), line); } catch (_) {}
}

// ─── Auto-install des dépendances si node_modules est absent ──────────────────
function ensureDeps() {
  const telegrafPath = path.join(BOT_DIR, 'node_modules', 'telegraf');
  if (fs.existsSync(telegrafPath)) {
    log('✅ Dépendances déjà installées.');
    return;
  }

  log('📦 node_modules manquants — lancement de npm install...');
  log(`   (dossier : ${BOT_DIR})`);

  try {
    execSync('npm install --ignore-scripts --omit=dev', {
      cwd: BOT_DIR,
      stdio: 'inherit',
      timeout: 180000,   // 3 minutes max
    });
    log('✅ npm install terminé avec succès.');
  } catch (err) {
    log(`❌ npm install échoué : ${err.message}`);
    // On tente quand même de démarrer — les deps partielles peuvent suffire
  }
}

// ─── Démarrage ────────────────────────────────────────────────────────────────
log('🔧 loader.cjs démarré');
log(`   Node.js : ${process.version}`);
log(`   CWD     : ${process.cwd()}`);
log(`   BOT_DIR : ${BOT_DIR}`);

ensureDeps();

log('🚀 Chargement de index.js...');
import('./index.js').catch((err) => {
  writeFatalLog(err);
  process.exit(1);
});
