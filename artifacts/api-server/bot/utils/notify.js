/**
 * Système de notifications admins
 */
import { getSetting } from '../models/Settings.js';
import logger from './logger.js';

/**
 * Envoyer une notification à tous les admins
 */
export async function notifyAdmins(telegram, { text, extra = {} }) {
  try {
    const adminGroupId = await getSetting('admin_group_id');
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(Number).filter(Boolean);

    const targets = new Set();
    if (adminGroupId) targets.add(adminGroupId);
    adminIds.forEach((id) => targets.add(id));

    const sendOpts = { parse_mode: 'Markdown', ...extra };

    for (const chatId of targets) {
      if (!chatId) continue;
      await telegram.sendMessage(chatId, text, sendOpts).catch((err) =>
        logger.warn('notifyAdmins send failed', { chatId, err: err.message })
      );
    }
  } catch (err) {
    logger.error('notifyAdmins error', { err: err.message });
  }
}

/**
 * Envoyer une notification dans le canal de retrait public (texte simple)
 */
export async function notifyWithdrawalChannel(telegram, text, extra = {}) {
  try {
    const channelId = await getSetting('withdrawal_channel');
    if (!channelId) {
      logger.warn('notifyWithdrawalChannel: withdrawal_channel non configuré — notification ignorée');
      return;
    }
    logger.info('notifyWithdrawalChannel: envoi vers canal', { channelId });
    await telegram.sendMessage(channelId, text, {
      parse_mode: 'Markdown',
      ...extra,
    }).catch((err) =>
      logger.warn('notifyWithdrawalChannel send failed', { channelId, err: err.message })
    );
  } catch (err) {
    logger.error('notifyWithdrawalChannel error', { err: err.message });
  }
}

/**
 * Envoyer une notification avec photo dans le canal de retrait
 */
export async function notifyWithdrawalChannelPhoto(telegram, photo, caption, extra = {}) {
  try {
    const channelId = await getSetting('withdrawal_channel');
    if (!channelId) {
      logger.warn('notifyWithdrawalChannelPhoto: withdrawal_channel non configuré — notification ignorée');
      return;
    }
    logger.info('notifyWithdrawalChannelPhoto: envoi photo vers canal', { channelId });
    await telegram.sendPhoto(channelId, photo, {
      caption,
      parse_mode: 'Markdown',
      ...extra,
    }).catch((err) => {
      logger.warn('notifyWithdrawalChannelPhoto send failed', { channelId, err: err.message });
    });
  } catch (err) {
    logger.error('notifyWithdrawalChannelPhoto error', { err: err.message });
  }
}

/**
 * Notifier un utilisateur spécifique
 */
export async function notifyUser(telegram, userId, text, extra = {}) {
  try {
    await telegram.sendMessage(userId, text, {
      parse_mode: 'Markdown',
      ...extra,
    });
  } catch (err) {
    logger.warn('notifyUser failed', { userId, err: err.message });
  }
}
