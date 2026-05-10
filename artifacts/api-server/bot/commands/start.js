/**
 * Commande /start — Point d'entrée du bot NeoCash
 */
import { createReadStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Referral from '../models/Referral.js';
import Transaction from '../models/Transaction.js';
import { getSetting } from '../models/Settings.js';
import { welcomeMessage } from '../utils/messages.js';
import { mainKeyboard } from '../utils/keyboards.js';
import { notifyAdmins } from '../utils/notify.js';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = join(__dirname, '../assets/logo.png');

export async function startCommand(ctx) {
  const tg = ctx.from;
  const args = ctx.payload || ctx.message?.text?.split(' ')[1] || '';
  const isNewUser = !ctx.dbUser?.createdAt || (Date.now() - new Date(ctx.dbUser.createdAt).getTime()) < 3000;

  // ─── Traitement parrainage ────────────────────────────────────────────────────
  if (args && isNewUser && ctx.dbUser) {
    await processReferral(ctx.dbUser, args, ctx.telegram, ctx.botInfo?.username);
  }

  const caption = await welcomeMessage(tg.first_name);

  // Envoyer le logo + message de bienvenue en même temps
  try {
    await ctx.replyWithPhoto(
      { source: createReadStream(LOGO_PATH) },
      {
        caption,
        parse_mode: 'Markdown',
        ...mainKeyboard,
      }
    );
  } catch {
    // Fallback texte si le logo est inaccessible
    await ctx.reply(caption, {
      parse_mode: 'Markdown',
      ...mainKeyboard,
    });
  }

  // ─── Notification admin nouveau utilisateur ───────────────────────────────────
  if (isNewUser && ctx.dbUser) {
    await notifyAdmins(ctx.telegram, {
      type: 'new_user',
      text:
        `🆕 *NOUVEAU UTILISATEUR*\n\n` +
        `👤 ${tg.first_name} ${tg.last_name || ''}\n` +
        `🆔 \`${tg.id}\`\n` +
        `📛 ${tg.username ? '@' + tg.username : 'N/A'}\n` +
        `👥 Parrainé : ${args ? '✅ Oui' : '❌ Non'}`,
    });
  }
}

async function processReferral(newUser, referralCodeOrId, telegram, botUsername) {
  try {
    if (newUser.referredBy) return;

    let referrer = await User.findOne({ referralCode: referralCodeOrId });
    if (!referrer) {
      const refId = Number(referralCodeOrId);
      if (!isNaN(refId) && refId !== newUser.telegramId) {
        referrer = await User.findOne({ telegramId: refId });
      }
    }

    if (!referrer || referrer.telegramId === newUser.telegramId) return;

    const bonus = await getSetting('referral_bonus') || 120;

    const balBefore = referrer.balance;
    referrer.balance += bonus;
    referrer.referralEarnings += bonus;
    referrer.referralCount += 1;
    await referrer.save();

    newUser.referredBy = referrer.telegramId;
    await newUser.save();

    await Referral.create({
      referrerId: referrer.telegramId,
      referredId: newUser.telegramId,
      referredUsername: newUser.username,
      referredFirstName: newUser.firstName,
      amount: bonus,
    });

    await Transaction.create({
      userId: referrer.telegramId,
      type: 'referral_bonus',
      amount: bonus,
      balanceBefore: balBefore,
      balanceAfter: referrer.balance,
      description: `Parrainage de ${newUser.firstName}`,
    });

    logger.info('Referral processed', {
      referrerId: referrer.telegramId,
      referredId: newUser.telegramId,
      bonus,
    });

    // ─── Notification au parrain ───────────────────────────────────────────────
    if (telegram) {
      try {
        const referralLink = botUsername
          ? `https://t.me/${botUsername}?start=${referrer.referralCode || referrer.telegramId}`
          : null;

        const shareText = encodeURIComponent(
          `🤑 Rejoins NeoCash et gagne de l'argent gratuitement ! Bonus quotidien + parrainage en FCFA.`
        );
        const shareUrl = referralLink
          ? `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${shareText}`
          : null;

        const notifText =
          `🎉 *Félicitations ${referrer.firstName} !*\n\n` +
          `💸 Vous venez de gagner *${bonus} FCFA* !\n\n` +
          `👤 *${newUser.firstName}* vient de rejoindre NeoCash grâce à votre lien de parrainage.\n\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `💰 Bonus crédité : *+${bonus} FCFA*\n` +
          `👥 Total filleuls : *${referrer.referralCount}*\n` +
          `💳 Nouveau solde : *${referrer.balance.toLocaleString('fr-FR')} FCFA*\n` +
          `━━━━━━━━━━━━━━━━━━\n\n` +
          `📲 Partagez encore votre lien pour gagner plus !`;

        const buttons = [];
        if (shareUrl) {
          buttons.push([{ text: '📤 Partager encore', url: shareUrl }]);
        }

        await telegram.sendMessage(referrer.telegramId, notifText, {
          parse_mode: 'Markdown',
          reply_markup: buttons.length ? { inline_keyboard: buttons } : undefined,
        });
      } catch (notifErr) {
        logger.warn('Referral notification failed', { err: notifErr.message });
      }
    }
  } catch (err) {
    logger.error('processReferral error', { err: err.message });
  }
}
