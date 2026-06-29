/**
 * Handler — Retrait Crypto Multi-étapes
 * Flux : crypto → wallet → réseau → montant → vérification éligibilité → conversion → confirmation
 */
import Withdrawal from '../models/Withdrawal.js';
import Crypto from '../models/Crypto.js';
import Transaction from '../models/Transaction.js';
import { getSetting } from '../models/Settings.js';
import { convertUsdtToCrypto } from '../utils/cryptoPrice.js';
import { withdrawSummaryMessage, formatAmount, formatCryptoAmount, escapeMarkdown } from '../utils/messages.js';
import {
  cryptoSelectionKeyboard,
  networkSelectionKeyboard,
  confirmWithdrawKeyboard,
  withdrawalAdminKeyboard,
  getMainKeyboard,
} from '../utils/keyboards.js';
import { Markup } from 'telegraf';
import { createReadStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { notifyAdmins, notifyUser, notifyWithdrawalChannelPhoto } from '../utils/notify.js';
import { getLang, t } from '../utils/i18n.js';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = join(__dirname, '../assets/logo.png');
const BANNER_PATH = join(__dirname, '../assets/banner.png');

function maskWallet(addr) {
  if (!addr || addr.length < 8) return addr || '—';
  return addr.slice(0, 6) + '···' + addr.slice(-6);
}

function cancelKeyboard(lang) {
  return Markup.inlineKeyboard([[Markup.button.callback(t(lang, 'withdrawal_cancel_btn'), 'cancel_withdrawal')]]);
}

const withdrawalSessions = new Map();

const STEP = {
  CRYPTO: 'crypto',
  WALLET: 'wallet',
  NETWORK: 'network',
  AMOUNT: 'amount',
  CONFIRM: 'confirm',
};

const MIN_REFERRALS = 15;

// ─── Démarrer le flux retrait — sélection crypto directe ──────────────────────
export async function handleWithdrawal(ctx) {
  const user = ctx.dbUser;
  if (!user) return;
  const lang = getLang(ctx);

  let cryptos = [];
  try {
    cryptos = await Crypto.findAll();
  } catch (err) {
    logger.error('handleWithdrawal: Crypto.findAll error', { err: err.message });
  }

  if (!cryptos.length) {
    return ctx.reply(t(lang, 'withdrawal_no_crypto'), { parse_mode: 'Markdown', ...getMainKeyboard(lang) });
  }

  withdrawalSessions.set(user.telegramId, { step: STEP.CRYPTO, lang });

  const SEP = '━━━━━━━━━━━━━━━━━━';
  await ctx.reply(
    t(lang, 'withdrawal_start_title') + '\n\n' +
    SEP + '\n' +
    t(lang, 'withdrawal_available', formatAmount(user.balance)) + '\n' +
    SEP + '\n\n' +
    t(lang, 'withdrawal_select_crypto'),
    { parse_mode: 'Markdown', ...cryptoSelectionKeyboard(cryptos, lang) }
  );
}

// ─── Sélection de la cryptomonnaie ────────────────────────────────────────────
export async function handleCryptoSelect(ctx, symbol) {
  await ctx.answerCbQuery().catch(() => {});
  const userId = ctx.from.id;
  const lang = getLang(ctx);

  let crypto;
  try { crypto = await Crypto.findBySymbol(symbol); } catch (err) {}

  if (!crypto) {
    return ctx.answerCbQuery('❌ Crypto non disponible').catch(() => {});
  }

  const session = withdrawalSessions.get(userId) || {};
  session.crypto = symbol;
  session.cryptoName = crypto.name;
  session.coingeckoId = crypto.coingeckoId;
  session.networks = crypto.networks || [];
  session.step = STEP.WALLET;
  withdrawalSessions.set(userId, session);

  const SEP = '━━━━━━━━━━━━━━━━━━';
  await ctx.editMessageText(
    t(lang, 'withdrawal_wallet_title') + '\n\n' +
    SEP + '\n' +
    t(lang, 'withdrawal_crypto_label', symbol) + '\n' +
    SEP + '\n\n' +
    t(lang, 'withdrawal_enter_wallet', symbol),
    { parse_mode: 'Markdown', ...cancelKeyboard(lang) }
  ).catch(async () => {
    await ctx.reply(
      t(lang, 'withdrawal_wallet_title') + '\n\n' + t(lang, 'withdrawal_enter_wallet', symbol),
      { parse_mode: 'Markdown', ...cancelKeyboard(lang) }
    );
  });
}

// ─── Sélection du réseau ──────────────────────────────────────────────────────
export async function handleNetworkSelect(ctx, symbol, network) {
  await ctx.answerCbQuery().catch(() => {});
  const userId = ctx.from.id;
  const lang = getLang(ctx);
  const session = withdrawalSessions.get(userId);
  if (!session) return ctx.answerCbQuery('Session expirée').catch(() => {});

  session.network = network;
  session.step = STEP.AMOUNT;
  withdrawalSessions.set(userId, session);

  const minWithdraw = Number(await getSetting('min_withdraw') || 15);
  const SEP = '━━━━━━━━━━━━━━━━━━';
  await ctx.editMessageText(
    t(lang, 'withdrawal_amount_title') + '\n\n' +
    SEP + '\n' +
    t(lang, 'withdrawal_crypto_label', session.crypto) + '\n' +
    t(lang, 'withdrawal_network_label', network) + '\n' +
    t(lang, 'withdrawal_wallet_label', maskWallet(session.wallet)) + '\n' +
    SEP + '\n\n' +
    t(lang, 'withdrawal_ask_amount') + '\n' +
    t(lang, 'withdrawal_min_notice', formatAmount(minWithdraw)) + '\n' +
    t(lang, 'withdrawal_available2', formatAmount(ctx.dbUser.balance)),
    { parse_mode: 'Markdown', ...cancelKeyboard(lang) }
  ).catch(async () => {
    await ctx.reply(
      t(lang, 'withdrawal_amount_title') + '\n\n' + t(lang, 'withdrawal_ask_amount') + '\n' +
      t(lang, 'withdrawal_min_notice', formatAmount(minWithdraw)),
      { parse_mode: 'Markdown' }
    );
  });
}

// ─── Annuler le retrait ────────────────────────────────────────────────────────
export async function handleCancelWithdrawal(ctx) {
  const lang = getLang(ctx);
  withdrawalSessions.delete(ctx.from?.id);
  await ctx.answerCbQuery(t(lang, 'withdrawal_cancelled')).catch(() => {});
  await ctx.reply(t(lang, 'withdrawal_cancelled'), { parse_mode: 'Markdown', ...getMainKeyboard(lang) }).catch(() => {});
}

// ─── Confirmer le retrait ──────────────────────────────────────────────────────
export async function handleConfirmWithdrawal(ctx) {
  const userId = ctx.from.id;
  const session = withdrawalSessions.get(userId);
  const lang = getLang(ctx);

  if (!session || session.step !== STEP.CONFIRM) {
    return ctx.answerCbQuery('Session expirée').catch(() => {});
  }

  const user = ctx.dbUser;

  if (Number(user.balance) < session.amount) {
    await ctx.answerCbQuery(t(lang, 'withdrawal_insufficient_confirm')).catch(() => {});
    withdrawalSessions.delete(userId);
    return ctx.reply(t(lang, 'withdrawal_insufficient_confirm'), { parse_mode: 'Markdown', ...getMainKeyboard(lang) });
  }

  try {
    const balBefore = Number(user.balance);
    user.balance = Number(user.balance) - session.amount;
    user.totalWithdrawn = Number(user.totalWithdrawn || 0) + session.amount;
    await user.save();

    const wd = await Withdrawal.create({
      userId: user.telegramId,
      telegramId: user.telegramId,
      firstName: user.firstName,
      username: user.username,
      amount: session.amount,
      crypto: session.crypto,
      walletAddress: session.wallet,
      network: session.network,
      conversionRate: session.rate || 1,
      cryptoAmount: session.cryptoAmount || null,
    });

    await Transaction.create({
      userId: user.telegramId,
      type: 'withdrawal',
      amount: -session.amount,
      balanceBefore: balBefore,
      balanceAfter: user.balance,
      description: `Withdrawal ${session.crypto} (${session.network})`,
      referenceId: wd._id.toString(),
    });

    withdrawalSessions.delete(userId);
    await ctx.answerCbQuery('✅').catch(() => {});

    const SEP = '━━━━━━━━━━━━━━━━━━';
    const convLine = session.cryptoAmount && session.crypto !== 'USDT'
      ? t(lang, 'withdrawal_conversion_line', formatCryptoAmount(session.cryptoAmount, session.crypto), session.crypto, session.rate) + '\n'
      : '';
    await ctx.editMessageText(
      t(lang, 'withdrawal_sent_title') + '\n\n' + SEP + '\n' +
      t(lang, 'withdrawal_sent_text') + '\n\n' +
      t(lang, 'withdrawal_summary_crypto', session.crypto) + '\n' +
      t(lang, 'withdrawal_summary_network', session.network) + '\n' +
      t(lang, 'withdrawal_summary_wallet', maskWallet(session.wallet)) + '\n' +
      t(lang, 'withdrawal_summary_amount', formatAmount(session.amount)) + '\n' +
      convLine + SEP + '\n' +
      t(lang, 'withdrawal_sent_admin') + '\n' +
      t(lang, 'withdrawal_new_balance', formatAmount(user.balance)),
      { parse_mode: 'Markdown' }
    ).catch(() => {});

    logger.info('Withdrawal created', { userId, amount: session.amount, crypto: session.crypto, wdId: wd._id });

    setImmediate(async () => {
      try {
        const notifText =
          `💸 *NOUVELLE DEMANDE DE RETRAIT*\n\n` +
          `👤 ${escapeMarkdown(user.firstName)} ${user.lastName ? escapeMarkdown(user.lastName) : ''}\n` +
          `🆔 \`${user.telegramId}\`\n` +
          `📛 ${user.username ? '@' + user.username : 'N/A'}\n\n` +
          `🪙 Crypto : *${session.crypto}* (${session.network})\n` +
          `👛 Wallet : \`${session.wallet}\`\n` +
          `💰 Montant : *${formatAmount(session.amount)}*\n` +
          (session.cryptoAmount && session.crypto !== 'USDT'
            ? `🔄 Équivalent : *${formatCryptoAmount(session.cryptoAmount, session.crypto)}*\n`
            : '') +
          `🆔 ID : \`${wd._id}\``;
        await notifyAdmins(ctx.telegram, {
          text: notifText,
          extra: { reply_markup: withdrawalAdminKeyboard(wd._id).reply_markup },
        });
      } catch (err) { logger.error('Erreur notif admin withdrawal', { err: err.message }); }

      try {
        const botInfo = await ctx.telegram.getMe();
        const botLink = `https://t.me/${botInfo.username}`;
        const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const caption =
          `⏳ *DEMANDE DE RETRAIT REÇUE*\n\n` +
          `🪙 Crypto : *${session.crypto}*\n` +
          `💰 Montant : *${formatAmount(session.amount)}*\n` +
          (session.cryptoAmount && session.crypto !== 'USDT'
            ? `🔄 Équivalent : *${formatCryptoAmount(session.cryptoAmount, session.crypto)}*\n`
            : '') +
          `📅 Date : ${now}\n\n` +
          `💬 _Toi aussi tu peux gagner !_`;
        await notifyWithdrawalChannelPhoto(
          ctx.telegram, { source: createReadStream(BANNER_PATH) }, caption,
          { reply_markup: { inline_keyboard: [[{ text: '🚀 Rejoindre Moon Crypto', url: botLink }]] } }
        );
      } catch (err) { logger.error('Erreur notif canal retrait', { err: err.message }); }
    });

  } catch (err) {
    logger.error('handleConfirmWithdrawal error', { err: err.message });
    await ctx.reply(t(lang, 'withdrawal_error'), { parse_mode: 'Markdown', ...getMainKeyboard(lang) });
  }
}

// ─── Traitement des messages texte dans le flux retrait ────────────────────────
export async function handleWithdrawalTextInput(ctx) {
  const userId = ctx.from.id;
  const session = withdrawalSessions.get(userId);
  const lang = getLang(ctx);

  if (!session) return false;

  const text = ctx.message?.text?.trim();
  if (!text) return false;

  // ── Étape wallet ──────────────────────────────────────────────────────────────
  if (session.step === STEP.WALLET) {
    if (text.length < 10 || text.length > 150) {
      await ctx.reply(t(lang, 'withdrawal_invalid_wallet'));
      return true;
    }
    session.wallet = text;
    withdrawalSessions.set(userId, session);

    // Si un seul réseau → sélection automatique
    if (session.networks && session.networks.length === 1) {
      session.network = session.networks[0];
      session.step = STEP.AMOUNT;
      withdrawalSessions.set(userId, session);
      const minWithdraw = Number(await getSetting('min_withdraw') || 15);
      await ctx.reply(
        t(lang, 'withdrawal_amount_title') + '\n\n' +
        t(lang, 'withdrawal_crypto_label', session.crypto) + '\n' +
        t(lang, 'withdrawal_network_label', session.network) + '\n' +
        t(lang, 'withdrawal_wallet_label', maskWallet(text)) + '\n\n' +
        t(lang, 'withdrawal_ask_amount') + '\n' +
        t(lang, 'withdrawal_min_notice', formatAmount(minWithdraw)) + '\n' +
        t(lang, 'withdrawal_available2', formatAmount(ctx.dbUser.balance)),
        { parse_mode: 'Markdown' }
      );
      return true;
    }

    session.step = STEP.NETWORK;
    withdrawalSessions.set(userId, session);
    await ctx.reply(
      t(lang, 'withdrawal_network_title') + '\n\n' +
      t(lang, 'withdrawal_crypto_label', session.crypto) + '\n' +
      t(lang, 'withdrawal_wallet_label', maskWallet(text)) + '\n\n' +
      t(lang, 'withdrawal_select_network'),
      { parse_mode: 'Markdown', ...networkSelectionKeyboard(session.networks, session.crypto, lang) }
    );
    return true;
  }

  // ── Étape montant ─────────────────────────────────────────────────────────────
  if (session.step === STEP.AMOUNT) {
    const amount = parseFloat(text.replace(/,/g, '.').replace(/\s/g, ''));
    const user = ctx.dbUser;
    const minWithdraw = Number(await getSetting('min_withdraw') || 15);

    if (isNaN(amount) || amount <= 0) {
      await ctx.reply(t(lang, 'withdrawal_invalid_amount'));
      return true;
    }
    if (amount < minWithdraw) {
      await ctx.reply(t(lang, 'withdrawal_below_min', formatAmount(minWithdraw)), { parse_mode: 'Markdown' });
      return true;
    }
    if (amount > Number(user.balance)) {
      await ctx.reply(t(lang, 'withdrawal_exceed_balance', formatAmount(user.balance)), { parse_mode: 'Markdown' });
      return true;
    }

    // ── Vérification conditions d'éligibilité (APRÈS la saisie) ──────────────
    const canWithdraw = user.referralCount >= MIN_REFERRALS || user.withdrawalUnlocked;
    if (!canWithdraw) {
      withdrawalSessions.delete(userId);
      const SEP = '━━━━━━━━━━━━━━━━━━';
      await ctx.reply(
        t(lang, 'withdrawal_locked_title') + '\n\n' + SEP + '\n' +
        t(lang, 'withdrawal_locked_text', MIN_REFERRALS) + '\n\n' +
        t(lang, 'withdrawal_referral_count', user.referralCount, MIN_REFERRALS) + '\n' +
        SEP + '\n\n' +
        t(lang, 'withdrawal_locked_cta'),
        { parse_mode: 'Markdown', ...getMainKeyboard(lang) }
      );
      return true;
    }

    session.amount = amount;

    // ── Conversion en temps réel ──────────────────────────────────────────────
    if (session.crypto !== 'USDT') {
      try {
        const result = await convertUsdtToCrypto(amount, session.crypto, session.coingeckoId);
        session.cryptoAmount = result.cryptoAmount;
        session.rate = result.rate;
      } catch (err) {
        logger.warn('Conversion rate fetch failed', { err: err.message });
        await ctx.reply(t(lang, 'withdrawal_rate_error'), { parse_mode: 'Markdown' });
        return true;
      }
    }

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
    await ctx.editMessageText(ctx.callbackQuery.message.text + '\n\n✅ *VALIDÉ PAR ADMIN*', { parse_mode: 'Markdown' }).catch(() => {});

    const User = (await import('../models/User.js')).default;
    const user = await User.findOne({ telegramId: wd.telegramId });
    const userLang = user?.language || 'fr';
    const cryptoInfo = wd.walletAddress
      ? `${wd.crypto || 'USDT'}${wd.network ? ' (' + wd.network + ')' : ''}`
      : (wd.operator || '');
    const walletInfo = wd.walletAddress || wd.phone || '';
    const cryptoLine = wd.cryptoAmount && wd.crypto !== 'USDT'
      ? ` → *${formatCryptoAmount(wd.cryptoAmount, wd.crypto)}*`
      : '';
    await notifyUser(ctx.telegram, wd.telegramId,
      t(userLang, 'withdrawal_approved_notif', formatAmount(wd.amount), cryptoInfo, walletInfo, cryptoLine)
    );

    try {
      const botInfo = await ctx.telegram.getMe();
      const botLink = `https://t.me/${botInfo.username}`;
      const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const caption =
        `✅ *PAIEMENT EFFECTUÉ*\n\n` +
        `🔍 Statut : Payé ✅\n` +
        `🪙 Crypto : *${wd.crypto || 'USDT'}*\n` +
        `💰 Montant : *${formatAmount(wd.amount)}*\n` +
        (wd.cryptoAmount && wd.crypto !== 'USDT'
          ? `🔄 Reçu : *${formatCryptoAmount(wd.cryptoAmount, wd.crypto)}*\n`
          : '') +
        `📅 Date : ${now}\n\n💬 _Toi aussi tu peux gagner !_`;
      await notifyWithdrawalChannelPhoto(ctx.telegram, { source: createReadStream(BANNER_PATH) }, caption,
        { reply_markup: { inline_keyboard: [[{ text: '🚀 Rejoindre Moon Crypto', url: botLink }]] } }
      );
    } catch (err) { logger.warn('Canal retrait notif failed', { err: err.message }); }
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
      user.balance = Number(user.balance) + Number(wd.amount);
      user.totalWithdrawn = Math.max(0, Number(user.totalWithdrawn || 0) - Number(wd.amount));
      await user.save();
    }

    wd.status = 'rejected';
    wd.processedAt = new Date();
    wd.processedBy = ctx.from.id;
    await wd.save();

    await ctx.answerCbQuery('❌ Refusé');
    await ctx.editMessageText(ctx.callbackQuery.message.text + '\n\n❌ *REFUSÉ PAR ADMIN*', { parse_mode: 'Markdown' }).catch(() => {});

    const userLang = user?.language || 'fr';
    await notifyUser(ctx.telegram, wd.telegramId, t(userLang, 'withdrawal_rejected_notif', formatAmount(wd.amount)));
  } catch (err) {
    logger.error('adminRejectWithdrawal error', { err: err.message });
    ctx.answerCbQuery('Erreur').catch(() => {});
  }
}

// ─── Stubs de compatibilité (ancien système pays/opérateur) ──────────────────
export async function handleCountrySelect() {}
export async function handleOperatorSelect() {}
export async function handleBackToCountries() {}
