/**
 * Handler — Support utilisateur
 */
import { getSetting } from '../models/Settings.js';
import { notifyAdmins } from '../utils/notify.js';
import { Markup } from 'telegraf';
import logger from '../utils/logger.js';

// Map pour les sessions de support en attente
const supportSessions = new Map();

export async function handleSupport(ctx) {
  const supportLink = await getSetting('support_link');

  if (supportLink) {
    return ctx.reply(`📞 *SUPPORT NEOCASH*\n\n━━━━━━━━━━━━━━━━━━\nContacte notre équipe support :\n${supportLink}\n━━━━━━━━━━━━━━━━━━\n\n⏱ Réponse sous 24h maximum.`, {
      parse_mode: 'Markdown',
    });
  }

  // Mode message direct
  await ctx.reply(`📞 *SUPPORT NEOCASH*\n\n━━━━━━━━━━━━━━━━━━\nEnvoie ton message et notre équipe te répondra rapidement.\n\n✍️ Écris ton message ci-dessous :`, {
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
    text: `📞 *MESSAGE SUPPORT*\n\n👤 ${user.firstName} ${user.lastName || ''}\n🆔 \`${user.telegramId}\`\n📛 ${user.username ? '@' + user.username : 'N/A'}\n\n💬 *Message :*\n${message}`,
    extra: {
      reply_markup: {
        inline_keyboard: [[
          { text: '↩️ Répondre', callback_data: `support_reply_${user.telegramId}` },
        ]],
      },
    },
  });

  await ctx.reply(`✅ *Message envoyé !*\n\nNotre équipe te répondra dès que possible. Merci de ta patience.`, {
    parse_mode: 'Markdown',
  });

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
