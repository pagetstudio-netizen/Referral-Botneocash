/**
 * Utilitaire — Crédit du parrainage après vérification canaux
 */
import Referral from '../models/Referral.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { t } from './i18n.js';
import { formatAmount } from './messages.js';
import logger from './logger.js';

export async function creditPendingReferral(filleul, telegram, botUsername) {
  try {
    const referral = await Referral.findOne({
      referredId: filleul.telegramId,
      status: 'pending',
    });
    if (!referral) return;

    const referrer = await User.findOne({ telegramId: referral.referrerId });
    if (!referrer) return;

    const bonus = referral.amount;
    const balBefore = referrer.balance;

    referrer.balance += bonus;
    referrer.referralEarnings += bonus;
    referrer.referralCount += 1;
    await referrer.save();

    await Transaction.create({
      userId: referrer.telegramId,
      type: 'referral_bonus',
      amount: bonus,
      balanceBefore: balBefore,
      balanceAfter: referrer.balance,
      description: `Referral from ${filleul.firstName}`,
    });

    referral.status = 'credited';
    referral.creditedAt = new Date();
    await referral.save();

    logger.info('Referral credited', {
      referrerId: referrer.telegramId,
      referredId: filleul.telegramId,
      bonus,
    });

    if (telegram) {
      try {
        const refLang = referrer.language || 'fr';
        const referralLink = botUsername
          ? `https://t.me/${botUsername}?start=${referrer.referralCode || referrer.telegramId}`
          : null;
        const shareUrl = referralLink
          ? `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(t(refLang, 'referral_share_text'))}`
          : null;

        const notifText = t(
          refLang,
          'referral_credited_notif',
          referrer.firstName,
          filleul.firstName,
          formatAmount(bonus),
          referrer.referralCount,
          formatAmount(referrer.balance),
          shareUrl,
        );

        const buttons = shareUrl
          ? { inline_keyboard: [[{ text: t(refLang, 'referral_share_again_btn'), url: shareUrl }]] }
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
