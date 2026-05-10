/**
 * Middleware anti-spam — limite les requêtes par utilisateur
 */

const userRequests = new Map();
const RATE_LIMIT = 10;
const WINDOW_MS = 10_000;

export function antiSpam(ctx, next) {
  const userId = ctx.from?.id;
  if (!userId) return next();

  const now = Date.now();
  const userData = userRequests.get(userId) || { count: 0, resetAt: now + WINDOW_MS };

  if (now > userData.resetAt) {
    userData.count = 1;
    userData.resetAt = now + WINDOW_MS;
  } else {
    userData.count++;
  }

  userRequests.set(userId, userData);

  if (userData.count > RATE_LIMIT) {
    return ctx.reply('⚠️ Trop de requêtes. Attends quelques secondes avant de continuer.').catch(() => {});
  }

  return next();
}

// Nettoyage périodique de la Map
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of userRequests.entries()) {
    if (now > val.resetAt) userRequests.delete(key);
  }
}, 60_000);
