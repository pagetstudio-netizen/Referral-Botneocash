/**
 * Commande /start — Point d'entrée du bot NeoCash
 */
import User from '../models/User.js';
import Referral from '../models/Referral.js';
import Transaction from '../models/Transaction.js';
import { getSetting } from '../models/Settings.js';
import { welcomeMessage } from '../utils/messages.js';
import { mainKeyboard } from '../utils/keyboards.js';
import { notifyAdmins } from '../utils/notify.js';
import logger from '../utils/logger.js';

export async function startCommand(ctx) {
  const tg = ctx.from;
  const args = ctx.payload || ctx.message?.text?.split(' ')[1] || '';
  const isNewUser = !ctx.dbUser?.createdAt || (Date.now() - new Date(ctx.dbUser.createdAt).getTime()) < 3000;

  // ─── Traitement parrainage ────────────────────────────────────────────────────
  if (args && isNewUser && ctx.dbUser) {
    await processReferral(ctx.dbUser, args);
  }

  const text = await welcomeMessage(tg.first_name);
  await ctx.reply(text, {
    parse_mode: 'Markdown',
    ...mainKeyboard,
  });

  // ─── Notification admin nouveau utilisateur ───────────────────────────────────
  if (isNewUser && ctx.dbUser) {
    await notifyAdmins(ctx.telegram, {
      type: 'new_user',
      text: `🆕 *NOUVEAU UTILISATEUR*\n\n👤 ${tg.first_name} ${tg.last_name || ''}\n🆔 \`${tg.id}\`\n📛 ${tg.username ? '@' + tg.username : 'N/A'}\n👥 Parrainé : ${args ? 'Oui' : 'Non'}`,
    });
  }
}

async function processReferral(newUser, referralCodeOrId) {
  try {
    // Vérifier que cet utilisateur n'a pas déjà un parrain
    if (newUser.referredBy) return;

    // Trouver le parrain par code
    let referrer = await User.findOne({ referralCode: referralCodeOrId });
    // Si pas trouvé par code, essayer par ID direct (lien t.me/bot?start=ID)
    if (!referrer) {
      const refId = Number(referralCodeOrId);
      if (!isNaN(refId) && refId !== newUser.telegramId) {
        referrer = await User.findOne({ telegramId: refId });
      }
    }

    if (!referrer || referrer.telegramId === newUser.telegramId) return;

    const bonus = await getSetting('referral_bonus') || 120;

    // Mettre à jour le parrain
    const balBefore = referrer.balance;
    referrer.balance += bonus;
    referrer.referralEarnings += bonus;
    referrer.referralCount += 1;
    await referrer.save();

    // Mettre à jour le filleul
    newUser.referredBy = referrer.telegramId;
    await newUser.save();

    // Enregistrer le parrainage
    await Referral.create({
      referrerId: referrer.telegramId,
      referredId: newUser.telegramId,
      referredUsername: newUser.username,
      referredFirstName: newUser.firstName,
      amount: bonus,
    });

    // Transaction
    await Transaction.create({
      userId: referrer.telegramId,
      type: 'referral_bonus',
      amount: bonus,
      balanceBefore: balBefore,
      balanceAfter: referrer.balance,
      description: `Parrainage de ${newUser.firstName}`,
    });

    logger.info('Referral processed', { referrerId: referrer.telegramId, referredId: newUser.telegramId, bonus });
  } catch (err) {
    logger.error('processReferral error', { err: err.message });
  }
}
