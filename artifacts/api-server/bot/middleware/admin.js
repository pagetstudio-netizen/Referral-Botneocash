/**
 * Middleware de vérification admin
 */
import { isUserAdmin } from './auth.js';

export async function requireAdmin(ctx, next) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const ok = await isUserAdmin(userId);
  if (!ok) {
    return ctx.reply('🚫 Accès non autorisé.').catch(() => {});
  }
  return next();
}
