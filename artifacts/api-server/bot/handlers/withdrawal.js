/**
 * Handler — Retrait Multi-étapes
 * Flow: pays → opérateur → numéro → bénéficiaire → montant → confirmation
 */
import Withdrawal from '../models/Withdrawal.js';
import Transaction from '../models/Transaction.js';
import { getSetting } from '../models/Settings.js';
import { getCountry, getOperators } from '../utils/countries.js';
import { withdrawSummaryMessage, formatAmount, escapeMarkdown } from '../utils/messages.js';
import {
  countriesKeyboard,
  operatorsKeyboard,
  confirmWithdrawKeyboard,
  withdrawalAdminKeyboard,
  getMainKeyboard,
} from '../utils/keyboards.js';
import { createReadStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { notifyAdmins, notifyUser, notifyWithdrawalChannel, notifyWithdrawalChannelPhoto } from '../utils/notify.js';
import { getLang, t } from '../utils/i18n.js';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = join(__dirname, '../assets/logo.png');

function maskPhone(phone) {
  const clean = phone.replace(/\s/g, '');
  if (clean.length < 4) return clean;
  let countryCode = '';
  let local = clean;
  if (clean.startsWith('+')) {
    const m = clean.match(/^(\+\d{1,3})(\d+)$/);
    if (m) { countryCode = m[1]; local = m[2]; }
  }
  const start = local.slice(0, 2);
  const end   = local.slice(-2);
  const hidden = local.length > 4 ? 'X'.repeat(local.length - 4) : '';
  const masked = start + hidden + end;
  const groups = masked.match(/.{1,2}/g) || [masked];
  const localPart = groups.join(' ');
  return countryCode ? `${countryCode} ${localPart}` : localPart;
}

function maskName(name) {
  if (!name) return '···';
  const trimmed = name.trim();
  if (trimmed.length <= 1) return trimmed + '·';
  if (trimmed.length === 2) return trimmed[0] + '·';
  if (trimmed.length === 3) return trimmed[0] + '··';
  return trimmed[0] + '···' + trimmed.slice(-2);
}

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
  const lang = getLang(ctx);

  const minWithdraw = await getSetting('min_withdraw') || 800;
  const SEP = '━━━━━━━━━━━━━━━━━━';

  const canWithdraw = user.referralCount >= MIN_REFERRALS_TO_WITHDRAW || user.withdrawalUnlocked;
  if (!canWithdraw) {
    return ctx.reply(
      t(lang, 'withdrawal_locked_title') + '\n\n' + SEP + '\n' +
      t(lang, 'withdrawal_locked_text', MIN_REFERRALS_TO_WITHDRAW) + '\n\n' +
      t(lang, 'withdrawal_referral_count', user.referralCount, MIN_REFERRALS_TO_WITHDRAW) + '\n' +
      SEP + '\n\n' +
      t(lang, 'withdrawal_locked_cta'),
      { parse_mode: 'Markdown' }
    );
  }

  if (user.balance < minWithdraw) {
    return ctx.reply(
      t(lang, 'withdrawal_insufficient_title') + '\n\n' + SEP + '\n' +
      t(lang, 'withdrawal_insufficient_balance', formatAmount(user.balance)) + '\n' +
      t(lang, 'withdrawal_min_required', formatAmount(minWithdraw)) + '\n' +
      SEP + '\n\n' +
      t(lang, 'withdrawal_invite_tip'),
      { parse_mode: 'Markdown' }
    );
  }

  withdrawalSessions.set(user.telegramId, { step: STEP.COUNTRY, lang });

  await ctx.reply(
    t(lang, 'withdrawal_start_title') + '\n\n' + SEP + '\n' +
    t(lang, 'withdrawal_available', formatAmount(user.balance)) + '\n\n' +
    t(lang, 'withdrawal_select_country'),
    { parse_mode: 'Markdown', ...countriesKeyboard(lang) }
  );
}

// ─── Sélection pays ───────────────────────────────────────────────────────────
export async function handleCountrySelect(ctx, countryCode) {
  const country = getCountry(countryCode);
  if (!country) return ctx.answerCbQuery('Invalid country');
  const lang = getLang(ctx);

  const userId = ctx.from.id;
  const session = withdrawalSessions.get(userId) || {};
  session.country = countryCode;
  session.countryName = country.name;
  session.step = STEP.OPERATOR;
  session.lang = lang;
  withdrawalSessions.set(userId, session);

  await ctx.answerCbQuery();
  await ctx.editMessageText(
    t(lang, 'withdrawal_operator_title') + '\n\n' +
    t(lang, 'withdrawal_country_label', country.name) + '\n\n' +
    t(lang, 'withdrawal_select_operator'),
    { parse_mode: 'Markdown', ...operatorsKeyboard(country.operators, countryCode, lang) }
  );
}

// ─── Sélection opérateur ──────────────────────────────────────────────────────
export async function handleOperatorSelect(ctx, countryCode, operator) {
  const userId = ctx.from.id;
  const session = withdrawalSessions.get(userId);
  const lang = getLang(ctx);
  if (!session) return ctx.answerCbQuery('Session expired');

  session.operator = operator;
  session.step = STEP.PHONE;
  session.lang = lang;
  withdrawalSessions.set(userId, session);

  await ctx.answerCbQuery();
  await ctx.editMessageText(
    t(lang, 'withdrawal_phone_title') + '\n\n' +
    t(lang, 'withdrawal_country_label', session.countryName) + '\n' +
    t(lang, 'withdrawal_operator_label', operator) + '\n\n' +
    t(lang, 'withdrawal_send_phone'),
    { parse_mode: 'Markdown' }
  );
}

// ─── Retour à la sélection pays ───────────────────────────────────────────────
export async function handleBackToCountries(ctx) {
  const userId = ctx.from.id;
  const session = withdrawalSessions.get(userId) || {};
  const lang = getLang(ctx);
  session.step = STEP.COUNTRY;
  withdrawalSessions.set(userId, session);
  await ctx.answerCbQuery();
  await ctx.editMessageText(t(lang, 'withdrawal_back_to_countries'), {
    parse_mode: 'Markdown',
    ...countriesKeyboard(lang),
  });
}

// ─── Annuler le retrait ────────────────────────────────────────────────────────
export async function handleCancelWithdrawal(ctx) {
  const lang = getLang(ctx);
  withdrawalSessions.delete(ctx.from?.id);
  await ctx.answerCbQuery(t(lang, 'withdrawal_cancelled')).catch(() => {});
  await ctx.reply(t(lang, 'withdrawal_cancelled'), getMainKeyboard(lang)).catch(() => {});
}

// ─── Confirmer le retrait ──────────────────────────────────────────────────────
export async function handleConfirmWithdrawal(ctx) {
  const userId = ctx.from.id;
  const session = withdrawalSessions.get(userId);
  const lang = getLang(ctx);

  if (!session || session.step !== STEP.CONFIRM) {
    await ctx.answerCbQuery('Session expired');
    return;
  }

  const user = ctx.dbUser;
  const minWithdraw = await getSetting('min_withdraw') || 800;

  if (user.balance < session.amount) {
    await ctx.answerCbQuery(t(lang, 'withdrawal_insufficient_confirm'));
    withdrawalSessions.delete(userId);
    return ctx.reply(t(lang, 'withdrawal_insufficient_confirm'), getMainKeyboard(lang));
  }
  if (session.amount < minWithdraw) {
    await ctx.answerCbQuery('Amount too low');
    withdrawalSessions.delete(userId);
    return ctx.reply(`❌ Min: ${formatAmount(minWithdraw)}`, getMainKeyboard(lang));
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
      description: `Withdrawal ${session.operator}`,
      referenceId: wd._id.toString(),
    });

    withdrawalSessions.delete(userId);

    await ctx.answerCbQuery('✅');
    const SEP = '━━━━━━━━━━━━━━━━━━';
    await ctx.editMessageText(
      t(lang, 'withdrawal_sent_title') + '\n\n' + SEP + '\n' +
      t(lang, 'withdrawal_sent_text') + '\n' +
      t(lang, 'withdrawal_summary_amount', formatAmount(session.amount)) + '\n' +
      t(lang, 'withdrawal_operator_label', escapeMarkdown(session.operator)) + '\n\n' +
      t(lang, 'withdrawal_sent_admin') + '\n' +
      SEP + '\n' +
      t(lang, 'withdrawal_new_balance', formatAmount(user.balance)),
      { parse_mode: 'Markdown' }
    );

    logger.info('Withdrawal created', { userId, amount: session.amount, wdId: wd._id });

    setImmediate(async () => {
      try {
        const notifText =
          `💸 *NOUVELLE DEMANDE DE RETRAIT*\n\n` +
          `👤 ${escapeMarkdown(user.firstName)} ${escapeMarkdown(user.lastName || '')}\n` +
          `🆔 \`${user.telegramId}\`\n` +
          `📛 ${user.username ? '@' + escapeMarkdown(user.username) : 'N/A'}\n\n` +
          `🌍 Pays : ${escapeMarkdown(session.countryName)}\n` +
          `📱 Opérateur : ${escapeMarkdown(session.operator)}\n` +
          `📞 Numéro : \`${session.phone}\`\n` +
          `💰 Montant : *${formatAmount(session.amount)}*\n` +
          `🆔 ID : \`${wd._id}\``;
        await notifyAdmins(ctx.telegram, {
          text: notifText,
          extra: { reply_markup: withdrawalAdminKeyboard(wd._id).reply_markup },
        });
      } catch (err) {
        logger.error('Erreur notif admin', { err: err.message });
      }

      try {
        const botInfo = await ctx.telegram.getMe();
        const botLink = `https://t.me/${botInfo.username}`;
        const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const caption =
          `✅ *PAIEMENT EFFECTUÉ*\n\n` +
          `🔍 Statut : Payé ✅\n` +
          `👤 Bénéficiaire : *${escapeMarkdown(maskName(session.beneficiaryName || user.firstName))}*\n` +
          `💰 Montant : *${formatAmount(session.amount)}*\n` +
          `📱 Opérateur : *${escapeMarkdown(session.operator)}*\n` +
          `📞 Numéro : \`${maskPhone(session.phone)}\`\n` +
          `📅 Date : ${now}\n\n` +
          `💬 _Toi aussi tu peux gagner !_\n` +
          `👉 Lien bot`;
        await notifyWithdrawalChannelPhoto(
          ctx.telegram,
          { source: createReadStream(LOGO_PATH) },
          caption,
          { reply_markup: { inline_keyboard: [[{ text: '🤖 Rejoindre NeoCash', url: botLink }]] } }
        );
      } catch (err) {
        logger.error('Erreur notif canal retrait', { err: err.message });
      }
    });

  } catch (err) {
    logger.error('handleConfirmWithdrawal error', { err: err.message });
    await ctx.reply(t(lang, 'withdrawal_error'), getMainKeyboard(lang));
  }
}

// ─── Traitement des messages texte dans le flux retrait ────────────────────────
export async function handleWithdrawalTextInput(ctx) {
  const userId = ctx.from.id;
  const session = withdrawalSessions.get(userId);
  const lang = getLang(ctx);

  if (!session) {
    const text = ctx.message?.text?.trim() || '';
    const looksLikePhone = /^\+?[\d\s\-]{7,15}$/.test(text);
    const looksLikeAmount = /^\d{3,7}$/.test(text.replace(/\s/g, ''));
    if (looksLikePhone || looksLikeAmount) {
      await ctx.reply(t(lang, 'withdrawal_session_expired'), {
        parse_mode: 'Markdown',
        ...getMainKeyboard(lang),
      });
      return true;
    }
    return false;
  }

  const text = ctx.message.text.trim();

  if (session.step === STEP.PHONE) {
    const phoneClean = text.replace(/[\s\-\.]/g, '');
    if (!/^\+?[\d]{8,15}$/.test(phoneClean)) {
      await ctx.reply(t(lang, 'withdrawal_invalid_phone'));
      return true;
    }
    session.phone = phoneClean;
    session.step = STEP.BENEFICIARY_NAME;
    withdrawalSessions.set(userId, session);

    const SEP = '━━━━━━━━━━━━━━━━━━';
    await ctx.reply(
      t(lang, 'withdrawal_name_title') + '\n\n' +
      t(lang, 'withdrawal_phone_label', phoneClean) + '\n\n' +
      t(lang, 'withdrawal_enter_name'),
      { parse_mode: 'Markdown' }
    );
    return true;
  }

  if (session.step === STEP.BENEFICIARY_NAME) {
    if (text.length < 2 || text.length > 60) {
      await ctx.reply(t(lang, 'withdrawal_invalid_name'));
      return true;
    }
    session.beneficiaryName = text;
    session.step = STEP.AMOUNT;
    withdrawalSessions.set(userId, session);

    const minWithdraw = await getSetting('min_withdraw') || 800;
    const SEP = '━━━━━━━━━━━━━━━━━━';
    await ctx.reply(
      t(lang, 'withdrawal_amount_title') + '\n\n' +
      t(lang, 'withdrawal_phone_label', session.phone) + '\n' +
      t(lang, 'withdrawal_beneficiary_label', text) + '\n\n' +
      t(lang, 'withdrawal_ask_amount') + '\n' +
      t(lang, 'withdrawal_min_notice', formatAmount(minWithdraw)) + '\n' +
      t(lang, 'withdrawal_available2', formatAmount(ctx.dbUser.balance)),
      { parse_mode: 'Markdown' }
    );
    return true;
  }

  if (session.step === STEP.AMOUNT) {
    const amount = parseInt(text.replace(/\s/g, ''), 10);
    const user = ctx.dbUser;
    const minWithdraw = await getSetting('min_withdraw') || 800;

    if (isNaN(amount) || amount <= 0) {
      await ctx.reply(t(lang, 'withdrawal_invalid_amount'));
      return true;
    }
    if (amount < minWithdraw) {
      await ctx.reply(t(lang, 'withdrawal_below_min', formatAmount(minWithdraw)), { parse_mode: 'Markdown' });
      return true;
    }
    if (amount > user.balance) {
      await ctx.reply(t(lang, 'withdrawal_exceed_balance', formatAmount(user.balance)), { parse_mode: 'Markdown' });
      return true;
    }

    session.amount = amount;
    session.step = STEP.CONFIRM;
    withdrawalSessions.set(userId, session);

    await ctx.reply(withdrawSummaryMessage(session, lang), {
      parse_mode: 'Markdown',
      ...confirmWithdrawKeyboard(lang),
    });
    return true;
  }

  return false;
}

// ─── Admin: Valider un retrait ─────────────────────────────────────────────────
export async function adminApproveWithdrawal(ctx, withdrawalId) {
  try {
    const wd = await Withdrawal.findById(withdrawalId);
    if (!wd) return ctx.answerCbQuery('Not found');
    if (wd.status !== 'pending') return ctx.answerCbQuery('Already processed');

    wd.status = 'approved';
    wd.processedAt = new Date();
    wd.processedBy = ctx.from.id;
    await wd.save();

    await ctx.answerCbQuery('✅ Validé !');
    await ctx.editMessageText(
      ctx.callbackQuery.message.text + '\n\n✅ *VALIDÉ PAR ADMIN*',
      { parse_mode: 'Markdown' }
    ).catch(() => {});

    // Notifier l'utilisateur dans sa langue
    const User = (await import('../models/User.js')).default;
    const user = await User.findOne({ telegramId: wd.telegramId });
    const userLang = user?.language || 'fr';

    await notifyUser(
      ctx.telegram,
      wd.telegramId,
      t(userLang, 'withdrawal_approved_notif', formatAmount(wd.amount), wd.operator, wd.phone),
    );

    try {
      const botInfo = await ctx.telegram.getMe();
      const botLink = `https://t.me/${botInfo.username}`;
      const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const approvedCaption =
        `✅ *PAIEMENT EFFECTUÉ*\n\n` +
        `🔍 Statut : Payé ✅\n` +
        `👤 Bénéficiaire : *${escapeMarkdown(maskName(wd.beneficiaryName || wd.firstName))}*\n` +
        `💰 Montant : *${formatAmount(wd.amount)}*\n` +
        `📱 Opérateur : *${escapeMarkdown(wd.operator)}*\n` +
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
    if (!wd) return ctx.answerCbQuery('Not found');
    if (wd.status !== 'pending') return ctx.answerCbQuery('Already processed');

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

    const userLang = user?.language || 'fr';
    await notifyUser(
      ctx.telegram,
      wd.telegramId,
      t(userLang, 'withdrawal_rejected_notif', formatAmount(wd.amount)),
    );
  } catch (err) {
    logger.error('adminRejectWithdrawal error', { err: err.message });
    ctx.answerCbQuery('Erreur').catch(() => {});
  }
}
