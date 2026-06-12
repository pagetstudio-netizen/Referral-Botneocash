/**
 * Configuration principale du bot Moon Crypto — Telegraf
 * Système multilingue : FR / EN / DE / ZH
 */
import { Telegraf } from 'telegraf';
import { antiSpam } from './middleware/antispam.js';
import { getOrCreateUser, checkBanned, checkChannelMembership, checkMaintenance, isUserAdmin, clearMembershipCache } from './middleware/auth.js';
import { requireAdmin } from './middleware/admin.js';
import { startCommand, handleLanguageSet } from './commands/start.js';
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
  handleAdminToggleWithdrawal,
  handleToggleMaintenance,
  executeBroadcast,
  getAdminSession,
  deleteAdminSession,
  setAdminSession,
  handleAddReqChannel,
  handleListReqChannels,
  handleDeleteReqChannel,
  handleChannelTypeSelect,
  handleChannelLangSelect,
  handleAdminCryptos,
  handleAddCrypto,
  handleDeleteCrypto,
} from './commands/admin.js';
import { handleBalance } from './handlers/balance.js';
import { handleBonus } from './handlers/bonus.js';
import { handleReferral } from './handlers/referral.js';
import { handleExplanation } from './handlers/explanation.js';
import { handleSupport, handleSupportMessage, handleCancelSupport } from './handlers/support.js';
import {
  handleWithdrawal,
  handleCryptoSelect,
  handleNetworkSelect,
  handleCancelWithdrawal,
  handleConfirmWithdrawal,
  handleWithdrawalTextInput,
  adminApproveWithdrawal,
  adminRejectWithdrawal,
} from './handlers/withdrawal.js';
import { getMainKeyboard, languageKeyboard, multiChannelVerifyKeyboard } from './utils/keyboards.js';
import { getSetting } from './models/Settings.js';
import { creditPendingReferral } from './utils/creditReferral.js';
import { buildMultiChannelVerifyMessage } from './utils/messages.js';
import { t, getLang, BUTTON_LABELS, LANGUAGE_NAMES } from './utils/i18n.js';
import { notifyUser } from './utils/notify.js';
import logger from './utils/logger.js';

// ─── Tous les labels de boutons dans toutes les langues ───────────────────────
const ALL_BUTTON_LABELS = {
  balance: Object.values(BUTTON_LABELS.balance),
  bonus: Object.values(BUTTON_LABELS.bonus),
  referral: Object.values(BUTTON_LABELS.referral),
  withdrawal: Object.values(BUTTON_LABELS.withdrawal),
  support: Object.values(BUTTON_LABELS.support),
  explanation: Object.values(BUTTON_LABELS.explanation),
  changeLanguage: Object.values(BUTTON_LABELS.changeLanguage),
};

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

  bot.command('menu', (ctx) => {
    const lang = getLang(ctx);
    return ctx.reply(t(lang, 'menu_title'), { parse_mode: 'Markdown', ...getMainKeyboard(lang) });
  });

  bot.command('langue', async (ctx) => {
    const lang = getLang(ctx);
    await ctx.reply(t('fr', 'language_select_prompt'), {
      parse_mode: 'Markdown',
      ...languageKeyboard,
    });
  });
  bot.command('language', async (ctx) => {
    await ctx.reply(t('fr', 'language_select_prompt'), {
      parse_mode: 'Markdown',
      ...languageKeyboard,
    });
  });

  bot.command('solde', checkChannelMembership, handleBalance);
  bot.command('bonus', checkChannelMembership, handleBonus);
  bot.command('parrainage', checkChannelMembership, handleReferral);
  bot.command('retrait', checkChannelMembership, handleWithdrawal);

  // ─── Sélection de langue ─────────────────────────────────────────────────────
  bot.action('set_lang_fr', async (ctx) => await handleLanguageSet(ctx, 'fr'));
  bot.action('set_lang_en', async (ctx) => await handleLanguageSet(ctx, 'en'));
  bot.action('set_lang_de', async (ctx) => await handleLanguageSet(ctx, 'de'));
  bot.action('set_lang_zh', async (ctx) => await handleLanguageSet(ctx, 'zh'));

  // ─── Clavier persistant — toutes les langues ─────────────────────────────────
  bot.hears(ALL_BUTTON_LABELS.balance, checkChannelMembership, handleBalance);
  bot.hears(ALL_BUTTON_LABELS.bonus, checkChannelMembership, handleBonus);
  bot.hears(ALL_BUTTON_LABELS.referral, checkChannelMembership, handleReferral);
  bot.hears(ALL_BUTTON_LABELS.withdrawal, checkChannelMembership, handleWithdrawal);
  bot.hears(ALL_BUTTON_LABELS.support, checkChannelMembership, handleSupport);
  bot.hears(ALL_BUTTON_LABELS.explanation, handleExplanation);

  // ─── Changement de langue depuis le menu ─────────────────────────────────────
  bot.hears(ALL_BUTTON_LABELS.changeLanguage, async (ctx) => {
    await ctx.reply(t('fr', 'language_select_prompt'), {
      parse_mode: 'Markdown',
      ...languageKeyboard,
    });
  });

  // ─── Callbacks inline — vérification canal ────────────────────────────────────
  bot.action('verify_channel', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    const lang = getLang(ctx);

    try {
      const { default: RequiredChannel } = await import('./models/RequiredChannel.js');
      const { getMissingChannels } = await import('./middleware/auth.js');

      const channels = await RequiredChannel.findAllForLang(lang);

      if (!channels.length) {
        ctx.dbUser.isVerified = true;
        await ctx.dbUser.save();
        clearMembershipCache(userId);
        await ctx.editMessageText('✅ ' + (lang === 'en' ? 'Access granted!' : lang === 'de' ? 'Zugang gewährt!' : lang === 'zh' ? '访问权限已授予！' : 'Vérification réussie !')).catch(() => {});
        await creditPendingReferral(ctx.dbUser, ctx.telegram, ctx.botInfo?.username);
        return ctx.reply(t(lang, 'channel_access_granted'), {
          parse_mode: 'Markdown', ...getMainKeyboard(lang),
        });
      }

      const stillMissing = await getMissingChannels(ctx.telegram, userId, channels);


      if (stillMissing.length > 0) {
        const names = stillMissing.map(ch => ch.label || ch.chatIdOrUrl).join(', ');
        await ctx.answerCbQuery(
          t(lang, 'channel_still_missing', names),
          { show_alert: true }
        ).catch(() => {});
        await ctx.editMessageText(buildMultiChannelVerifyMessage(stillMissing, lang), {
          parse_mode: 'Markdown',
          ...multiChannelVerifyKeyboard(stillMissing, lang),
        }).catch(() => {});
        return;
      }

      ctx.dbUser.isVerified = true;
      await ctx.dbUser.save();
      clearMembershipCache(userId);
      await ctx.editMessageText('✅ ' + (lang === 'en' ? 'Access granted!' : lang === 'de' ? 'Zugang gewährt!' : lang === 'zh' ? '访问权限已授予！' : 'Accès accordé !')).catch(() => {});
      await creditPendingReferral(ctx.dbUser, ctx.telegram, ctx.botInfo?.username);
      logger.info('verify_channel: accès accordé', { userId });
      return ctx.reply(t(lang, 'channel_access_granted'), {
        parse_mode: 'Markdown', ...getMainKeyboard(lang),
      });

    } catch (err) {
      logger.error('verify_channel error', { err: err.message });
      return ctx.answerCbQuery('⚠️ ' + (lang === 'en' ? 'Verification failed. Try again.' : 'Vérification impossible. Réessaie.'), { show_alert: true });
    }
  });

  // ─── Callbacks retrait crypto ────────────────────────────────────────────────
  bot.action(/^crypto_([A-Z]+)$/, checkChannelMembership, async (ctx) => {
    await handleCryptoSelect(ctx, ctx.match[1]);
  });

  bot.action(/^network_([A-Z]+)_(.+)$/, checkChannelMembership, async (ctx) => {
    await handleNetworkSelect(ctx, ctx.match[1], ctx.match[2]);
  });

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

  // ─── Callbacks gestion canaux obligatoires ──────────────────────────────────
  bot.action('add_req_channel', requireAdmin, handleAddReqChannel);
  bot.action('list_req_channels', requireAdmin, handleListReqChannels);
  bot.action(/^del_req_ch_(\d+)$/, requireAdmin, (ctx) => handleDeleteReqChannel(ctx, ctx.match[1]));

  // Type de canal lors de la création
  bot.action('ch_type_channel', requireAdmin, (ctx) => handleChannelTypeSelect(ctx, 'channel'));
  bot.action('ch_type_group', requireAdmin, (ctx) => handleChannelTypeSelect(ctx, 'group'));
  bot.action('ch_type_website', requireAdmin, (ctx) => handleChannelTypeSelect(ctx, 'website'));

  // Langue du canal lors de la création
  bot.action('ch_lang_fr', requireAdmin, (ctx) => handleChannelLangSelect(ctx, 'fr'));
  bot.action('ch_lang_en', requireAdmin, (ctx) => handleChannelLangSelect(ctx, 'en'));
  bot.action('ch_lang_de', requireAdmin, (ctx) => handleChannelLangSelect(ctx, 'de'));
  bot.action('ch_lang_zh', requireAdmin, (ctx) => handleChannelLangSelect(ctx, 'zh'));
  bot.action('ch_lang_all', requireAdmin, (ctx) => handleChannelLangSelect(ctx, 'all'));

  bot.action('ignore_detected_group', requireAdmin, async (ctx) => {
    await ctx.answerCbQuery('❌ Groupe ignoré').catch(() => {});
    await ctx.deleteMessage().catch(() => {});
  });
  bot.action(/^set_as_admin_group_(-?\d+)$/, requireAdmin, (ctx) => handleSetDetectedGroup(ctx, ctx.match[1], 'admin'));
  bot.action(/^set_as_wd_channel_(-?\d+)$/, requireAdmin, (ctx) => handleSetDetectedGroup(ctx, ctx.match[1], 'wd'));
  bot.action(/^set_as_req_channel_(-?\d+)$/, requireAdmin, (ctx) => handleSetDetectedGroup(ctx, ctx.match[1], 'channel'));
  bot.action('admin_withdrawals', requireAdmin, handleAdminWithdrawals);
  bot.action('admin_cryptos', requireAdmin, handleAdminCryptos);
  bot.action('admin_add_crypto', requireAdmin, handleAddCrypto);
  bot.action(/^admin_del_crypto_([A-Z]+)$/, requireAdmin, (ctx) => handleDeleteCrypto(ctx, ctx.match[1]));
  bot.action('admin_users', requireAdmin, handleAdminUsers);
  bot.action('admin_broadcast', requireAdmin, handleAdminBroadcast);
  bot.action('admin_settings', requireAdmin, handleAdminSettings);
  bot.action('admin_back', requireAdmin, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const { adminKeyboard } = await import('./utils/keyboards.js');
    await ctx.editMessageText('🛡 *PANEL ADMINISTRATEUR — MOON CRYPTO*\n\nSélectionne une option :', {
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
  bot.action(/^admin_unlock_wd_(\d+)$/, requireAdmin, (ctx) => handleAdminToggleWithdrawal(ctx, ctx.match[1], true));
  bot.action(/^admin_lock_wd_(\d+)$/, requireAdmin, (ctx) => handleAdminToggleWithdrawal(ctx, ctx.match[1], false));

  // ─── Callbacks admin — Paramètres ────────────────────────────────────────────
  bot.action('set_daily_bonus', requireAdmin, async (ctx) => {
    await ctx.answerCbQuery();
    setAdminSession(ctx.from.id, { action: 'set_daily_bonus' });
    await ctx.reply('🎁 Nouveau montant du bonus quotidien (USDT, ex: 0.5) :');
  });

  bot.action('set_referral_bonus', requireAdmin, async (ctx) => {
    await ctx.answerCbQuery();
    setAdminSession(ctx.from.id, { action: 'set_referral_bonus' });
    await ctx.reply('👥 Nouveau montant du bonus parrainage (USDT, ex: 1.5) :');
  });

  bot.action('set_min_withdraw', requireAdmin, async (ctx) => {
    await ctx.answerCbQuery();
    setAdminSession(ctx.from.id, { action: 'set_min_withdraw' });
    await ctx.reply('💰 Nouveau retrait minimum (USDT, ex: 15) :');
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
      `✏️ *MESSAGE SUPPORT PERSONNALISÉ*\n\nÉcris le texte qui s'affichera dans la section 📞 Support.\n\n💡 Tu peux mentionner :\n• Les types de problèmes traités\n• La disponibilité des publicités\n• Les partenariats possibles\n• Les horaires de support\n• Tout autre information utile\n\n_Le formatage Markdown est supporté_\n\n📄 Pour revenir au texte par défaut, envoie : \`reset\``,
      { parse_mode: 'Markdown' }
    );
  });

  bot.action('set_withdrawal_channel', requireAdmin, async (ctx) => {
    await ctx.answerCbQuery();
    setAdminSession(ctx.from.id, { action: 'set_withdrawal_channel' });
    await ctx.reply(
      `💸 *CANAL DE RETRAIT*\n\nEntre le username ou l'ID du canal.\n\nExemples :\n• \`@mon_canal_retrait\`\n• \`-1001234567890\`\n\n⚠️ Le bot doit être *administrateur* du canal.`,
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
    const lang = getLang(ctx);
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
        // Récupérer la langue de l'utilisateur cible
        const User = (await import('./models/User.js')).default;
        const targetUser = await User.findOne({ telegramId: session.targetId }).catch(() => null);
        const targetLang = targetUser?.language || 'fr';
        const replyPrefix = t(targetLang, 'support_admin_reply');
        await notifyUser(ctx.telegram, session.targetId, `${replyPrefix}${ctx.message.text}`);
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
    await ctx.reply(t(lang, 'use_menu'), getMainKeyboard(lang));
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
    const lang = getLang(ctx);
    ctx.reply(t(lang, 'error_generic')).catch(() => {});
  });

  return bot;
}
