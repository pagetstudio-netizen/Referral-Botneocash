/**
 * Système de traduction — i18n multilingue
 * Langues supportées : fr, en, de, zh
 */

export const SUPPORTED_LANGUAGES = ['fr', 'en', 'de', 'zh'];

export const LANGUAGE_NAMES = {
  fr: '🇫🇷 Français',
  en: '🇬🇧 English',
  de: '🇩🇪 Deutsch',
  zh: '🇨🇳 中文',
};

// ─── Labels des boutons principaux (utilisés dans hears() et claviers) ────────
export const BUTTON_LABELS = {
  balance: { fr: '💰 Solde', en: '💰 Balance', de: '💰 Guthaben', zh: '💰 余额' },
  bonus: { fr: '🎁 Bonus Quotidien', en: '🎁 Daily Bonus', de: '🎁 Tagesbonus', zh: '🎁 每日奖励' },
  referral: { fr: '👥 Parrainage', en: '👥 Referral', de: '👥 Empfehlung', zh: '👥 推荐' },
  withdrawal: { fr: '💸 Retrait', en: '💸 Withdrawal', de: '💸 Auszahlung', zh: '💸 提现' },
  support: { fr: '📞 Support', en: '📞 Support', de: '📞 Support', zh: '📞 支持' },
  explanation: { fr: '📖 Explication', en: '📖 Explanation', de: '📖 Erklärung', zh: '📖 说明' },
  changeLanguage: { fr: '🌐 Changer la langue', en: '🌐 Change Language', de: '🌐 Sprache ändern', zh: '🌐 更换语言' },
};

// ─── Dictionnaire de traductions ──────────────────────────────────────────────
const translations = {

  // ── Sélection de langue ──────────────────────────────────────────────────────
  language_select_prompt: {
    fr: '🌍 *Bienvenue !*\n\nChoisissez votre langue pour continuer :',
    en: '🌍 *Welcome!*\n\nPlease choose your language to continue:',
    de: '🌍 *Willkommen!*\n\nBitte wählen Sie Ihre Sprache, um fortzufahren:',
    zh: '🌍 *欢迎！*\n\n请选择您的语言以继续：',
  },

  language_changed: {
    fr: '✅ Langue changée en *Français* !',
    en: '✅ Language changed to *English*!',
    de: '✅ Sprache auf *Deutsch* geändert!',
    zh: '✅ 语言已更改为*中文*！',
  },

  // ── Message de bienvenue ─────────────────────────────────────────────────────
  welcome: {
    fr: (name, ref, daily, min) =>
      `👋 *Bonjour ${name}, bienvenue chez NeoCash !* 🎉\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💸 *Gagne de l'argent réel* en partageant simplement ton lien de parrainage avec tes amis et ta famille !\n\n` +
      `🔥 *Comment gagner :*\n` +
      `👥 *+${ref} USDT* par ami invité via ton lien\n` +
      `🎁 *+${daily} USDT* bonus gratuit chaque jour\n\n` +
      `🪙 *Retraits disponibles en crypto :*\n` +
      `USDT • BNB • BTC • ETH • SOL • TRX • MATIC\n\n` +
      `💰 Retrait à partir de *${min} USDT* seulement\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `🚀 *C'est gratuit, sans dépôt — commence maintenant !*`,
    en: (name, ref, daily, min) =>
      `👋 *Hello ${name}, welcome to NeoCash!* 🎉\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💸 *Earn real money* by simply sharing your referral link with friends and family!\n\n` +
      `🔥 *How to earn:*\n` +
      `👥 *+${ref} USDT* per friend invited via your link\n` +
      `🎁 *+${daily} USDT* free bonus every day\n\n` +
      `🪙 *Crypto withdrawals available:*\n` +
      `USDT • BNB • BTC • ETH • SOL • TRX • MATIC\n\n` +
      `💰 Withdraw from *${min} USDT* only\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `🚀 *It's free, no deposit required — start now!*`,
    de: (name, ref, daily, min) =>
      `👋 *Hallo ${name}, willkommen bei NeoCash!* 🎉\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💸 *Verdiene echtes Geld*, indem du deinen Empfehlungslink mit Freunden und Familie teilst!\n\n` +
      `🔥 *Wie du verdienst:*\n` +
      `👥 *+${ref} USDT* pro eingeladenem Freund über deinen Link\n` +
      `🎁 *+${daily} USDT* kostenloser Bonus jeden Tag\n\n` +
      `🪙 *Krypto-Auszahlungen verfügbar:*\n` +
      `USDT • BNB • BTC • ETH • SOL • TRX • MATIC\n\n` +
      `💰 Auszahlung ab *${min} USDT*\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `🚀 *Kostenlos, keine Einzahlung — fang jetzt an!*`,
    zh: (name, ref, daily, min) =>
      `👋 *你好 ${name}，欢迎来到 NeoCash！* 🎉\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💸 *赚取真实收入*，只需将您的推荐链接分享给朋友和家人！\n\n` +
      `🔥 *如何赚取：*\n` +
      `👥 每位通过您链接邀请的朋友 *+${ref} USDT*\n` +
      `🎁 每天免费奖励 *+${daily} USDT*\n\n` +
      `🪙 *加密货币提现方式：*\n` +
      `USDT • BNB • BTC • ETH • SOL • TRX • MATIC\n\n` +
      `💰 最低提现 *${min} USDT*\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `🚀 *完全免费，无需存款——立即开始！*`,
  },

  // ── Solde ────────────────────────────────────────────────────────────────────
  balance_title: {
    fr: '💰 *TON SOLDE*',
    en: '💰 *YOUR BALANCE*',
    de: '💰 *DEIN GUTHABEN*',
    zh: '💰 *您的余额*',
  },
  balance_current: {
    fr: (v) => `💵 Solde actuel : *${v}*`,
    en: (v) => `💵 Current balance: *${v}*`,
    de: (v) => `💵 Aktuelles Guthaben: *${v}*`,
    zh: (v) => `💵 当前余额：*${v}*`,
  },
  balance_referral_earnings: {
    fr: (v) => `👥 Gains parrainage : *${v}*`,
    en: (v) => `👥 Referral earnings: *${v}*`,
    de: (v) => `👥 Empfehlungsverdienst: *${v}*`,
    zh: (v) => `👥 推荐收入：*${v}*`,
  },
  balance_bonus_earnings: {
    fr: (v) => `🎁 Bonus reçus : *${v}*`,
    en: (v) => `🎁 Bonuses received: *${v}*`,
    de: (v) => `🎁 Erhaltene Boni: *${v}*`,
    zh: (v) => `🎁 已获奖励：*${v}*`,
  },
  balance_withdrawn: {
    fr: (v) => `💳 Total retiré : *${v}*`,
    en: (v) => `💳 Total withdrawn: *${v}*`,
    de: (v) => `💳 Insgesamt ausgezahlt: *${v}*`,
    zh: (v) => `💳 累计提现：*${v}*`,
  },
  balance_referrals: {
    fr: (v) => `📊 Filleuls actifs : *${v}*`,
    en: (v) => `📊 Active referrals: *${v}*`,
    de: (v) => `📊 Aktive Empfehlungen: *${v}*`,
    zh: (v) => `📊 活跃推荐：*${v}*`,
  },

  // ── Parrainage ───────────────────────────────────────────────────────────────
  referral_title: {
    fr: '👥 *TON LIEN D\'AFFILIATION*',
    en: '👥 *YOUR REFERRAL LINK*',
    de: '👥 *DEIN EMPFEHLUNGSLINK*',
    zh: '👥 *您的推荐链接*',
  },
  referral_link_label: {
    fr: '🔗 Lien unique :',
    en: '🔗 Unique link:',
    de: '🔗 Einzigartiger Link:',
    zh: '🔗 专属链接：',
  },
  referral_validated: {
    fr: (v) => `📊 Parrainages validés : *${v}*`,
    en: (v) => `📊 Validated referrals: *${v}*`,
    de: (v) => `📊 Bestätigte Empfehlungen: *${v}*`,
    zh: (v) => `📊 已验证推荐：*${v}*`,
  },
  referral_earnings_label: {
    fr: (v) => `💰 Gain par parrainage : *${v}*`,
    en: (v) => `💰 Earnings per referral: *${v}*`,
    de: (v) => `💰 Verdienst pro Empfehlung: *${v}*`,
    zh: (v) => `💰 每次推荐收入：*${v}*`,
  },
  referral_cta: {
    fr: (amount) => `📢 *Partage ton lien et gagne ${amount} USDT par ami invité !*`,
    en: (amount) => `📢 *Share your link and earn ${amount} USDT per invited friend!*`,
    de: (amount) => `📢 *Teile deinen Link und verdiene ${amount} USDT pro eingeladenem Freund!*`,
    zh: (amount) => `📢 *分享您的链接，每邀请一位朋友赚取 ${amount} USDT！*`,
  },
  referral_share_button: {
    fr: '📤 Partager mon lien',
    en: '📤 Share my link',
    de: '📤 Meinen Link teilen',
    zh: '📤 分享我的链接',
  },
  referral_share_text: {
    fr: '🎉 Rejoins NeoCash et gagne de l\'argent !',
    en: '🎉 Join NeoCash and earn money!',
    de: '🎉 Tritt NeoCash bei und verdiene Geld!',
    zh: '🎉 加入 NeoCash，赚取真实收入！',
  },

  // ── Bonus quotidien ──────────────────────────────────────────────────────────
  bonus_claimed_title: {
    fr: '🎁 *BONUS QUOTIDIEN REÇU !*',
    en: '🎁 *DAILY BONUS RECEIVED!*',
    de: '🎁 *TAGESBONUS ERHALTEN!*',
    zh: '🎁 *每日奖励已领取！*',
  },
  bonus_amount: {
    fr: (v) => `✅ Montant : +*${v}*`,
    en: (v) => `✅ Amount: +*${v}*`,
    de: (v) => `✅ Betrag: +*${v}*`,
    zh: (v) => `✅ 金额：+*${v}*`,
  },
  bonus_new_balance: {
    fr: (v) => `💰 Nouveau solde : *${v}*`,
    en: (v) => `💰 New balance: *${v}*`,
    de: (v) => `💰 Neues Guthaben: *${v}*`,
    zh: (v) => `💰 新余额：*${v}*`,
  },
  bonus_comeback: {
    fr: 'Reviens demain pour ton prochain bonus ! 🔥',
    en: 'Come back tomorrow for your next bonus! 🔥',
    de: 'Komm morgen für deinen nächsten Bonus wieder! 🔥',
    zh: '明天回来领取下一个奖励！🔥',
  },
  bonus_already_title: {
    fr: '⏰ *BONUS DÉJÀ RÉCLAMÉ*',
    en: '⏰ *BONUS ALREADY CLAIMED*',
    de: '⏰ *BONUS BEREITS ERHALTEN*',
    zh: '⏰ *奖励已领取*',
  },
  bonus_already_text: {
    fr: 'Tu as déjà réclamé ton bonus aujourd\'hui.',
    en: 'You have already claimed your bonus today.',
    de: 'Du hast deinen Bonus heute bereits erhalten.',
    zh: '您今天已经领取了奖励。',
  },
  bonus_next_in: {
    fr: (v) => `⏳ Prochain bonus dans : *${v}*`,
    en: (v) => `⏳ Next bonus in: *${v}*`,
    de: (v) => `⏳ Nächster Bonus in: *${v}*`,
    zh: (v) => `⏳ 下个奖励倒计时：*${v}*`,
  },
  bonus_wait_tip: {
    fr: '💡 En attendant, invite tes amis pour gagner plus !',
    en: '💡 In the meantime, invite friends to earn more!',
    de: '💡 Lade in der Zwischenzeit Freunde ein, um mehr zu verdienen!',
    zh: '💡 在此期间，邀请朋友赚取更多！',
  },

  // ── Retrait ──────────────────────────────────────────────────────────────────
  withdrawal_locked_title: {
    fr: '🔒 *RETRAIT VERROUILLÉ*',
    en: '🔒 *WITHDRAWAL LOCKED*',
    de: '🔒 *AUSZAHLUNG GESPERRT*',
    zh: '🔒 *提现已锁定*',
  },
  withdrawal_locked_text: {
    fr: (min) => `Pour effectuer un retrait, tu dois parrainer au moins *${min} amis*.`,
    en: (min) => `To make a withdrawal, you must refer at least *${min} friends*.`,
    de: (min) => `Um eine Auszahlung vorzunehmen, musst du mindestens *${min} Freunde* einladen.`,
    zh: (min) => `要提现，您必须推荐至少 *${min} 位朋友*。`,
  },
  withdrawal_referral_count: {
    fr: (cur, max) => `👥 Filleuls actuels : *${cur}/${max}*`,
    en: (cur, max) => `👥 Current referrals: *${cur}/${max}*`,
    de: (cur, max) => `👥 Aktuelle Empfehlungen: *${cur}/${max}*`,
    zh: (cur, max) => `👥 当前推荐：*${cur}/${max}*`,
  },
  withdrawal_locked_cta: {
    fr: '📲 Partage ton lien de parrainage pour débloquer le retrait !',
    en: '📲 Share your referral link to unlock withdrawal!',
    de: '📲 Teile deinen Empfehlungslink, um die Auszahlung freizuschalten!',
    zh: '📲 分享您的推荐链接以解锁提现！',
  },
  withdrawal_insufficient_title: {
    fr: '💸 *RETRAIT INDISPONIBLE*',
    en: '💸 *WITHDRAWAL UNAVAILABLE*',
    de: '💸 *AUSZAHLUNG NICHT VERFÜGBAR*',
    zh: '💸 *无法提现*',
  },
  withdrawal_insufficient_balance: {
    fr: (v) => `💰 Solde actuel : *${v}*`,
    en: (v) => `💰 Current balance: *${v}*`,
    de: (v) => `💰 Aktuelles Guthaben: *${v}*`,
    zh: (v) => `💰 当前余额：*${v}*`,
  },
  withdrawal_min_required: {
    fr: (v) => `⚠️ Minimum requis : *${v}*`,
    en: (v) => `⚠️ Minimum required: *${v}*`,
    de: (v) => `⚠️ Mindestbetrag erforderlich: *${v}*`,
    zh: (v) => `⚠️ 最低要求：*${v}*`,
  },
  withdrawal_invite_tip: {
    fr: '👥 Invite des amis pour augmenter ton solde !',
    en: '👥 Invite friends to increase your balance!',
    de: '👥 Lade Freunde ein, um dein Guthaben zu erhöhen!',
    zh: '👥 邀请朋友增加您的余额！',
  },
  withdrawal_start_title: {
    fr: '💸 *DEMANDE DE RETRAIT*',
    en: '💸 *WITHDRAWAL REQUEST*',
    de: '💸 *AUSZAHLUNGSANTRAG*',
    zh: '💸 *提现申请*',
  },
  withdrawal_available: {
    fr: (v) => `💰 Solde disponible : *${v}*`,
    en: (v) => `💰 Available balance: *${v}*`,
    de: (v) => `💰 Verfügbares Guthaben: *${v}*`,
    zh: (v) => `💰 可用余额：*${v}*`,
  },
  withdrawal_select_country: {
    fr: '🌍 Sélectionne ton pays :',
    en: '🌍 Select your country:',
    de: '🌍 Wähle dein Land:',
    zh: '🌍 选择您的国家：',
  },
  withdrawal_operator_title: {
    fr: '💸 *RETRAIT — OPÉRATEUR*',
    en: '💸 *WITHDRAWAL — OPERATOR*',
    de: '💸 *AUSZAHLUNG — ANBIETER*',
    zh: '💸 *提现 — 运营商*',
  },
  withdrawal_country_label: {
    fr: (v) => `🌍 Pays : *${v}*`,
    en: (v) => `🌍 Country: *${v}*`,
    de: (v) => `🌍 Land: *${v}*`,
    zh: (v) => `🌍 国家：*${v}*`,
  },
  withdrawal_select_operator: {
    fr: '📱 Sélectionne ton opérateur :',
    en: '📱 Select your operator:',
    de: '📱 Wähle deinen Anbieter:',
    zh: '📱 选择您的运营商：',
  },
  withdrawal_phone_title: {
    fr: '💸 *RETRAIT — NUMÉRO*',
    en: '💸 *WITHDRAWAL — NUMBER*',
    de: '💸 *AUSZAHLUNG — NUMMER*',
    zh: '💸 *提现 — 号码*',
  },
  withdrawal_operator_label: {
    fr: (v) => `📱 Opérateur : *${v}*`,
    en: (v) => `📱 Operator: *${v}*`,
    de: (v) => `📱 Anbieter: *${v}*`,
    zh: (v) => `📱 运营商：*${v}*`,
  },
  withdrawal_send_phone: {
    fr: '📞 Envoie ton numéro Mobile Money :',
    en: '📞 Send your Mobile Money number:',
    de: '📞 Sende deine Mobile Money Nummer:',
    zh: '📞 发送您的移动支付号码：',
  },
  withdrawal_invalid_phone: {
    fr: '⚠️ Numéro invalide. Envoie un numéro valide (ex: +22890123456) :',
    en: '⚠️ Invalid number. Send a valid number (e.g.: +22890123456):',
    de: '⚠️ Ungültige Nummer. Sende eine gültige Nummer (z.B.: +22890123456):',
    zh: '⚠️ 号码无效，请输入有效号码（例如：+22890123456）：',
  },
  withdrawal_name_title: {
    fr: '💸 *RETRAIT — NOM DU BÉNÉFICIAIRE*',
    en: '💸 *WITHDRAWAL — BENEFICIARY NAME*',
    de: '💸 *AUSZAHLUNG — NAME DES BEGÜNSTIGTEN*',
    zh: '💸 *提现 — 收款人姓名*',
  },
  withdrawal_phone_label: {
    fr: (v) => `📞 Numéro : \`${v}\``,
    en: (v) => `📞 Number: \`${v}\``,
    de: (v) => `📞 Nummer: \`${v}\``,
    zh: (v) => `📞 号码：\`${v}\``,
  },
  withdrawal_enter_name: {
    fr: '👤 Entre le *nom complet* du titulaire du compte Mobile Money :',
    en: '👤 Enter the *full name* of the Mobile Money account holder:',
    de: '👤 Gib den *vollständigen Namen* des Mobile Money Kontoinhabers ein:',
    zh: '👤 输入移动支付账户持有人的*全名*：',
  },
  withdrawal_invalid_name: {
    fr: '⚠️ Nom invalide. Entre un nom entre 2 et 60 caractères :',
    en: '⚠️ Invalid name. Enter a name between 2 and 60 characters:',
    de: '⚠️ Ungültiger Name. Gib einen Namen zwischen 2 und 60 Zeichen ein:',
    zh: '⚠️ 姓名无效，请输入2到60个字符之间的姓名：',
  },
  withdrawal_amount_title: {
    fr: '💸 *RETRAIT — MONTANT*',
    en: '💸 *WITHDRAWAL — AMOUNT*',
    de: '💸 *AUSZAHLUNG — BETRAG*',
    zh: '💸 *提现 — 金额*',
  },
  withdrawal_beneficiary_label: {
    fr: (v) => `👤 Bénéficiaire : *${v}*`,
    en: (v) => `👤 Beneficiary: *${v}*`,
    de: (v) => `👤 Begünstigter: *${v}*`,
    zh: (v) => `👤 收款人：*${v}*`,
  },
  withdrawal_ask_amount: {
    fr: '💰 Combien veux-tu retirer ?',
    en: '💰 How much do you want to withdraw?',
    de: '💰 Wie viel möchtest du auszahlen?',
    zh: '💰 您想提现多少？',
  },
  withdrawal_min_notice: {
    fr: (v) => `⚠️ Minimum : *${v}*`,
    en: (v) => `⚠️ Minimum: *${v}*`,
    de: (v) => `⚠️ Minimum: *${v}*`,
    zh: (v) => `⚠️ 最低：*${v}*`,
  },
  withdrawal_available2: {
    fr: (v) => `💵 Disponible : *${v}*`,
    en: (v) => `💵 Available: *${v}*`,
    de: (v) => `💵 Verfügbar: *${v}*`,
    zh: (v) => `💵 可用：*${v}*`,
  },
  withdrawal_invalid_amount: {
    fr: '⚠️ Montant invalide. Entre un nombre entier positif :',
    en: '⚠️ Invalid amount. Enter a positive integer:',
    de: '⚠️ Ungültiger Betrag. Gib eine positive ganze Zahl ein:',
    zh: '⚠️ 金额无效，请输入正整数：',
  },
  withdrawal_below_min: {
    fr: (v) => `⚠️ Montant minimum : *${v}*\n\nEntre un montant valide :`,
    en: (v) => `⚠️ Minimum amount: *${v}*\n\nEnter a valid amount:`,
    de: (v) => `⚠️ Mindestbetrag: *${v}*\n\nGib einen gültigen Betrag ein:`,
    zh: (v) => `⚠️ 最低金额：*${v}*\n\n请输入有效金额：`,
  },
  withdrawal_exceed_balance: {
    fr: (v) => `⚠️ Solde insuffisant !\n\n💵 Disponible : *${v}*`,
    en: (v) => `⚠️ Insufficient balance!\n\n💵 Available: *${v}*`,
    de: (v) => `⚠️ Unzureichendes Guthaben!\n\n💵 Verfügbar: *${v}*`,
    zh: (v) => `⚠️ 余额不足！\n\n💵 可用：*${v}*`,
  },
  withdrawal_summary_title: {
    fr: '📄 *RÉCAPITULATIF DU RETRAIT*',
    en: '📄 *WITHDRAWAL SUMMARY*',
    de: '📄 *AUSZAHLUNGSZUSAMMENFASSUNG*',
    zh: '📄 *提现摘要*',
  },
  withdrawal_summary_country: {
    fr: (v) => `🌍 Pays : *${v}*`,
    en: (v) => `🌍 Country: *${v}*`,
    de: (v) => `🌍 Land: *${v}*`,
    zh: (v) => `🌍 国家：*${v}*`,
  },
  withdrawal_summary_operator: {
    fr: (v) => `📱 Opérateur : *${v}*`,
    en: (v) => `📱 Operator: *${v}*`,
    de: (v) => `📱 Anbieter: *${v}*`,
    zh: (v) => `📱 运营商：*${v}*`,
  },
  withdrawal_summary_beneficiary: {
    fr: (v) => `👤 Bénéficiaire : *${v}*`,
    en: (v) => `👤 Beneficiary: *${v}*`,
    de: (v) => `👤 Begünstigter: *${v}*`,
    zh: (v) => `👤 收款人：*${v}*`,
  },
  withdrawal_summary_amount: {
    fr: (v) => `💰 Montant : *${v}*`,
    en: (v) => `💰 Amount: *${v}*`,
    de: (v) => `💰 Betrag: *${v}*`,
    zh: (v) => `💰 金额：*${v}*`,
  },
  withdrawal_summary_phone: {
    fr: (v) => `📞 Numéro : \`${v}\``,
    en: (v) => `📞 Number: \`${v}\``,
    de: (v) => `📞 Nummer: \`${v}\``,
    zh: (v) => `📞 号码：\`${v}\``,
  },
  withdrawal_confirm_question: {
    fr: 'Confirmer le retrait ?',
    en: 'Confirm withdrawal?',
    de: 'Auszahlung bestätigen?',
    zh: '确认提现？',
  },
  withdrawal_confirm_btn: {
    fr: '✅ Confirmer',
    en: '✅ Confirm',
    de: '✅ Bestätigen',
    zh: '✅ 确认',
  },
  withdrawal_cancel_btn: {
    fr: '❌ Annuler',
    en: '❌ Cancel',
    de: '❌ Abbrechen',
    zh: '❌ 取消',
  },
  withdrawal_cancelled: {
    fr: '❌ Retrait annulé.',
    en: '❌ Withdrawal cancelled.',
    de: '❌ Auszahlung abgebrochen.',
    zh: '❌ 提现已取消。',
  },
  withdrawal_sent_title: {
    fr: '⏳ *DEMANDE ENVOYÉE !*',
    en: '⏳ *REQUEST SENT!*',
    de: '⏳ *ANTRAG GESENDET!*',
    zh: '⏳ *申请已发送！*',
  },
  withdrawal_sent_text: {
    fr: '✅ Ta demande de retrait a été enregistrée.',
    en: '✅ Your withdrawal request has been recorded.',
    de: '✅ Dein Auszahlungsantrag wurde erfasst.',
    zh: '✅ 您的提现申请已记录。',
  },
  withdrawal_sent_admin: {
    fr: 'L\'admin la traitera bientôt.',
    en: 'The admin will process it soon.',
    de: 'Der Admin wird es bald bearbeiten.',
    zh: '管理员将很快处理。',
  },
  withdrawal_new_balance: {
    fr: (v) => `💰 Nouveau solde : *${v}*`,
    en: (v) => `💰 New balance: *${v}*`,
    de: (v) => `💰 Neues Guthaben: *${v}*`,
    zh: (v) => `💰 新余额：*${v}*`,
  },
  withdrawal_session_expired: {
    fr: '⚠️ *Session expirée*\n\nTon retrait a été interrompu (le bot a redémarré).\n\nClique sur *💸 Retrait* pour recommencer.',
    en: '⚠️ *Session expired*\n\nYour withdrawal was interrupted (bot restarted).\n\nClick *💸 Withdrawal* to start again.',
    de: '⚠️ *Sitzung abgelaufen*\n\nDeine Auszahlung wurde unterbrochen (Bot neugestartet).\n\nKlicke auf *💸 Auszahlung*, um neu zu beginnen.',
    zh: '⚠️ *会话已过期*\n\n您的提现已中断（机器人已重启）。\n\n点击 *💸 提现* 重新开始。',
  },
  withdrawal_insufficient_confirm: {
    fr: '❌ Solde insuffisant pour effectuer ce retrait.',
    en: '❌ Insufficient balance for this withdrawal.',
    de: '❌ Unzureichendes Guthaben für diese Auszahlung.',
    zh: '❌ 余额不足，无法提现。',
  },
  withdrawal_error: {
    fr: '❌ Erreur lors du traitement. Contacte le support.',
    en: '❌ Processing error. Please contact support.',
    de: '❌ Verarbeitungsfehler. Bitte kontaktiere den Support.',
    zh: '❌ 处理错误，请联系客服。',
  },
  withdrawal_back_btn: {
    fr: '⬅️ Retour',
    en: '⬅️ Back',
    de: '⬅️ Zurück',
    zh: '⬅️ 返回',
  },
  withdrawal_back_to_countries: {
    fr: '🌍 Sélectionne ton pays :',
    en: '🌍 Select your country:',
    de: '🌍 Wähle dein Land:',
    zh: '🌍 选择您的国家：',
  },
  withdrawal_cancel_btn_text: {
    fr: '❌ Annuler',
    en: '❌ Cancel',
    de: '❌ Abbrechen',
    zh: '❌ 取消',
  },

  // ── Nouveau flux retrait crypto ───────────────────────────────────────────────
  withdrawal_no_crypto: {
    fr: '❌ Aucune crypto disponible pour le retrait. Contacte le support.',
    en: '❌ No crypto available for withdrawal. Contact support.',
    de: '❌ Keine Kryptowährung für die Auszahlung verfügbar. Wende dich an den Support.',
    zh: '❌ 暂无可用于提现的加密货币，请联系客服。',
  },
  withdrawal_select_crypto: {
    fr: '🪙 Choisissez la cryptomonnaie de réception :',
    en: '🪙 Choose the cryptocurrency to receive:',
    de: '🪙 Wähle die Empfangskryptowährung:',
    zh: '🪙 选择接收的加密货币：',
  },
  withdrawal_crypto_title: {
    fr: '💸 *RETRAIT — CRYPTO*',
    en: '💸 *WITHDRAWAL — CRYPTO*',
    de: '💸 *AUSZAHLUNG — KRYPTO*',
    zh: '💸 *提现 — 加密货币*',
  },
  withdrawal_wallet_title: {
    fr: '💸 *RETRAIT — ADRESSE WALLET*',
    en: '💸 *WITHDRAWAL — WALLET ADDRESS*',
    de: '💸 *AUSZAHLUNG — WALLET-ADRESSE*',
    zh: '💸 *提现 — 钱包地址*',
  },
  withdrawal_network_title: {
    fr: '💸 *RETRAIT — RÉSEAU*',
    en: '💸 *WITHDRAWAL — NETWORK*',
    de: '💸 *AUSZAHLUNG — NETZWERK*',
    zh: '💸 *提现 — 网络*',
  },
  withdrawal_crypto_label: {
    fr: (v) => `🪙 Crypto : *${v}*`,
    en: (v) => `🪙 Crypto: *${v}*`,
    de: (v) => `🪙 Krypto: *${v}*`,
    zh: (v) => `🪙 加密货币：*${v}*`,
  },
  withdrawal_wallet_label: {
    fr: (v) => `👛 Wallet : \`${v}\``,
    en: (v) => `👛 Wallet: \`${v}\``,
    de: (v) => `👛 Wallet: \`${v}\``,
    zh: (v) => `👛 钱包：\`${v}\``,
  },
  withdrawal_network_label: {
    fr: (v) => `🔗 Réseau : *${v}*`,
    en: (v) => `🔗 Network: *${v}*`,
    de: (v) => `🔗 Netzwerk: *${v}*`,
    zh: (v) => `🔗 网络：*${v}*`,
  },
  withdrawal_enter_wallet: {
    fr: (crypto) => `👛 Entrez votre adresse *${crypto}* de réception :`,
    en: (crypto) => `👛 Enter your *${crypto}* receiving wallet address:`,
    de: (crypto) => `👛 Gib deine *${crypto}* Empfangs-Wallet-Adresse ein:`,
    zh: (crypto) => `👛 输入您的 *${crypto}* 收款钱包地址：`,
  },
  withdrawal_invalid_wallet: {
    fr: '⚠️ Adresse invalide. Entre une adresse valide (10–150 caractères) :',
    en: '⚠️ Invalid address. Enter a valid address (10–150 characters):',
    de: '⚠️ Ungültige Adresse. Gib eine gültige Adresse ein (10–150 Zeichen):',
    zh: '⚠️ 地址无效，请输入有效地址（10–150个字符）：',
  },
  withdrawal_select_network: {
    fr: '🔗 Sélectionnez le réseau de transfert :',
    en: '🔗 Select the transfer network:',
    de: '🔗 Wähle das Überweisungsnetzwerk:',
    zh: '🔗 选择转账网络：',
  },
  withdrawal_rate_error: {
    fr: '⚠️ Impossible de récupérer le taux de conversion. Réessaie dans quelques secondes.',
    en: '⚠️ Unable to fetch conversion rate. Please try again in a few seconds.',
    de: '⚠️ Umrechnungskurs konnte nicht abgerufen werden. Versuche es in einigen Sekunden erneut.',
    zh: '⚠️ 无法获取汇率，请几秒钟后重试。',
  },
  withdrawal_conversion_line: {
    fr: (amount, crypto, rate) => `🔄 Tu recevras ≈ *${amount}* (1 USDT = ${rate} ${crypto})`,
    en: (amount, crypto, rate) => `🔄 You will receive ≈ *${amount}* (1 USDT = ${rate} ${crypto})`,
    de: (amount, crypto, rate) => `🔄 Du erhältst ≈ *${amount}* (1 USDT = ${rate} ${crypto})`,
    zh: (amount, crypto, rate) => `🔄 您将收到 ≈ *${amount}*（1 USDT = ${rate} ${crypto}）`,
  },
  withdrawal_summary_crypto: {
    fr: (v) => `🪙 Crypto : *${v}*`,
    en: (v) => `🪙 Crypto: *${v}*`,
    de: (v) => `🪙 Krypto: *${v}*`,
    zh: (v) => `🪙 加密货币：*${v}*`,
  },
  withdrawal_summary_wallet: {
    fr: (v) => `👛 Wallet : \`${v}\``,
    en: (v) => `👛 Wallet: \`${v}\``,
    de: (v) => `👛 Wallet: \`${v}\``,
    zh: (v) => `👛 钱包：\`${v}\``,
  },
  withdrawal_summary_network: {
    fr: (v) => `🔗 Réseau : *${v}*`,
    en: (v) => `🔗 Network: *${v}*`,
    de: (v) => `🔗 Netzwerk: *${v}*`,
    zh: (v) => `🔗 网络：*${v}*`,
  },

  // ── Explication ───────────────────────────────────────────────────────────────
  explanation_title: {
    fr: '📖 *COMMENT ÇA MARCHE ?*',
    en: '📖 *HOW DOES IT WORK?*',
    de: '📖 *WIE FUNKTIONIERT ES?*',
    zh: '📖 *如何运作？*',
  },
  explanation_referral: {
    fr: (v) => `👥 *${v} USDT* par parrainage confirmé`,
    en: (v) => `👥 *${v} USDT* per confirmed referral`,
    de: (v) => `👥 *${v} USDT* pro bestätigter Empfehlung`,
    zh: (v) => `👥 每次确认推荐 *${v} USDT*`,
  },
  explanation_bonus: {
    fr: (v) => `🎁 *${v} USDT* bonus quotidien`,
    en: (v) => `🎁 *${v} USDT* daily bonus`,
    de: (v) => `🎁 *${v} USDT* Tagesbonus`,
    zh: (v) => `🎁 每日奖励 *${v} USDT*`,
  },
  explanation_min_withdraw: {
    fr: (v) => `💳 Retrait minimum : *${v}*`,
    en: (v) => `💳 Minimum withdrawal: *${v}*`,
    de: (v) => `💳 Mindestabhebung: *${v}*`,
    zh: (v) => `💳 最低提现：*${v}*`,
  },
  explanation_steps_title: {
    fr: '*ÉTAPES SIMPLES :*',
    en: '*SIMPLE STEPS:*',
    de: '*EINFACHE SCHRITTE:*',
    zh: '*简单步骤：*',
  },
  explanation_step1: {
    fr: '1️⃣ *Rejoins* la communauté NeoCash',
    en: '1️⃣ *Join* the NeoCash community',
    de: '1️⃣ *Tritt* der NeoCash-Gemeinschaft bei',
    zh: '1️⃣ *加入* NeoCash 社区',
  },
  explanation_step2: {
    fr: '2️⃣ *Invite* tes amis avec ton lien unique',
    en: '2️⃣ *Invite* your friends with your unique link',
    de: '2️⃣ *Lade* deine Freunde mit deinem einzigartigen Link ein',
    zh: '2️⃣ *邀请*朋友使用您的专属链接',
  },
  explanation_step3: {
    fr: '3️⃣ *Réclame* ton bonus quotidien chaque jour',
    en: '3️⃣ *Claim* your daily bonus every day',
    de: '3️⃣ *Hole* deinen Tagesbonus jeden Tag ab',
    zh: '3️⃣ 每天*领取*每日奖励',
  },
  explanation_step4: {
    fr: (v) => `4️⃣ *Retire* ton argent dès ${v}`,
    en: (v) => `4️⃣ *Withdraw* your money from ${v}`,
    de: (v) => `4️⃣ *Hebe* dein Geld ab ${v} ab`,
    zh: (v) => `4️⃣ 从 ${v} 起*提现*`,
  },
  explanation_methods_title: {
    fr: '💳 *Méthodes de retrait disponibles :*',
    en: '💳 *Available withdrawal methods:*',
    de: '💳 *Verfügbare Auszahlungsmethoden:*',
    zh: '💳 *可用提现方式：*',
  },
  explanation_methods: {
    fr: 'USDT (TRC20 • ERC20 • BEP20) • BNB • BTC • ETH • SOL • TRX • MATIC et plus',
    en: 'USDT (TRC20 • ERC20 • BEP20) • BNB • BTC • ETH • SOL • TRX • MATIC and more',
    de: 'USDT (TRC20 • ERC20 • BEP20) • BNB • BTC • ETH • SOL • TRX • MATIC und mehr',
    zh: 'USDT（TRC20 • ERC20 • BEP20）• BNB • BTC • ETH • SOL • TRX • MATIC 等',
  },
  explanation_free: {
    fr: '⚡ *Pas de dépôt requis — 100% gratuit !*',
    en: '⚡ *No deposit required — 100% free!*',
    de: '⚡ *Keine Einzahlung erforderlich — 100% kostenlos!*',
    zh: '⚡ *无需存款 — 100% 免费！*',
  },

  // ── Support ──────────────────────────────────────────────────────────────────
  support_title: {
    fr: (name) => `📞 *SUPPORT ${name.toUpperCase()}*`,
    en: (name) => `📞 *${name.toUpperCase()} SUPPORT*`,
    de: (name) => `📞 *${name.toUpperCase()} SUPPORT*`,
    zh: (name) => `📞 *${name.toUpperCase()} 客服*`,
  },
  support_default_body: {
    fr: `Nous sommes là pour vous aider !\n\n📌 *Vous pouvez nous contacter pour :*\n\n🔧 *Problèmes techniques* — Retrait bloqué, bonus non reçu, bug...\n📢 *Publicités & Partenariats* — Diffuser votre offre à notre communauté\n🤝 *Collaborations* — Proposer un partenariat ou une affiliation\n❓ *Questions générales* — Tout autre question sur le bot\n⚠️ *Signalement* — Abus, arnaque, compte suspect`,
    en: `We are here to help you!\n\n📌 *You can contact us for:*\n\n🔧 *Technical issues* — Blocked withdrawal, bonus not received, bug...\n📢 *Advertising & Partnerships* — Promote your offer to our community\n🤝 *Collaborations* — Propose a partnership or affiliation\n❓ *General questions* — Any other question about the bot\n⚠️ *Report* — Abuse, scam, suspicious account`,
    de: `Wir sind hier, um Ihnen zu helfen!\n\n📌 *Sie können uns kontaktieren für:*\n\n🔧 *Technische Probleme* — Blockierte Auszahlung, Bonus nicht erhalten, Bug...\n📢 *Werbung & Partnerschaften* — Bewerben Sie Ihr Angebot in unserer Community\n🤝 *Kooperationen* — Partnerschaft oder Affiliate vorschlagen\n❓ *Allgemeine Fragen* — Alle anderen Fragen zum Bot\n⚠️ *Melden* — Missbrauch, Betrug, verdächtiges Konto`,
    zh: `我们在这里为您提供帮助！\n\n📌 *您可以联系我们：*\n\n🔧 *技术问题* — 提现被阻、未收到奖励、错误...\n📢 *广告与合作* — 向我们的社区推广您的产品\n🤝 *合作* — 提出合作或联盟计划\n❓ *一般问题* — 任何关于机器人的其他问题\n⚠️ *举报* — 滥用、诈骗、可疑账户`,
  },
  support_response_time: {
    fr: '⏱ Réponse sous *24h* maximum.',
    en: '⏱ Response within *24 hours* maximum.',
    de: '⏱ Antwort innerhalb von *24 Stunden* maximal.',
    zh: '⏱ 最长 *24小时* 内回复。',
  },
  support_contact_btn: {
    fr: '📩 Contacter le support',
    en: '📩 Contact support',
    de: '📩 Support kontaktieren',
    zh: '📩 联系客服',
  },
  support_write_message: {
    fr: '✍️ Écris ton message ci-dessous et notre équipe te répondra rapidement.',
    en: '✍️ Write your message below and our team will reply quickly.',
    de: '✍️ Schreibe deine Nachricht unten und unser Team wird schnell antworten.',
    zh: '✍️ 在下方写下您的消息，我们的团队将尽快回复。',
  },
  support_cancel_btn: {
    fr: '❌ Annuler',
    en: '❌ Cancel',
    de: '❌ Abbrechen',
    zh: '❌ 取消',
  },
  support_cancelled: {
    fr: '❌ Support annulé.',
    en: '❌ Support cancelled.',
    de: '❌ Support abgebrochen.',
    zh: '❌ 客服已取消。',
  },
  support_sent: {
    fr: '✅ *Message envoyé !*\n\nNotre équipe te répondra dès que possible.\nMerci de ta patience. 🙏',
    en: '✅ *Message sent!*\n\nOur team will reply as soon as possible.\nThank you for your patience. 🙏',
    de: '✅ *Nachricht gesendet!*\n\nUnser Team wird so schnell wie möglich antworten.\nVielen Dank für Ihre Geduld. 🙏',
    zh: '✅ *消息已发送！*\n\n我们的团队将尽快回复。\n感谢您的耐心等待。🙏',
  },
  support_admin_reply: {
    fr: '📩 *RÉPONSE DU SUPPORT*\n\n',
    en: '📩 *SUPPORT REPLY*\n\n',
    de: '📩 *SUPPORT-ANTWORT*\n\n',
    zh: '📩 *客服回复*\n\n',
  },

  // ── Vérification canaux ──────────────────────────────────────────────────────
  channel_verify_title: {
    fr: '🔒 *ACCÈS REQUIS*',
    en: '🔒 *ACCESS REQUIRED*',
    de: '🔒 *ZUGANG ERFORDERLICH*',
    zh: '🔒 *需要访问权限*',
  },
  channel_verify_text: {
    fr: (count) => `Pour utiliser le bot, rejoins ${count > 1 ? 'tous ces canaux' : 'ce canal'} :`,
    en: (count) => `To use the bot, join ${count > 1 ? 'all these channels' : 'this channel'}:`,
    de: (count) => `Um den Bot zu nutzen, tritt ${count > 1 ? 'allen diesen Kanälen' : 'diesem Kanal'} bei:`,
    zh: (count) => `要使用机器人，请加入${count > 1 ? '以下所有频道' : '此频道'}：`,
  },
  channel_verify_steps: {
    fr: (count) =>
      `1️⃣ Clique sur chaque bouton ci-dessous\n2️⃣ Rejoins ${count > 1 ? 'chaque canal' : 'le canal'}\n3️⃣ Clique sur ✅ *Vérifier mon accès*\n\n⚠️ L'accès est retiré si tu quittes l'un des canaux.`,
    en: (count) =>
      `1️⃣ Click each button below\n2️⃣ Join ${count > 1 ? 'each channel' : 'the channel'}\n3️⃣ Click ✅ *Verify my access*\n\n⚠️ Access is revoked if you leave any channel.`,
    de: (count) =>
      `1️⃣ Klicke auf jeden Button unten\n2️⃣ Tritt ${count > 1 ? 'jedem Kanal' : 'dem Kanal'} bei\n3️⃣ Klicke auf ✅ *Meinen Zugang überprüfen*\n\n⚠️ Zugang wird entzogen, wenn du einen Kanal verlässt.`,
    zh: (count) =>
      `1️⃣ 点击下方每个按钮\n2️⃣ 加入${count > 1 ? '每个频道' : '该频道'}\n3️⃣ 点击 ✅ *验证我的访问权限*\n\n⚠️ 如果您退出任何频道，访问权限将被撤销。`,
  },
  channel_verify_btn: {
    fr: '✅ Vérifier mon accès',
    en: '✅ Verify my access',
    de: '✅ Meinen Zugang überprüfen',
    zh: '✅ 验证我的访问权限',
  },
  channel_join_btn: {
    fr: '📢 Rejoindre',
    en: '📢 Join',
    de: '📢 Beitreten',
    zh: '📢 加入',
  },
  channel_visit_btn: {
    fr: '🌐 Visiter le site',
    en: '🌐 Visit website',
    de: '🌐 Website besuchen',
    zh: '🌐 访问网站',
  },
  channel_access_granted: {
    fr: '🎉 *Accès accordé !*\n\nBienvenue sur NeoCash. Utilise le menu ci-dessous.',
    en: '🎉 *Access granted!*\n\nWelcome to NeoCash. Use the menu below.',
    de: '🎉 *Zugang gewährt!*\n\nWillkommen bei NeoCash. Nutze das Menü unten.',
    zh: '🎉 *访问权限已授予！*\n\n欢迎来到 NeoCash。请使用下方菜单。',
  },
  channel_still_missing: {
    fr: (names) => `❌ Rejoins d'abord : ${names}`,
    en: (names) => `❌ Join first: ${names}`,
    de: (names) => `❌ Tritt zuerst bei: ${names}`,
    zh: (names) => `❌ 请先加入：${names}`,
  },

  // ── Maintenance / Banni ──────────────────────────────────────────────────────
  maintenance: {
    fr: '🚧 *Mode maintenance activé*\n\nLe bot est temporairement indisponible. Revenez plus tard !',
    en: '🚧 *Maintenance mode enabled*\n\nThe bot is temporarily unavailable. Come back later!',
    de: '🚧 *Wartungsmodus aktiviert*\n\nDer Bot ist vorübergehend nicht verfügbar. Komm später wieder!',
    zh: '🚧 *维护模式已启用*\n\n机器人暂时不可用，请稍后再来！',
  },
  banned: {
    fr: '🚫 Ton compte a été suspendu. Contacte le support pour plus d\'informations.',
    en: '🚫 Your account has been suspended. Contact support for more information.',
    de: '🚫 Dein Konto wurde gesperrt. Kontaktiere den Support für weitere Informationen.',
    zh: '🚫 您的账户已被暂停，请联系客服获取更多信息。',
  },

  // ── Messages généraux ────────────────────────────────────────────────────────
  use_menu: {
    fr: '💬 Utilise les boutons du menu ci-dessous.',
    en: '💬 Use the menu buttons below.',
    de: '💬 Nutze die Menü-Buttons unten.',
    zh: '💬 请使用下方菜单按钮。',
  },
  error_generic: {
    fr: '❌ Une erreur inattendue est survenue. Réessaie plus tard.',
    en: '❌ An unexpected error occurred. Please try again later.',
    de: '❌ Ein unerwarteter Fehler ist aufgetreten. Versuche es später erneut.',
    zh: '❌ 发生意外错误，请稍后重试。',
  },
  user_not_found: {
    fr: '❌ Utilisateur non trouvé.',
    en: '❌ User not found.',
    de: '❌ Benutzer nicht gefunden.',
    zh: '❌ 用户未找到。',
  },

  // ── Notifications utilisateur ────────────────────────────────────────────────
  withdrawal_approved_notif: {
    fr: (amount, crypto, wallet, cryptoLine) =>
      `✅ *RETRAIT APPROUVÉ !*\n\n━━━━━━━━━━━━━━━━━━\n💰 Montant : *${amount}*\n🪙 Crypto : *${crypto}*\n👛 Wallet : \`${wallet}\`${cryptoLine}\n\n🎉 Ta demande a été traitée !`,
    en: (amount, crypto, wallet, cryptoLine) =>
      `✅ *WITHDRAWAL APPROVED!*\n\n━━━━━━━━━━━━━━━━━━\n💰 Amount: *${amount}*\n🪙 Crypto: *${crypto}*\n👛 Wallet: \`${wallet}\`${cryptoLine}\n\n🎉 Your request has been processed!`,
    de: (amount, crypto, wallet, cryptoLine) =>
      `✅ *AUSZAHLUNG GENEHMIGT!*\n\n━━━━━━━━━━━━━━━━━━\n💰 Betrag: *${amount}*\n🪙 Krypto: *${crypto}*\n👛 Wallet: \`${wallet}\`${cryptoLine}\n\n🎉 Deine Anfrage wurde bearbeitet!`,
    zh: (amount, crypto, wallet, cryptoLine) =>
      `✅ *提现已批准！*\n\n━━━━━━━━━━━━━━━━━━\n💰 金额：*${amount}*\n🪙 加密货币：*${crypto}*\n👛 钱包：\`${wallet}\`${cryptoLine}\n\n🎉 您的请求已处理！`,
  },
  withdrawal_rejected_notif: {
    fr: (amount) =>
      `❌ *RETRAIT REFUSÉ*\n\n━━━━━━━━━━━━━━━━━━\n💰 Montant : *${amount}*\n\n🔄 Ton solde a été remboursé.\nContacte le support si tu as des questions.`,
    en: (amount) =>
      `❌ *WITHDRAWAL REJECTED*\n\n━━━━━━━━━━━━━━━━━━\n💰 Amount: *${amount}*\n\n🔄 Your balance has been refunded.\nContact support if you have questions.`,
    de: (amount) =>
      `❌ *AUSZAHLUNG ABGELEHNT*\n\n━━━━━━━━━━━━━━━━━━\n💰 Betrag: *${amount}*\n\n🔄 Dein Guthaben wurde zurückerstattet.\nKontaktiere den Support, wenn du Fragen hast.`,
    zh: (amount) =>
      `❌ *提现被拒绝*\n\n━━━━━━━━━━━━━━━━━━\n💰 金额：*${amount}*\n\n🔄 您的余额已退款。\n如有疑问，请联系客服。`,
  },
  credit_received_notif: {
    fr: (amount, balance) =>
      `💰 *CRÉDIT REÇU*\n\n+${amount} ajouté à ton compte par l'admin.\n💵 Nouveau solde : *${balance}*`,
    en: (amount, balance) =>
      `💰 *CREDIT RECEIVED*\n\n+${amount} added to your account by admin.\n💵 New balance: *${balance}*`,
    de: (amount, balance) =>
      `💰 *GUTHABEN ERHALTEN*\n\n+${amount} zu deinem Konto vom Admin hinzugefügt.\n💵 Neues Guthaben: *${balance}*`,
    zh: (amount, balance) =>
      `💰 *已收到充值*\n\n管理员向您的账户添加了 +${amount}。\n💵 新余额：*${balance}*`,
  },
  withdrawal_unlocked_notif: {
    fr: `🎉 *RETRAIT DÉBLOQUÉ !*\n\n✅ Un administrateur t'a accordé l'accès au retrait.\n\n💸 Tu peux maintenant effectuer ton retrait depuis le menu principal !`,
    en: `🎉 *WITHDRAWAL UNLOCKED!*\n\n✅ An administrator has granted you withdrawal access.\n\n💸 You can now make your withdrawal from the main menu!`,
    de: `🎉 *AUSZAHLUNG ENTSPERRT!*\n\n✅ Ein Administrator hat dir Auszahlungszugang gewährt.\n\n💸 Du kannst jetzt deine Auszahlung über das Hauptmenü vornehmen!`,
    zh: `🎉 *提现已解锁！*\n\n✅ 管理员已授予您提现权限。\n\n💸 您现在可以从主菜单进行提现！`,
  },
  referral_pending_notif: {
    fr: (firstName, bonus) =>
      `🔔 *Quelqu'un a cliqué sur ton lien !*\n\n👤 *${firstName}* vient d'utiliser ton lien de parrainage.\n\n⏳ En attente de vérification des canaux...\n💰 Tu gagneras *${bonus} USDT* dès que la vérification sera validée.`,
    en: (firstName, bonus) =>
      `🔔 *Someone clicked your link!*\n\n👤 *${firstName}* just used your referral link.\n\n⏳ Waiting for channel verification...\n💰 You will earn *${bonus} USDT* once verification is confirmed.`,
    de: (firstName, bonus) =>
      `🔔 *Jemand hat auf deinen Link geklickt!*\n\n👤 *${firstName}* hat gerade deinen Empfehlungslink verwendet.\n\n⏳ Warten auf Kanalverifizierung...\n💰 Du wirst *${bonus} USDT* verdienen, sobald die Verifizierung bestätigt ist.`,
    zh: (firstName, bonus) =>
      `🔔 *有人点击了您的链接！*\n\n👤 *${firstName}* 刚刚使用了您的推荐链接。\n\n⏳ 等待频道验证...\n💰 验证通过后您将获得 *${bonus} USDT*。`,
  },
  referral_credited_notif: {
    fr: (refFirstName, filFirstName, bonus, count, balance, shareUrl) =>
      `🎉 *Félicitations ${refFirstName} !*\n\n` +
      `💸 Tu viens de gagner *${bonus} USDT* !\n\n` +
      `👤 *${filFirstName}* vient de rejoindre NeoCash grâce à ton lien.\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💰 Bonus crédité : *+${bonus} USDT*\n` +
      `👥 Total filleuls validés : *${count}*\n` +
      `💳 Nouveau solde : *${balance}*\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `📲 Partage encore ton lien pour gagner plus !`,
    en: (refFirstName, filFirstName, bonus, count, balance, shareUrl) =>
      `🎉 *Congratulations ${refFirstName}!*\n\n` +
      `💸 You just earned *${bonus} USDT*!\n\n` +
      `👤 *${filFirstName}* just joined NeoCash through your link.\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💰 Bonus credited: *+${bonus} USDT*\n` +
      `👥 Total validated referrals: *${count}*\n` +
      `💳 New balance: *${balance}*\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `📲 Share your link again to earn more!`,
    de: (refFirstName, filFirstName, bonus, count, balance, shareUrl) =>
      `🎉 *Glückwunsch ${refFirstName}!*\n\n` +
      `💸 Du hast gerade *${bonus} USDT* verdient!\n\n` +
      `👤 *${filFirstName}* ist gerade über deinen Link bei NeoCash beigetreten.\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💰 Bonus gutgeschrieben: *+${bonus} USDT*\n` +
      `👥 Bestätigte Empfehlungen: *${count}*\n` +
      `💳 Neues Guthaben: *${balance}*\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `📲 Teile deinen Link erneut, um mehr zu verdienen!`,
    zh: (refFirstName, filFirstName, bonus, count, balance, shareUrl) =>
      `🎉 *恭喜 ${refFirstName}！*\n\n` +
      `💸 您刚刚赚取了 *${bonus} USDT*！\n\n` +
      `👤 *${filFirstName}* 刚刚通过您的链接加入了 NeoCash。\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💰 已奖励：*+${bonus} USDT*\n` +
      `👥 已确认推荐总计：*${count}*\n` +
      `💳 新余额：*${balance}*\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `📲 再次分享您的链接以赚取更多！`,
  },
  referral_share_again_btn: {
    fr: '📤 Partager encore',
    en: '📤 Share again',
    de: '📤 Erneut teilen',
    zh: '📤 再次分享',
  },

  // ── Menu principal ────────────────────────────────────────────────────────────
  menu_title: {
    fr: '📱 *Menu Principal*',
    en: '📱 *Main Menu*',
    de: '📱 *Hauptmenü*',
    zh: '📱 *主菜单*',
  },
};

/**
 * Fonction de traduction principale
 * @param {string} lang - Code langue (fr, en, de, zh)
 * @param {string} key - Clé de traduction
 * @param {...any} args - Arguments pour les fonctions
 * @returns {string}
 */
export function t(lang, key, ...args) {
  const validLang = SUPPORTED_LANGUAGES.includes(lang) ? lang : 'fr';
  const entry = translations[key];
  if (!entry) {
    console.warn(`[i18n] Clé manquante : ${key}`);
    return key;
  }
  const value = entry[validLang] ?? entry['fr'];
  if (typeof value === 'function') {
    return value(...args);
  }
  return value;
}

/**
 * Obtenir la langue de l'utilisateur depuis le contexte
 * @param {object} ctx - Contexte Telegraf
 * @returns {string}
 */
export function getLang(ctx) {
  return ctx.userLang || ctx.dbUser?.language || 'fr';
}
