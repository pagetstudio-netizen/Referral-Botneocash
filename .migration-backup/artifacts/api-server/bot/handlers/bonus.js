/**
 * Handler — Bonus quotidien
 */
import Transaction from '../models/Transaction.js';
import { getSetting } from '../models/Settings.js';
import { bonusClaimedMessage, bonusAlreadyClaimedMessage } from '../utils/messages.js';
import { getLang, t } from '../utils/i18n.js';
import logger from '../utils/logger.js';

export async function handleBonus(ctx) {
  const user = ctx.dbUser;
  const lang = getLang(ctx);

  if (!user) return ctx.reply(t(lang, 'user_not_found'));

  if (!user.canClaimBonus()) {
    const timeLeft = user.timeUntilNextBonus();
    return ctx.reply(bonusAlreadyClaimedMessage(timeLeft, lang), { parse_mode: 'Markdown' });
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
      description: 'Daily bonus',
    });

    logger.info('Daily bonus claimed', { userId: user.telegramId, amount: bonusAmount });
    await ctx.reply(bonusClaimedMessage(bonusAmount, user.balance, lang), { parse_mode: 'Markdown' });
  } catch (err) {
    logger.error('handleBonus error', { err: err.message });
    await ctx.reply(t(lang, 'error_generic'));
  }
}
