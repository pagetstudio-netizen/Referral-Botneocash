/**
 * Middleware d'authentification et vérification canal (multi-canaux)
 */
import User from '../models/User.js';
import RequiredChannel from '../models/RequiredChannel.js';
import { getSetting } from '../models/Settings.js';
import { multiChannelVerifyKeyboard } from '../utils/keyboards.js';
import { multiChannelVerifyMessage } from '../utils/messages.js';
import logger from '../utils/logger.js';

// ─── Récupérer ou créer un utilisateur ────────────────────────────────────────
export async function getOrCreateUser(ctx, next) {
  const tg = ctx.from;
  if (!tg) return next();

  try {
    let user = await User.findOne({ telegramId: tg.id });
    if (!user) {
      const code = generateReferralCode(tg.id);
      user = await User.create({
        telegramId: tg.id,
        username: tg.username || null,
        firstName: tg.first_name || '',
        lastName: tg.last_name || '',
        referralCode: code,
      });
    } else {
      user.username = tg.username || null;
      user.firstName = tg.first_name || '';
      user.lastName = tg.last_name || '';
      user.lastActivityAt = new Date();
      await user.save();
    }
    ctx.dbUser = user;
  } catch (err) {
    logger.error('getOrCreateUser error', { err: err.message });
  }

  return next();
}

// ─── Vérifier si l'utilisateur est banni ──────────────────────────────────────
export async function checkBanned(ctx, next) {
  if (!ctx.dbUser) return next();
  if (ctx.dbUser.banned) {
    return ctx.reply('🚫 Ton compte a été suspendu. Contacte le support pour plus d\'informations.').catch(() => {});
  }
  return next();
}

// ─── Mode maintenance ──────────────────────────────────────────────────────────
export async function checkMaintenance(ctx, next) {
  const isAdmin = await isUserAdmin(ctx.from?.id);
  if (isAdmin) return next();

  const maintenance = await getSetting('maintenance_mode');
  if (maintenance) {
    return ctx.reply('🚧 *Mode maintenance activé*\n\nLe bot est temporairement indisponible. Revenez plus tard !', {
      parse_mode: 'Markdown',
    }).catch(() => {});
  }
  return next();
}

// ─── Vérifier adhésion aux canaux obligatoires (multi-canaux) ─────────────────
export async function checkChannelMembership(ctx, next) {
  if (ctx.callbackQuery?.data === 'verify_channel') return next();

  const userId = ctx.from?.id;
  if (!userId) return next();

  const isAdmin = await isUserAdmin(userId);
  if (isAdmin) return next();

  try {
    const channels = await RequiredChannel.findAll();
    if (!channels.length) return next();

    const missing = await getMissingChannels(ctx.telegram, userId, channels);
    if (!missing.length) return next();

    return sendMultiVerifyMessage(ctx, missing);
  } catch (err) {
    logger.warn('checkChannelMembership error', { err: err.message });
    return next();
  }
}

// ─── Utilitaire : trouver les canaux non rejoints ─────────────────────────────
export async function getMissingChannels(telegram, userId, channels) {
  const missing = [];
  for (const ch of channels) {
    if (ch.type === 'website') {
      // Pour les sites web : vérifier si l'utilisateur a cliqué "Vérifier"
      // On ne peut pas vérifier automatiquement → traiter comme non vérifié si pas en DB
      try {
        const verified = await RequiredChannel.getUserVerifiedIds(userId);
        if (!verified.includes(ch.id)) missing.push(ch);
      } catch {
        missing.push(ch);
      }
      continue;
    }
    try {
      const member = await telegram.getChatMember(ch.chatIdOrUrl, userId);
      const isMember = ['member', 'administrator', 'creator'].includes(member.status);
      if (!isMember) missing.push(ch);
    } catch {
      // Bot pas dans le canal → on saute (on ne bloque pas)
    }
  }
  return missing;
}

async function sendMultiVerifyMessage(ctx, missingChannels) {
  const text = multiChannelVerifyMessage(missingChannels);
  const keyboard = multiChannelVerifyKeyboard(missingChannels);
  await ctx.reply(text, {
    parse_mode: 'Markdown',
    ...keyboard,
  }).catch(() => {});
}

// ─── Utilitaire admin ──────────────────────────────────────────────────────────
export async function isUserAdmin(telegramId) {
  if (!telegramId) return false;
  const adminIds = (process.env.ADMIN_IDS || '').split(',').map(Number).filter(Boolean);
  if (adminIds.includes(Number(telegramId))) return true;

  try {
    const Admin = (await import('../models/Admin.js')).default;
    const admin = await Admin.findOne({ telegramId: Number(telegramId) });
    return !!admin;
  } catch {
    return false;
  }
}

// ─── Code de parrainage ────────────────────────────────────────────────────────
function generateReferralCode(telegramId) {
  return `NC${telegramId}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
