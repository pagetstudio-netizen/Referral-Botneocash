/**
 * Handler — Support utilisateur
 */
import { getSetting } from '../models/Settings.js';
import { notifyAdmins } from '../utils/notify.js';
import { getLang, t } from '../utils/i18n.js';
import { Markup } from 'telegraf';
import logger from '../utils/logger.js';

const supportSessions = new Map();

export async function handleSupport(ctx) {
  const lang = getLang(ctx);
  const [supportLink, customMessage, botName] = await Promise.all([
    getSetting('support_link'),
    getSetting('support_message'),
    getSetting('bot_name'),
  ]);

  const name = botName || 'NeoCash';
  const SEP = '━━━━━━━━━━━━━━━━━━';

  const defaultBody = customMessage || t(lang, 'support_default_body');

  const buttons = [];

  if (supportLink) {
    buttons.push([Markup.button.url(t(lang, 'support_contact_btn'), supportLink)]);

    const text =
      t(lang, 'support_title', name) + '\n\n' +
      SEP + '\n' +
      defaultBody + '\n' +
      SEP + '\n\n' +
      t(lang, 'support_response_time');

    return ctx.reply(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  }

  const text =
    t(lang, 'support_title', name) + '\n\n' +
    SEP + '\n' +
    defaultBody + '\n' +
    SEP + '\n\n' +
    t(lang, 'support_write_message') + '\n' +
    t(lang, 'support_response_time');

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([[Markup.button.callback(t(lang, 'support_cancel_btn'), 'cancel_support')]]),
  });

  supportSessions.set(ctx.from.id, true);
  if (ctx.dbUser) {
    ctx.dbUser.waitingForSupport = true;
    await ctx.dbUser.save();
  }
}

export async function handleSupportMessage(ctx) {
  const user = ctx.dbUser;
  if (!user?.waitingForSupport) return false;

  const lang = getLang(ctx);
  const message = ctx.message.text;
  user.waitingForSupport = false;
  await user.save();
  supportSessions.delete(ctx.from.id);

  await notifyAdmins(ctx.telegram, {
    text:
      `📞 *MESSAGE SUPPORT*\n\n` +
      `👤 ${user.firstName} ${user.lastName || ''}\n` +
      `🆔 \`${user.telegramId}\`\n` +
      `📛 ${user.username ? '@' + user.username : 'N/A'}\n` +
      `🌐 Langue : ${user.language || 'fr'}\n\n` +
      `💬 *Message :*\n${message}`,
    extra: {
      reply_markup: {
        inline_keyboard: [[
          { text: '↩️ Répondre', callback_data: `support_reply_${user.telegramId}` },
        ]],
      },
    },
  });

  await ctx.reply(t(lang, 'support_sent'), { parse_mode: 'Markdown' });

  logger.info('Support message sent', { userId: user.telegramId });
  return true;
}

export async function handleCancelSupport(ctx) {
  const lang = getLang(ctx);
  if (ctx.dbUser) {
    ctx.dbUser.waitingForSupport = false;
    await ctx.dbUser.save();
  }
  supportSessions.delete(ctx.from?.id);
  await ctx.answerCbQuery('Annulé');
  await ctx.editMessageText(t(lang, 'support_cancelled')).catch(() => {});
}
