/**
 * Utilitaire — Crédit du parrainage après vérification canal
 * Appelé depuis start.js (si pas de canal ou déjà membre)
 * et depuis bot.js (callback verify_channel).
 */
import Referral from '../models/Referral.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
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
      description: `Parrainage de ${filleul.firstName} (canal vérifié)`,
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
        const referralLink = botUsername
          ? `https://t.me/${botUsername}?start=${referrer.referralCode || referrer.telegramId}`
          : null;
        const shareUrl = referralLink
          ? `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('🤑 Rejoins NeoCash et gagne de l\'argent gratuitement !')}`
          : null;

        const notifText =
          `🎉 *Félicitations ${referrer.firstName} !*\n\n` +
          `💸 Tu viens de gagner *${bonus} FCFA* !\n\n` +
          `👤 *${filleul.firstName}* vient de rejoindre NeoCash grâce à ton lien` +
          ` et a rejoint le canal.\n\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `💰 Bonus crédité : *+${bonus} FCFA*\n` +
          `👥 Total filleuls validés : *${referrer.referralCount}*\n` +
          `💳 Nouveau solde : *${referrer.balance.toLocaleString('fr-FR')} FCFA*\n` +
          `━━━━━━━━━━━━━━━━━━\n\n` +
          `📲 Partage encore ton lien pour gagner plus !`;

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
