/**
 * Templates de messages pour NeoCash
 */
import { getSetting } from '../models/Settings.js';

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
export async function welcomeMessage(firstName) {
  const botName = await getSetting('bot_name') || 'NeoCash';
  const dailyBonus = await getSetting('daily_bonus') || 100;
  const referralBonus = await getSetting('referral_bonus') || 120;
  const minWithdraw = await getSetting('min_withdraw') || 800;
  return `🎉 *Bienvenue sur ${botName} !*

💸 Gagnez de l'argent facilement grâce au parrainage et aux bonus quotidiens.

👥 *${referralBonus} FCFA* par ami invité
🎁 *${dailyBonus} FCFA* bonus quotidien
💳 Retrait minimum : *${formatAmount(minWithdraw)}*

💳 Retraits disponibles via :
MTN • Moov • Orange Money • TMoney • Wave

Invitez vos amis et augmentez vos revenus directement depuis Telegram. 🚀`;
}

// ─── Message solde ─────────────────────────────────────────────────────────────
export function balanceMessage(user) {
  return `💰 *TON SOLDE*

━━━━━━━━━━━━━━━━━━
💵 Solde actuel : *${formatAmount(user.balance)}*
👥 Gains parrainage : *${formatAmount(user.referralEarnings)}*
🎁 Bonus reçus : *${formatAmount(user.bonusEarnings)}*
💳 Total retiré : *${formatAmount(user.totalWithdrawn)}*
━━━━━━━━━━━━━━━━━━

📊 Filleuls actifs : *${user.referralCount}*`;
}

// ─── Message parrainage ────────────────────────────────────────────────────────
export function referralMessage(user, botUsername) {
  const referralLink = `https://t.me/${botUsername}?start=${user.referralCode}`;
  return `👥 *TON LIEN D'AFFILIATION*

━━━━━━━━━━━━━━━━━━
🔗 Lien unique :
\`${referralLink}\`

📊 Parrainages validés : *${user.referralCount}*
💰 Gain par parrainage : *${formatAmount(user.referralEarnings)}*
━━━━━━━━━━━━━━━━━━

📢 *Partage ton lien et gagne 120 FCFA par ami invité !*`;
}

// ─── Message bonus quotidien ───────────────────────────────────────────────────
export function bonusClaimedMessage(amount, newBalance) {
  return `🎁 *BONUS QUOTIDIEN REÇU !*

━━━━━━━━━━━━━━━━━━
✅ Montant : +*${formatAmount(amount)}*
💰 Nouveau solde : *${formatAmount(newBalance)}*
━━━━━━━━━━━━━━━━━━

Reviens demain pour ton prochain bonus ! 🔥`;
}

export function bonusAlreadyClaimedMessage(timeLeft) {
  return `⏰ *BONUS DÉJÀ RÉCLAMÉ*

━━━━━━━━━━━━━━━━━━
Tu as déjà réclamé ton bonus aujourd'hui.

⏳ Prochain bonus dans : *${formatDuration(timeLeft)}*
━━━━━━━━━━━━━━━━━━

💡 En attendant, invite tes amis pour gagner plus !`;
}

// ─── Récapitulatif retrait ─────────────────────────────────────────────────────
export function withdrawSummaryMessage(data) {
  return `📄 *RÉCAPITULATIF DU RETRAIT*

━━━━━━━━━━━━━━━━━━
🌍 Pays : *${data.countryName}*
📱 Opérateur : *${data.operator}*
💰 Montant : *${formatAmount(data.amount)}*
📞 Numéro : \`${data.phone}\`
━━━━━━━━━━━━━━━━━━

Confirmer le retrait ?`;
}

// ─── Message explication ───────────────────────────────────────────────────────
export async function explanationMessage() {
  const dailyBonus = await getSetting('daily_bonus') || 100;
  const referralBonus = await getSetting('referral_bonus') || 120;
  const minWithdraw = await getSetting('min_withdraw') || 800;
  return `📖 *COMMENT ÇA MARCHE ?*

━━━━━━━━━━━━━━━━━━
👥 *${referralBonus} FCFA* par parrainage confirmé
🎁 *${dailyBonus} FCFA* bonus quotidien
💳 Retrait minimum : *${formatAmount(minWithdraw)}*
━━━━━━━━━━━━━━━━━━

*ÉTAPES SIMPLES :*

1️⃣ *Rejoins* la communauté NeoCash
2️⃣ *Invite* tes amis avec ton lien unique
3️⃣ *Réclame* ton bonus quotidien chaque jour
4️⃣ *Retire* ton argent dès 800 FCFA

💳 *Méthodes de retrait disponibles :*
MTN • Moov • Orange Money • TMoney • Wave • Airtel Money • Flooz • Free Money • Wave • Coris Money

━━━━━━━━━━━━━━━━━━
⚡ *Pas de dépôt requis — 100% gratuit !*`;
}

// ─── Message vérification canal ────────────────────────────────────────────────
export function channelVerifyMessage() {
  return `🔒 *VÉRIFICATION REQUISE*

━━━━━━━━━━━━━━━━━━
Pour accéder au bot, tu dois rejoindre notre communauté officielle.

1️⃣ Clique sur *📢 Rejoindre*
2️⃣ Rejoins le canal/groupe
3️⃣ Clique sur *✅ Vérifier*
━━━━━━━━━━━━━━━━━━

⚠️ Si tu quittes le canal, l'accès sera bloqué.`;
}

// ─── Message notification admin ────────────────────────────────────────────────
export function adminNewUserNotif(user) {
  return `🆕 *NOUVEAU UTILISATEUR*

👤 Nom : ${user.firstName} ${user.lastName || ''}
🆔 ID : \`${user.telegramId}\`
📛 Username : ${user.username ? '@' + user.username : 'N/A'}
👥 Parrainé par : ${user.referredBy ? `\`${user.referredBy}\`` : 'Direct'}
📅 ${formatDate(new Date())}`;
}

export function adminWithdrawNotif(wd) {
  return `💸 *NOUVELLE DEMANDE DE RETRAIT*

👤 Utilisateur : ${wd.firstName}
🆔 ID : \`${wd.telegramId}\`
🌍 Pays : ${wd.countryName}
📱 Opérateur : ${wd.operator}
📞 Numéro : \`${wd.phone}\`
💰 Montant : *${formatAmount(wd.amount)}*
🔖 Réf : \`${wd._id}\`
📅 ${formatDate(new Date())}`;
}

export function adminBroadcastPreviewMessage(text, hasImage = false) {
  return `📢 *APERÇU DE LA DIFFUSION*\n\n${text}${hasImage ? '\n\n🖼 [Image jointe]' : ''}`;
}
