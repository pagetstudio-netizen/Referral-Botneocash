# NeoCash Bot

Bot Telegram professionnel de gains et de parrainage pour l'Afrique de l'Ouest. Les utilisateurs gagnent de l'argent via le parrainage (120 FCFA/ami) et les bonus quotidiens (100 FCFA/jour).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — lancer le bot Telegram + serveur Express
- `node artifacts/api-server/bot/index.js` — démarrage direct du bot

## Stack

- Node.js 24 (ESM), Telegraf 4, Supabase (PostgreSQL via `pg`)
- Express 4 (healthcheck), dotenv, axios

## Where things live

- `artifacts/api-server/bot/` — Tout le code du bot Telegram
  - `commands/` — /start, /admin
  - `handlers/` — balance, bonus, referral, withdrawal, support, explanation
  - `models/` — User, Withdrawal, Referral, Transaction, Settings, Admin, Notification
  - `middleware/` — auth (canal verify), admin, antispam
  - `utils/` — keyboards, messages, countries, notify, logger
  - `database/connect.js` — Connexion Supabase PostgreSQL
  - `database/db.js` — Pool pg (queryOne, queryAll, queryScalar)
  - `database/schema.sql` — Schéma PostgreSQL (CREATE IF NOT EXISTS, auto-exécuté)
  - `bot.js` — Configuration Telegraf centrale
  - `index.js` — Point d'entrée

## Architecture decisions

- Bot en long-polling (bot.launch() sans await) pour la compatibilité Replit
- Base de données : Supabase PostgreSQL via pool `pg` (pas MongoDB/Mongoose)
- Sessions multi-étapes en mémoire (Map) pour les flux retrait/admin
- Paramètres dynamiques dans PostgreSQL (table settings) modifiables depuis Telegram
- Canal obligatoire vérifié via `getChatMember` à chaque action
- Anti-spam via compteur de requêtes par fenêtre glissante
- Schéma SQL initialisé automatiquement au démarrage (idempotent)

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

- `bot.launch()` ne doit PAS être attendu (await) — c'est une boucle infinie en long-polling
- ADMIN_IDS = IDs Telegram séparés par des virgules (obtenir via @userinfobot)
- Pour les notifications de groupe admin : ajouter le bot dans le groupe, utiliser ADMIN_GROUP_ID
- Le canal obligatoire doit avoir le bot en tant qu'admin pour vérifier les membres
- DATABASE_URL est réservé par Replit — utiliser SUPABASE_DB_URL pour la connexion pg

## Secrets requis

- `BOT_TOKEN` — Token Telegram du bot (via @BotFather) ✅ configuré
- `SUPABASE_DB_URL` — URL de connexion PostgreSQL Supabase ✅ configuré
- `ADMIN_IDS` — IDs Telegram des admins (optionnel mais recommandé)

## Pointers

- Voir `artifacts/api-server/README.md` pour la documentation complète
- Voir `artifacts/api-server/.env.example` pour toutes les variables disponibles
