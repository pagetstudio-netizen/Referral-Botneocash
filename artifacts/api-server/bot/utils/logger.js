/**
 * Logger utilitaire pour le bot NeoCash
 */

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT_LEVEL = process.env.LOG_LEVEL || 'info';

function formatDate() {
  return new Date().toISOString();
}

function log(level, message, data = null) {
  if (LOG_LEVELS[level] > LOG_LEVELS[CURRENT_LEVEL]) return;
  const prefix = {
    error: '❌ ERROR',
    warn: '⚠️  WARN ',
    info: '📋 INFO ',
    debug: '🔍 DEBUG',
  }[level];
  const msg = data
    ? `[${formatDate()}] ${prefix}: ${message} ${JSON.stringify(data)}`
    : `[${formatDate()}] ${prefix}: ${message}`;
  if (level === 'error') {
    console.error(msg);
  } else {
    console.log(msg);
  }
}

const logger = {
  info: (msg, data) => log('info', msg, data),
  warn: (msg, data) => log('warn', msg, data),
  error: (msg, data) => log('error', msg, data),
  debug: (msg, data) => log('debug', msg, data),
};

export default logger;
