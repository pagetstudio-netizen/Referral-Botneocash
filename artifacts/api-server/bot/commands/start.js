/**
 * Commande /start — Point d'entrée du bot NeoCash
 * Inclut le flux de sélection de langue
 */
import { createReadStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Referral from '../models/Referral.js';
import RequiredChannel from '../models/RequiredChannel.js';
import { getSetting } from '../models/Settings.js';
import { welcomeMessage, buildMultiChannelVerifyMessage } from '../utils/messages.js';
import { getMainKeyboard, multiChannelVerifyKeyboard, languageKeyboard } from '../utils/keyboards.js';
import { notifyAdmins } from '../utils/notify.js';
import { creditPendingReferral } from '../utils/creditReferral.js';
import { isUserAdmin, getMissingChannels } from '../middleware/auth.js';
import { t, getLang } from '../utils/i18n.js';
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

  // ─── Utilisateur sans langue définie → afficher sélecteur de langue ───────────
  const user = ctx.dbUser;
  const needsLanguageSelection = !user?.language || user.language === 'fr' && isNewUser;

  if (isNewUser || !user?.language) {
    return ctx.reply(
      t('fr', 'language_select_prompt'),
      { parse_mode: 'Markdown', ...languageKeyboard }
    );
  }

  const lang = getLang(ctx);

  // ─── Vérification canaux obligatoires avant le message de bienvenue ───────────
  const adminUser = await isUserAdmin(tg.id);
  if (!adminUser) {
    try {
      const channels = await RequiredChannel.findAll();
      if (channels.length > 0) {
        const missing = await getMissingChannels(ctx.telegram, tg.id, channels);
        if (missing.length > 0) {
          return ctx.reply(buildMultiChannelVerifyMessage(missing, lang), {
            parse_mode: 'Markdown',
            ...multiChannelVerifyKeyboard(missing, lang),
          });
        }
      }
    } catch (err) {
      logger.warn('startCommand channel check error', { err: err.message });
    }
  }

  const caption = await welcomeMessage(tg.first_name, lang);
  const keyboard = getMainKeyboard(lang);

  try {
    await ctx.replyWithPhoto(
      { source: createReadStream(LOGO_PATH) },
      {
        caption,
        parse_mode: 'Markdown',
        ...keyboard,
      }
    );
  } catch {
    await ctx.reply(caption, {
      parse_mode: 'Markdown',
      ...keyboard,
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

/**
 * Gérer la sélection de langue et envoyer le message de bienvenue
 */
export async function handleLanguageSet(ctx, lang) {
  await ctx.answerCbQuery().catch(() => {});

  const user = ctx.dbUser;
  if (!user) return;

  user.language = lang;
  await user.save();
  ctx.userLang = lang;

  const tg = ctx.from;
  const args = ctx.payload || '';

  // ─── Vérification canaux obligatoires ─────────────────────────────────────────
  const adminUser = await isUserAdmin(tg.id);
  if (!adminUser) {
    try {
      const channels = await RequiredChannel.findAll();
      if (channels.length > 0) {
        const missing = await getMissingChannels(ctx.telegram, tg.id, channels);
        if (missing.length > 0) {
          await ctx.editMessageText(buildMultiChannelVerifyMessage(missing, lang), {
            parse_mode: 'Markdown',
            ...multiChannelVerifyKeyboard(missing, lang),
          }).catch(async () => {
            await ctx.reply(buildMultiChannelVerifyMessage(missing, lang), {
              parse_mode: 'Markdown',
              ...multiChannelVerifyKeyboard(missing, lang),
            });
          });
          return;
        }
      }
    } catch (err) {
      logger.warn('handleLanguageSet channel check error', { err: err.message });
    }
  }

  const caption = await welcomeMessage(tg.first_name, lang);
  const keyboard = getMainKeyboard(lang);

  try {
    await ctx.editMessageText(caption, { parse_mode: 'Markdown' }).catch(() => {});
    await ctx.reply(caption, { parse_mode: 'Markdown', ...keyboard });
  } catch {
    await ctx.reply(caption, { parse_mode: 'Markdown', ...keyboard });
  }

  // Notification admin
  await notifyAdmins(ctx.telegram, {
    type: 'new_user',
    text:
      `🆕 *NOUVEAU UTILISATEUR*\n\n` +
      `👤 ${tg.first_name} ${tg.last_name || ''}\n` +
      `🆔 \`${tg.id}\`\n` +
      `📛 ${tg.username ? '@' + tg.username : 'N/A'}\n` +
      `🌐 Langue : ${lang}\n` +
      `👥 Parrainé : ${args ? '✅ Oui' : '❌ Non'}`,
  }).catch(() => {});
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

    const existing = await Referral.findOne({ referredId: newUser.telegramId });
    if (existing) return;

    const bonus = await getSetting('referral_bonus') || 120;

    newUser.referredBy = referrer.telegramId;
    await newUser.save();

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

    if (telegram && referral) {
      try {
        const refLang = referrer.language || 'fr';
        const { t: translate } = await import('../utils/i18n.js');
        await telegram.sendMessage(
          referrer.telegramId,
          translate(refLang, 'referral_pending_notif', newUser.firstName, bonus),
          { parse_mode: 'Markdown' }
        );
      } catch (notifErr) {
        logger.warn('Pending referral notification failed', { err: notifErr.message });
      }
    }

    const channels = await RequiredChannel.findAll();

    if (!channels.length) {
      await creditPendingReferral(newUser, telegram, botUsername);
      return;
    }

    try {
      const missing = await getMissingChannels(telegram, newUser.telegramId, channels);
      if (missing.length === 0) {
        await creditPendingReferral(newUser, telegram, botUsername);
      }
    } catch {
      // Erreur API → laisser en pending
    }
  } catch (err) {
    logger.error('processReferral error', { err: err.message });
  }
}
