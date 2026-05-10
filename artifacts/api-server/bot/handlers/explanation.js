/**
 * Handler — Explication du bot
 */
import { explanationMessage } from '../utils/messages.js';

export async function handleExplanation(ctx) {
  const text = await explanationMessage();
  await ctx.reply(text, { parse_mode: 'Markdown' });
}
