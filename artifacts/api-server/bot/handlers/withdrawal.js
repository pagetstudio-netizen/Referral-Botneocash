/**
 * Handler — Retrait Multi-étapes
 * Flow: pays → opérateur → numéro → montant → récapitulatif → confirmation
 */
import Withdrawal from '../models/Withdrawal.js';
import Transaction from '../models/Transaction.js';
import { getSetting } from '../models/Settings.js';
import { getCountry, getOperators } from '../utils/countries.js';
import { withdrawSummaryMessage, formatAmount } from '../utils/messages.js';
import {
  countriesKeyboard,
  operatorsKeyboard,
  confirmWithdrawKeyboard,
  withdrawalAdminKeyboard,
  mainKeyboard,
} from '../utils/keyboards.js';
import { createReadStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { notifyAdmins, notifyUser, notifyWithdrawalChannel, notifyWithdrawalChannelPhoto } from '../utils/notify.js';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = join(__dirname, '../assets/logo.png');

// Masque le numéro : +22507123456 → +225 07X XX XX 56 (garde début + 2 derniers chiffres)
function maskPhone(phone) {
  const clean = phone.replace(/\s/g, '');
  if (clean.length < 6) return clean;
  const visible_start = clean.slice(0, Math.min(6, clean.length - 2));
  const visible_end   = clean.slice(-2);
  const hidden_count  = clean.length - visible_start.length - visible_end.length;
  const hidden        = 'X'.repeat(hidden_count);
  const all = visible_start + hidden + visible_end;
  const prefix = all.startsWith('+') ? '+' : '';
  const digits = all.replace('+', '');
  const groups = digits.match(/.{1,2}/g) || [digits];
  return prefix + groups.join(' ');
}

// Masque le nom : "Kikou" → "K***ou", "Jean" → "J**n", "Al" → "A*"
function maskName(name) {
  if (!name) return '***';
  const trimmed = name.trim();
  if (trimmed.length <= 1) return trimmed + '*';
  if (trimmed.length === 2) return trimmed[0] + '*';
  if (trimmed.length === 3) return trimmed[0] + '**';
  // 4+ chars : premier + *** + 2 derniers
  return trimmed[0] + '***' + trimmed.slice(-2);
}

// Sessions en mémoire pour le flux multi-étapes
const withdrawalSessions = new Map();

const STEP = {
  COUNTRY: 'country',
  OPERATOR: 'operator',
  PHONE: 'phone',
  BENEFICIARY_NAME: 'beneficiary_name',
  AMOUNT: 'amount',
  CONFIRM: 'confirm',
};

const MIN_REFERRALS_TO_WITHDRAW = 15;

// ─── Démarrer le flux retrait ─────────────────────────────────────────────────
export async function handleWithdrawal(ctx) {
  const user = ctx.dbUser;
  if (!user) return;

  const minWithdraw = await getSetting('min_withdraw') || 800;

  // ── Vérification anti-triche : 15 filleuls minimum ──────────────────────────
  const canWithdraw = user.referralCount >= MIN_REFERRALS_TO_WITHDRAW || user.withdrawalUnlocked;
  if (!canWithdraw) {
    return ctx.reply(
      `🔒 *RETRAIT VERROUILLÉ*\n\n━━━━━━━━━━━━━━━━━━\n` +
      `Pour effectuer un retrait, tu dois parrainer au moins *${MIN_REFERRALS_TO_WITHDRAW} amis*.\n\n` +
      `👥 Filleuls actuels : *${user.referralCount}/${MIN_REFERRALS_TO_WITHDRAW}*\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `📲 Partage ton lien de parrainage pour débloquer le retrait !`,
      { parse_mode: 'Markdown' }
    );
  }

  if (user.balance < minWithdraw) {
    return ctx.reply(
      `💸 *RETRAIT INDISPONIBLE*\n\n━━━━━━━━━━━━━━━━━━\n💰 Solde actuel : *${formatAmount(user.balance)}*\n⚠️ Minimum requis : *${formatAmount(minWithdraw)}*\n━━━━━━━━━━━━━━━━━━\n\n👥 Invite des amis pour augmenter ton solde !`,
      { parse_mode: 'Markdown' }
    );
  }

  withdrawalSessions.set(user.telegramId, { step: STEP.COUNTRY });

  await ctx.reply(
    `💸 *DEMANDE DE RETRAIT*\n\n━━━━━━━━━━━━━━━━━━\n💰 Solde disponible : *${formatAmount(user.balance)}*\n\n🌍 Sélectionne ton pays :`,
    { parse_mode: 'Markdown', ...countriesKeyboard() }
  );
}

// ─── Sélection pays ───────────────────────────────────────────────────────────
export async function handleCountrySelect(ctx, countryCode) {
  const country = getCountry(countryCode);
  if (!country) return ctx.answerCbQuery('Pays invalide');

  const userId = ctx.from.id;
  const session = withdrawalSessions.get(userId) || {};
  session.country = countryCode;
  session.countryName = country.name;
  session.step = STEP.OPERATOR;
  withdrawalSessions.set(userId, session);

  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `💸 *RETRAIT — OPÉRATEUR*\n\n🌍 Pays : *${country.name}*\n\n📱 Sélectionne ton opérateur :`,
    { parse_mode: 'Markdown', ...operatorsKeyboard(country.operators, countryCode) }
  );
}

// ─── Sélection opérateur ──────────────────────────────────────────────────────
export async function handleOperatorSelect(ctx, countryCode, operator) {
  const userId = ctx.from.id;
  const session = withdrawalSessions.get(userId);
  if (!session) return ctx.answerCbQuery('Session expirée');

  session.operator = operator;
  session.step = STEP.PHONE;
  withdrawalSessions.set(userId, session);

  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `💸 *RETRAIT — NUMÉRO*\n\n🌍 Pays : *${session.countryName}*\n📱 Opérateur : *${operator}*\n\n📞 Envoie ton numéro Mobile Money :`,
    { parse_mode: 'Markdown' }
  );
}

// ─── Retour à la sélection pays ───────────────────────────────────────────────
export async function handleBackToCountries(ctx) {
  const userId = ctx.from.id;
  const session = withdrawalSessions.get(userId) || {};
  session.step = STEP.COUNTRY;
  withdrawalSessions.set(userId, session);
  await ctx.answerCbQuery();
  await ctx.editMessageText('🌍 Sélectionne ton pays :', {
    parse_mode: 'Markdown',
    ...countriesKeyboard(),
  });
}

// ─── Annuler le retrait ────────────────────────────────────────────────────────
export async function handleCancelWithdrawal(ctx) {
  withdrawalSessions.delete(ctx.from?.id);
  await ctx.answerCbQuery('Retrait annulé').catch(() => {});
  await ctx.reply('❌ Retrait annulé.', mainKeyboard).catch(() => {});
}

// ─── Confirmer le retrait ──────────────────────────────────────────────────────
export async function handleConfirmWithdrawal(ctx) {
  const userId = ctx.from.id;
  const session = withdrawalSessions.get(userId);
  if (!session || session.step !== STEP.CONFIRM) {
    await ctx.answerCbQuery('Session expirée');
    return;
  }

  const user = ctx.dbUser;
  const minWithdraw = await getSetting('min_withdraw') || 800;

  if (user.balance < session.amount) {
    await ctx.answerCbQuery('Solde insuffisant');
    withdrawalSessions.delete(userId);
    return ctx.reply('❌ Solde insuffisant pour effectuer ce retrait.', mainKeyboard);
  }
  if (session.amount < minWithdraw) {
    await ctx.answerCbQuery('Montant trop faible');
    withdrawalSessions.delete(userId);
    return ctx.reply(`❌ Montant minimum : ${formatAmount(minWithdraw)}`, mainKeyboard);
  }

  try {
    const balBefore = user.balance;
    user.balance -= session.amount;
    user.totalWithdrawn += session.amount;
    await user.save();

    const wd = await Withdrawal.create({
      userId: user.telegramId,
      telegramId: user.telegramId,
      firstName: user.firstName,
      beneficiaryName: session.beneficiaryName || '',
      username: user.username,
      country: session.country,
      countryName: session.countryName,
      operator: session.operator,
      phone: session.phone,
      amount: session.amount,
    });

    await Transaction.create({
      userId: user.telegramId,
      type: 'withdrawal',
      amount: -session.amount,
      balanceBefore: balBefore,
      balanceAfter: user.balance,
      description: `Retrait ${session.operator}`,
      referenceId: wd._id.toString(),
    });

    withdrawalSessions.delete(userId);

    await ctx.answerCbQuery('✅ Demande envoyée !');
    await ctx.editMessageText(
      `⏳ *DEMANDE ENVOYÉE !*\n\n━━━━━━━━━━━━━━━━━━\n✅ Ta demande de retrait a été enregistrée.\n💰 Montant : *${formatAmount(session.amount)}*\n📱 Opérateur : *${session.operator}*\n\nL'admin la traitera bientôt.\n━━━━━━━━━━━━━━━━━━\n💰 Nouveau solde : *${formatAmount(user.balance)}*`,
      { parse_mode: 'Markdown' }
    );

    // Notifier les admins
    const notifText = `💸 *NOUVELLE DEMANDE DE RETRAIT*\n\n👤 ${user.firstName} ${user.lastName || ''}\n🆔 \`${user.telegramId}\`\n📛 ${user.username ? '@' + user.username : 'N/A'}\n\n🌍 Pays : ${session.countryName}\n📱 Opérateur : ${session.operator}\n📞 Numéro : \`${session.phone}\`\n💰 Montant : *${formatAmount(session.amount)}*\n🔖 ID : \`${wd._id}\``;

    await notifyAdmins(ctx.telegram, {
      text: notifText,
      extra: { reply_markup: withdrawalAdminKeyboard(wd._id).reply_markup },
    });

    // ─── Notification canal de retrait (demande en attente) ────────────────────
    const botInfo = await ctx.telegram.getMe();
    const botLink = `https://t.me/${botInfo.username}`;
    const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const pendingCaption =
      `⏳ *RETRAIT EN COURS*\n\n` +
      `🔍 Statut : *En attente* ⏳\n` +
      `👤 Bénéficiaire : *${maskName(session.beneficiaryName || user.firstName)}*\n` +
      `💰 Montant : *${formatAmount(session.amount)}*\n` +
      `📱 Opérateur : *${session.operator}*\n` +
      `📞 Numéro : \`${maskPhone(session.phone)}\`\n` +
      `📅 Date : ${now}\n\n` +
      `💬 _Toi aussi tu peux gagner !_\n` +
      `👉 Lien bot`;

    await notifyWithdrawalChannelPhoto(
      ctx.telegram,
      { source: createReadStream(LOGO_PATH) },
      pendingCaption,
      { reply_markup: { inline_keyboard: [[{ text: '🤖 Rejoindre NeoCash', url: botLink }]] } }
    );

    logger.info('Withdrawal created', { userId, amount: session.amount, wdId: wd._id });
  } catch (err) {
    logger.error('handleConfirmWithdrawal error', { err: err.message });
    await ctx.reply('❌ Erreur lors du traitement. Contacte le support.', mainKeyboard);
  }
}

// ─── Traitement des messages texte dans le flux retrait ────────────────────────
export async function handleWithdrawalTextInput(ctx) {
  const userId = ctx.from.id;
  const session = withdrawalSessions.get(userId);
  if (!session) {
    // Detect if user seems to be in a flow (sends a number or phone-like text)
    const text = ctx.message?.text?.trim() || '';
    const looksLikePhone = /^\+?[\d\s\-]{7,15}$/.test(text);
    const looksLikeAmount = /^\d{3,7}$/.test(text.replace(/\s/g, ''));
    if (looksLikePhone || looksLikeAmount) {
      await ctx.reply(
        `⚠️ *Session expirée*\n\nTon retrait a été interrompu (le bot a redémarré).\n\nClique sur *💸 Retrait* pour recommencer.`,
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
      return true;
    }
    return false;
  }

  const text = ctx.message.text.trim();

  if (session.step === STEP.PHONE) {
    // Validation numéro de téléphone
    const phoneClean = text.replace(/[\s\-\.]/g, '');
    if (!/^\+?[\d]{8,15}$/.test(phoneClean)) {
      await ctx.reply('⚠️ Numéro invalide. Envoie un numéro valide (ex: +22890123456) :');
      return true;
    }
    session.phone = phoneClean;
    session.step = STEP.BENEFICIARY_NAME;
    withdrawalSessions.set(userId, session);

    await ctx.reply(
      `💸 *RETRAIT — NOM DU BÉNÉFICIAIRE*\n\n📞 Numéro : \`${phoneClean}\`\n\n👤 Entre le *nom complet* du titulaire du compte Mobile Money :`,
      { parse_mode: 'Markdown' }
    );
    return true;
  }

  if (session.step === STEP.BENEFICIARY_NAME) {
    if (text.length < 2 || text.length > 60) {
      await ctx.reply('⚠️ Nom invalide. Entre un nom entre 2 et 60 caractères :');
      return true;
    }
    session.beneficiaryName = text;
    session.step = STEP.AMOUNT;
    withdrawalSessions.set(userId, session);

    const minWithdraw = await getSetting('min_withdraw') || 800;
    await ctx.reply(
      `💸 *RETRAIT — MONTANT*\n\n📞 Numéro : \`${session.phone}\`\n👤 Bénéficiaire : *${text}*\n\n💰 Combien veux-tu retirer ?\n⚠️ Minimum : *${formatAmount(minWithdraw)}*\n💵 Disponible : *${formatAmount(ctx.dbUser.balance)}*`,
      { parse_mode: 'Markdown' }
    );
    return true;
  }

  if (session.step === STEP.AMOUNT) {
    const amount = parseInt(text.replace(/\s/g, ''), 10);
    const user = ctx.dbUser;
    const minWithdraw = await getSetting('min_withdraw') || 800;

    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('⚠️ Montant invalide. Entre un nombre entier positif :');
      return true;
    }
    if (amount < minWithdraw) {
      await ctx.reply(`⚠️ Montant minimum : *${formatAmount(minWithdraw)}*\n\nEntre un montant valide :`, { parse_mode: 'Markdown' });
      return true;
    }
    if (amount > user.balance) {
      await ctx.reply(`⚠️ Solde insuffisant !\n\n💵 Disponible : *${formatAmount(user.balance)}*`, { parse_mode: 'Markdown' });
      return true;
    }

    session.amount = amount;
    session.step = STEP.CONFIRM;
    withdrawalSessions.set(userId, session);

    await ctx.reply(withdrawSummaryMessage(session), {
      parse_mode: 'Markdown',
      ...confirmWithdrawKeyboard,
    });
    return true;
  }

  return false;
}

// ─── Admin: Valider un retrait ─────────────────────────────────────────────────
export async function adminApproveWithdrawal(ctx, withdrawalId) {
  try {
    const wd = await Withdrawal.findById(withdrawalId);
    if (!wd) return ctx.answerCbQuery('Retrait introuvable');
    if (wd.status !== 'pending') return ctx.answerCbQuery('Déjà traité');

    wd.status = 'approved';
    wd.processedAt = new Date();
    wd.processedBy = ctx.from.id;
    await wd.save();

    await ctx.answerCbQuery('✅ Validé !');
    await ctx.editMessageText(
      ctx.callbackQuery.message.text + '\n\n✅ *VALIDÉ PAR ADMIN*',
      { parse_mode: 'Markdown' }
    ).catch(() => {});

    await notifyUser(
      ctx.telegram,
      wd.telegramId,
      `✅ *RETRAIT APPROUVÉ !*\n\n━━━━━━━━━━━━━━━━━━\n💰 Montant : *${formatAmount(wd.amount)}*\n📱 Opérateur : *${wd.operator}*\n📞 Numéro : \`${wd.phone}\`\n\n🎉 Ton paiement a été effectué !`,
    );

    // ─── Notification canal de retrait (paiement effectué) ─────────────────────
    try {
      const botInfo = await ctx.telegram.getMe();
      const botLink = `https://t.me/${botInfo.username}`;
      const now = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });

      const approvedCaption =
        `✅ *PAIEMENT EFFECTUÉ*\n\n` +
        `🔍 Statut : Payé ✅\n` +
        `👤 Bénéficiaire : *${maskName(wd.beneficiaryName || wd.firstName)}*\n` +
        `💰 Montant : *${formatAmount(wd.amount)}*\n` +
        `📱 Opérateur : *${wd.operator}*\n` +
        `📞 Numéro : \`${maskPhone(wd.phone)}\`\n` +
        `📅 Date : ${now}\n\n` +
        `💬 _Toi aussi tu peux gagner !_\n` +
        `👉 Lien bot`;

      await notifyWithdrawalChannelPhoto(
        ctx.telegram,
        { source: createReadStream(LOGO_PATH) },
        approvedCaption,
        { reply_markup: { inline_keyboard: [[{ text: '🤖 Rejoindre NeoCash', url: botLink }]] } }
      );
    } catch (channelErr) {
      logger.warn('Canal retrait notif failed', { err: channelErr.message });
    }
  } catch (err) {
    logger.error('adminApproveWithdrawal error', { err: err.message });
    ctx.answerCbQuery('Erreur').catch(() => {});
  }
}

// ─── Admin: Refuser un retrait ─────────────────────────────────────────────────
export async function adminRejectWithdrawal(ctx, withdrawalId) {
  try {
    const wd = await Withdrawal.findById(withdrawalId);
    if (!wd) return ctx.answerCbQuery('Retrait introuvable');
    if (wd.status !== 'pending') return ctx.answerCbQuery('Déjà traité');

    // Rembourser l'utilisateur
    const User = (await import('../models/User.js')).default;
    const user = await User.findOne({ telegramId: wd.telegramId });
    if (user) {
      user.balance += wd.amount;
      user.totalWithdrawn -= wd.amount;
      await user.save();
    }

    wd.status = 'rejected';
    wd.processedAt = new Date();
    wd.processedBy = ctx.from.id;
    await wd.save();

    await ctx.answerCbQuery('❌ Refusé');
    await ctx.editMessageText(
      ctx.callbackQuery.message.text + '\n\n❌ *REFUSÉ PAR ADMIN*',
      { parse_mode: 'Markdown' }
    ).catch(() => {});

    await notifyUser(
      ctx.telegram,
      wd.telegramId,
      `❌ *RETRAIT REFUSÉ*\n\n━━━━━━━━━━━━━━━━━━\n💰 Montant : *${formatAmount(wd.amount)}*\n\n🔄 Ton solde a été remboursé.\nContacte le support si tu as des questions.`,
    );
  } catch (err) {
    logger.error('adminRejectWithdrawal error', { err: err.message });
    ctx.answerCbQuery('Erreur').catch(() => {});
  }
}
