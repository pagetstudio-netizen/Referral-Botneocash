# 🤖 NeoCash Bot

Bot Telegram professionnel de gains et de parrainage pour l'Afrique de l'Ouest.

## ✨ Fonctionnalités

- 👥 **Parrainage** — 120 FCFA par ami invité
- 🎁 **Bonus quotidien** — 100 FCFA toutes les 24h
- 💸 **Retraits** — Mobile Money (MTN, Moov, Orange, TMoney, Wave, etc.)
- 🔒 **Vérification canal** — Accès conditionné à l'adhésion
- 🛡 **Panel Admin complet** — Stats, gestion users, diffusion globale
- 🌍 **Multi-pays** — Togo, Bénin, Côte d'Ivoire, Sénégal, Mali, Burkina, Niger, Guinée, Cameroun, Congo

## 🚀 Installation rapide

### 1. Cloner et installer les dépendances

```bash
git clone <repo>
cd neocash-bot
pnpm install
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Édite `.env` et remplis :
- `BOT_TOKEN` — Token obtenu via [@BotFather](https://t.me/BotFather)
- `MONGODB_URI` — Connexion MongoDB Atlas ou locale
- `ADMIN_IDS` — Ton ID Telegram (obtenu via [@userinfobot](https://t.me/userinfobot))

### 3. Démarrer le bot

```bash
pnpm run dev
```

## ⚙️ Variables d'environnement

| Variable | Description | Exemple |
|---|---|---|
| `BOT_TOKEN` | Token Telegram du bot | `123456:ABC...` |
| `MONGODB_URI` | URI MongoDB | `mongodb+srv://...` |
| `ADMIN_IDS` | IDs admins (séparés par virgule) | `123456,789012` |
| `ADMIN_GROUP_ID` | ID groupe admin (notifications) | `-100123456789` |
| `REFERRAL_BONUS` | Bonus parrainage (FCFA) | `120` |
| `DAILY_BONUS` | Bonus quotidien (FCFA) | `100` |
| `MIN_WITHDRAW` | Retrait minimum (FCFA) | `800` |
| `REQUIRED_CHANNEL` | Canal obligatoire | `@moncanal` |

## 📂 Structure du projet

```
bot/
├── commands/
│   ├── start.js          # Commande /start + parrainage
│   └── admin.js          # Panel admin complet
├── handlers/
│   ├── balance.js        # Affichage solde
│   ├── bonus.js          # Bonus quotidien
│   ├── referral.js       # Système parrainage
│   ├── withdrawal.js     # Flux retrait multi-étapes
│   ├── support.js        # Système support
│   └── explanation.js    # Page explication
├── models/
│   ├── User.js           # Modèle utilisateur
│   ├── Withdrawal.js     # Modèle retrait
│   ├── Referral.js       # Modèle parrainage
│   ├── Transaction.js    # Historique transactions
│   ├── Settings.js       # Paramètres dynamiques
│   ├── Admin.js          # Administrateurs
│   └── Notification.js   # Notifications
├── middleware/
│   ├── auth.js           # Auth, vérif canal, anti-ban
│   ├── admin.js          # Middleware admin
│   └── antispam.js       # Protection anti-spam
├── utils/
│   ├── keyboards.js      # Claviers inline/persistants
│   ├── messages.js       # Templates messages
│   ├── countries.js      # Pays & opérateurs
│   ├── notify.js         # Notifications admins
│   └── logger.js         # Logger
├── database/
│   └── connect.js        # Connexion MongoDB
├── bot.js                # Configuration Telegraf
└── index.js              # Point d'entrée
```

## 👨‍💼 Commandes admin

- `/admin` — Ouvre le panel administrateur

### Fonctionnalités admin :
- 📊 Statistiques complètes (users, retraits, bonus)
- 👤 Gestion utilisateurs (créditer, débiter, bannir)
- 💸 Validation/refus des retraits
- 📢 Diffusion globale (texte + image + bouton)
- ⚙️ Paramètres dynamiques (bonus, canal, maintenance)

## 🌍 Pays et opérateurs supportés

| Pays | Opérateurs |
|---|---|
| 🇹🇬 Togo | TMoney, Moov Togo, Flooz |
| 🇧🇯 Bénin | MTN, Moov, Celtiis |
| 🇨🇮 Côte d'Ivoire | MTN, Orange Money, Moov, Wave |
| 🇸🇳 Sénégal | Orange Money, Wave, Free Money |
| 🇲🇱 Mali | Orange Money, Moov, Wave |
| 🇧🇫 Burkina Faso | Orange Money, Moov, Coris Money |
| 🇳🇪 Niger | Airtel Money, Moov Money |
| 🇬🇳 Guinée | Orange Money, MTN |
| 🇨🇲 Cameroun | MTN, Orange Money |
| 🇨🇬 Congo Brazzaville | Airtel Money, MTN |

## 🚀 Déploiement

### Replit
Le bot tourne automatiquement via le workflow configuré.

### Render / Railway
```bash
# Build command: pnpm install
# Start command: node bot/index.js
```

### VPS Linux
```bash
# Avec PM2
npm install -g pm2
pm2 start bot/index.js --name neocash-bot
pm2 save
pm2 startup
```

## 🔐 Sécurité

- ✅ Anti-spam (10 requêtes/10s par utilisateur)
- ✅ Vérification canal obligatoire
- ✅ Protection contre les multi-comptes
- ✅ Validation des données (montants, numéros)
- ✅ Middleware admin sécurisé
- ✅ Logs d'erreurs complets
