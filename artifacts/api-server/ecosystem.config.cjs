/**
 * PM2 Ecosystem Config — NeoCash Bot
 *
 * Sur Plesk : Node.js → Application startup file → ecosystem.config.cjs
 * En ligne de commande : pm2 start ecosystem.config.cjs --env production
 *
 * Variables d'environnement à configurer dans .env ou dans Plesk :
 *   BOT_TOKEN, SUPABASE_DB_URL, ADMIN_IDS, ADMIN_EMAIL, ADMIN_PASSWORD
 */
module.exports = {
  apps: [
    {
      name: 'neocash-bot',
      script: './bot/index.js',
      cwd: __dirname,

      interpreter: 'node',
      node_args: [],

      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        LOG_LEVEL: 'info',
        // ⚠️  Ces valeurs par défaut sont des FALLBACKS.
        // Configurez les vraies valeurs dans le fichier .env de Plesk.
        ADMIN_EMAIL: 'pagetstudio@gmail.com',
        ADMIN_PASSWORD: 'AAbb11##',
        ADMIN_JWT_SECRET: 'neocash-admin-secret-change-me-in-production',
      },

      env_development: {
        NODE_ENV: 'development',
        PORT: 5000,
        LOG_LEVEL: 'debug',
      },

      autorestart: true,
      watch: false,
      max_memory_restart: '512M',

      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 10000,

      exp_backoff_restart_delay: 1000,
    },
  ],
};
