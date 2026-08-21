/**
 * loader.cjs — Point d'entrée CommonJS pour Plesk/Passenger
 *
 * Certaines versions de Passenger ne peuvent pas démarrer directement
 * un fichier ES module (.js avec "type":"module").
 * Ce fichier CJS importe dynamiquement index.js (ES module) et
 * capture toute erreur de démarrage pour éviter un crash silencieux.
 */
'use strict';

const path = require('path');
const fs   = require('fs');

// Écrire les erreurs fatales dans un fichier log accessible
function writeFatalLog(err) {
  try {
    const logPath = path.join(__dirname, '..', 'startup-error.log');
    const msg = `[${new Date().toISOString()}] FATAL: ${err.message}\n${err.stack}\n`;
    fs.writeFileSync(logPath, msg);
    console.error(msg);
  } catch (_) {
    console.error('FATAL STARTUP ERROR:', err.message, err.stack);
  }
}

// Lancer l'application ES module
import('./index.js').catch((err) => {
  writeFatalLog(err);
  process.exit(1);
});
