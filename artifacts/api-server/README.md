# 🤖 NeoCash Bot — Guide de déploiement Plesk

Bot Telegram professionnel de gains et de parrainage pour l'Afrique de l'Ouest.

---

## ⚙️ Configuration Plesk (Node.js)

Dans le panneau Plesk, ouvre **Node.js** et configure :

| Paramètre | Valeur |
|-----------|--------|
| **Document Root** | Chemin vers `artifacts/api-server` dans ton repo |
| **Application Startup File** | `bot/index.js` |
| **Node.js version** | 20 ou supérieur |

---

## 🔑 Variables d'environnement (obligatoires)

Dans **Plesk → Node.js → Environment Variables**, ajoute :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `BOT_TOKEN` | Token du bot (@BotFather) | `7123456789:AAH...` |
| `MONGODB_URI` | URI MongoDB Atlas | `mongodb+srv://user:pass@cluster.mongodb.net/neocash` |
| `ADMIN_IDS` | Ton ID Telegram (via @userinfobot) | `123456789` |

### Variables optionnelles

| Variable | Description | Défaut |
|----------|-------------|--------|
| `ADMIN_GROUP_ID` | ID groupe admin Telegram | — |
| `REFERRAL_BONUS` | Bonus parrainage FCFA | `120` |
| `DAILY_BONUS` | Bonus quotidien FCFA | `100` |
| `MIN_WITHDRAW` | Retrait minimum FCFA | `800` |
| `PORT` | Port du serveur HTTP | `5000` |
| `NODE_ENV` | Environnement | `production` |
| `LOG_LEVEL` | Niveau de log | `info` |

> 💡 Tu peux aussi créer un fichier `.env` à la racine de `artifacts/api-server/` en copiant `.env.example`.

---

## 🚀 Procédure de déploiement

### Premier déploiement

1. **Connecter** le repo GitHub dans Plesk (Git → Add Repository)
2. **Configurer** le Document Root sur `artifacts/api-server`
3. **Ajouter** les variables d'environnement (BOT_TOKEN, MONGODB_URI, ADMIN_IDS)
4. Cliquer **NPM Install** dans Plesk
5. Cliquer **Run** (ou **Restart**)

### Mise à jour (Pull + Deploy + Restart)

1. Cliquer **Pull** dans Plesk (ou **Deploy Now**)
2. Cliquer **Restart**

> ✅ Pas besoin de relancer NPM Install à chaque mise à jour, sauf si `package.json` change.

---

## 📁 Structure des fichiers

```
artifacts/api-server/
├── bot/
│   ├── index.js          ← Point d'entrée (Application Startup File)
│   ├── bot.js            ← Configuration Telegraf
│   ├── commands/         ← /start, /admin
│   ├── handlers/         ← balance, bonus, retrait, support...
│   ├── models/           ← MongoDB schemas
│   ├── middleware/        ← auth, admin, anti-spam
│   ├── utils/            ← keyboards, messages, notify...
│   ├── database/         ← Connexion MongoDB
│   └── assets/
│       └── logo.png      ← Logo affiché au /start
├── .env.example          ← Modèle des variables d'environnement
├── package.json          ← Dépendances npm
├── package-lock.json     ← Verrou des versions (généré)
└── README.md             ← Ce fichier
```

---

## 🛡 Prérequis

- **MongoDB Atlas** : Créer un cluster gratuit sur [mongodb.com/atlas](https://www.mongodb.com/atlas) et récupérer l'URI de connexion
- **Bot Telegram** : Créer le bot via [@BotFather](https://t.me/BotFather) et récupérer le token
- **ID Telegram admin** : Obtenir via [@userinfobot](https://t.me/userinfobot)

---

## 🩺 Healthcheck

Une fois démarré, le bot expose :

- `GET /api/health` — Statut du bot et de la connexion MongoDB
- `GET /api/stats` — Nombre d'utilisateurs et retraits en attente

---

## 💬 Fonctionnalités

| Fonctionnalité | Détail |
|---------------|--------|
| 👥 Parrainage | 120 FCFA par ami invité (configurable) |
| 🎁 Bonus quotidien | 100 FCFA toutes les 24h (configurable) |
| 💸 Retrait Mobile Money | Min 800 FCFA, 10 pays africains |
| 🛡 Panel admin Telegram | Stats, gestion users, diffusion, paramètres |
| 📢 Canal obligatoire | Vérification avant chaque action |
| 📣 Canal de retrait | Notifications publiques automatiques |
| 📞 Support personnalisé | Lien + message configurables par l'admin |
