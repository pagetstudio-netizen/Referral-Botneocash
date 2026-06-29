// @ts-nocheck
import { Router } from "express";
import crypto from "crypto";
import { logger } from "../lib/logger";

const router = Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "pagetstudio@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "AAbb11##";
const ADMIN_NAME = process.env.ADMIN_NAME || "Administrateur";
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || "moon-crypto-admin-secret-2024";

function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) })).toString("base64url");
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verifyToken(token) {
  try {
    const [header, body, sig] = token.split(".");
    const expected = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Non autorisé" });
  }
  const token = auth.slice(7);
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Token invalide ou expiré" });
  req.admin = payload;
  next();
}

async function getDb() {
  const { queryAll, queryOne, queryScalar } = await import("../../../bot/database/db.js");
  return { queryAll, queryOne, queryScalar };
}

router.post("/admin/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis" });
  }
  if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Email ou mot de passe incorrect" });
  }
  const token = signToken({
    email: ADMIN_EMAIL,
    name: ADMIN_NAME,
    exp: Math.floor(Date.now() / 1000) + 86400 * 7,
  });
  logger.info({ email }, "Admin web login");
  res.json({ token, admin: { email: ADMIN_EMAIL, name: ADMIN_NAME } });
});

router.get("/admin/stats", authMiddleware, async (req, res) => {
  try {
    const { queryAll, queryScalar } = await getDb();

    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers, todayUsers, weekUsers, monthUsers, activeUsers, bannedUsers,
      totalWd, pendingWd, approvedWd, rejectedWd,
      wdApprovedAmount, bonusTotal,
    ] = await Promise.all([
      queryScalar("SELECT COUNT(*) FROM users"),
      queryScalar("SELECT COUNT(*) FROM users WHERE created_at >= $1", [startOfDay]),
      queryScalar("SELECT COUNT(*) FROM users WHERE created_at >= $1", [startOfWeek]),
      queryScalar("SELECT COUNT(*) FROM users WHERE created_at >= $1", [startOfMonth]),
      queryScalar("SELECT COUNT(*) FROM users WHERE last_activity_at >= $1", [startOfWeek]),
      queryScalar("SELECT COUNT(*) FROM users WHERE banned = true"),
      queryScalar("SELECT COUNT(*) FROM withdrawals"),
      queryScalar("SELECT COUNT(*) FROM withdrawals WHERE status = 'pending'"),
      queryScalar("SELECT COUNT(*) FROM withdrawals WHERE status = 'approved'"),
      queryScalar("SELECT COUNT(*) FROM withdrawals WHERE status = 'rejected'"),
      queryScalar("SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status = 'approved'"),
      queryScalar("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type LIKE '%bonus%'"),
    ]);

    res.json({
      users: { total: Number(totalUsers), today: Number(todayUsers), week: Number(weekUsers), month: Number(monthUsers), active: Number(activeUsers), banned: Number(bannedUsers) },
      withdrawals: { total: Number(totalWd), pending: Number(pendingWd), approved: Number(approvedWd), rejected: Number(rejectedWd), totalApprovedAmount: Number(wdApprovedAmount) },
      bonuses: { total: Number(bonusTotal) },
    });
  } catch (err) {
    logger.error({ err }, "Admin stats error");
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/users", authMiddleware, async (req, res) => {
  try {
    const { queryAll, queryScalar } = await getDb();
    const { search, page = 1, limit = 20, banned } = req.query;

    let sql = "SELECT * FROM users WHERE 1=1";
    const params = [];
    let i = 1;

    if (search && String(search).trim()) {
      const q = String(search).trim().replace("@", "");
      sql += ` AND (username ILIKE $${i} OR first_name ILIKE $${i} OR telegram_id::text = $${i + 1})`;
      params.push(`%${q}%`, q);
      i += 2;
    }
    if (banned === "true") { sql += ` AND banned = $${i++}`; params.push(true); }
    else if (banned === "false") { sql += ` AND banned = $${i++}`; params.push(false); }

    const countSql = sql.replace("SELECT *", "SELECT COUNT(*)");
    const total = Number(await queryScalar(countSql, params));

    const offset = (Number(page) - 1) * Number(limit);
    sql += ` ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(Number(limit), offset);

    const rows = await queryAll(sql, params);
    const users = rows.map((r) => ({
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
    logger.error({ err }, "Admin list users error");
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/users/:telegramId", authMiddleware, async (req, res) => {
  try {
    const { queryOne } = await getDb();
    const r = await queryOne("SELECT * FROM users WHERE telegram_id = $1", [Number(req.params.telegramId)]);
    if (!r) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json({
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
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/users/:telegramId/ban", authMiddleware, async (req, res) => {
  try {
    const { queryOne } = await getDb();
    const { banned, reason } = req.body;
    const r = await queryOne("SELECT * FROM users WHERE telegram_id = $1", [Number(req.params.telegramId)]);
    if (!r) return res.status(404).json({ error: "Utilisateur introuvable" });

    if (banned) {
      await queryOne("UPDATE users SET banned = true, banned_at = NOW(), banned_reason = $1 WHERE telegram_id = $2", [reason || "Banni par admin web", Number(req.params.telegramId)]);
    } else {
      await queryOne("UPDATE users SET banned = false, banned_at = NULL, banned_reason = NULL WHERE telegram_id = $1", [Number(req.params.telegramId)]);
    }
    logger.info({ telegramId: req.params.telegramId, banned }, "Admin ban user");
    res.json({ success: true, message: banned ? "Utilisateur banni" : "Utilisateur débanni" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/users/:telegramId/credit", authMiddleware, async (req, res) => {
  try {
    const { queryOne } = await getDb();
    const { amount, type } = req.body;
    const amt = parseInt(amount, 10);
    if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: "Montant invalide" });

    const r = await queryOne("SELECT * FROM users WHERE telegram_id = $1", [Number(req.params.telegramId)]);
    if (!r) return res.status(404).json({ error: "Utilisateur introuvable" });

    const balBefore = r.balance;
    let balAfter;
    if (type === "debit") {
      balAfter = Math.max(0, balBefore - amt);
    } else {
      balAfter = balBefore + amt;
    }

    await queryOne("UPDATE users SET balance = $1 WHERE telegram_id = $2", [balAfter, Number(req.params.telegramId)]);
    await queryOne(
      "INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description) VALUES ($1, $2, $3, $4, $5, $6)",
      [Number(req.params.telegramId), type === "debit" ? "admin_debit" : "admin_credit", type === "debit" ? -amt : amt, balBefore, balAfter, type === "debit" ? "Débit admin web" : "Crédit admin web"]
    );
    logger.info({ telegramId: req.params.telegramId, type, amount: amt }, "Admin credit/debit user");
    res.json({ success: true, message: `${type === "debit" ? "Débit" : "Crédit"} de ${amt} USDT effectué` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/users/:telegramId/withdrawal-unlock", authMiddleware, async (req, res) => {
  try {
    const { queryOne } = await getDb();
    const { unlocked } = req.body;
    const r = await queryOne("SELECT telegram_id FROM users WHERE telegram_id = $1", [Number(req.params.telegramId)]);
    if (!r) return res.status(404).json({ error: "Utilisateur introuvable" });

    await queryOne("UPDATE users SET withdrawal_unlocked = $1 WHERE telegram_id = $2", [!!unlocked, Number(req.params.telegramId)]);
    logger.info({ telegramId: req.params.telegramId, unlocked }, "Admin toggle withdrawal");
    res.json({ success: true, message: unlocked ? "Retrait débloqué" : "Retrait verrouillé" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/withdrawals", authMiddleware, async (req, res) => {
  try {
    const { queryAll, queryScalar } = await getDb();
    const { status, page = 1, limit = 20 } = req.query;

    let sql = "SELECT * FROM withdrawals WHERE 1=1";
    const params = [];
    let i = 1;

    if (status) { sql += ` AND status = $${i++}`; params.push(status); }

    const countSql = sql.replace("SELECT *", "SELECT COUNT(*)");
    const total = Number(await queryScalar(countSql, params));

    const offset = (Number(page) - 1) * Number(limit);
    sql += ` ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`;
    params.push(Number(limit), offset);

    const rows = await queryAll(sql, params);
    const withdrawals = rows.map((r) => ({
      id: Number(r.id),
      telegramId: Number(r.telegram_id),
      firstName: r.first_name,
      beneficiaryName: r.beneficiary_name || "",
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
    logger.error({ err }, "Admin list withdrawals error");
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/withdrawals/:id/approve", authMiddleware, async (req, res) => {
  try {
    const { queryOne } = await getDb();
    const { note } = req.body;
    const wd = await queryOne("SELECT * FROM withdrawals WHERE id = $1", [Number(req.params.id)]);
    if (!wd) return res.status(404).json({ error: "Retrait introuvable" });
    if (wd.status !== "pending") return res.status(400).json({ error: "Ce retrait n'est plus en attente" });

    await queryOne("UPDATE withdrawals SET status = 'approved', admin_note = $1, processed_at = NOW() WHERE id = $2", [note || null, Number(req.params.id)]);
    await queryOne("UPDATE users SET total_withdrawn = total_withdrawn + $1 WHERE telegram_id = $2", [wd.amount, wd.telegram_id]);

    logger.info({ id: wd.id, amount: wd.amount }, "Admin approve withdrawal");
    res.json({ success: true, message: "Retrait approuvé" });

    setImmediate(async () => {
      try {
        const bot = (global as any).moonCryptoBot;
        if (!bot) return;
        await bot.telegram.sendMessage(
          wd.telegram_id,
          `✅ *RETRAIT APPROUVÉ !*\n\n━━━━━━━━━━━━━━━━━━\n💰 Montant : *${wd.amount} USDT*\n📱 Opérateur : *${wd.operator}*\n📞 Numéro : \`${wd.phone}\`\n\n🎉 Ton paiement a été effectué !`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        logger.warn({ err }, "Approve notif error");
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/withdrawals/:id/reject", authMiddleware, async (req, res) => {
  try {
    const { queryOne } = await getDb();
    const { note } = req.body;
    const wd = await queryOne("SELECT * FROM withdrawals WHERE id = $1", [Number(req.params.id)]);
    if (!wd) return res.status(404).json({ error: "Retrait introuvable" });
    if (wd.status !== "pending") return res.status(400).json({ error: "Ce retrait n'est plus en attente" });

    await queryOne("UPDATE withdrawals SET status = 'rejected', admin_note = $1, processed_at = NOW() WHERE id = $2", [note || null, Number(req.params.id)]);
    await queryOne("UPDATE users SET balance = balance + $1 WHERE telegram_id = $2", [wd.amount, wd.telegram_id]);

    logger.info({ id: wd.id }, "Admin reject withdrawal");
    res.json({ success: true, message: "Retrait refusé et montant remboursé" });

    setImmediate(async () => {
      try {
        const bot = (global as any).moonCryptoBot;
        if (!bot) return;
        await bot.telegram.sendMessage(
          wd.telegram_id,
          `❌ *RETRAIT REFUSÉ*\n\n━━━━━━━━━━━━━━━━━━\n💰 Montant : *${wd.amount} USDT*\n\n🔄 Ton solde a été remboursé.`,
          { parse_mode: "Markdown" }
        );
      } catch (err) {
        logger.warn({ err }, "Reject notif error");
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/settings", authMiddleware, async (req, res) => {
  try {
    const { queryOne } = await getDb();
    const getS = async (key: string) => {
      const r = await queryOne("SELECT value FROM settings WHERE key = $1", [key]);
      return r?.value;
    };

    const [referralBonus, dailyBonus, minWithdraw, requiredChannel, requiredGroup,
      supportLink, supportMessage, maintenanceMode, botName, withdrawalChannel, adminGroupId] = await Promise.all([
      getS("referral_bonus"), getS("daily_bonus"), getS("min_withdraw"),
      getS("required_channel"), getS("required_group"), getS("support_link"),
      getS("support_message"), getS("maintenance_mode"), getS("bot_name"),
      getS("withdrawal_channel"), getS("admin_group_id"),
    ]);

    res.json({
      referralBonus: Number(referralBonus) || 120,
      dailyBonus: Number(dailyBonus) || 100,
      minWithdraw: Number(minWithdraw) || 800,
      requiredChannel: requiredChannel || "",
      requiredGroup: requiredGroup || "",
      supportLink: supportLink || "",
      supportMessage: supportMessage || "",
      maintenanceMode: maintenanceMode === "true",
      botName: botName || "Moon Crypto",
      withdrawalChannel: withdrawalChannel || "",
      adminGroupId: adminGroupId || "",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/admin/settings", authMiddleware, async (req, res) => {
  try {
    const { queryOne } = await getDb();
    const updates = req.body;
    const mapping: Record<string, string> = {
      referralBonus: "referral_bonus", dailyBonus: "daily_bonus", minWithdraw: "min_withdraw",
      requiredChannel: "required_channel", requiredGroup: "required_group",
      supportLink: "support_link", supportMessage: "support_message",
      maintenanceMode: "maintenance_mode", botName: "bot_name",
      withdrawalChannel: "withdrawal_channel", adminGroupId: "admin_group_id",
    };
    for (const [key, dbKey] of Object.entries(mapping)) {
      if (updates[key] !== undefined) {
        await queryOne(
          "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
          [dbKey, String(updates[key])]
        );
      }
    }
    logger.info({ keys: Object.keys(updates) }, "Admin updated settings");
    res.json({ success: true, message: "Paramètres mis à jour" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/channels", authMiddleware, async (req, res) => {
  try {
    const { queryAll } = await getDb();
    const rows = await queryAll("SELECT * FROM required_channels ORDER BY display_order ASC", []);
    res.json(rows.map((r) => ({
      id: r.id, label: r.label, type: r.type, chatIdOrUrl: r.chat_id_or_url,
      displayOrder: r.display_order, isActive: r.is_active, subscribers: r.subscribers ?? 0, createdAt: r.created_at,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/channels", authMiddleware, async (req, res) => {
  try {
    const { queryOne } = await getDb();
    const { label, type, chatIdOrUrl, displayOrder } = req.body;
    if (!label || !chatIdOrUrl) return res.status(400).json({ error: "label et chatIdOrUrl requis" });
    if (!["channel", "group", "website"].includes(type)) {
      return res.status(400).json({ error: "type invalide (channel, group, website)" });
    }
    const r = await queryOne(
      "INSERT INTO required_channels (label, type, chat_id_or_url, display_order) VALUES ($1, $2, $3, $4) RETURNING *",
      [label, type, chatIdOrUrl, displayOrder ?? 0]
    );
    res.status(201).json({ id: r.id, label: r.label, type: r.type, chatIdOrUrl: r.chat_id_or_url, displayOrder: r.display_order, isActive: r.is_active, subscribers: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/admin/channels/:id", authMiddleware, async (req, res) => {
  try {
    const { queryOne } = await getDb();
    const { label, type, chatIdOrUrl, displayOrder, isActive } = req.body;
    const r = await queryOne(
      "UPDATE required_channels SET label=$1, type=$2, chat_id_or_url=$3, display_order=$4, is_active=$5 WHERE id=$6 RETURNING *",
      [label, type, chatIdOrUrl, displayOrder ?? 0, isActive ?? true, req.params.id]
    );
    if (!r) return res.status(404).json({ error: "Canal introuvable" });
    res.json({ id: r.id, label: r.label, type: r.type, chatIdOrUrl: r.chat_id_or_url, displayOrder: r.display_order, isActive: r.is_active });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/admin/channels/:id", authMiddleware, async (req, res) => {
  try {
    const { queryOne } = await getDb();
    await queryOne("DELETE FROM required_channels WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/broadcast", authMiddleware, async (req, res) => {
  try {
    const { message, buttonLabel, buttonUrl, imageBase64 } = req.body;
    if (!message) return res.status(400).json({ error: "Message requis" });

    res.json({ status: "started", message: "Diffusion lancée en arrière-plan" });

    setImmediate(async () => {
      try {
        const { queryAll } = await getDb();
        const users = await queryAll("SELECT telegram_id FROM users WHERE banned = false", []);
        const bot = (global as any).moonCryptoBot;
        if (!bot) { logger.warn("Broadcast: bot non disponible"); return; }

        const replyOpts = buttonLabel && buttonUrl
          ? { reply_markup: { inline_keyboard: [[{ text: buttonLabel, url: buttonUrl }]] } }
          : {};

        const imageBuffer = imageBase64 ? Buffer.from(imageBase64, "base64") : null;
        let sent = 0, failed = 0;
        for (const user of users) {
          try {
            if (imageBuffer) {
              await bot.telegram.sendPhoto(user.telegram_id, { source: imageBuffer }, { caption: message, parse_mode: "Markdown", ...replyOpts });
            } else {
              await bot.telegram.sendMessage(user.telegram_id, message, { parse_mode: "Markdown", ...replyOpts });
            }
            sent++;
          } catch { failed++; }
          await new Promise((r) => setTimeout(r, 50));
        }
        logger.info({ total: users.length, sent, failed }, "Broadcast terminé");
      } catch (err) {
        logger.error({ err }, "Broadcast error");
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
