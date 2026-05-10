/**
 * Handler — Parrainage
 */
import { referralMessage } from '../utils/messages.js';
import { Markup } from 'telegraf';

export async function handleReferral(ctx) {
  const user = ctx.dbUser;
  if (!user) return ctx.reply('❌ Utilisateur non trouvé.');

  const botInfo = await ctx.telegram.getMe();
  const text = referralMessage(user, botInfo.username);

  const referralLink = `https://t.me/${botInfo.username}?start=${user.referralCode}`;

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.url('📤 Partager mon lien', `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('🎉 Rejoins NeoCash et gagne de l\'argent !')}`)],
    ]),
  });
}
