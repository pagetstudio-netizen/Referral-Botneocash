/**
 * Système de notifications admins
 */
import { getSetting } from '../models/Settings.js';
import logger from './logger.js';

/**
 * Envoyer une notification à tous les admins
 * @param {Object} telegram - Instance telegram du bot
 * @param {Object} options - { type, text, extra }
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
