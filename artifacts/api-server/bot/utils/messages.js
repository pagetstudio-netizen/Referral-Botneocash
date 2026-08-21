/**
 * Templates de messages pour Moon Crypto — avec support multilingue
 * Système basé sur USDT / cryptomonnaies
 */
import { getSetting } from '../models/Settings.js';
import { t } from './i18n.js';

export function escapeMarkdown(text) {
  if (!text) return '';
  // Telegram Markdown v1 ne supporte PAS l'échappement backslash (\*)
  // → on supprime les caractères spéciaux pour éviter les erreurs 400
  return String(text).replace(/[*_`\[\]\\]/g, '');
}

// ─── Formatage montant USDT ────────────────────────────────────────────────────
export function formatAmount(amount) {
  const num = Number(amount);
  if (isNaN(num)) return '0.00 USDT';
  return `${parseFloat(num.toFixed(2))} USDT`;
}

// Formatage montant crypto avec précision adaptée au symbole
export function formatCryptoAmount(amount, symbol = 'USDT') {
  const num = Number(amount);
  if (isNaN(num)) return `0 ${symbol}`;
  if (symbol === 'USDT' || symbol === 'USDC') return `${num.toFixed(2)} ${symbol}`;
  if (symbol === 'BTC') return `${num.toFixed(8)} ${symbol}`;
  if (num < 0.0001) return `${num.toFixed(8)} ${symbol}`;
  if (num < 0.01) return `${num.toFixed(6)} ${symbol}`;
  if (num < 1) return `${num.toFixed(4)} ${symbol}`;
  return `${parseFloat(num.toFixed(4))} ${symbol}`;
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}min`;
}

// ─── Message de bienvenue ─────────────────────────────────────────────────────
export async function welcomeMessage(firstName, lang = 'fr') {
  const dailyBonus    = await getSetting('daily_bonus')    || 0.2;
  const referralBonus = await getSetting('referral_bonus') || 1.5;
  const minWithdraw   = await getSetting('min_withdraw')   || 15;
  const adReward      = await getSetting('ad_reward_usdt') || 0.01;
  return t(lang, 'welcome', escapeMarkdown(firstName), referralBonus, dailyBonus, minWithdraw, adReward);
}

// ─── Message solde ─────────────────────────────────────────────────────────────
export function balanceMessage(user, lang = 'fr') {
  const SEP = '━━━━━━━━━━━━━━━━━━';
  return (
    t(lang, 'balance_title') + '\n\n' +
    SEP + '\n' +
    t(lang, 'balance_current', formatAmount(user.balance)) + '\n' +
    t(lang, 'balance_referral_earnings', formatAmount(user.referralEarnings)) + '\n' +
    t(lang, 'balance_bonus_earnings', formatAmount(user.bonusEarnings)) + '\n' +
    t(lang, 'balance_withdrawn', formatAmount(user.totalWithdrawn)) + '\n' +
    SEP + '\n\n' +
    t(lang, 'balance_referrals', user.referralCount)
  );
}

// ─── Message parrainage ────────────────────────────────────────────────────────
export function referralMessage(user, botUsername, lang = 'fr') {
  const referralLink = `https://t.me/${botUsername}?start=${user.referralCode}`;
  const SEP = '━━━━━━━━━━━━━━━━━━';
  return (
    t(lang, 'referral_title') + '\n\n' +
    SEP + '\n' +
    t(lang, 'referral_link_label') + '\n' +
    `\`${referralLink}\`\n\n` +
    t(lang, 'referral_validated', user.referralCount) + '\n' +
    t(lang, 'referral_earnings_label', formatAmount(user.referralEarnings)) + '\n' +
    SEP + '\n\n' +
    t(lang, 'referral_cta', 1.5)
  );
}

// ─── Message bonus quotidien ───────────────────────────────────────────────────
export function bonusClaimedMessage(amount, newBalance, lang = 'fr') {
  const SEP = '━━━━━━━━━━━━━━━━━━';
  return (
    t(lang, 'bonus_claimed_title') + '\n\n' +
    SEP + '\n' +
    t(lang, 'bonus_amount', formatAmount(amount)) + '\n' +
    t(lang, 'bonus_new_balance', formatAmount(newBalance)) + '\n' +
    SEP + '\n\n' +
    t(lang, 'bonus_comeback')
  );
}

export function bonusAlreadyClaimedMessage(timeLeft, lang = 'fr') {
  const SEP = '━━━━━━━━━━━━━━━━━━';
  return (
    t(lang, 'bonus_already_title') + '\n\n' +
    SEP + '\n' +
    t(lang, 'bonus_already_text') + '\n\n' +
    t(lang, 'bonus_next_in', formatDuration(timeLeft)) + '\n' +
    SEP + '\n\n' +
    t(lang, 'bonus_wait_tip')
  );
}

// ─── Récapitulatif retrait crypto ─────────────────────────────────────────────
export function withdrawSummaryMessage(data, lang = 'fr') {
  const SEP = '━━━━━━━━━━━━━━━━━━';
  const isSameCrypto = !data.cryptoAmount || data.crypto === 'USDT';
  let convLine = '';
  if (!isSameCrypto && data.cryptoAmount && data.rate) {
    convLine = t(lang, 'withdrawal_conversion_line',
      formatCryptoAmount(data.cryptoAmount, data.crypto),
      data.crypto,
      data.rate
    ) + '\n';
  }
  return (
    t(lang, 'withdrawal_summary_title') + '\n\n' +
    SEP + '\n' +
    t(lang, 'withdrawal_summary_crypto', data.crypto) + '\n' +
    t(lang, 'withdrawal_summary_network', data.network || 'N/A') + '\n' +
    t(lang, 'withdrawal_summary_wallet', escapeMarkdown(maskWallet(data.wallet || data.walletAddress))) + '\n' +
    t(lang, 'withdrawal_summary_amount', formatAmount(data.amount)) + '\n' +
    convLine +
    SEP + '\n\n' +
    t(lang, 'withdrawal_confirm_question')
  );
}

function maskWallet(addr) {
  if (!addr || addr.length < 8) return addr || '—';
  return addr.slice(0, 6) + '...' + addr.slice(-6);
}

// ─── Message explication ───────────────────────────────────────────────────────
export async function explanationMessage(lang = 'fr') {
  const dailyBonus    = await getSetting('daily_bonus')    || 0.2;
  const referralBonus = await getSetting('referral_bonus') || 1.5;
  const minWithdraw   = await getSetting('min_withdraw')   || 15;
  const SEP = '━━━━━━━━━━━━━━━━━━';
  return (
    t(lang, 'explanation_title') + '\n\n' +
    SEP + '\n' +
    t(lang, 'explanation_referral', referralBonus) + '\n' +
    t(lang, 'explanation_bonus', dailyBonus) + '\n' +
    t(lang, 'explanation_min_withdraw', `${minWithdraw} USDT`) + '\n' +
    SEP + '\n\n' +
    t(lang, 'explanation_steps_title') + '\n\n' +
    t(lang, 'explanation_step1') + '\n' +
    t(lang, 'explanation_step2') + '\n' +
    t(lang, 'explanation_step3') + '\n' +
    t(lang, 'explanation_step4', `${minWithdraw} USDT`) + '\n\n' +
    t(lang, 'explanation_methods_title') + '\n' +
    t(lang, 'explanation_methods') + '\n\n' +
    SEP + '\n' +
    t(lang, 'explanation_free')
  );
}

// ─── Message vérification multi-canaux (conservé pour compatibilité) ───────────
export function buildMultiChannelVerifyMessage(channels, lang = 'fr') {
  const lines = channels.map((ch, i) => {
    const icon = ch.type === 'website' ? '🌐' : ch.type === 'group' ? '👥' : '📢';
    const label = ch.label || ch.chatIdOrUrl;
    return `${i + 1}️⃣ ${icon} *${label}*`;
  });
  const SEP = '━━━━━━━━━━━━━━━━━━';
  return (
    t(lang, 'channel_verify_title') + '\n\n' +
    SEP + '\n' +
    t(lang, 'channel_verify_text', channels.length) + '\n\n' +
    lines.join('\n') + '\n\n' +
    SEP + '\n' +
    t(lang, 'channel_verify_steps', channels.length)
  );
}

export function multiChannelVerifyMessage(channels) {
  return buildMultiChannelVerifyMessage(channels, 'fr');
}

// ─── Message vérification chaîne unique officielle ─────────────────────────────
export function buildSingleChannelVerifyMessage(label, lang = 'fr') {
  const SEP = '━━━━━━━━━━━━━━━━━━';
  return (
    t(lang, 'channel_verify_title') + '\n\n' +
    SEP + '\n' +
    `📢 *${label}*\n\n` +
    SEP + '\n' +
    t(lang, 'channel_verify_steps', 1)
  );
}

// ─── Notifications admin ───────────────────────────────────────────────────────
export function adminNewUserNotif(user) {
  return `🆕 *NOUVEAU UTILISATEUR*

👤 Nom : ${escapeMarkdown(user.firstName)} ${escapeMarkdown(user.lastName || '')}
🆔 ID : \`${user.telegramId}\`
📛 Username : ${user.username ? '@' + escapeMarkdown(user.username) : 'N/A'}
👥 Parrainé par : ${user.referredBy ? `\`${user.referredBy}\`` : 'Direct'}
🌐 Langue : ${user.language || 'fr'}
📅 ${formatDate(new Date())}`;
}

export function adminWithdrawNotif(wd) {
  const paymentInfo = wd.walletAddress
    ? `🪙 Crypto : *${wd.crypto}* (${wd.network || 'N/A'})\n👛 Wallet : \`${wd.walletAddress}\``
    : `🌍 Pays : ${escapeMarkdown(wd.countryName || 'N/A')}\n📱 Opérateur : ${escapeMarkdown(wd.operator || 'N/A')}\n📞 Numéro : \`${wd.phone || 'N/A'}\``;
  const cryptoLine = wd.cryptoAmount && wd.crypto !== 'USDT'
    ? `\n🔄 Équivalent : *${formatCryptoAmount(wd.cryptoAmount, wd.crypto)}*`
    : '';
  return `💸 *NOUVELLE DEMANDE DE RETRAIT*

👤 Utilisateur : ${escapeMarkdown(wd.firstName)}
🆔 ID : \`${wd.telegramId}\`
${paymentInfo}
💰 Montant : *${formatAmount(wd.amount)}*${cryptoLine}
🔖 Réf : \`${wd._id}\`
📅 ${formatDate(new Date())}`;
}

export function adminBroadcastPreviewMessage(text, hasImage = false) {
  return `📢 *APERÇU DE LA DIFFUSION*\n\n${text}${hasImage ? '\n\n🖼 [Image jointe]' : ''}`;
}
