# NeoCash Bot

Bot Telegram professionnel de gains et de parrainage pour l'Afrique de l'Ouest. Les utilisateurs gagnent de l'argent via le parrainage (120 FCFA/ami) et les bonus quotidiens (100 FCFA/jour).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — lancer le bot Telegram + serveur Express
- `node artifacts/api-server/bot/index.js` — démarrage direct du bot

## Stack

- Node.js 24 (ESM), Telegraf 4, MongoDB + Mongoose
- Express 5 (healthcheck), dotenv, axios

## Where things live

- `artifacts/api-server/bot/` — Tout le code du bot Telegram
  - `commands/` — /start, /admin
  - `handlers/` — balance, bonus, referral, withdrawal, support, explanation
  - `models/` — User, Withdrawal, Referral, Transaction, Settings, Admin, Notification
  - `middleware/` — auth (canal verify), admin, antispam
  - `utils/` — keyboards, messages, countries, notify, logger
  - `database/connect.js` — Connexion MongoDB
  - `bot.js` — Configuration Telegraf centrale
  - `index.js` — Point d'entrée

## Architecture decisions

- Bot en long-polling (pas de webhook) pour la compatibilité Replit
- Sessions multi-étapes en mémoire (Map) pour les flux retrait/admin
- Paramètres dynamiques dans MongoDB (Settings) modifiables depuis Telegram
- Canal obligatoire vérifié via `getChatMember` à chaque action
- Anti-spam via compteur de requêtes par fenêtre glissante

## Product

- 👥 Parrainage : 120 FCFA par ami invité (via lien unique)
- 🎁 Bonus quotidien : 100 FCFA toutes les 24h
- 💸 Retraits Mobile Money : min 800 FCFA, 10 pays africains supportés
- 🛡 Panel admin Telegram : stats, gestion users, diffusion globale, paramètres dynamiques
- 🔒 Vérification canal obligatoire configurable

## User preferences

- Code en JavaScript (ESM), pas TypeScript pour le bot
- Architecture propre avec dossiers séparés (commands, handlers, models, middleware, utils)
- Interface en français avec emojis professionnels
- Devise FCFA

## Gotchas

- Toujours configurer BOT_TOKEN et MONGODB_URI avant de démarrer
- ADMIN_IDS = IDs Telegram séparés par des virgules (obtenir via @userinfobot)
- Pour les notifications de groupe admin : ajouter le bot dans le groupe, utiliser ADMIN_GROUP_ID
- Le canal obligatoire doit avoir le bot en tant qu'admin pour vérifier les membres

## Secrets requis

- `BOT_TOKEN` — Token Telegram du bot (via @BotFather)
- `MONGODB_URI` — Connexion MongoDB Atlas
- `ADMIN_IDS` — IDs Telegram des admins

## Pointers

- Voir `artifacts/api-server/README.md` pour la documentation complète
- Voir `artifacts/api-server/.env.example` pour toutes les variables disponibles
