/**
 * PM2 Ecosystem Config — NeoCash Bot
 * Utilisé par Plesk pour démarrer/redémarrer l'application.
 *
 * Plesk → Node.js → Application startup file : ecosystem.config.cjs
 * Ou en ligne de commande : pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'neocash-bot',
      script: './bot/index.js',
      cwd: __dirname,

      // Node.js ESM
      node_args: [],
      interpreter: 'node',

      // Variables d'environnement de production
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },

      // Redémarrage automatique en cas de crash
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',

      // Logs
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // Arrêt propre (SIGTERM géré dans index.js)
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 10000,

      // Redémarrage exponentiel (évite les boucles crashloop)
      exp_backoff_restart_delay: 1000,
    },
  ],
};
