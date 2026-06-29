/**
 * Handler — Parrainage
 */
import { referralMessage } from '../utils/messages.js';
import { getLang, t } from '../utils/i18n.js';
import { Markup } from 'telegraf';

export async function handleReferral(ctx) {
  const user = ctx.dbUser;
  const lang = getLang(ctx);

  if (!user) return ctx.reply(t(lang, 'user_not_found'));

  const botInfo = await ctx.telegram.getMe();
  const text = referralMessage(user, botInfo.username, lang);

  const referralLink = `https://t.me/${botInfo.username}?start=${user.referralCode}`;
  const shareText = t(lang, 'referral_share_text');
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`;

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.url(t(lang, 'referral_share_button'), shareUrl)],
    ]),
  });
}
