/**
 * Adsgram — Regarder des publicités pour gagner 0.002 USDT
 * API doc: https://docs.adsgram.ai/bots/block-integration
 */
import { Markup } from 'telegraf';
import { getLang } from '../utils/i18n.js';
import logger from '../utils/logger.js';

// ─── Constantes (valeurs par défaut — configurables depuis l'admin) ───────────
const AD_REWARD_USDT_DEFAULT = 0.002; // Récompense par pub (défaut)
const AD_COOLDOWN_MIN_DEFAULT = 5;    // Délai entre pubs en minutes (défaut)
const AD_DAILY_LIMIT_DEFAULT  = 10;   // Max pubs par jour (défaut)
const AD_CLAIM_WINDOW = 15 * 60_000;  // 15 min pour cliquer "J'ai regardé" (fixe)

// Lire les paramètres configurés par l'admin (cache 60s via Settings)
async function getAdConfig() {
  const { getSetting } = await import('../models/Settings.js');
  const [reward, limit, cooldown] = await Promise.all([
    getSetting('ad_reward_usdt'),
    getSetting('ad_daily_limit'),
    getSetting('ad_cooldown_min'),
  ]);
  return {
    rewardUsdt:    Number(reward)   || AD_REWARD_USDT_DEFAULT,
    dailyLimit:    Number(limit)    || AD_DAILY_LIMIT_DEFAULT,
    cooldownMs:    (Number(cooldown) || AD_COOLDOWN_MIN_DEFAULT) * 60_000,
  };
}

// ─── État anti-abus par utilisateur (en mémoire, reset quotidien) ─────────────
// userId → { adShownAt, lastClaimedAt, dailyCount, dayDate }
const _adState = new Map();

function getAdState(userId) {
  const today = new Date().toDateString();
  const s = _adState.get(userId);
  if (!s || s.dayDate !== today) {
    return { adShownAt: 0, lastClaimedAt: 0, dailyCount: 0, dayDate: today };
  }
  return s;
}

function setAdState(userId, patch) {
  const current = getAdState(userId);
  _adState.set(userId, { ...current, ...patch, dayDate: new Date().toDateString() });
}

// ─── Récupérer la pub depuis l'API Adsgram ────────────────────────────────────
async function fetchAd(userId, lang) {
  const blockId = (process.env.ADSGRAM_BLOCK_ID || '').replace(/^bot-/i, '').trim();
  const token   = (process.env.ADSGRAM_TOKEN || '').trim();
  if (!blockId || !token) return 'not_configured';

  const adLang = ['en', 'de', 'zh', 'fr'].includes(lang) ? lang : 'fr';
  const url = `https://api.adsgram.ai/advbot?tgid=${userId}&blockid=${blockId}&language=${adLang}&token=${token}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (res.status === 404) return 'no_ad';
  if (!res.ok) throw new Error(`Adsgram ${res.status}: ${await res.text().catch(() => '')}`);
  return await res.json();
}

// ─── /ads ou bouton "📺 Regarder une pub" ─────────────────────────────────────
export async function handleWatchAds(ctx) {
  const lang   = getLang(ctx);
  const userId = ctx.from?.id;
  if (!userId) return;

  // Config manquante
  const blockId = (process.env.ADSGRAM_BLOCK_ID || '').replace(/^bot-/i, '').trim();
  const token   = (process.env.ADSGRAM_TOKEN || '').trim();
  if (!blockId || !token) {
    return ctx.reply(
      '⚙️ *Système de publicités non activé*\n\nReviens bientôt, nous travaillons dessus !',
      { parse_mode: 'Markdown' },
    );
  }

  // Lire la config admin (reward, limite, cooldown)
  const cfg   = await getAdConfig();
  const state = getAdState(userId);
  const now   = Date.now();

  if (state.dailyCount >= cfg.dailyLimit) {
    return ctx.reply(
      `🚫 *Limite quotidienne atteinte !*\n\nTu as déjà regardé *${cfg.dailyLimit} publicités* aujourd'hui.\n🌙 Reviens demain pour en gagner davantage !`,
      { parse_mode: 'Markdown' },
    );
  }

  const cooldownRemaining = cfg.cooldownMs - (now - state.lastClaimedAt);
  if (state.lastClaimedAt > 0 && cooldownRemaining > 0) {
    const mins = Math.ceil(cooldownRemaining / 60_000);
    return ctx.reply(
      `⏳ *Patiente encore ${mins} minute(s)* avant la prochaine pub.\n\n📊 Pubs vues aujourd'hui : *${state.dailyCount}/${cfg.dailyLimit}*`,
      { parse_mode: 'Markdown' },
    );
  }

  // Charger la pub
  const loadingMsg = await ctx.reply('⏳ Chargement de la publicité...').catch(() => null);

  let ad;
  try {
    ad = await fetchAd(userId, lang);
  } catch (err) {
    logger.error('handleWatchAds: fetchAd failed', { err: err.message });
    if (loadingMsg) await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
    return ctx.reply('❌ Erreur de chargement. Réessaie dans quelques secondes.');
  }

  if (loadingMsg) await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});

  if (ad === 'no_ad') {
    return ctx.reply(
      '😔 *Aucune publicité disponible* pour le moment.\nRéessaie dans quelques minutes !',
      { parse_mode: 'Markdown' },
    );
  }

  // Enregistrer l'affichage (timestamp en secondes dans le callback data)
  const nowSec = Math.floor(now / 1000);
  setAdState(userId, { adShownAt: now });

  // Callback data unique: ads_claim_{userId}_{nowSec}
  const claimData = `ads_claim_${userId}_${nowSec}`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.url(`🔗 ${ad.button_name || 'Voir la pub'}`, ad.click_url)],
    [Markup.button.url(`🎁 ${ad.button_reward_name || 'Réclamer la récompense'}`, ad.reward_url)],
    [Markup.button.callback(`✅ J'ai regardé — Recevoir +${cfg.rewardUsdt} USDT`, claimData)],
  ]);

  // Envoyer l'annonce avec protect_content=true (requis par Adsgram)
  await ctx.replyWithPhoto(ad.image_url, {
    caption: ad.text_html,
    parse_mode: 'HTML',
    protect_content: true,
    ...keyboard,
  }).catch(async () => {
    // Fallback si l'image est inaccessible
    await ctx.reply(ad.text_html, {
      parse_mode: 'HTML',
      protect_content: true,
      ...keyboard,
    }).catch(() => {});
  });
}

// ─── Callback inline : réclamer la récompense ─────────────────────────────────
export async function handleAdsClaim(ctx) {
  await ctx.answerCbQuery().catch(() => {});
  const userId = ctx.from?.id;
  if (!userId) return;

  // Format callback: ads_claim_{adUserId}_{timestamp_sec}
  const parts    = (ctx.callbackQuery.data || '').split('_');
  const adUserId = parseInt(parts[2], 10);
  const adTs     = parseInt(parts[3], 10) * 1000; // secondes → ms

  // Sécurité : seul l'utilisateur ayant vu la pub peut réclamer
  if (adUserId !== userId) {
    return ctx.answerCbQuery('❌ Ce bouton ne t\'appartient pas.', { show_alert: true }).catch(() => {});
  }

  // Lire la config admin
  const cfg   = await getAdConfig();
  const state = getAdState(userId);
  const now   = Date.now();

  // Vérifier que la pub a été affichée récemment
  if (!state.adShownAt || Math.abs(state.adShownAt - adTs) > 90_000) {
    return ctx.answerCbQuery('⏰ Session expirée. Regarde une nouvelle publicité.', { show_alert: true }).catch(() => {});
  }

  // Fenêtre de réclamation (15 min)
  if (now - state.adShownAt > AD_CLAIM_WINDOW) {
    return ctx.answerCbQuery('⏰ Délai dépassé ! Regarde une nouvelle publicité.', { show_alert: true }).catch(() => {});
  }

  // Limite quotidienne
  if (state.dailyCount >= cfg.dailyLimit) {
    return ctx.answerCbQuery(`🚫 Limite de ${cfg.dailyLimit} pubs/jour atteinte.`, { show_alert: true }).catch(() => {});
  }

  // Marquer comme réclamé IMMÉDIATEMENT (anti double-claim)
  setAdState(userId, { adShownAt: 0, lastClaimedAt: now, dailyCount: state.dailyCount + 1 });

  // Créditer l'utilisateur en base
  try {
    const [{ default: User }, { default: Transaction }] = await Promise.all([
      import('../models/User.js'),
      import('../models/Transaction.js'),
    ]);

    const user = ctx.dbUser || await User.findOne({ telegramId: userId });
    if (!user) throw new Error('user not found');

    const balanceBefore    = user.balance;
    user.balance           = parseFloat((user.balance       + cfg.rewardUsdt).toFixed(6));
    user.bonusEarnings     = parseFloat((user.bonusEarnings + cfg.rewardUsdt).toFixed(6));
    await user.save();

    await Transaction.create({
      userId: user.id,
      type: 'ad_reward',
      amount: cfg.rewardUsdt,
      balanceBefore,
      balanceAfter: user.balance,
      description: `Récompense publicité Adsgram (${cfg.rewardUsdt} USDT)`,
    });

    // Désactiver les boutons (empêche tout re-claim)
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});

    const remainingToday = cfg.dailyLimit - (state.dailyCount + 1);
    const cooldownMins   = Math.round(cfg.cooldownMs / 60_000);

    await ctx.reply(
      `✅ *+${cfg.rewardUsdt} USDT* ajouté à ton solde !\n\n` +
      `💰 *Solde :* ${user.balance.toFixed(4)} USDT\n` +
      `📺 *Pubs restantes aujourd'hui :* ${remainingToday}/${cfg.dailyLimit}\n\n` +
      (remainingToday > 0
        ? `⏳ Prochaine pub disponible dans *${cooldownMins} min*.`
        : `🌙 Tu as atteint la limite du jour. Reviens demain !`),
      { parse_mode: 'Markdown' },
    );

    logger.info('Ad reward credited', { userId, amount: cfg.rewardUsdt, newBalance: user.balance, dailyCount: state.dailyCount + 1 });

  } catch (err) {
    // Rollback du state en cas d'erreur DB
    setAdState(userId, {
      adShownAt: state.adShownAt,
      lastClaimedAt: state.lastClaimedAt,
      dailyCount: state.dailyCount,
    });
    logger.error('handleAdsClaim credit error', { err: err.message });
    await ctx.reply('❌ Erreur lors du crédit. Réessaie ou contacte le support.').catch(() => {});
  }
}
