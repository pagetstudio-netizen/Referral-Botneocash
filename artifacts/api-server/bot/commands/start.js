/**
 * Commande /start — Point d'entrée du bot NeoCash
 */
import { createReadStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Referral from '../models/Referral.js';
import RequiredChannel from '../models/RequiredChannel.js';
import { getSetting } from '../models/Settings.js';
import { welcomeMessage, multiChannelVerifyMessage } from '../utils/messages.js';
import { mainKeyboard, multiChannelVerifyKeyboard } from '../utils/keyboards.js';
import { notifyAdmins } from '../utils/notify.js';
import { creditPendingReferral } from '../utils/creditReferral.js';
import { isUserAdmin, getMissingChannels } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = join(__dirname, '../assets/logo.png');

export async function startCommand(ctx) {
  const tg = ctx.from;
  const args = ctx.payload || ctx.message?.text?.split(' ')[1] || '';
  const isNewUser = !!ctx.isNewUser;

  // ─── Traitement parrainage ────────────────────────────────────────────────────
  if (args && isNewUser && ctx.dbUser) {
    await processReferral(ctx.dbUser, args, ctx.telegram, ctx.botInfo?.username);
  }

  // ─── Vérification canaux obligatoires avant le message de bienvenue ───────────
  const adminUser = await isUserAdmin(tg.id);
  if (!adminUser) {
    try {
      const channels = await RequiredChannel.findAll();
      if (channels.length > 0) {
        const missing = await getMissingChannels(ctx.telegram, tg.id, channels);
        if (missing.length > 0) {
          return ctx.reply(multiChannelVerifyMessage(missing), {
            parse_mode: 'Markdown',
            ...multiChannelVerifyKeyboard(missing),
          });
        }
      }
    } catch (err) {
      logger.warn('startCommand channel check error', { err: err.message });
    }
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

    // Trouver le parrain via code ou ID Telegram
    let referrer = await User.findOne({ referralCode: referralCodeOrId });
    if (!referrer) {
      const refId = Number(referralCodeOrId);
      if (!isNaN(refId) && refId !== newUser.telegramId) {
        referrer = await User.findOne({ telegramId: refId });
      }
    }
    if (!referrer || referrer.telegramId === newUser.telegramId) return;

    // Un filleul ne peut être parrainé qu'une seule fois
    const existing = await Referral.findOne({ referredId: newUser.telegramId });
    if (existing) return;

    const bonus = await getSetting('referral_bonus') || 120;

    // Marquer le filleul comme parrainé
    newUser.referredBy = referrer.telegramId;
    await newUser.save();

    // Créer le parrainage en attente (pending) — validé après vérification canal
    const referral = await Referral.create({
      referrerId: referrer.telegramId,
      referredId: newUser.telegramId,
      referredUsername: newUser.username,
      referredFirstName: newUser.firstName,
      amount: bonus,
      status: 'pending',
    });

    logger.info('Referral pending — waiting for channel verification', {
      referrerId: referrer.telegramId,
      referredId: newUser.telegramId,
      bonus,
    });

    // ─── Notification immédiate au parrain (lien cliqué) ─────────────────────
    if (telegram && referral) {
      try {
        await telegram.sendMessage(
          referrer.telegramId,
          `🔔 *Quelqu'un a cliqué sur ton lien !*\n\n` +
          `👤 *${newUser.firstName}* vient d'utiliser ton lien de parrainage.\n\n` +
          `⏳ En attente de vérification des canaux...\n` +
          `💰 Tu gagneras *${bonus} FCFA* dès que la vérification sera validée.`,
          { parse_mode: 'Markdown' }
        );
      } catch (notifErr) {
        logger.warn('Pending referral notification failed', { err: notifErr.message });
      }
    }

    // Vérifier si des canaux obligatoires sont configurés
    const channels = await RequiredChannel.findAll();

    if (!channels.length) {
      // Aucun canal → créditer immédiatement
      await creditPendingReferral(newUser, telegram, botUsername);
      return;
    }

    // Canaux configurés : vérifier si le filleul est déjà membre de tous
    try {
      const missing = await getMissingChannels(telegram, newUser.telegramId, channels);
      if (missing.length === 0) {
        // Déjà membre de tout → créditer maintenant
        await creditPendingReferral(newUser, telegram, botUsername);
      }
      // Sinon → sera crédité quand il cliquera sur ✅ Vérifier
    } catch {
      // Erreur API → laisser en pending
    }
  } catch (err) {
    logger.error('processReferral error', { err: err.message });
  }
}
