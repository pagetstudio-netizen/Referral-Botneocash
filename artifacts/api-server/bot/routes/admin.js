/**
 * Routes Admin — Tableau de bord web Moon Crypto
 */
import { Router } from 'express';
import crypto from 'crypto';
import User from '../models/User.js';
import Withdrawal from '../models/Withdrawal.js';
import Transaction from '../models/Transaction.js';
import RequiredChannel from '../models/RequiredChannel.js';
import { getSetting, setSetting } from '../models/Settings.js';
import { notifyUser, notifyWithdrawalChannelPhoto } from '../utils/notify.js';
import { formatAmount, escapeMarkdown } from '../utils/messages.js';
import { createReadStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = join(__dirname, '../assets/logo.png');

function maskPhone(phone) {
  const clean = String(phone).replace(/\s/g, '');
  if (clean.length < 6) return clean;
  const visible_start = clean.slice(0, Math.min(6, clean.length - 2));
  const visible_end   = clean.slice(-2);
  const hidden_count  = clean.length - visible_start.length - visible_end.length;
  const hidden        = 'X'.repeat(hidden_count);
  const all = visible_start + hidden + visible_end;
  const prefix = all.startsWith('+') ? '+' : '';
  const digits = all.replace('+', '');
  const groups = digits.match(/.{1,2}/g) || [digits];
  return prefix + groups.join(' ');
}

function maskName(name) {
  if (!name) return '***';
  const trimmed = name.trim();
  if (trimmed.length <= 1) return trimmed + '*';
  if (trimmed.length === 2) return trimmed[0] + '*';
  if (trimmed.length === 3) return trimmed[0] + '**';
  return trimmed[0] + '***' + trimmed.slice(-2);
}

const router = Router();

// ─── Config Admin ──────────────────────────────────────────────────────────────
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'pagetstudio@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AAbb11##';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Administrateur';
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'moon-crypto-admin-secret-2024';

function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyToken(token) {
  try {
    const [header, body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  const token = auth.slice(7);
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Token invalide ou expiré' });
  req.admin = payload;
  next();
}

// ─── POST /api/admin/login ─────────────────────────────────────────────────────
router.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }
  if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }
  const token = signToken({
    email: ADMIN_EMAIL,
    name: ADMIN_NAME,
    exp: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 jours
  });
  logger.info('Admin web login', { email });
  res.json({
    token,
    admin: { email: ADMIN_EMAIL, name: ADMIN_NAME },
  });
});

// ─── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get('/admin/stats', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers, todayUsers, weekUsers, monthUsers, activeUsers, bannedUsers,
      totalWd, pendingWd, approvedWd, rejectedWd,
      wdStats, bonusTotal, languages,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startOfDay } }),
      User.countDocuments({ createdAt: { $gte: startOfWeek } }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      User.countDocuments({ lastActivityAt: { $gte: startOfWeek } }),
      User.countDocuments({ banned: true }),
      Withdrawal.countDocuments(),
      Withdrawal.countDocuments({ status: 'pending' }),
      Withdrawal.countDocuments({ status: 'approved' }),
      Withdrawal.countDocuments({ status: 'rejected' }),
      Withdrawal.sumByStatus(),
      Transaction.sumBonuses(),
      User.countByLanguage(),
    ]);

    res.json({
      users: { total: totalUsers, today: todayUsers, week: weekUsers, month: monthUsers, active: activeUsers, banned: bannedUsers },
      withdrawals: { total: totalWd, pending: pendingWd, approved: approvedWd, rejected: rejectedWd, totalApprovedAmount: wdStats.approved || 0 },
      bonuses: { total: bonusTotal },
      languages,
    });
  } catch (err) {
    logger.error('Admin stats error', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/users ──────────────────────────────────────────────────────
router.get('/admin/users', authMiddleware, async (req, res) => {
  try {
    const { search, page = 1, limit = 20, banned } = req.query;
    const { queryAll, queryOne: _qo, queryScalar } = await import('../database/db.js');

    let sql = 'SELECT * FROM users WHERE 1=1';
    const params = [];
    let i = 1;

    if (search && search.trim()) {
      const q = search.trim().replace('@', '');
      sql += ` AND (username ILIKE $${i} OR first_name ILIKE $${i} OR telegram_id::text = $${i+1})`;
      params.push(`%${q}%`, q);
      i += 2;
    }
    if (banned === 'true') { sql += ` AND banned = $${i++}`; params.push(true); }
    else if (banned === 'false') { sql += ` AND banned = $${i++}`; params.push(false); }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*)');
    const total = Number(await queryScalar(countSql, params));

    const offset = (Number(page) - 1) * Number(limit);
    sql += ` ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(Number(limit), offset);

    const rows = await queryAll(sql, params);
    const users = rows.map(r => ({
      telegramId: Number(r.telegram_id),
      username: r.username,
      firstName: r.first_name,
      lastName: r.last_name,
      balance: r.balance,
      referralCode: r.referral_code,
      referralCount: r.referral_count,
      referralEarnings: r.referral_earnings,
      bonusEarnings: r.bonus_earnings,
      totalWithdrawn: r.total_withdrawn,
      banned: r.banned,
      bannedReason: r.banned_reason,
      withdrawalUnlocked: r.withdrawal_unlocked ?? false,
      lastActivityAt: r.last_activity_at,
      createdAt: r.created_at,
    }));

    res.json({ users, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    logger.error('Admin list users error', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/users/:telegramId ─────────────────────────────────────────
router.get('/admin/users/:telegramId', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: Number(req.params.telegramId) });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json({
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      balance: user.balance,
      referralCode: user.referralCode,
      referralCount: user.referralCount,
      referralEarnings: user.referralEarnings,
      bonusEarnings: user.bonusEarnings,
      totalWithdrawn: user.totalWithdrawn,
      banned: user.banned,
      bannedReason: user.bannedReason,
      withdrawalUnlocked: user.withdrawalUnlocked,
      lastActivityAt: user.lastActivityAt,
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/users/:telegramId/ban ─────────────────────────────────────
router.post('/admin/users/:telegramId/ban', authMiddleware, async (req, res) => {
  try {
    const { banned, reason } = req.body;
    const user = await User.findOne({ telegramId: Number(req.params.telegramId) });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    user.banned = !!banned;
    if (banned) {
      user.bannedAt = new Date();
      user.bannedReason = reason || 'Banni par admin web';
    } else {
      user.bannedAt = null;
      user.bannedReason = null;
    }
    await user.save();
    logger.info('Admin ban user', { telegramId: user.telegramId, banned });
    res.json({ success: true, message: banned ? 'Utilisateur banni' : 'Utilisateur débanni' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/users/:telegramId/credit ──────────────────────────────────
router.post('/admin/users/:telegramId/credit', authMiddleware, async (req, res) => {
  try {
    const { amount, type } = req.body;
    const amt = parseInt(amount, 10);
    if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Montant invalide' });

    const user = await User.findOne({ telegramId: Number(req.params.telegramId) });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const balBefore = user.balance;
    if (type === 'debit') {
      user.balance = Math.max(0, user.balance - amt);
    } else {
      user.balance += amt;
    }
    await user.save();
    await Transaction.create({
      userId: user.telegramId,
      type: type === 'debit' ? 'admin_debit' : 'admin_credit',
      amount: type === 'debit' ? -amt : amt,
      balanceBefore: balBefore,
      balanceAfter: user.balance,
      description: type === 'debit' ? 'Débit admin web' : 'Crédit admin web',
    });
    logger.info('Admin credit/debit user', { telegramId: user.telegramId, type, amount: amt });
    res.json({ success: true, message: `${type === 'debit' ? 'Débit' : 'Crédit'} de ${amt} USDT effectué` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/users/:telegramId/withdrawal-unlock ───────────────────────
router.post('/admin/users/:telegramId/withdrawal-unlock', authMiddleware, async (req, res) => {
  try {
    const { unlocked } = req.body;
    const user = await User.findOne({ telegramId: Number(req.params.telegramId) });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    user.withdrawalUnlocked = !!unlocked;
    await user.save();
    logger.info('Admin toggle withdrawal', { telegramId: user.telegramId, unlocked });
    res.json({ success: true, message: unlocked ? 'Retrait débloqué' : 'Retrait verrouillé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/withdrawals ────────────────────────────────────────────────
router.get('/admin/withdrawals', authMiddleware, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const { queryAll, queryScalar } = await import('../database/db.js');

    let sql = 'SELECT * FROM withdrawals WHERE 1=1';
    const params = [];
    let i = 1;

    if (status) { sql += ` AND status = $${i++}`; params.push(status); }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*)');
    const total = Number(await queryScalar(countSql, params));

    const offset = (Number(page) - 1) * Number(limit);
    sql += ` ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(Number(limit), offset);

    const rows = await queryAll(sql, params);
    const withdrawals = rows.map(r => ({
      id: Number(r.id),
      telegramId: Number(r.telegram_id),
      firstName: r.first_name,
      beneficiaryName: r.beneficiary_name || '',
      username: r.username,
      country: r.country,
      countryName: r.country_name,
      operator: r.operator,
      phone: r.phone,
      amount: r.amount,
      status: r.status,
      adminNote: r.admin_note,
      processedAt: r.processed_at,
      createdAt: r.created_at,
    }));

    res.json({ withdrawals, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    logger.error('Admin list withdrawals error', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/withdrawals/:id/approve ──────────────────────────────────
router.post('/admin/withdrawals/:id/approve', authMiddleware, async (req, res) => {
  try {
    const { note } = req.body;
    const wd = await Withdrawal.findById(Number(req.params.id));
    if (!wd) return res.status(404).json({ error: 'Retrait introuvable' });
    if (wd.status !== 'pending') return res.status(400).json({ error: 'Ce retrait n\'est plus en attente' });

    wd.status = 'approved';
    wd.adminNote = note || null;
    wd.processedAt = new Date();
    await wd.save();

    const user = await User.findOne({ telegramId: wd.telegramId });
    if (user) {
      user.totalWithdrawn = (user.totalWithdrawn || 0) + wd.amount;
      await user.save();
    }

    logger.info('Admin approve withdrawal', { id: wd.id, amount: wd.amount });
    res.json({ success: true, message: 'Retrait approuvé' });

    // ─── Notifications Telegram (en arrière-plan) ───────────────────────────
    setImmediate(async () => {
      try {
        const bot = global.moonCryptoBot;
        if (!bot) return;

        // Notification à l'utilisateur
        await notifyUser(
          bot.telegram,
          wd.telegramId,
          `✅ *RETRAIT APPROUVÉ !*\n\n━━━━━━━━━━━━━━━━━━\n💰 Montant : *${formatAmount(wd.amount)}*\n📱 Opérateur : *${escapeMarkdown(wd.operator)}*\n📞 Numéro : \`${wd.phone}\`\n\n🎉 Ton paiement a été effectué !`,
        );

        // Notification canal de retrait
        const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const botInfo = await bot.telegram.getMe();
        const botLink = `https://t.me/${botInfo.username}`;
        const caption =
          `✅ *PAIEMENT EFFECTUÉ*\n\n` +
          `🔍 Statut : Payé ✅\n` +
          `👤 Bénéficiaire : *${escapeMarkdown(maskName(wd.beneficiaryName || wd.firstName))}*\n` +
          `💰 Montant : *${formatAmount(wd.amount)}*\n` +
          `📱 Opérateur : *${escapeMarkdown(wd.operator)}*\n` +
          `📞 Numéro : \`${maskPhone(wd.phone)}\`\n` +
          `📅 Date : ${now}\n\n` +
          `💬 _Toi aussi tu peux gagner !_\n` +
          `👉 Lien bot`;
        await notifyWithdrawalChannelPhoto(
          bot.telegram,
          { source: createReadStream(LOGO_PATH) },
          caption,
          { reply_markup: { inline_keyboard: [[{ text: '🤖 Rejoindre Moon Crypto', url: botLink }]] } }
        );
      } catch (err) {
        logger.warn('Approve notif error', { err: err.message });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/withdrawals/:id/reject ───────────────────────────────────
router.post('/admin/withdrawals/:id/reject', authMiddleware, async (req, res) => {
  try {
    const { note } = req.body;
    const wd = await Withdrawal.findById(Number(req.params.id));
    if (!wd) return res.status(404).json({ error: 'Retrait introuvable' });
    if (wd.status !== 'pending') return res.status(400).json({ error: 'Ce retrait n\'est plus en attente' });

    const user = await User.findOne({ telegramId: wd.telegramId });

    wd.status = 'rejected';
    wd.adminNote = note || null;
    wd.processedAt = new Date();
    await wd.save();

    if (user) {
      user.balance += wd.amount;
      await user.save();
    }

    logger.info('Admin reject withdrawal', { id: wd.id });
    res.json({ success: true, message: 'Retrait refusé et montant remboursé' });

    // ─── Notification Telegram (en arrière-plan) ────────────────────────────
    setImmediate(async () => {
      try {
        const bot = global.moonCryptoBot;
        if (!bot) return;
        await notifyUser(
          bot.telegram,
          wd.telegramId,
          `❌ *RETRAIT REFUSÉ*\n\n━━━━━━━━━━━━━━━━━━\n💰 Montant : *${formatAmount(wd.amount)}*\n\n🔄 Ton solde a été remboursé.\nContacte le support si tu as des questions.`,
        );
      } catch (err) {
        logger.warn('Reject notif error', { err: err.message });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/settings ───────────────────────────────────────────────────
router.get('/admin/settings', authMiddleware, async (req, res) => {
  try {
    const [referralBonus, dailyBonus, minWithdraw, requiredChannel, requiredGroup,
           supportLink, supportMessage, maintenanceMode, botName, withdrawalChannel, adminGroupId] = await Promise.all([
      getSetting('referral_bonus'),
      getSetting('daily_bonus'),
      getSetting('min_withdraw'),
      getSetting('required_channel'),
      getSetting('required_group'),
      getSetting('support_link'),
      getSetting('support_message'),
      getSetting('maintenance_mode'),
      getSetting('bot_name'),
      getSetting('withdrawal_channel'),
      getSetting('admin_group_id'),
    ]);
    res.json({
      referralBonus: Number(referralBonus) || 120,
      dailyBonus: Number(dailyBonus) || 100,
      minWithdraw: Number(minWithdraw) || 800,
      requiredChannel: requiredChannel || '',
      requiredGroup: requiredGroup || '',
      supportLink: supportLink || '',
      supportMessage: supportMessage || '',
      maintenanceMode: !!maintenanceMode,
      botName: botName || 'Moon Crypto',
      withdrawalChannel: withdrawalChannel || '',
      adminGroupId: adminGroupId || '',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/admin/settings ───────────────────────────────────────────────────
router.put('/admin/settings', authMiddleware, async (req, res) => {
  try {
    const updates = req.body;
    const mapping = {
      referralBonus: 'referral_bonus',
      dailyBonus: 'daily_bonus',
      minWithdraw: 'min_withdraw',
      requiredChannel: 'required_channel',
      requiredGroup: 'required_group',
      supportLink: 'support_link',
      supportMessage: 'support_message',
      maintenanceMode: 'maintenance_mode',
      botName: 'bot_name',
      withdrawalChannel: 'withdrawal_channel',
      adminGroupId: 'admin_group_id',
    };
    for (const [key, dbKey] of Object.entries(mapping)) {
      if (updates[key] !== undefined) {
        await setSetting(dbKey, updates[key]);
      }
    }
    logger.info('Admin updated settings', { keys: Object.keys(updates) });
    res.json({ success: true, message: 'Paramètres mis à jour' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/channels ───────────────────────────────────────────────────
router.get('/admin/channels', authMiddleware, async (req, res) => {
  try {
    const channels = await RequiredChannel.findAllAdmin();
    res.json(channels.map(ch => ({
      id: ch.id,
      label: ch.label,
      type: ch.type,
      chatIdOrUrl: ch.chatIdOrUrl,
      displayOrder: ch.displayOrder,
      isActive: ch.isActive,
      subscribers: ch.subscribers ?? 0,
      createdAt: ch.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/channels ──────────────────────────────────────────────────
router.post('/admin/channels', authMiddleware, async (req, res) => {
  try {
    const { label, type, chatIdOrUrl, displayOrder } = req.body;
    if (!label || !chatIdOrUrl) return res.status(400).json({ error: 'label et chatIdOrUrl requis' });
    if (!['channel', 'group', 'website'].includes(type)) {
      return res.status(400).json({ error: 'type invalide (channel, group, website)' });
    }
    const ch = await RequiredChannel.create({ label, type, chatIdOrUrl, displayOrder: displayOrder ?? 0 });
    logger.info('Admin added required channel', { label, type, chatIdOrUrl });
    res.status(201).json({ id: ch.id, label: ch.label, type: ch.type, chatIdOrUrl: ch.chatIdOrUrl, displayOrder: ch.displayOrder, isActive: ch.isActive, subscribers: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/admin/channels/:id ───────────────────────────────────────────────
router.put('/admin/channels/:id', authMiddleware, async (req, res) => {
  try {
    const { label, type, chatIdOrUrl, displayOrder, isActive } = req.body;
    const ch = await RequiredChannel.update(req.params.id, {
      label, type, chatIdOrUrl, displayOrder: displayOrder ?? 0, isActive: isActive ?? true,
    });
    if (!ch) return res.status(404).json({ error: 'Canal introuvable' });
    logger.info('Admin updated required channel', { id: req.params.id });
    res.json({ id: ch.id, label: ch.label, type: ch.type, chatIdOrUrl: ch.chatIdOrUrl, displayOrder: ch.displayOrder, isActive: ch.isActive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/admin/channels/:id ────────────────────────────────────────────
router.delete('/admin/channels/:id', authMiddleware, async (req, res) => {
  try {
    await RequiredChannel.delete(req.params.id);
    logger.info('Admin deleted required channel', { id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/broadcast ─────────────────────────────────────────────────
router.post('/admin/broadcast', authMiddleware, async (req, res) => {
  try {
    const { message, buttonLabel, buttonUrl, imageBase64, imageMimeType } = req.body;
    if (!message) return res.status(400).json({ error: 'Message requis' });

    const imageBuffer = imageBase64 ? Buffer.from(imageBase64, 'base64') : null;

    res.json({ status: 'started', message: 'Diffusion lancée en arrière-plan' });

    setImmediate(async () => {
      try {
        const { queryAll } = await import('../database/db.js');
        const users = await queryAll('SELECT telegram_id FROM users WHERE banned = false', []);
        const bot = global.moonCryptoBot;
        if (!bot) { logger.warn('Broadcast: bot non disponible'); return; }

        const replyOpts = buttonLabel && buttonUrl
          ? { reply_markup: { inline_keyboard: [[{ text: buttonLabel, url: buttonUrl }]] } }
          : {};

        let sent = 0, failed = 0;
        for (const user of users) {
          try {
            if (imageBuffer) {
              await bot.telegram.sendPhoto(
                user.telegram_id,
                { source: imageBuffer },
                { caption: message, parse_mode: 'Markdown', ...replyOpts }
              );
            } else {
              await bot.telegram.sendMessage(user.telegram_id, message, { parse_mode: 'Markdown', ...replyOpts });
            }
            sent++;
          } catch {
            failed++;
          }
          await new Promise(r => setTimeout(r, 50));
        }
        logger.info('Broadcast terminé', { total: users.length, sent, failed, withImage: !!imageBuffer });
      } catch (err) {
        logger.error('Broadcast error', { err: err.message });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
