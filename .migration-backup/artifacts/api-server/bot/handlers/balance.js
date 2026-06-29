/**
 * Handler — Solde utilisateur
 */
import { balanceMessage } from '../utils/messages.js';
import { getLang } from '../utils/i18n.js';

export async function handleBalance(ctx) {
  const user = ctx.dbUser;
  if (!user) return ctx.reply('❌ User not found.');
  const lang = getLang(ctx);
  await ctx.reply(balanceMessage(user, lang), { parse_mode: 'Markdown' });
}
