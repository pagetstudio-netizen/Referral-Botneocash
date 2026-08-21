/**
 * Middleware d'authentification et vérification canal
 * — chaîne officielle principale (settings) + chaînes supplémentaires optionnelles (table)
 */
import User from '../models/User.js';
import RequiredChannel from '../models/RequiredChannel.js';
import { getSetting } from '../models/Settings.js';
import { singleChannelVerifyKeyboard, multiChannelVerifyKeyboard } from '../utils/keyboards.js';
import { buildSingleChannelVerifyMessage, buildMultiChannelVerifyMessage } from '../utils/messages.js';
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

// ─── Cache adhésion canaux (TTL 5 min) ────────────────────────────────────────
const _membershipCache = new Map();
const MEMBERSHIP_TTL = 5 * 60_000;

// ─── Construire la liste complète des chaînes requises ────────────────────────
// Chaîne officielle principale (settings) + chaînes supplémentaires (table)
async function buildRequiredList(ctx) {
  const userLang = ctx.userLang || ctx.dbUser?.language || 'fr';
  const extra = await RequiredChannel.findAllForLang(userLang);

  const primaryId = await getSetting('required_channel');
  if (!primaryId) return extra;

  const primaryLabel = (await getSetting('required_channel_label')) || primaryId;
  const primaryEntry = {
    id: '__primary__',
    chatIdOrUrl: primaryId,
    label: primaryLabel,
    type: 'channel',
  };
  return [primaryEntry, ...extra];
}

// ─── Vérifier adhésion à toutes les chaînes requises ─────────────────────────
export async function checkChannelMembership(ctx, next) {
  if (ctx.callbackQuery?.data === 'verify_channel') return next();

  const userId = ctx.from?.id;
  if (!userId) return next();

  const isAdmin = await isUserAdmin(userId);
  if (isAdmin) return next();

  try {
    const required = await buildRequiredList(ctx);
    if (!required.length) return next(); // aucune chaîne configurée → accès libre

    const cached = _membershipCache.get(userId);
    if (cached && Date.now() < cached.expiresAt) {
      if (cached.missing.length === 0) return next();
      return sendVerifyMessage(ctx, cached.missing);
    }

    const missing = await getMissingChannels(ctx.telegram, userId, required);
    _membershipCache.set(userId, { missing, expiresAt: Date.now() + MEMBERSHIP_TTL });

    if (!missing.length) return next();
    return sendVerifyMessage(ctx, missing);
  } catch (err) {
    logger.warn('checkChannelMembership error', { err: err.message });
    return next(); // fail open en cas d'erreur
  }
}

// ─── Trouver les chaînes non rejointes ────────────────────────────────────────
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
      logger.warn('getMissingChannels: impossible de vérifier', { chatId: ch.chatIdOrUrl, err: err.message });
      missing.push(ch);
    }
  }
  return missing;
}

// ─── Vérification rapide d'une chaîne (utilisée par bot.js) ──────────────────
export async function _checkTelegramMembership(telegram, userId, channelId) {
  try {
    const member = await telegram.getChatMember(channelId, userId);
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch {
    return true; // fail open
  }
}

// ─── Invalider le cache d'un utilisateur ─────────────────────────────────────
export function clearMembershipCache(userId) {
  if (userId) _membershipCache.delete(Number(userId));
  else _membershipCache.clear();
}

// ─── Envoyer le message de vérification (1 ou plusieurs chaînes) ─────────────
async function sendVerifyMessage(ctx, missingChannels) {
  const lang = getLang(ctx);
  let text, keyboard;
  if (missingChannels.length === 1) {
    const ch = missingChannels[0];
    text = buildSingleChannelVerifyMessage(ch.label || ch.chatIdOrUrl, lang);
    keyboard = singleChannelVerifyKeyboard(ch.chatIdOrUrl, ch.label, lang);
  } else {
    text = buildMultiChannelVerifyMessage(missingChannels, lang);
    keyboard = multiChannelVerifyKeyboard(missingChannels, lang);
  }
  await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard }).catch(() => {});
}

// ─── Cache isUserAdmin (TTL 5 min) ────────────────────────────────────────────
const _adminCache = new Map();
const ADMIN_CACHE_TTL = 5 * 60_000;

export function clearAdminCache(telegramId) {
  if (telegramId) _adminCache.delete(Number(telegramId));
  else _adminCache.clear();
}

// ─── Utilitaire admin ──────────────────────────────────────────────────────────
export async function isUserAdmin(telegramId) {
  if (!telegramId) return false;
  const id = Number(telegramId);

  const cached = _adminCache.get(id);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  const adminIds = (process.env.ADMIN_IDS || '').split(',').map(Number).filter(Boolean);
  if (adminIds.includes(id)) {
    _adminCache.set(id, { value: true, expiresAt: Date.now() + ADMIN_CACHE_TTL });
    return true;
  }

  try {
    const Admin = (await import('../models/Admin.js')).default;
    const admin = await Admin.findOne({ telegramId: id });
    const result = !!admin;
    _adminCache.set(id, { value: result, expiresAt: Date.now() + ADMIN_CACHE_TTL });
    return result;
  } catch {
    return false;
  }
}

// ─── Code de parrainage ────────────────────────────────────────────────────────
function generateReferralCode(telegramId) {
  return `NC${telegramId}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
