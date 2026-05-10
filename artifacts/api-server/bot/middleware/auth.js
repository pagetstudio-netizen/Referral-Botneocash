/**
 * Middleware d'authentification et vérification canal
 */
import User from '../models/User.js';
import { getSetting } from '../models/Settings.js';
import { channelVerifyMessage } from '../utils/messages.js';
import { verifyKeyboard } from '../utils/keyboards.js';
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
      // Mettre à jour les infos
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

// ─── Vérifier adhésion canal ───────────────────────────────────────────────────
export async function checkChannelMembership(ctx, next) {
  // Passer les callbacks de vérification
  if (ctx.callbackQuery?.data === 'verify_channel') return next();

  const userId = ctx.from?.id;
  if (!userId) return next();

  // Les admins passent toujours
  const isAdmin = await isUserAdmin(userId);
  if (isAdmin) return next();

  const channelId = await getSetting('required_channel');
  const groupId = await getSetting('required_group');

  const requiredChat = channelId || groupId;
  if (!requiredChat) return next();

  try {
    const member = await ctx.telegram.getChatMember(requiredChat, userId);
    const allowed = ['member', 'administrator', 'creator'].includes(member.status);
    if (!allowed) {
      return sendVerificationMessage(ctx, requiredChat);
    }
    return next();
  } catch (err) {
    logger.warn('checkChannelMembership error', { err: err.message });
    // En cas d'erreur (ex: bot pas dans le canal), laisser passer
    return next();
  }
}

async function sendVerificationMessage(ctx, chatId) {
  const joinUrl = chatId.toString().startsWith('-')
    ? null
    : `https://t.me/${chatId.replace('@', '')}`;

  const site = await getSetting('required_site');
  const joinLink = joinUrl || site || null;

  await ctx.reply(channelVerifyMessage(), {
    parse_mode: 'Markdown',
    ...verifyKeyboard(joinLink),
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
