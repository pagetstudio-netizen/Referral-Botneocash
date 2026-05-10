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
  ]);

  const wdAmounts = await Withdrawal.aggregate([
    { $group: { _id: '$status', total: { $sum: '$amount' } } },
  ]);
  const wdStats = {};
  wdAmounts.forEach((w) => (wdStats[w._id] = w.total));

  const totalBonuses = await Transaction.aggregate([
    { $match: { type: { $in: ['daily_bonus', 'referral_bonus'] } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const bonusTotal = totalBonuses[0]?.total || 0;

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

  const text = `👤 *UTILISATEUR*\n\n🆔 ID : \`${user.telegramId}\`\n📛 Username : ${user.username ? '@' + user.username : 'N/A'}\n👤 Nom : ${user.firstName} ${user.lastName || ''}\n💰 Solde : *${formatAmount(user.balance)}*\n👥 Filleuls : *${user.referralCount}*\n📅 Inscrit : ${formatDate(user.createdAt)}\n🚫 Banni : ${user.banned ? '✅ Oui' : '❌ Non'}`;

  await ctx.reply(text, { parse_mode: 'Markdown', ...userAdminKeyboard(user.telegramId) });
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
  const [dailyBonus, referralBonus, minWithdraw, channel, maintenance] = await Promise.all([
    getSetting('daily_bonus'),
    getSetting('referral_bonus'),
    getSetting('min_withdraw'),
    getSetting('required_channel'),
    getSetting('maintenance_mode'),
  ]);

  const text = `⚙️ *PARAMÈTRES NEOCASH*\n\n━━━━━━━━━━━━━━━━━━\n🎁 Bonus quotidien : *${formatAmount(dailyBonus)}*\n👥 Bonus parrainage : *${formatAmount(referralBonus)}*\n💰 Retrait minimum : *${formatAmount(minWithdraw)}*\n📢 Canal obligatoire : ${channel || 'Non défini'}\n🚧 Maintenance : ${maintenance ? '✅ Activée' : '❌ Désactivée'}\n━━━━━━━━━━━━━━━━━━`;

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
      await ctx.reply(`✅ Lien support mis à jour.`);
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
  const users = await User.find({ banned: false }).select('telegramId');
  let sent = 0, failed = 0;

  for (const user of users) {
    try {
      if (session.broadcastPhoto) {
        const fileId = session.broadcastPhoto[session.broadcastPhoto.length - 1].file_id;
        await ctx.telegram.sendPhoto(user.telegramId, fileId, {
          caption: session.broadcastText || '',
          parse_mode: 'Markdown',
          ...(session.broadcastButton ? {
            reply_markup: { inline_keyboard: [[{ text: session.broadcastButton.label, url: session.broadcastButton.url }]] }
          } : {}),
        });
      } else {
        await ctx.telegram.sendMessage(user.telegramId, session.broadcastText, {
          parse_mode: 'Markdown',
          ...(session.broadcastButton ? {
            reply_markup: { inline_keyboard: [[{ text: session.broadcastButton.label, url: session.broadcastButton.url }]] }
          } : {}),
        });
      }
      sent++;
      await new Promise((r) => setTimeout(r, 30));
    } catch {
      failed++;
    }
  }

  await ctx.reply(`✅ *Diffusion terminée !*\n\n📤 Envoyé : *${sent}*\n❌ Échecs : *${failed}*`, { parse_mode: 'Markdown' });
  adminSessions.delete(ctx.from.id);
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
