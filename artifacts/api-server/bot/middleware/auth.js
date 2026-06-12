/**
 * Middleware d'authentification et vérification canal (multi-canaux)
 */
import User from '../models/User.js';
import RequiredChannel from '../models/RequiredChannel.js';
import { getSetting } from '../models/Settings.js';
import { multiChannelVerifyKeyboard } from '../utils/keyboards.js';
import { buildMultiChannelVerifyMessage } from '../utils/messages.js';
import { getLang, t } from '../utils/i18n.js';
import logger from '../utils/logger.js';

// Throttle lastActivityAt saves — only write to DB every 5 min per user
const _lastSavedAt = new Map();
const SAVE_THROTTLE = 5 * 60_000;

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
      ctx.isNewUser = true;
    } else {
      const now = Date.now();
      const lastSaved = _lastSavedAt.get(tg.id) || 0;
      const nameChanged = user.username !== (tg.username || null) ||
        user.firstName !== (tg.first_name || '') ||
        user.lastName !== (tg.last_name || '');

      user.username = tg.username || null;
      user.firstName = tg.first_name || '';
      user.lastName = tg.last_name || '';
      user.lastActivityAt = new Date();

      if (nameChanged || now - lastSaved > SAVE_THROTTLE) {
        await user.save();
        _lastSavedAt.set(tg.id, now);
      }
    }
    ctx.dbUser = user;
    // Attacher la langue au contexte pour accès facile
    ctx.userLang = user.language || 'fr';
  } catch (err) {
    logger.error('getOrCreateUser error', { err: err.message });
  }

  return next();
}

// ─── Vérifier si l'utilisateur est banni ──────────────────────────────────────
export async function checkBanned(ctx, next) {
  if (!ctx.dbUser) return next();
  if (ctx.dbUser.banned) {
    const lang = getLang(ctx);
    return ctx.reply(t(lang, 'banned')).catch(() => {});
  }
  return next();
}

// ─── Mode maintenance ──────────────────────────────────────────────────────────
export async function checkMaintenance(ctx, next) {
  const isAdmin = await isUserAdmin(ctx.from?.id);
  if (isAdmin) return next();

  const maintenance = await getSetting('maintenance_mode');
  if (maintenance) {
    const lang = getLang(ctx);
    return ctx.reply(t(lang, 'maintenance'), {
      parse_mode: 'Markdown',
    }).catch(() => {});
  }
  return next();
}

// ─── Cache adhésion canaux par utilisateur (TTL 5 min) ────────────────────────
const _membershipCache = new Map();
const MEMBERSHIP_TTL = 5 * 60_000;

function _invalidateMembership(userId) {
  _membershipCache.delete(userId);
}

// ─── Vérifier adhésion aux canaux obligatoires (multi-canaux, filtré par langue)
export async function checkChannelMembership(ctx, next) {
  if (ctx.callbackQuery?.data === 'verify_channel') return next();

  const userId = ctx.from?.id;
  if (!userId) return next();

  const isAdmin = await isUserAdmin(userId);
  if (isAdmin) return next();

  try {
    // Filtrer les canaux selon la langue de l'utilisateur
    const userLang = ctx.userLang || ctx.dbUser?.language || 'fr';
    const channels = await RequiredChannel.findAllForLang(userLang);
    if (!channels.length) return next();

    // Clé cache incluant la langue pour éviter les conflits entre langues
    const cacheKey = `${userId}_${userLang}`;
    const cached = _membershipCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      if (cached.missing.length === 0) return next();
      return sendMultiVerifyMessage(ctx, cached.missing);
    }

    const missing = await getMissingChannels(ctx.telegram, userId, channels);
    _membershipCache.set(cacheKey, { missing, expiresAt: Date.now() + MEMBERSHIP_TTL });

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
    } catch (err) {
      logger.warn('getMissingChannels: impossible de vérifier canal', { chatId: ch.chatIdOrUrl, err: err.message });
      missing.push(ch);
    }
  }
  return missing;
}

// ─── Invalider le cache après vérification réussie ou changement de langue ────
export function clearMembershipCache(userId) {
  // Supprimer toutes les entrées de cache pour cet utilisateur (toutes les langues)
  const keysToDelete = [];
  for (const key of _membershipCache.keys()) {
    if (key === String(userId) || key.startsWith(`${userId}_`)) {
      keysToDelete.push(key);
    }
  }
  for (const key of keysToDelete) {
    _membershipCache.delete(key);
  }
}

async function sendMultiVerifyMessage(ctx, missingChannels) {
  const lang = getLang(ctx);
  const text = buildMultiChannelVerifyMessage(missingChannels, lang);
  const keyboard = multiChannelVerifyKeyboard(missingChannels, lang);
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
