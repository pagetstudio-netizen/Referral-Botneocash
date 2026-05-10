/**
 * Commandes et handlers Admin — Interface complète
 */
import User from '../models/User.js';
import Withdrawal from '../models/Withdrawal.js';
import Referral from '../models/Referral.js';
import Transaction from '../models/Transaction.js';
import { getSetting, setSetting } from '../models/Settings.js';
import {
  adminKeyboard,
  adminSettingsKeyboard,
  adminWithdrawalsKeyboard,
  backToAdminKeyboard,
  channelsTestKeyboard,
  detectedGroupKeyboard,
  userAdminKeyboard,
} from '../utils/keyboards.js';
import { formatAmount, formatDate } from '../utils/messages.js';
import { notifyUser } from '../utils/notify.js';
import logger from '../utils/logger.js';
import { Markup } from 'telegraf';

// Sessions admin en mémoire
const adminSessions = new Map();

// ─── /admin ───────────────────────────────────────────────────────────────────
export async function adminCommand(ctx) {
  await ctx.reply(
    `🛡 *PANEL ADMINISTRATEUR — NEOCASH*\n\n━━━━━━━━━━━━━━━━━━\nBienvenue, Admin !\nSélectionne une option :`,
    { parse_mode: 'Markdown', ...adminKeyboard }
  );
}

// ─── Statistiques ─────────────────────────────────────────────────────────────
export async function handleAdminStats(ctx) {
  await ctx.answerCbQuery().catch(() => {});
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers,
    todayUsers,
    weekUsers,
    monthUsers,
    activeUsers,
    totalWd,
    approvedWd,
    rejectedWd,
    pendingWd,
    wdStats,
    bonusTotal,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: startOfDay } }),
    User.countDocuments({ createdAt: { $gte: startOfWeek } }),
    User.countDocuments({ createdAt: { $gte: startOfMonth } }),
    User.countDocuments({ lastActivityAt: { $gte: startOfWeek } }),
    Withdrawal.countDocuments(),
    Withdrawal.countDocuments({ status: 'approved' }),
    Withdrawal.countDocuments({ status: 'rejected' }),
    Withdrawal.countDocuments({ status: 'pending' }),
    Withdrawal.sumByStatus(),
    Transaction.sumBonuses(),
  ]);

  const text = `📊 *STATISTIQUES NEOCASH*

━━━━━━━━━━━━━━━━━━
👥 *UTILISATEURS*
• Total : *${totalUsers}*
• Aujourd'hui : *${todayUsers}*
• Cette semaine : *${weekUsers}*
• Ce mois : *${monthUsers}*
• Actifs (7j) : *${activeUsers}*

💸 *RETRAITS*
• Total : *${totalWd}* (${formatAmount(wdStats.approved || 0)})
• ⏳ En attente : *${pendingWd}*
• ✅ Validés : *${approvedWd}* (${formatAmount(wdStats.approved || 0)})
• ❌ Refusés : *${rejectedWd}*

🎁 *BONUS DISTRIBUÉS*
• Total : *${formatAmount(bonusTotal)}*
━━━━━━━━━━━━━━━━━━`;

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...backToAdminKeyboard,
  }).catch(() => ctx.reply(text, { parse_mode: 'Markdown', ...backToAdminKeyboard }));
}

// ─── Canaux & Groupes configurés + détection ──────────────────────────────────
export async function handleAdminChannels(ctx) {
  await ctx.answerCbQuery().catch(() => {});

  const [channel, group, site, withdrawalChannel, adminGroupId] = await Promise.all([
    getSetting('required_channel'),
    getSetting('required_group'),
    getSetting('required_site'),
    getSetting('withdrawal_channel'),
    getSetting('admin_group_id'),
  ]);

  async function getChatSummary(chatId, label, unit = 'abonnés') {
    if (!chatId) return null;
    try {
      const [chat, count] = await Promise.all([
        ctx.telegram.getChat(chatId),
        ctx.telegram.getChatMembersCount(chatId),
      ]);
      const title = chat.title || chat.username || chatId;
      return `${label}\n📌 *${title}*\n🆔 \`${chatId}\`\n👥 *${Number(count).toLocaleString('fr-FR')}* ${unit}`;
    } catch {
      return `${label}\n🆔 \`${chatId}\`\n❓ _Accès refusé — ajoute le bot comme administrateur_`;
    }
  }

  const results = await Promise.all([
    getChatSummary(channel, '📢 *Canal obligatoire*', 'abonnés'),
    getChatSummary(group, '👥 *Groupe obligatoire*', 'membres'),
    getChatSummary(withdrawalChannel, '💸 *Canal de retrait*', 'abonnés'),
    getChatSummary(adminGroupId, '🛡 *Groupe administrateur*', 'membres'),
  ]);

  const lines = results.filter(Boolean);
  if (site) lines.push(`🌐 *Site web obligatoire*\n🔗 ${site}`);

  const body = lines.length
    ? lines.join('\n\n━━━━━━━━━━━━━━━━━━\n')
    : '❌ Aucun canal ou groupe configuré.';

  const text =
    `📡 *CANAUX & GROUPES*\n\n━━━━━━━━━━━━━━━━━━\n${body}\n━━━━━━━━━━━━━━━━━━\n\n` +
    `💡 *Détection automatique :* Ajoute le bot dans un groupe — il te demandera son rôle automatiquement.\n` +
    `🔌 Utilise les boutons ci-dessous pour tester les connexions.`;

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...channelsTestKeyboard,
  }).catch(() => ctx.reply(text, { parse_mode: 'Markdown', ...channelsTestKeyboard }));
}

// ─── Test connexion groupe admin ──────────────────────────────────────────────
export async function handleTestAdminGroup(ctx) {
  await ctx.answerCbQuery('🔌 Test en cours...').catch(() => {});
  const groupId = await getSetting('admin_group_id');
  if (!groupId) {
    return ctx.reply('❌ *Groupe admin non configuré.*\n\nAjoute le bot dans ton groupe admin, puis choisis "🛡 Groupe Admin" quand il détecte le groupe.', { parse_mode: 'Markdown' });
  }
  try {
    await ctx.telegram.sendMessage(groupId,
      `✅ *TEST DE CONNEXION — GROUPE ADMIN*\n\n` +
      `🤖 Le bot @neomcashbot est bien connecté à ce groupe !\n` +
      `📢 Tu recevras ici les notifications suivantes :\n` +
      `• 🆕 Nouveaux utilisateurs\n` +
      `• 💸 Demandes de retrait\n` +
      `• ✅ Retraits validés / ❌ Refusés\n` +
      `• 🚫 Utilisateurs bannis\n\n` +
      `📅 Test effectué le ${new Date().toLocaleString('fr-FR')}`,
      { parse_mode: 'Markdown' }
    );
    await ctx.reply(`✅ *Connexion réussie !*\n\nLe bot est bien connecté au groupe admin \`${groupId}\`.\nUn message de test a été envoyé.`, { parse_mode: 'Markdown' });
  } catch (err) {
    await ctx.reply(
      `❌ *Échec de connexion au groupe admin*\n\n🆔 ID : \`${groupId}\`\n⚠️ Erreur : ${err.message}\n\n💡 Vérifie que le bot est bien *administrateur* du groupe.`,
      { parse_mode: 'Markdown' }
    );
  }
}

// ─── Test connexion canal retrait ──────────────────────────────────────────────
export async function handleTestWdChannel(ctx) {
  await ctx.answerCbQuery('🔌 Test en cours...').catch(() => {});
  const channelId = await getSetting('withdrawal_channel');
  if (!channelId) {
    return ctx.reply('❌ *Canal de retrait non configuré.*\n\nAjoute le bot dans ton canal de retrait, puis choisis "💸 Canal Retrait" quand il détecte le canal.', { parse_mode: 'Markdown' });
  }
  try {
    await ctx.telegram.sendMessage(channelId,
      `✅ *TEST DE CONNEXION — CANAL DE RETRAIT*\n\n` +
      `🤖 Le bot @neomcashbot est bien connecté à ce canal !\n` +
      `💸 Les notifications de retrait apparaîtront ici :\n\n` +
      `*Exemple :*\n` +
      `💸 Retrait validé pour Jean Dupont\n` +
      `💰 Montant : 5 000 FCFA\n` +
      `📱 Orange Money — 07XXXXXXXX\n\n` +
      `📅 Test effectué le ${new Date().toLocaleString('fr-FR')}`,
      { parse_mode: 'Markdown' }
    );
    await ctx.reply(`✅ *Connexion réussie !*\n\nLe bot est bien connecté au canal de retrait \`${channelId}\`.\nUn message de test a été envoyé.`, { parse_mode: 'Markdown' });
  } catch (err) {
    await ctx.reply(
      `❌ *Échec de connexion au canal de retrait*\n\n🆔 ID : \`${channelId}\`\n⚠️ Erreur : ${err.message}\n\n💡 Vérifie que le bot est bien *administrateur* du canal.`,
      { parse_mode: 'Markdown' }
    );
  }
}

// ─── Définir groupe détecté ────────────────────────────────────────────────────
export async function handleSetDetectedGroup(ctx, chatId, role) {
  await ctx.answerCbQuery().catch(() => {});
  const id = chatId.toString();

  let settingKey, label;
  if (role === 'admin')    { settingKey = 'admin_group_id';     label = '🛡 Groupe Admin'; }
  if (role === 'wd')       { settingKey = 'withdrawal_channel'; label = '💸 Canal Retrait'; }
  if (role === 'channel')  { settingKey = 'required_channel';   label = '📢 Canal Obligatoire'; }

  await setSetting(settingKey, id);

  let testMsg = '';
  try {
    if (role === 'admin') {
      await ctx.telegram.sendMessage(id,
        `🎉 *Groupe Admin configuré avec succès !*\n\n` +
        `🤖 Le bot @neomcashbot est maintenant connecté à ce groupe.\n` +
        `📢 Tu recevras ici toutes les notifications importantes :\n` +
        `• 🆕 Nouveaux utilisateurs\n• 💸 Demandes de retrait\n• 🚫 Bannis\n\n` +
        `✅ Connexion vérifiée.`,
        { parse_mode: 'Markdown' }
      );
    } else if (role === 'wd') {
      await ctx.telegram.sendMessage(id,
        `🎉 *Canal de retrait configuré avec succès !*\n\n` +
        `🤖 Le bot @neomcashbot publiera ici les notifications de retrait.\n\n` +
        `✅ Connexion vérifiée.`,
        { parse_mode: 'Markdown' }
      );
    } else if (role === 'channel') {
      await ctx.telegram.sendMessage(id,
        `🎉 *Canal obligatoire configuré !*\n\n` +
        `🤖 Le bot @neomcashbot vérifiera l'adhésion des utilisateurs à ce canal.\n\n` +
        `✅ Connexion vérifiée.`,
        { parse_mode: 'Markdown' }
      );
    }
    testMsg = '\n✅ *Message de confirmation envoyé dans le groupe.*';
  } catch {
    testMsg = '\n⚠️ _Message de test échoué — ajoute le bot comme admin._';
  }

  await ctx.editMessageText(
    `✅ *Rôle assigné : ${label}*\n\n🆔 ID sauvegardé : \`${id}\`${testMsg}`,
    { parse_mode: 'Markdown', ...channelsTestKeyboard }
  ).catch(() => ctx.reply(`✅ ${label} configuré : \`${id}\``, { parse_mode: 'Markdown' }));
}

// ─── Gestion retraits ─────────────────────────────────────────────────────────
export async function handleAdminWithdrawals(ctx) {
  await ctx.answerCbQuery().catch(() => {});
  await ctx.editMessageText('💸 *GESTION DES RETRAITS*\n\nChoisir une catégorie :', {
    parse_mode: 'Markdown',
    ...adminWithdrawalsKeyboard,
  }).catch(() => {});
}

export async function handleWithdrawalsList(ctx, status) {
  await ctx.answerCbQuery().catch(() => {});
  const labels = { pending: '⏳ En attente', approved: '✅ Validés', rejected: '❌ Refusés' };
  const withdrawals = await Withdrawal.find({ status }).sort({ createdAt: -1 }).limit(10);

  if (!withdrawals.length) {
    return ctx.editMessageText(`${labels[status]}\n\nAucune demande dans cette catégorie.`, {
      parse_mode: 'Markdown',
      ...backToAdminKeyboard,
    }).catch(() => {});
  }

  const { withdrawalAdminKeyboard } = await import('../utils/keyboards.js');

  for (const wd of withdrawals) {
    const text = `${labels[status]}\n\n👤 ${wd.firstName}\n🆔 \`${wd.telegramId}\`\n🌍 ${wd.countryName}\n📱 ${wd.operator}\n📞 \`${wd.phone}\`\n💰 *${formatAmount(wd.amount)}*\n📅 ${formatDate(wd.createdAt)}`;
    const extra = status === 'pending'
      ? { reply_markup: withdrawalAdminKeyboard(wd._id).reply_markup }
      : { reply_markup: backToAdminKeyboard.reply_markup };
    await ctx.reply(text, { parse_mode: 'Markdown', ...extra }).catch(() => {});
  }
}

// ─── Recherche utilisateur ────────────────────────────────────────────────────
export async function handleAdminUsers(ctx) {
  await ctx.answerCbQuery().catch(() => {});
  adminSessions.set(ctx.from.id, { action: 'search_user' });
  await ctx.editMessageText(
    '👤 *GESTION UTILISATEURS*\n\nEnvoie l\'ID Telegram ou le @username de l\'utilisateur :',
    { parse_mode: 'Markdown', ...backToAdminKeyboard }
  ).catch(() => ctx.reply('👤 Envoie l\'ID Telegram ou le @username :'));
}

export async function handleAdminUserSearch(ctx, query) {
  let user;
  const q = query.replace('@', '').trim();

  if (/^\d+$/.test(q)) {
    user = await User.findOne({ telegramId: Number(q) });
  } else {
    user = await User.findOne({ username: q });
  }

  if (!user) return ctx.reply('❌ Utilisateur introuvable.');

  const MIN_REF = 15;
  const wdStatus = user.withdrawalUnlocked
    ? '🔓 Débloqué par admin'
    : user.referralCount >= MIN_REF
      ? `✅ Débloqué (${user.referralCount} filleuls)`
      : `🔒 Verrouillé (${user.referralCount}/${MIN_REF} filleuls)`;

  const text =
    `👤 *UTILISATEUR*\n\n` +
    `🆔 ID : \`${user.telegramId}\`\n` +
    `📛 Username : ${user.username ? '@' + user.username : 'N/A'}\n` +
    `👤 Nom : ${user.firstName} ${user.lastName || ''}\n` +
    `💰 Solde : *${formatAmount(user.balance)}*\n` +
    `👥 Filleuls : *${user.referralCount}/${MIN_REF}*\n` +
    `💸 Retrait : ${wdStatus}\n` +
    `📅 Inscrit : ${formatDate(user.createdAt)}\n` +
    `🚫 Banni : ${user.banned ? '✅ Oui' : '❌ Non'}`;

  await ctx.reply(text, { parse_mode: 'Markdown', ...userAdminKeyboard(user.telegramId, user.withdrawalUnlocked) });
}

// ─── Créditer/débiter utilisateur ────────────────────────────────────────────
export async function handleAdminCredit(ctx, targetId, debit = false) {
  await ctx.answerCbQuery().catch(() => {});
  adminSessions.set(ctx.from.id, { action: debit ? 'debit_user' : 'credit_user', targetId: Number(targetId) });
  await ctx.reply(`${debit ? '➖ Débiter' : '➕ Créditer'} l\'utilisateur \`${targetId}\`\n\nEntre le montant en FCFA :`, { parse_mode: 'Markdown' });
}

// ─── Bannir/débannir ──────────────────────────────────────────────────────────
export async function handleAdminBan(ctx, targetId, unban = false) {
  await ctx.answerCbQuery().catch(() => {});
  const user = await User.findOne({ telegramId: Number(targetId) });
  if (!user) return ctx.reply('❌ Utilisateur introuvable.');

  user.banned = !unban;
  if (!unban) {
    user.bannedAt = new Date();
    user.bannedReason = 'Banni par admin';
  } else {
    user.bannedAt = null;
    user.bannedReason = null;
  }
  await user.save();

  const action = unban ? 'débannis' : 'banni';
  await ctx.reply(`✅ Utilisateur \`${targetId}\` ${action}.`, { parse_mode: 'Markdown' });

  if (!unban) {
    await notifyAdmins_local(ctx.telegram, `🚫 *UTILISATEUR BANNI*\n\n👤 ${user.firstName}\n🆔 \`${user.telegramId}\``);
  }
}

// ─── Débloquer / Verrouiller retrait utilisateur ─────────────────────────────
export async function handleAdminToggleWithdrawal(ctx, targetId, unlock = true) {
  await ctx.answerCbQuery().catch(() => {});
  const user = await User.findOne({ telegramId: Number(targetId) });
  if (!user) return ctx.reply('❌ Utilisateur introuvable.');

  user.withdrawalUnlocked = unlock;
  await user.save();

  const label = unlock ? '🔓 débloqué' : '🔒 verrouillé';
  await ctx.reply(
    `✅ Retrait *${label}* pour \`${targetId}\`.\n\n` +
    `👤 ${user.firstName} ${user.lastName || ''}\n` +
    `👥 Filleuls : *${user.referralCount}/15*`,
    { parse_mode: 'Markdown' }
  );

  // Notifier l'utilisateur si on lui débloque le retrait
  if (unlock) {
    await notifyUser(ctx.telegram, user.telegramId,
      `🎉 *RETRAIT DÉBLOQUÉ !*\n\n` +
      `✅ Un administrateur t'a accordé l'accès au retrait.\n\n` +
      `💸 Tu peux maintenant effectuer ton retrait depuis le menu principal !`
    ).catch(() => {});
  }

  logger.info('Admin toggle withdrawal unlock', { targetId, unlock });
}

// ─── Diffusion globale ────────────────────────────────────────────────────────
export async function handleAdminBroadcast(ctx) {
  await ctx.answerCbQuery().catch(() => {});
  adminSessions.set(ctx.from.id, { action: 'broadcast' });
  await ctx.editMessageText(
    `📢 *DIFFUSION GLOBALE*\n\n━━━━━━━━━━━━━━━━━━\nEnvoie le message à diffuser.\n\n✏️ Formats supportés :\n• Texte seul\n• Photo + légende\n\n_Tu pourras ajouter un bouton ensuite._`,
    { parse_mode: 'Markdown', ...backToAdminKeyboard }
  ).catch(() => ctx.reply('📢 Envoie le message à diffuser :'));
}

// ─── Paramètres admin ─────────────────────────────────────────────────────────
export async function handleAdminSettings(ctx) {
  await ctx.answerCbQuery().catch(() => {});
  const [dailyBonus, referralBonus, minWithdraw, channel, withdrawalChannel, supportLink, supportMessage, maintenance] = await Promise.all([
    getSetting('daily_bonus'),
    getSetting('referral_bonus'),
    getSetting('min_withdraw'),
    getSetting('required_channel'),
    getSetting('withdrawal_channel'),
    getSetting('support_link'),
    getSetting('support_message'),
    getSetting('maintenance_mode'),
  ]);

  const text =
    `⚙️ *PARAMÈTRES NEOCASH*\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🎁 Bonus quotidien : *${formatAmount(dailyBonus)}*\n` +
    `👥 Bonus parrainage : *${formatAmount(referralBonus)}*\n` +
    `💰 Retrait minimum : *${formatAmount(minWithdraw)}*\n` +
    `📢 Canal obligatoire : ${channel || '❌ Non défini'}\n` +
    `💸 Canal de retrait : ${withdrawalChannel || '❌ Non défini'}\n` +
    `📞 Lien support : ${supportLink || '❌ Non défini'}\n` +
    `✏️ Message support : ${supportMessage ? '✅ Personnalisé' : '📄 Par défaut'}\n` +
    `🚧 Maintenance : ${maintenance ? '✅ Activée' : '❌ Désactivée'}\n` +
    `━━━━━━━━━━━━━━━━━━`;

  await ctx.editMessageText(text, {
    parse_mode: 'Markdown',
    ...adminSettingsKeyboard,
  }).catch(() => ctx.reply(text, { parse_mode: 'Markdown', ...adminSettingsKeyboard }));
}

// ─── Traitement des entrées admin (settings, broadcast, etc.) ─────────────────
export async function handleAdminInput(ctx) {
  const userId = ctx.from.id;
  const session = adminSessions.get(userId);
  if (!session) return false;

  const text = ctx.message?.text;
  const photo = ctx.message?.photo;

  switch (session.action) {
    case 'search_user': {
      adminSessions.delete(userId);
      await handleAdminUserSearch(ctx, text);
      return true;
    }
    case 'credit_user': {
      const amount = parseInt(text, 10);
      if (isNaN(amount) || amount <= 0) {
        await ctx.reply('⚠️ Montant invalide.');
        return true;
      }
      const user = await User.findOne({ telegramId: session.targetId });
      if (!user) { await ctx.reply('❌ Utilisateur introuvable.'); adminSessions.delete(userId); return true; }
      const balBefore = user.balance;
      user.balance += amount;
      await user.save();
      await Transaction.create({ userId: user.telegramId, type: 'admin_credit', amount, balanceBefore: balBefore, balanceAfter: user.balance, description: 'Crédit admin' });
      await ctx.reply(`✅ *${formatAmount(amount)}* crédité à \`${session.targetId}\`.\nNouveau solde : *${formatAmount(user.balance)}*`, { parse_mode: 'Markdown' });
      await notifyUser(ctx.telegram, user.telegramId, `💰 *CRÉDIT REÇU*\n\n+${formatAmount(amount)} ajouté à ton compte par l'admin.\n💵 Nouveau solde : *${formatAmount(user.balance)}*`);
      adminSessions.delete(userId);
      return true;
    }
    case 'debit_user': {
      const amount = parseInt(text, 10);
      if (isNaN(amount) || amount <= 0) { await ctx.reply('⚠️ Montant invalide.'); return true; }
      const user = await User.findOne({ telegramId: session.targetId });
      if (!user) { await ctx.reply('❌ Utilisateur introuvable.'); adminSessions.delete(userId); return true; }
      const balBefore = user.balance;
      user.balance = Math.max(0, user.balance - amount);
      await user.save();
      await Transaction.create({ userId: user.telegramId, type: 'admin_debit', amount: -amount, balanceBefore: balBefore, balanceAfter: user.balance, description: 'Débit admin' });
      await ctx.reply(`✅ *${formatAmount(amount)}* débité de \`${session.targetId}\`.`, { parse_mode: 'Markdown' });
      adminSessions.delete(userId);
      return true;
    }
    case 'broadcast': {
      // Préparer la diffusion
      adminSessions.set(userId, { action: 'broadcast_confirm', broadcastText: text, broadcastPhoto: photo });
      await ctx.reply(
        `📢 *APERÇU DE LA DIFFUSION*\n\n${text || '[Photo]'}\n\n━━━━━━━━━━━━━━━━━━\nEnvoyer à tous les utilisateurs ?`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('✅ Envoyer maintenant', 'broadcast_confirm')],
            [Markup.button.callback('➕ Ajouter un bouton', 'broadcast_add_button')],
            [Markup.button.callback('❌ Annuler', 'admin_back')],
          ]),
        }
      );
      return true;
    }
    case 'set_daily_bonus': {
      const val = parseInt(text, 10);
      if (isNaN(val) || val < 0) { await ctx.reply('⚠️ Valeur invalide.'); return true; }
      await setSetting('daily_bonus', val);
      await ctx.reply(`✅ Bonus quotidien mis à jour : *${formatAmount(val)}*`, { parse_mode: 'Markdown' });
      adminSessions.delete(userId);
      return true;
    }
    case 'set_referral_bonus': {
      const val = parseInt(text, 10);
      if (isNaN(val) || val < 0) { await ctx.reply('⚠️ Valeur invalide.'); return true; }
      await setSetting('referral_bonus', val);
      await ctx.reply(`✅ Bonus parrainage mis à jour : *${formatAmount(val)}*`, { parse_mode: 'Markdown' });
      adminSessions.delete(userId);
      return true;
    }
    case 'set_min_withdraw': {
      const val = parseInt(text, 10);
      if (isNaN(val) || val < 0) { await ctx.reply('⚠️ Valeur invalide.'); return true; }
      await setSetting('min_withdraw', val);
      await ctx.reply(`✅ Retrait minimum mis à jour : *${formatAmount(val)}*`, { parse_mode: 'Markdown' });
      adminSessions.delete(userId);
      return true;
    }
    case 'set_required_channel': {
      await setSetting('required_channel', text);
      await ctx.reply(`✅ Canal obligatoire mis à jour : \`${text}\``, { parse_mode: 'Markdown' });
      adminSessions.delete(userId);
      return true;
    }
    case 'set_required_group': {
      await setSetting('required_group', text);
      await ctx.reply(`✅ Groupe obligatoire mis à jour : \`${text}\``, { parse_mode: 'Markdown' });
      adminSessions.delete(userId);
      return true;
    }
    case 'set_support_link': {
      await setSetting('support_link', text);
      await ctx.reply(
        `✅ *Lien support mis à jour !*\n\n🔗 \`${text}\`\n\nLes utilisateurs verront ce bouton dans la section Support.`,
        { parse_mode: 'Markdown' }
      );
      adminSessions.delete(userId);
      return true;
    }
    case 'set_support_message': {
      if (!text) { await ctx.reply('⚠️ Message vide. Envoie le texte à afficher ou \`reset\` pour revenir au défaut.', { parse_mode: 'Markdown' }); return true; }
      if (text.trim().toLowerCase() === 'reset') {
        await setSetting('support_message', '');
        await ctx.reply('✅ Message support réinitialisé au texte par défaut.', { parse_mode: 'Markdown' });
        adminSessions.delete(userId);
        return true;
      }
      await setSetting('support_message', text);
      await ctx.reply(
        `✅ *Message support mis à jour !*\n\n📝 *Aperçu :*\n\n${text}\n\n_Ce texte s'affichera dans la section 📞 Support._`,
        { parse_mode: 'Markdown' }
      );
      adminSessions.delete(userId);
      return true;
    }
    case 'set_withdrawal_channel': {
      await setSetting('withdrawal_channel', text);
      await ctx.reply(
        `✅ *Canal de retrait configuré !*\n\n💸 Canal : \`${text}\`\n\n📌 Le bot enverra maintenant les notifications de retrait dans ce canal.\n\n⚠️ Assure-toi que le bot est administrateur du canal.`,
        { parse_mode: 'Markdown' }
      );
      adminSessions.delete(userId);
      return true;
    }
    default:
      return false;
  }
}

// ─── Diffusion globale ────────────────────────────────────────────────────────
export async function executeBroadcast(ctx, session) {
  await ctx.answerCbQuery('📢 Diffusion en cours...').catch(() => {});

  // Chargement de TOUS les utilisateurs non bannis (fix : find() est synchrone, limit() est async)
  const users = await User.find({ banned: false }).limit(1000000);
  const total = users.length;

  let sent = 0, blocked = 0, failed = 0;

  // Message de progression initial
  const progressMsg = await ctx.reply(
    `📢 *Diffusion en cours...*\n\n👥 Total : *${total}* utilisateurs\n📤 Envoyé : 0\n🚫 Bloqués : 0\n❌ Erreurs : 0`,
    { parse_mode: 'Markdown' }
  );

  const replyOpts = session.broadcastButton
    ? { reply_markup: { inline_keyboard: [[{ text: session.broadcastButton.label, url: session.broadcastButton.url }]] } }
    : {};

  for (const user of users) {
    try {
      if (session.broadcastPhoto) {
        const fileId = session.broadcastPhoto[session.broadcastPhoto.length - 1].file_id;
        await ctx.telegram.sendPhoto(user.telegramId, fileId, {
          caption: session.broadcastText || '',
          parse_mode: 'Markdown',
          ...replyOpts,
        });
      } else {
        await ctx.telegram.sendMessage(user.telegramId, session.broadcastText, {
          parse_mode: 'Markdown',
          ...replyOpts,
        });
      }
      sent++;
    } catch (err) {
      const errMsg = err?.message || '';
      // Utilisateur a bloqué le bot ou désactivé son compte
      if (errMsg.includes('blocked') || errMsg.includes('deactivated') || errMsg.includes('chat not found') || errMsg.includes('user is deactivated')) {
        blocked++;
      } else if (errMsg.includes('Too Many Requests') || errMsg.includes('429')) {
        // Flood control — pause plus longue et retry
        const retryAfter = (err?.parameters?.retry_after || 5) * 1000;
        await new Promise((r) => setTimeout(r, retryAfter));
        try {
          if (session.broadcastPhoto) {
            const fileId = session.broadcastPhoto[session.broadcastPhoto.length - 1].file_id;
            await ctx.telegram.sendPhoto(user.telegramId, fileId, { caption: session.broadcastText || '', parse_mode: 'Markdown', ...replyOpts });
          } else {
            await ctx.telegram.sendMessage(user.telegramId, session.broadcastText, { parse_mode: 'Markdown', ...replyOpts });
          }
          sent++;
        } catch {
          failed++;
        }
      } else {
        failed++;
      }
    }

    // Délai anti-flood Telegram (max 30 msg/sec → 35ms de sécurité)
    await new Promise((r) => setTimeout(r, 35));

    // Mise à jour progression toutes les 50 personnes
    const processed = sent + blocked + failed;
    if (processed > 0 && processed % 50 === 0) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        progressMsg.message_id,
        undefined,
        `📢 *Diffusion en cours...*\n\n👥 Total : *${total}*\n📤 Envoyé : *${sent}*\n🚫 Bloqués : *${blocked}*\n❌ Erreurs : *${failed}*\n⏳ Progression : *${Math.round((processed / total) * 100)}%*`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});
    }
  }

  // Rapport final
  await ctx.telegram.editMessageText(
    ctx.chat.id,
    progressMsg.message_id,
    undefined,
    `✅ *DIFFUSION TERMINÉE !*\n\n━━━━━━━━━━━━━━━━━━\n👥 Total ciblé : *${total}*\n📤 Reçu : *${sent}*\n🚫 Bloqué le bot : *${blocked}*\n❌ Autres erreurs : *${failed}*\n━━━━━━━━━━━━━━━━━━`,
    { parse_mode: 'Markdown' }
  ).catch(() => {});

  adminSessions.delete(ctx.from.id);
  logger.info('Broadcast terminé', { total, sent, blocked, failed });
}

// ─── Maintenance toggle ────────────────────────────────────────────────────────
export async function handleToggleMaintenance(ctx) {
  await ctx.answerCbQuery().catch(() => {});
  const current = await getSetting('maintenance_mode');
  await setSetting('maintenance_mode', !current);
  await ctx.reply(`🚧 Mode maintenance : ${!current ? '✅ *Activé*' : '❌ *Désactivé*'}`, { parse_mode: 'Markdown' });
}

// Démarrage entrée paramètre
export function setAdminSession(userId, data) {
  adminSessions.set(userId, data);
}

export function getAdminSession(userId) {
  return adminSessions.get(userId);
}

export function deleteAdminSession(userId) {
  adminSessions.delete(userId);
}

// Notification locale
async function notifyAdmins_local(telegram, text) {
  const { notifyAdmins } = await import('../utils/notify.js');
  await notifyAdmins(telegram, { text });
}
