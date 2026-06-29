/**
 * PM2 Ecosystem Config — NeoCash Bot
 *
 * Sur Plesk (si PM2 disponible) :
 *   pm2 start ecosystem.config.cjs --env production
 */
module.exports = {
  apps: [
    {
      name: 'neocash-bot',
      script: './start.cjs',
      cwd: __dirname,

      interpreter: 'node',

      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 5000,
        LOG_LEVEL: 'info',
      },

      env_development: {
        NODE_ENV: 'development',
        PORT: process.env.PORT || 3000,
        LOG_LEVEL: 'debug',
      },

      autorestart: true,
      watch: false,
      max_memory_restart: '512M',

      error_file: './logs/pm2-error.log',
      out_file:   './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      kill_timeout: 5000,
      listen_timeout: 10000,
      exp_backoff_restart_delay: 1000,
    },
  ],
};
