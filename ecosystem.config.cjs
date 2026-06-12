/**
 * PM2 — Configuration Moon Crypto Bot
 * Démarrage : pm2 start ecosystem.config.cjs
 * Logs      : pm2 logs moon-crypto-bot
 * Statut    : pm2 status
 * Redémarrer: pm2 restart moon-crypto-bot
 */
module.exports = {
  apps: [
    {
      name: 'moon-crypto-bot',
      script: 'artifacts/api-server/bot/index.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: 'production',
        PORT: '8080',
      },
      error_file: 'artifacts/api-server/logs/pm2-error.log',
      out_file: 'artifacts/api-server/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
