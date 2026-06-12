/**
 * Claviers inline et persistants pour NeoCash — multilingue
 */
import { Markup } from 'telegraf';
import { getCountryList } from './countries.js';
import { t, BUTTON_LABELS, LANGUAGE_NAMES } from './i18n.js';

// ─── Clavier principal persistant (langue spécifique) ─────────────────────────
export function getMainKeyboard(lang = 'fr') {
  const L = (key) => BUTTON_LABELS[key][lang] || BUTTON_LABELS[key]['fr'];
  return Markup.keyboard([
    [L('balance'), L('bonus')],
    [L('referral'), L('withdrawal')],
    [L('support'), L('explanation')],
    [L('changeLanguage')],
  ]).resize().persistent();
}

// Clavier par défaut (français) pour compatibilité
export const mainKeyboard = getMainKeyboard('fr');

// ─── Clavier de sélection de langue ──────────────────────────────────────────
export const languageKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('🇫🇷 Français', 'set_lang_fr'),
    Markup.button.callback('🇬🇧 English', 'set_lang_en'),
  ],
  [
    Markup.button.callback('🇩🇪 Deutsch', 'set_lang_de'),
    Markup.button.callback('🇨🇳 中文', 'set_lang_zh'),
  ],
]);

// ─── Menu vérification multi-canaux ───────────────────────────────────────────
export function multiChannelVerifyKeyboard(channels, lang = 'fr') {
  const rows = channels.map(ch => {
    const label = ch.label || (ch.type === 'website'
      ? t(lang, 'channel_visit_btn')
      : t(lang, 'channel_join_btn'));
    let url;
    if (ch.type === 'website') {
      url = ch.chatIdOrUrl;
    } else {
      const idStr = ch.chatIdOrUrl.toString().trim();
      if (idStr.startsWith('http')) {
        url = idStr;
      } else if (idStr.startsWith('-100')) {
        url = `https://t.me/c/${idStr.replace('-100', '')}`;
      } else if (idStr.startsWith('-')) {
        url = `https://t.me/c/${idStr.slice(1)}`;
      } else {
        url = `https://t.me/${idStr.replace('@', '')}`;
      }
    }
    return [Markup.button.url(label, url)];
  });

  rows.push([Markup.button.callback(t(lang, 'channel_verify_btn'), 'verify_channel')]);
  return Markup.inlineKeyboard(rows);
}

// ─── Clavier pays pour retrait ─────────────────────────────────────────────────
export function countriesKeyboard(lang = 'fr') {
  const countries = getCountryList();
  const rows = [];
  for (let i = 0; i < countries.length; i += 2) {
    const row = [
      Markup.button.callback(countries[i].name, `country_${countries[i].code}`),
    ];
    if (countries[i + 1]) {
      row.push(Markup.button.callback(countries[i + 1].name, `country_${countries[i + 1].code}`));
    }
    rows.push(row);
  }
  rows.push([Markup.button.callback(t(lang, 'withdrawal_cancel_btn'), 'cancel_withdrawal')]);
  return Markup.inlineKeyboard(rows);
}

// ─── Clavier opérateurs ────────────────────────────────────────────────────────
export function operatorsKeyboard(operators, countryCode, lang = 'fr') {
  const rows = operators.map((op) => [
    Markup.button.callback(op, `operator_${countryCode}_${op}`),
  ]);
  rows.push([Markup.button.callback(t(lang, 'withdrawal_back_btn'), 'back_to_countries')]);
  return Markup.inlineKeyboard(rows);
}

// ─── Clavier confirmation retrait ─────────────────────────────────────────────
export function confirmWithdrawKeyboard(lang = 'fr') {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(t(lang, 'withdrawal_confirm_btn'), 'confirm_withdrawal'),
      Markup.button.callback(t(lang, 'withdrawal_cancel_btn'), 'cancel_withdrawal'),
    ],
  ]);
}

// Alias statique pour compatibilité
export const confirmWithdrawKeyboardDefault = Markup.inlineKeyboard([
  [
    Markup.button.callback('✅ Confirmer', 'confirm_withdrawal'),
    Markup.button.callback('❌ Annuler', 'cancel_withdrawal'),
  ],
]);

// ─── Clavier retrait admin ────────────────────────────────────────────────────
export function withdrawalAdminKeyboard(withdrawalId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Valider', `approve_wd_${withdrawalId}`),
      Markup.button.callback('❌ Refuser', `reject_wd_${withdrawalId}`),
    ],
    [Markup.button.callback('👤 Voir utilisateur', `admin_user_${withdrawalId}_wd`)],
  ]);
}

// ─── Clavier panel admin ──────────────────────────────────────────────────────
export const adminKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('📊 Statistiques', 'admin_stats'),
    Markup.button.callback('💸 Retraits', 'admin_withdrawals'),
  ],
  [
    Markup.button.callback('👤 Utilisateurs', 'admin_users'),
    Markup.button.callback('📢 Diffusion', 'admin_broadcast'),
  ],
  [
    Markup.button.callback('📡 Canaux & Groupes', 'admin_channels'),
    Markup.button.callback('⚙️ Paramètres', 'admin_settings'),
  ],
  [
    Markup.button.callback('🪙 Cryptos', 'admin_cryptos'),
    Markup.button.callback('🔄 Redémarrer', 'admin_restart'),
  ],
]);

// ─── Clavier gestion canaux obligatoires ──────────────────────────────────────
export const adminChannelsKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('➕ Ajouter un canal/groupe', 'add_req_channel'),
  ],
  [
    Markup.button.callback('📋 Liste des canaux', 'list_req_channels'),
  ],
  [
    Markup.button.callback('🔌 Tester Groupe Admin', 'test_admin_group'),
    Markup.button.callback('🔌 Tester Canal Retrait', 'test_wd_channel'),
  ],
  [Markup.button.callback('◀️ Retour au panel', 'admin_back')],
]);

// ─── Clavier type de canal (création) ────────────────────────────────────────
export const channelTypeKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('📢 Canal Telegram', 'ch_type_channel'),
    Markup.button.callback('👥 Groupe Telegram', 'ch_type_group'),
  ],
  [Markup.button.callback('🌐 Site Web', 'ch_type_website')],
  [Markup.button.callback('❌ Annuler', 'admin_channels')],
]);

// ─── Clavier langue canal obligatoire (création) ─────────────────────────────
export const channelLangKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('🇫🇷 Français seulement', 'ch_lang_fr'),
    Markup.button.callback('🇬🇧 English only', 'ch_lang_en'),
  ],
  [
    Markup.button.callback('🇩🇪 Deutsch only', 'ch_lang_de'),
    Markup.button.callback('🇨🇳 中文 only', 'ch_lang_zh'),
  ],
  [Markup.button.callback('🌍 Toutes les langues', 'ch_lang_all')],
  [Markup.button.callback('❌ Annuler', 'admin_channels')],
]);

// ─── Claviers retrait crypto ──────────────────────────────────────────────────
export function cryptoSelectionKeyboard(cryptos, lang = 'fr') {
  const rows = [];
  for (let i = 0; i < cryptos.length; i += 2) {
    const row = [Markup.button.callback(`🪙 ${cryptos[i].symbol}`, `crypto_${cryptos[i].symbol}`)];
    if (cryptos[i + 1]) row.push(Markup.button.callback(`🪙 ${cryptos[i + 1].symbol}`, `crypto_${cryptos[i + 1].symbol}`));
    rows.push(row);
  }
  rows.push([Markup.button.callback(t(lang, 'withdrawal_cancel_btn'), 'cancel_withdrawal')]);
  return Markup.inlineKeyboard(rows);
}

export function networkSelectionKeyboard(networks, cryptoSymbol, lang = 'fr') {
  const rows = (networks || []).map(net => [
    Markup.button.callback(net, `network_${cryptoSymbol}_${net}`),
  ]);
  rows.push([Markup.button.callback(t(lang, 'withdrawal_cancel_btn'), 'cancel_withdrawal')]);
  return Markup.inlineKeyboard(rows);
}

// ─── Clavier paramètres admin ─────────────────────────────────────────────────
export const adminSettingsKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('🎁 Bonus quotidien', 'set_daily_bonus'),
    Markup.button.callback('👥 Bonus parrainage', 'set_referral_bonus'),
  ],
  [
    Markup.button.callback('💰 Retrait min', 'set_min_withdraw'),
    Markup.button.callback('📢 Canal obligatoire', 'set_required_channel'),
  ],
  [
    Markup.button.callback('💸 Canal de retrait', 'set_withdrawal_channel'),
    Markup.button.callback('👥 Groupe obligatoire', 'set_required_group'),
  ],
  [
    Markup.button.callback('📞 Lien support', 'set_support_link'),
    Markup.button.callback('✏️ Message support', 'set_support_message'),
  ],
  [
    Markup.button.callback('🚧 Mode maintenance', 'toggle_maintenance'),
    Markup.button.callback('◀️ Retour', 'admin_back'),
  ],
]);

// ─── Clavier retraits pending admin ──────────────────────────────────────────
export const adminWithdrawalsKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('⏳ En attente', 'wd_pending'),
    Markup.button.callback('✅ Validés', 'wd_approved'),
  ],
  [
    Markup.button.callback('❌ Refusés', 'wd_rejected'),
    Markup.button.callback('◀️ Retour', 'admin_back'),
  ],
]);

// ─── Clavier retour admin ─────────────────────────────────────────────────────
export const backToAdminKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('◀️ Retour au panel', 'admin_back')],
]);

// ─── Clavier retour canaux ────────────────────────────────────────────────────
export const backToChannelsKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('◀️ Retour Canaux & Groupes', 'admin_channels')],
]);

// ─── Clavier groupe détecté ───────────────────────────────────────────────────
export function detectedGroupKeyboard(chatId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🛡 Groupe Admin', `set_as_admin_group_${chatId}`),
      Markup.button.callback('💸 Canal Retrait', `set_as_wd_channel_${chatId}`),
    ],
    [Markup.button.callback('📢 Canal Obligatoire', `set_as_req_channel_${chatId}`)],
    [Markup.button.callback('❌ Ignorer', 'ignore_detected_group')],
  ]);
}

// ─── Clavier tests connexion ──────────────────────────────────────────────────
export const channelsTestKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('🔌 Tester Groupe Admin', 'test_admin_group'),
    Markup.button.callback('🔌 Tester Canal Retrait', 'test_wd_channel'),
  ],
  [Markup.button.callback('◀️ Retour au panel', 'admin_back')],
]);

// ─── Clavier utilisateur admin ────────────────────────────────────────────────
export function userAdminKeyboard(targetId, withdrawalUnlocked = false) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('➕ Créditer', `admin_credit_${targetId}`),
      Markup.button.callback('➖ Débiter', `admin_debit_${targetId}`),
    ],
    [
      Markup.button.callback('🚫 Bannir', `admin_ban_${targetId}`),
      Markup.button.callback('✅ Débannir', `admin_unban_${targetId}`),
    ],
    [
      withdrawalUnlocked
        ? Markup.button.callback('🔒 Verrouiller retrait', `admin_lock_wd_${targetId}`)
        : Markup.button.callback('🔓 Débloquer retrait', `admin_unlock_wd_${targetId}`),
    ],
    [Markup.button.callback('◀️ Retour', 'admin_back')],
  ]);
}
