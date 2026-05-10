/**
 * Handler — Solde utilisateur
 */
import { balanceMessage } from '../utils/messages.js';

export async function handleBalance(ctx) {
  const user = ctx.dbUser;
  if (!user) return ctx.reply('❌ Utilisateur non trouvé.');
  await ctx.reply(balanceMessage(user), { parse_mode: 'Markdown' });
}
