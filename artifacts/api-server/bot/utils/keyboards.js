/**
 * Claviers inline et persistants pour NeoCash
 */
import { Markup } from 'telegraf';
import { getCountryList } from './countries.js';

// ─── Clavier principal persistant ─────────────────────────────────────────────
export const mainKeyboard = Markup.keyboard([
  ['💰 Solde', '🎁 Bonus Quotidien'],
  ['👥 Parrainage', '💸 Retrait'],
  ['📞 Support', '📖 Explication'],
])
  .resize()
  .persistent();

// ─── Menu vérification canal ───────────────────────────────────────────────────
export function verifyKeyboard(joinUrl, verifyCallback = 'verify_channel') {
  const buttons = [];
  if (joinUrl) buttons.push(Markup.button.url('📢 Rejoindre', joinUrl));
  buttons.push(Markup.button.callback('✅ Vérifier', verifyCallback));
  return Markup.inlineKeyboard([buttons]);
}

// ─── Clavier pays pour retrait ─────────────────────────────────────────────────
export function countriesKeyboard() {
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
  rows.push([Markup.button.callback('❌ Annuler', 'cancel_withdrawal')]);
  return Markup.inlineKeyboard(rows);
}

// ─── Clavier opérateurs ────────────────────────────────────────────────────────
export function operatorsKeyboard(operators, countryCode) {
  const rows = operators.map((op) => [
    Markup.button.callback(op, `operator_${countryCode}_${op}`),
  ]);
  rows.push([Markup.button.callback('⬅️ Retour', 'back_to_countries')]);
  return Markup.inlineKeyboard(rows);
}

// ─── Clavier confirmation retrait ─────────────────────────────────────────────
export const confirmWithdrawKeyboard = Markup.inlineKeyboard([
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
  [Markup.button.callback('🔄 Redémarrer', 'admin_restart')],
]);

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

// ─── Clavier utilisateur admin ────────────────────────────────────────────────
export function userAdminKeyboard(targetId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('➕ Créditer', `admin_credit_${targetId}`),
      Markup.button.callback('➖ Débiter', `admin_debit_${targetId}`),
    ],
    [
      Markup.button.callback('🚫 Bannir', `admin_ban_${targetId}`),
      Markup.button.callback('✅ Débannir', `admin_unban_${targetId}`),
    ],
    [Markup.button.callback('◀️ Retour', 'admin_back')],
  ]);
}
