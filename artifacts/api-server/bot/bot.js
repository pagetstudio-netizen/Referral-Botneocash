/**
 * Configuration principale du bot NeoCash — Telegraf
 */
import { Telegraf } from 'telegraf';
import { antiSpam } from './middleware/antispam.js';
import { getOrCreateUser, checkBanned, checkChannelMembership, checkMaintenance, isUserAdmin } from './middleware/auth.js';
import { requireAdmin } from './middleware/admin.js';
import { startCommand } from './commands/start.js';
import {
  adminCommand,
  handleAdminStats,
  handleAdminChannels,
  handleTestAdminGroup,
  handleTestWdChannel,
  handleSetDetectedGroup,
  handleAdminWithdrawals,
  handleWithdrawalsList,
  handleAdminUsers,
  handleAdminBroadcast,
  handleAdminSettings,
  handleAdminInput,
  handleAdminCredit,
  handleAdminBan,
  handleToggleMaintenance,
  executeBroadcast,
  getAdminSession,
  deleteAdminSession,
  setAdminSession,
} from './commands/admin.js';
import { handleBalance } from './handlers/balance.js';
import { handleBonus } from './handlers/bonus.js';
import { handleReferral } from './handlers/referral.js';
import { handleExplanation } from './handlers/explanation.js';
import { handleSupport, handleSupportMessage, handleCancelSupport } from './handlers/support.js';
import {
  handleWithdrawal,
  handleCountrySelect,
  handleOperatorSelect,
  handleBackToCountries,
  handleCancelWithdrawal,
  handleConfirmWithdrawal,
  handleWithdrawalTextInput,
  adminApproveWithdrawal,
  adminRejectWithdrawal,
} from './handlers/withdrawal.js';
import { mainKeyboard } from './utils/keyboards.js';
import { getSetting } from './models/Settings.js';
import Referral from './models/Referral.js';
import User from './models/User.js';
import Transaction from './models/Transaction.js';
import { notifyUser } from './utils/notify.js';
import logger from './utils/logger.js';

/**
 * Crédite le parrain d'un filleul si un parrainage est en attente (pending).
 * Appelé après que le filleul ait vérifié son adhésion aux canaux obligatoires.
 */
async function creditPendingReferral(filleul, telegram, botUsername) {
  try {
    // Chercher un parrainage en attente pour ce filleul
    const referral = await Referral.findOne({
      referredId: filleul.telegramId,
      status: 'pending',
    });
    if (!referral) return;

    // Charger le parrain
    const referrer = await User.findOne({ telegramId: referral.referrerId });
    if (!referrer) return;

    const bonus = referral.amount;
    const balBefore = referrer.balance;

    // Créditer le parrain
    referrer.balance += bonus;
    referrer.referralEarnings += bonus;
    referrer.referralCount += 1;
    await referrer.save();

    // Créer la transaction
    await Transaction.create({
      userId: referrer.telegramId,
      type: 'referral_bonus',
      amount: bonus,
      balanceBefore: balBefore,
      balanceAfter: referrer.balance,
      description: `Parrainage de ${filleul.firstName} (canal vérifié)`,
    });

    // Marquer le parrainage comme crédité
    referral.status = 'credited';
    referral.creditedAt = new Date();
    await referral.save();

    logger.info('Referral credited after channel verification', {
      referrerId: referrer.telegramId,
      referredId: filleul.telegramId,
      bonus,
    });

    // ─── Notifier le parrain ───────────────────────────────────────────────────
    if (telegram) {
      try {
        const referralLink = botUsername
          ? `https://t.me/${botUsername}?start=${referrer.referralCode || referrer.telegramId}`
          : null;

        const shareText = encodeURIComponent(
          `🤑 Rejoins NeoCash et gagne de l'argent gratuitement ! Bonus quotidien + parrainage en FCFA.`
        );
        const shareUrl = referralLink
          ? `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${shareText}`
          : null;

        const notifText =
          `🎉 *Félicitations ${referrer.firstName} !*\n\n` +
          `💸 Vous venez de gagner *${bonus} FCFA* !\n\n` +
          `👤 *${filleul.firstName}* vient de rejoindre NeoCash grâce à votre lien ` +
          `et a confirmé son adhésion au canal.\n\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `💰 Bonus crédité : *+${bonus} FCFA*\n` +
          `👥 Total filleuls : *${referrer.referralCount}*\n` +
          `💳 Nouveau solde : *${referrer.balance.toLocaleString('fr-FR')} FCFA*\n` +
          `━━━━━━━━━━━━━━━━━━\n\n` +
          `📲 Partagez encore votre lien pour gagner plus !`;

        const buttons = shareUrl
          ? { inline_keyboard: [[{ text: '📤 Partager encore', url: shareUrl }]] }
          : undefined;

        await telegram.sendMessage(referrer.telegramId, notifText, {
          parse_mode: 'Markdown',
          reply_markup: buttons,
        });
      } catch (notifErr) {
        logger.warn('Referral notification failed', { err: notifErr.message });
      }
    }
  } catch (err) {
    logger.error('creditPendingReferral error', { err: err.message });
  }
}

export function createBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    throw new Error('BOT_TOKEN manquant dans les variables d\'environnement');
  }

  const bot = new Telegraf(token);

  // ─── Middlewares globaux ────────────────────────────────────────────────────
  bot.use(antiSpam);
  bot.use(getOrCreateUser);
  bot.use(checkMaintenance);
  bot.use(checkBanned);

  // ─── Commandes ──────────────────────────────────────────────────────────────
  bot.start(async (ctx) => {
    const args = ctx.startPayload;
    ctx.payload = args;
    await startCommand(ctx);
  });

  bot.command('admin', requireAdmin, adminCommand);

  bot.command('menu', (ctx) =>
    ctx.reply('📱 *Menu Principal*', { parse_mode: 'Markdown', ...mainKeyboard })
  );

  bot.command('solde', checkChannelMembership, handleBalance);
  bot.command('bonus', checkChannelMembership, handleBonus);
  bot.command('parrainage', checkChannelMembership, handleReferral);
  bot.command('retrait', checkChannelMembership, handleWithdrawal);

  // ─── Clavier persistant ─────────────────────────────────────────────────────
  bot.hears('💰 Solde', checkChannelMembership, handleBalance);
  bot.hears('🎁 Bonus Quotidien', checkChannelMembership, handleBonus);
  bot.hears('👥 Parrainage', checkChannelMembership, handleReferral);
  bot.hears('💸 Retrait', checkChannelMembership, handleWithdrawal);
  bot.hears('📞 Support', checkChannelMembership, handleSupport);
  bot.hears('📖 Explication', handleExplanation);

  // ─── Callbacks inline ────────────────────────────────────────────────────────
  bot.action('verify_channel', async (ctx) => {
    await ctx.answerCbQuery();
    const channelId = await getSetting('required_channel') || await getSetting('required_group');

    if (!channelId) {
      ctx.dbUser.isVerified = true;
      await ctx.dbUser.save();
      await ctx.editMessageText('✅ Vérification réussie ! Bienvenue !').catch(() => {});
      await creditPendingReferral(ctx.dbUser, ctx.telegram, ctx.botInfo?.username);
      return ctx.reply('✅ *Accès accordé !*\n\nUtilise le menu ci-dessous.', {
        parse_mode: 'Markdown',
        ...mainKeyboard,
      });
    }

    try {
      const member = await ctx.telegram.getChatMember(channelId, ctx.from.id);
      const allowed = ['member', 'administrator', 'creator'].includes(member.status);

      if (allowed) {
        ctx.dbUser.isVerified = true;
        await ctx.dbUser.save();
        await ctx.editMessageText('✅ Vérification réussie !').catch(() => {});
        await creditPendingReferral(ctx.dbUser, ctx.telegram, ctx.botInfo?.username);
        return ctx.reply('🎉 *Accès accordé !*\n\nBienvenue sur NeoCash. Utilise le menu ci-dessous.', {
          parse_mode: 'Markdown',
          ...mainKeyboard,
        });
      } else {
        return ctx.answerCbQuery('❌ Tu n\'as pas encore rejoint !', { show_alert: true });
      }
    } catch {
      return ctx.answerCbQuery('⚠️ Vérification impossible. Réessaie.', { show_alert: true });
    }
  });

  // ─── Callbacks retrait ───────────────────────────────────────────────────────
  bot.action(/^country_(.+)$/, checkChannelMembership, async (ctx) => {
    const countryCode = ctx.match[1];
    await handleCountrySelect(ctx, countryCode);
  });

  bot.action(/^operator_([^_]+)_(.+)$/, checkChannelMembership, async (ctx) => {
    const countryCode = ctx.match[1];
    const operator = ctx.match[2];
    await handleOperatorSelect(ctx, countryCode, operator);
  });

  bot.action('back_to_countries', handleBackToCountries);
  bot.action('cancel_withdrawal', handleCancelWithdrawal);
  bot.action('confirm_withdrawal', checkChannelMembership, handleConfirmWithdrawal);

  // ─── Callbacks admin — Retraits ──────────────────────────────────────────────
  bot.action(/^approve_wd_(.+)$/, requireAdmin, async (ctx) => {
    await adminApproveWithdrawal(ctx, ctx.match[1]);
  });

  bot.action(/^reject_wd_(.+)$/, requireAdmin, async (ctx) => {
    await adminRejectWithdrawal(ctx, ctx.match[1]);
  });

  // ─── Callbacks admin — Panel ─────────────────────────────────────────────────
  bot.action('admin_stats', requireAdmin, handleAdminStats);
  bot.action('admin_channels', requireAdmin, handleAdminChannels);
  bot.action('test_admin_group', requireAdmin, handleTestAdminGroup);
  bot.action('test_wd_channel', requireAdmin, handleTestWdChannel);
  bot.action('ignore_detected_group', requireAdmin, async (ctx) => {
    await ctx.answerCbQuery('❌ Groupe ignoré').catch(() => {});
    await ctx.deleteMessage().catch(() => {});
  });
  bot.action(/^set_as_admin_group_(-?\d+)$/, requireAdmin, (ctx) => handleSetDetectedGroup(ctx, ctx.match[1], 'admin'));
  bot.action(/^set_as_wd_channel_(-?\d+)$/, requireAdmin, (ctx) => handleSetDetectedGroup(ctx, ctx.match[1], 'wd'));
  bot.action(/^set_as_req_channel_(-?\d+)$/, requireAdmin, (ctx) => handleSetDetectedGroup(ctx, ctx.match[1], 'channel'));
  bot.action('admin_withdrawals', requireAdmin, handleAdminWithdrawals);
  bot.action('admin_users', requireAdmin, handleAdminUsers);
  bot.action('admin_broadcast', requireAdmin, handleAdminBroadcast);
  bot.action('admin_settings', requireAdmin, handleAdminSettings);
  bot.action('admin_back', requireAdmin, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const { adminKeyboard } = await import('./utils/keyboards.js');
    await ctx.editMessageText('🛡 *PANEL ADMINISTRATEUR — NEOCASH*\n\nSélectionne une option :', {
      parse_mode: 'Markdown',
      ...adminKeyboard,
    }).catch(() => ctx.reply('🛡 Panel Admin', adminKeyboard));
  });

  // ─── Callbacks admin — Retraits liste ────────────────────────────────────────
  bot.action('wd_pending', requireAdmin, (ctx) => handleWithdrawalsList(ctx, 'pending'));
  bot.action('wd_approved', requireAdmin, (ctx) => handleWithdrawalsList(ctx, 'approved'));
  bot.action('wd_rejected', requireAdmin, (ctx) => handleWithdrawalsList(ctx, 'rejected'));

  // ─── Callbacks admin — Utilisateurs ──────────────────────────────────────────
  bot.action(/^admin_credit_(\d+)$/, requireAdmin, (ctx) => handleAdminCredit(ctx, ctx.match[1]));
  bot.action(/^admin_debit_(\d+)$/, requireAdmin, (ctx) => handleAdminCredit(ctx, ctx.match[1], true));
  bot.action(/^admin_ban_(\d+)$/, requireAdmin, (ctx) => handleAdminBan(ctx, ctx.match[1]));
  bot.action(/^admin_unban_(\d+)$/, requireAdmin, (ctx) => handleAdminBan(ctx, ctx.match[1], true));

  // ─── Callbacks admin — Paramètres ────────────────────────────────────────────
  bot.action('set_daily_bonus', requireAdmin, async (ctx) => {
    await ctx.answerCbQuery();
    setAdminSession(ctx.from.id, { action: 'set_daily_bonus' });
    await ctx.reply('🎁 Nouveau montant du bonus quotidien (FCFA) :');
  });

  bot.action('set_referral_bonus', requireAdmin, async (ctx) => {
    await ctx.answerCbQuery();
    setAdminSession(ctx.from.id, { action: 'set_referral_bonus' });
    await ctx.reply('👥 Nouveau montant du bonus parrainage (FCFA) :');
  });

  bot.action('set_min_withdraw', requireAdmin, async (ctx) => {
    await ctx.answerCbQuery();
    setAdminSession(ctx.from.id, { action: 'set_min_withdraw' });
    await ctx.reply('💰 Nouveau montant minimum de retrait (FCFA) :');
  });

  bot.action('set_required_channel', requireAdmin, async (ctx) => {
    await ctx.answerCbQuery();
    setAdminSession(ctx.from.id, { action: 'set_required_channel' });
    await ctx.reply('📢 Entre le username ou ID du canal obligatoire (ex: @moncanal ou -100123456789) :');
  });

  bot.action('set_required_group', requireAdmin, async (ctx) => {
    await ctx.answerCbQuery();
    setAdminSession(ctx.from.id, { action: 'set_required_group' });
    await ctx.reply('👥 Entre l\'ID du groupe obligatoire (ex: -100123456789) :');
  });

  bot.action('set_support_link', requireAdmin, async (ctx) => {
    await ctx.answerCbQuery();
    setAdminSession(ctx.from.id, { action: 'set_support_link' });
    await ctx.reply(
      `📞 *LIEN SUPPORT*\n\nEntre le lien vers ton support Telegram.\n\nExemples :\n• \`https://t.me/mon_support\`\n• \`https://t.me/+AbCdEfGhIjKl\` (groupe privé)\n• \`https://t.me/monbot\`\n\n💡 Ce lien apparaîtra comme bouton dans la section 📞 Support.`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('set_support_message', requireAdmin, async (ctx) => {
    await ctx.answerCbQuery();
    setAdminSession(ctx.from.id, { action: 'set_support_message' });
    await ctx.reply(
      `✏️ *MESSAGE SUPPORT PERSONNALISÉ*\n\n` +
      `Écris le texte qui s'affichera dans la section 📞 Support.\n\n` +
      `💡 Tu peux mentionner :\n` +
      `• Les types de problèmes traités\n` +
      `• La disponibilité des publicités\n` +
      `• Les partenariats possibles\n` +
      `• Les horaires de support\n` +
      `• Tout autre information utile\n\n` +
      `_Le formatage Markdown est supporté (*gras*, _italique_, etc.)_\n\n` +
      `📄 Pour revenir au texte par défaut, envoie : \`reset\``,
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('set_withdrawal_channel', requireAdmin, async (ctx) => {
    await ctx.answerCbQuery();
    setAdminSession(ctx.from.id, { action: 'set_withdrawal_channel' });
    await ctx.reply(
      `💸 *CANAL DE RETRAIT*\n\nEntre le username ou l'ID du canal où publier les notifications de retrait.\n\nExemples :\n• \`@mon_canal_retrait\`\n• \`-1001234567890\`\n\n⚠️ Le bot doit être *administrateur* du canal.`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('toggle_maintenance', requireAdmin, handleToggleMaintenance);

  // ─── Diffusion — Confirmation ─────────────────────────────────────────────────
  bot.action('broadcast_confirm', requireAdmin, async (ctx) => {
    const session = getAdminSession(ctx.from.id);
    if (!session || session.action !== 'broadcast_confirm') return ctx.answerCbQuery('Session expirée');
    await executeBroadcast(ctx, session);
  });

  bot.action('broadcast_add_button', requireAdmin, async (ctx) => {
    await ctx.answerCbQuery();
    const session = getAdminSession(ctx.from.id);
    if (session) {
      session.action = 'broadcast_button_label';
      setAdminSession(ctx.from.id, session);
    }
    await ctx.reply('➕ Entre le texte du bouton :');
  });

  // ─── Réponse admin aux messages support ───────────────────────────────────────
  bot.action(/^support_reply_(\d+)$/, requireAdmin, async (ctx) => {
    await ctx.answerCbQuery();
    const targetId = Number(ctx.match[1]);
    setAdminSession(ctx.from.id, { action: 'support_reply', targetId });
    await ctx.reply(`✉️ Écris ta réponse à l'utilisateur \`${targetId}\` :`, { parse_mode: 'Markdown' });
  });

  // ─── Admin — Redémarrer ────────────────────────────────────────────────────────
  bot.action('admin_restart', requireAdmin, async (ctx) => {
    await ctx.answerCbQuery('🔄 Redémarrage...');
    await ctx.reply('🔄 Redémarrage du serveur dans 3 secondes...');
    setTimeout(() => process.exit(0), 3000);
  });

  // ─── Traitement messages texte ────────────────────────────────────────────────
  bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const isAdmin = await isUserAdmin(userId);

    // Admin input (broadcast, search, credit, etc.)
    if (isAdmin) {
      const adminHandled = await handleAdminInput(ctx);
      if (adminHandled) return;
    }

    // Support message
    const supportHandled = await handleSupportMessage(ctx);
    if (supportHandled) return;

    // Withdrawal text input
    const wdHandled = await handleWithdrawalTextInput(ctx);
    if (wdHandled) return;

    // Support reply (admin)
    if (isAdmin) {
      const session = getAdminSession(userId);
      if (session?.action === 'support_reply') {
        await notifyUser(ctx.telegram, session.targetId, `📩 *RÉPONSE DU SUPPORT*\n\n${ctx.message.text}`);
        await ctx.reply(`✅ Réponse envoyée à \`${session.targetId}\``, { parse_mode: 'Markdown' });
        deleteAdminSession(userId);
        return;
      }
      if (session?.action === 'broadcast_button_label') {
        setAdminSession(userId, { ...session, action: 'broadcast_button_url', broadcastButtonLabel: ctx.message.text });
        await ctx.reply('🔗 Entre maintenant l\'URL du bouton :');
        return;
      }
      if (session?.action === 'broadcast_button_url') {
        const buttonLabel = session.broadcastButtonLabel;
        const buttonUrl = ctx.message.text;
        setAdminSession(userId, {
          ...session,
          action: 'broadcast_confirm',
          broadcastButton: { label: buttonLabel, url: buttonUrl },
        });
        await ctx.reply(`✅ Bouton ajouté : *${buttonLabel}* → ${buttonUrl}\n\nEnvoyer maintenant ?`, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Envoyer', callback_data: 'broadcast_confirm' }],
              [{ text: '❌ Annuler', callback_data: 'admin_back' }],
            ],
          },
        });
        return;
      }
    }

    // Message par défaut
    await ctx.reply('💬 Utilise les boutons du menu ci-dessous.', mainKeyboard);
  });

  // ─── Traitement photos (broadcast admin) ──────────────────────────────────────
  bot.on('photo', async (ctx) => {
    const userId = ctx.from.id;
    const isAdmin = await isUserAdmin(userId);
    if (isAdmin) {
      const handled = await handleAdminInput(ctx);
      if (handled) return;
    }
  });

  // ─── Support annulé ──────────────────────────────────────────────────────────
  bot.action('cancel_support', handleCancelSupport);

  // ─── Détection automatique : bot ajouté dans un groupe/canal ─────────────────
  bot.on('my_chat_member', async (ctx) => {
    const update = ctx.myChatMember;
    if (!update) return;

    const newStatus = update.new_chat_member?.status;
    const chat = update.chat;

    // Bot ajouté ou promu admin dans un groupe/canal/supergroupe
    if (!['member', 'administrator'].includes(newStatus)) return;
    if (!['group', 'supergroup', 'channel'].includes(chat.type)) return;

    const chatId = chat.id;
    const chatTitle = chat.title || chat.username || String(chatId);
    const typeLabel = chat.type === 'channel' ? '📢 Canal' : '👥 Groupe';
    const isAdmin = newStatus === 'administrator' ? '✅ Admin' : '👤 Membre';

    const text =
      `🔔 *NOUVEAU ${typeLabel.toUpperCase()} DÉTECTÉ*\n\n` +
      `📌 *${chatTitle}*\n` +
      `🆔 ID : \`${chatId}\`\n` +
      `🤖 Statut bot : ${isAdmin}\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `Quel est le rôle de ce ${chat.type === 'channel' ? 'canal' : 'groupe'} ?`;

    const { detectedGroupKeyboard } = await import('./utils/keyboards.js');
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(Number).filter(Boolean);

    for (const adminId of adminIds) {
      await ctx.telegram.sendMessage(adminId, text, {
        parse_mode: 'Markdown',
        ...detectedGroupKeyboard(chatId),
      }).catch(() => {});
    }
  });

  // ─── Gestion erreurs ─────────────────────────────────────────────────────────
  bot.catch((err, ctx) => {
    logger.error('Bot error', { err: err.message, update: ctx.update });
    ctx.reply('❌ Une erreur inattendue est survenue. Réessaie plus tard.').catch(() => {});
  });

  return bot;
}
