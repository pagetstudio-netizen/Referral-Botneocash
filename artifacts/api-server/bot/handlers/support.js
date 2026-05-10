/**
 * Handler — Support utilisateur
 */
import { getSetting } from '../models/Settings.js';
import { notifyAdmins } from '../utils/notify.js';
import { Markup } from 'telegraf';
import logger from '../utils/logger.js';

const supportSessions = new Map();

export async function handleSupport(ctx) {
  const [supportLink, customMessage, botName] = await Promise.all([
    getSetting('support_link'),
    getSetting('support_message'),
    getSetting('bot_name'),
  ]);

  const name = botName || 'NeoCash';

  // Message principal du support
  const defaultBody = customMessage ||
    `Nous sommes là pour vous aider !\n\n` +
    `📌 *Vous pouvez nous contacter pour :*\n\n` +
    `🔧 *Problèmes techniques* — Retrait bloqué, bonus non reçu, bug...\n` +
    `📢 *Publicités & Partenariats* — Diffuser votre offre à notre communauté\n` +
    `🤝 *Collaborations* — Proposer un partenariat ou une affiliation\n` +
    `❓ *Questions générales* — Tout autre question sur le bot\n` +
    `⚠️ *Signalement* — Abus, arnaque, compte suspect`;

  const buttons = [];

  if (supportLink) {
    // Mode bouton — lien direct vers le support
    buttons.push([Markup.button.url('📩 Contacter le support', supportLink)]);

    const text =
      `📞 *SUPPORT ${name.toUpperCase()}*\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `${defaultBody}\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `⏱ Réponse sous *24h* maximum.`;

    return ctx.reply(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  }

  // Mode message direct (pas de lien configuré)
  const text =
    `📞 *SUPPORT ${name.toUpperCase()}*\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `${defaultBody}\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `✍️ Écris ton message ci-dessous et notre équipe te répondra rapidement.\n` +
    `⏱ Réponse sous *24h* maximum.`;

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([[Markup.button.callback('❌ Annuler', 'cancel_support')]]),
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

  const message = ctx.message.text;
  user.waitingForSupport = false;
  await user.save();
  supportSessions.delete(ctx.from.id);

  await notifyAdmins(ctx.telegram, {
    text:
      `📞 *MESSAGE SUPPORT*\n\n` +
      `👤 ${user.firstName} ${user.lastName || ''}\n` +
      `🆔 \`${user.telegramId}\`\n` +
      `📛 ${user.username ? '@' + user.username : 'N/A'}\n\n` +
      `💬 *Message :*\n${message}`,
    extra: {
      reply_markup: {
        inline_keyboard: [[
          { text: '↩️ Répondre', callback_data: `support_reply_${user.telegramId}` },
        ]],
      },
    },
  });

  await ctx.reply(
    `✅ *Message envoyé !*\n\nNotre équipe te répondra dès que possible.\nMerci de ta patience. 🙏`,
    { parse_mode: 'Markdown' }
  );

  logger.info('Support message sent', { userId: user.telegramId });
  return true;
}

export async function handleCancelSupport(ctx) {
  if (ctx.dbUser) {
    ctx.dbUser.waitingForSupport = false;
    await ctx.dbUser.save();
  }
  supportSessions.delete(ctx.from?.id);
  await ctx.answerCbQuery('Annulé');
  await ctx.editMessageText('❌ Support annulé.').catch(() => {});
}
