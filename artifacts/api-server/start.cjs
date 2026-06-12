'use strict';
// Wrapper CommonJS pour Phusion Passenger (Plesk)
// Passenger peut avoir des problèmes avec les fichiers .mjs directement
// Ce wrapper CJS charge dynamiquement le bundle ESM
import('./dist/index.mjs').catch(function(err) {
  console.error('[NeoCash] Erreur au démarrage:', err.message);
  console.error(err.stack);
  process.exit(1);
});
