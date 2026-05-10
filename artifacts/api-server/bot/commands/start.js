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

    // Trouver le parrain via code de parrainage ou ID Telegram
    let referrer = await User.findOne({ referralCode: referralCodeOrId });
    if (!referrer) {
      const refId = Number(referralCodeOrId);
      if (!isNaN(refId) && refId !== newUser.telegramId) {
        referrer = await User.findOne({ telegramId: refId });
      }
    }

    if (!referrer || referrer.telegramId === newUser.telegramId) return;

    // Vérifier qu'il n'y a pas déjà un parrainage enregistré pour ce filleul
    const existing = await Referral.findOne({ referredId: newUser.telegramId });
    if (existing) return;

    const bonus = await getSetting('referral_bonus') || 120;

    // Marquer le filleul comme parrainé
    newUser.referredBy = referrer.telegramId;
    await newUser.save();

    // ✅ Créditer le parrain immédiatement
    const balBefore = referrer.balance;
    referrer.balance += bonus;
    referrer.referralEarnings += bonus;
    referrer.referralCount += 1;
    await referrer.save();

    // Créer la transaction
    await Transaction.create({
      userId: referrer.telegramId,
      type: 'referral_bonus',
      amount: bonus,
      balanceBefore: balBefore,
      balanceAfter: referrer.balance,
      description: `Parrainage de ${newUser.firstName}`,
    });

    // Enregistrer le parrainage comme crédité
    await Referral.create({
      referrerId: referrer.telegramId,
      referredId: newUser.telegramId,
      referredUsername: newUser.username,
      referredFirstName: newUser.firstName,
      amount: bonus,
      status: 'credited',
    });

    logger.info('Referral credited immediately', {
      referrerId: referrer.telegramId,
      referredId: newUser.telegramId,
      bonus,
    });

    // Notifier le parrain
    if (telegram) {
      const referralLink = botUsername
        ? `https://t.me/${botUsername}?start=${referrer.referralCode || referrer.telegramId}`
        : null;
      const shareUrl = referralLink
        ? `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('🤑 Rejoins NeoCash et gagne de l\'argent gratuitement !')}`
        : null;

      const notifText =
        `🎉 *Félicitations ${referrer.firstName} !*\n\n` +
        `💸 Tu viens de gagner *${bonus} FCFA* !\n\n` +
        `👤 *${newUser.firstName}* vient de rejoindre NeoCash grâce à ton lien.\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💰 Bonus crédité : *+${bonus} FCFA*\n` +
        `👥 Total filleuls : *${referrer.referralCount}*\n` +
        `💳 Nouveau solde : *${referrer.balance.toLocaleString('fr-FR')} FCFA*\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `📲 Partage encore ton lien pour gagner plus !`;

      const buttons = shareUrl
        ? { inline_keyboard: [[{ text: '📤 Partager encore', url: shareUrl }]] }
        : undefined;

      await telegram.sendMessage(referrer.telegramId, notifText, {
        parse_mode: 'Markdown',
        reply_markup: buttons,
      }).catch((err) => logger.warn('Referral notify failed', { err: err.message }));
    }
  } catch (err) {
    logger.error('processReferral error', { err: err.message });
  }
}
