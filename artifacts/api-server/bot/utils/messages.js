/**
 * Templates de messages pour NeoCash — avec support multilingue
 */
import { getSetting } from '../models/Settings.js';
import { t } from './i18n.js';

// ─── Échappement Markdown Telegram ────────────────────────────────────────────
export function escapeMarkdown(text) {
  if (!text) return '';
  return String(text).replace(/[*_`\[\]]/g, '\\$&');
}

// ─── Formatage ────────────────────────────────────────────────────────────────
export function formatAmount(amount) {
  return `${Number(amount).toLocaleString('fr-FR')} FCFA`;
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
  const dailyBonus  = await getSetting('daily_bonus')    || 100;
  const referralBonus = await getSetting('referral_bonus') || 120;
  const minWithdraw = await getSetting('min_withdraw')   || 800;

  return t(lang, 'welcome', firstName, referralBonus, dailyBonus, formatAmount(minWithdraw));
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
    t(lang, 'referral_cta', user.referralEarnings || 120)
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

// ─── Récapitulatif retrait ─────────────────────────────────────────────────────
export function withdrawSummaryMessage(data, lang = 'fr') {
  const SEP = '━━━━━━━━━━━━━━━━━━';
  return (
    t(lang, 'withdrawal_summary_title') + '\n\n' +
    SEP + '\n' +
    t(lang, 'withdrawal_summary_country', data.countryName) + '\n' +
    t(lang, 'withdrawal_summary_operator', data.operator) + '\n' +
    t(lang, 'withdrawal_summary_beneficiary', data.beneficiaryName) + '\n' +
    t(lang, 'withdrawal_summary_amount', formatAmount(data.amount)) + '\n' +
    t(lang, 'withdrawal_summary_phone', data.phone) + '\n' +
    SEP + '\n\n' +
    t(lang, 'withdrawal_confirm_question')
  );
}

// ─── Message explication ───────────────────────────────────────────────────────
export async function explanationMessage(lang = 'fr') {
  const dailyBonus = await getSetting('daily_bonus') || 100;
  const referralBonus = await getSetting('referral_bonus') || 120;
  const minWithdraw = await getSetting('min_withdraw') || 800;
  const SEP = '━━━━━━━━━━━━━━━━━━';
  return (
    t(lang, 'explanation_title') + '\n\n' +
    SEP + '\n' +
    t(lang, 'explanation_referral', referralBonus) + '\n' +
    t(lang, 'explanation_bonus', dailyBonus) + '\n' +
    t(lang, 'explanation_min_withdraw', formatAmount(minWithdraw)) + '\n' +
    SEP + '\n\n' +
    t(lang, 'explanation_steps_title') + '\n\n' +
    t(lang, 'explanation_step1') + '\n' +
    t(lang, 'explanation_step2') + '\n' +
    t(lang, 'explanation_step3') + '\n' +
    t(lang, 'explanation_step4', formatAmount(minWithdraw)) + '\n\n' +
    t(lang, 'explanation_methods_title') + '\n' +
    t(lang, 'explanation_methods') + '\n\n' +
    SEP + '\n' +
    t(lang, 'explanation_free')
  );
}

// ─── Message vérification multi-canaux ─────────────────────────────────────────
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

// ─── Alias pour compatibilité backward ────────────────────────────────────────
export function multiChannelVerifyMessage(channels) {
  return buildMultiChannelVerifyMessage(channels, 'fr');
}

// ─── Message notification admin ────────────────────────────────────────────────
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
  return `💸 *NOUVELLE DEMANDE DE RETRAIT*

👤 Utilisateur : ${escapeMarkdown(wd.firstName)}
🆔 ID : \`${wd.telegramId}\`
🌍 Pays : ${escapeMarkdown(wd.countryName)}
📱 Opérateur : ${escapeMarkdown(wd.operator)}
📞 Numéro : \`${wd.phone}\`
💰 Montant : *${formatAmount(wd.amount)}*
🔖 Réf : \`${wd._id}\`
📅 ${formatDate(new Date())}`;
}

export function adminBroadcastPreviewMessage(text, hasImage = false) {
  return `📢 *APERÇU DE LA DIFFUSION*\n\n${text}${hasImage ? '\n\n🖼 [Image jointe]' : ''}`;
}
