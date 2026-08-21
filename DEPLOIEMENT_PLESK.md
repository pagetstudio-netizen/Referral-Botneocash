# 🚀 Guide de déploiement — Moon Crypto Bot sur Plesk

## Architecture en production

Un seul processus Node.js gère tout :
- 🤖 Le bot Telegram (long-polling)
- 🔌 L'API Express (`/api/*`)
- 🖥️ Le dashboard admin (fichiers statiques depuis `artifacts/admin-dashboard/dist/public/`)

---

## Étape 1 — GitHub : pousser le code

```bash
git add .
git commit -m "deploy: Moon Crypto Bot"
git push origin main
```

---

## Étape 2 — Plesk : Configurer l'application Node.js

Va sur **zoksilll.online → Node.js** dans Plesk.

### ✅ Paramètres Node.js — exactement ces valeurs

| Champ Plesk | Valeur à saisir |
|---|---|
| **Node.js version** | `20` |
| **Application mode** | `production` |
| **Application root** | `/` *(racine du dépôt, laisser vide ou `/`)* |
| **Document root** | `public` ← **dossier `public/` à la racine du dépôt** |
| **Application startup file** | `artifacts/api-server/bot/index.js` |

> Le dossier `public/` est déjà créé dans le dépôt. Plesk/Passenger l'utilise comme point d'entrée statique, mais Node.js intercepte toutes les requêtes.

---

## Étape 3 — Plesk : Variables d'environnement

Dans **Node.js → Environment Variables** :

| Variable | Valeur |
|---|---|
| `NODE_ENV` | `production` |
| `APP_URL` | `http://zoksilll.online` |
| `BOT_TOKEN` | *(token BotFather)* |
| `SUPABASE_DB_URL` | *(URL PostgreSQL Supabase)* |
| `ADMIN_EMAIL` | *(email dashboard)* |
| `ADMIN_PASSWORD` | *(mot de passe dashboard)* |
| `ADMIN_JWT_SECRET` | *(chaîne aléatoire longue, ex: 64 caractères)* |
| `ADSGRAM_BLOCK_ID` | *(chiffres seulement, sans `bot-`)* |
| `ADSGRAM_TOKEN` | *(token depuis profil Adsgram)* |

> **`PORT`** : ne pas le définir — Plesk/Passenger le fixe automatiquement.

---

## Étape 4 — Plesk : Script de déploiement

Dans **Git → Deployment script** (ou custom npm script) :

```
bash deploy.sh
```

Ce script fait automatiquement :
1. Installe `pnpm` si absent
2. Installe toutes les dépendances
3. Build le dashboard admin → `artifacts/admin-dashboard/dist/public/`

---

## Étape 5 — Plesk : Connecter GitHub

1. **Hébergement web → Git → Ajouter un dépôt**
2. URL : `https://github.com/TON_COMPTE/TON_REPO.git`
3. Branche : `main`

---

## Étape 6 — Déploiement (et toutes les mises à jour futures)

```
1. Plesk → Git → Pull
2. Plesk → Git → Deploy Now   ← exécute deploy.sh (installe + build)
3. Plesk → Node.js → Restart  ← redémarre le bot
```

✅ Le bot tourne sur `http://zoksilll.online`

---

## Étape 7 — Configurer Adsgram Reward URL

Dans le dashboard Adsgram (partner.adsgram.ai), champ **Reward URL** :

```
http://zoksilll.online/api/adsgram/reward?userid=[userId]
```

Adsgram remplace `[userId]` par l'ID Telegram de l'utilisateur et appelle cette URL quand la pub est regardée. Le bot crédite automatiquement le solde et notifie l'utilisateur sur Telegram.

---

## Vérifications après déploiement

| Test | Résultat attendu |
|---|---|
| `http://zoksilll.online/api/health` | `{"status":"ok"}` |
| `http://zoksilll.online/` | Page de connexion dashboard |
| `/start` dans Telegram | Bot répond |
| `http://zoksilll.online/api/adsgram/reward?userid=123` | `{"success":true,...}` |

---

## Structure des fichiers (après deploy.sh)

```
/ ← Application root Plesk
├── public/                           ← Document root Plesk (dossier vide requis)
├── deploy.sh                         ← Script Plesk
├── artifacts/
│   ├── api-server/
│   │   └── bot/index.js             ← Application startup file
│   └── admin-dashboard/
│       └── dist/public/             ← Généré par deploy.sh
│           ├── index.html
│           └── assets/
└── ...
```
