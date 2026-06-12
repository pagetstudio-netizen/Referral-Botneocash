/**
 * Handler — Explication du bot
 */
import { explanationMessage } from '../utils/messages.js';
import { getLang } from '../utils/i18n.js';

export async function handleExplanation(ctx) {
  const lang = getLang(ctx);
  const text = await explanationMessage(lang);
  await ctx.reply(text, { parse_mode: 'Markdown' });
}
