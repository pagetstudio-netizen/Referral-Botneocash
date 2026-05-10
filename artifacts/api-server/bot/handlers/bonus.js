/**
 * Handler — Bonus quotidien
 */
import Transaction from '../models/Transaction.js';
import { getSetting } from '../models/Settings.js';
import { bonusClaimedMessage, bonusAlreadyClaimedMessage } from '../utils/messages.js';
import logger from '../utils/logger.js';

export async function handleBonus(ctx) {
  const user = ctx.dbUser;
  if (!user) return ctx.reply('❌ Utilisateur non trouvé.');

  if (!user.canClaimBonus()) {
    const timeLeft = user.timeUntilNextBonus();
    return ctx.reply(bonusAlreadyClaimedMessage(timeLeft), { parse_mode: 'Markdown' });
  }

  try {
    const bonusAmount = await getSetting('daily_bonus') || 100;
    const balBefore = user.balance;

    user.balance += bonusAmount;
    user.bonusEarnings += bonusAmount;
    user.lastBonusAt = new Date();
    await user.save();

    await Transaction.create({
      userId: user.telegramId,
      type: 'daily_bonus',
      amount: bonusAmount,
      balanceBefore: balBefore,
      balanceAfter: user.balance,
      description: 'Bonus quotidien',
    });

    logger.info('Daily bonus claimed', { userId: user.telegramId, amount: bonusAmount });
    await ctx.reply(bonusClaimedMessage(bonusAmount, user.balance), { parse_mode: 'Markdown' });
  } catch (err) {
    logger.error('handleBonus error', { err: err.message });
    await ctx.reply('❌ Une erreur est survenue. Réessaie plus tard.');
  }
}
