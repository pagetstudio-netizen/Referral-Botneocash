# 🚀 Guide de déploiement — Moon Crypto Bot sur Plesk

## Architecture en production

Un seul processus Node.js gère tout :
- 🤖 Bot Telegram (long-polling)
- 🔌 API Express (`/api/*`)
- 🖥️ Dashboard admin (statique depuis `artifacts/admin-dashboard/dist/public/`)

---

## Étape 1 — Pousser sur GitHub

```bash
git add .
git commit -m "deploy: Moon Crypto Bot"
git push origin main
```

---

## Étape 2 — Plesk : Configuration Node.js

Dans **zoksilll.online → Node.js** :

| Champ | Valeur |
|---|---|
| **Node.js version** | `20` |
| **Application mode** | `production` |
| **Application root** | `artifacts/api-server` |
| **Document root** | `public` |
| **Application startup file** | `bot/index.js` |

> ⚠️ Application root = `artifacts/api-server` (PAS la racine du dépôt).
> Plesk installera les dépendances npm dans ce dossier — son `package.json` est compatible npm.

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
| `ADMIN_JWT_SECRET` | *(chaîne aléatoire longue)* |
| `ADSGRAM_BLOCK_ID` | `43911` |
| `ADSGRAM_TOKEN` | *(token Adsgram)* |

---

## Étape 4 — Plesk : Script de déploiement Git

Dans **Git → Deployment script** :

```
bash deploy.sh
```

Ce script (`deploy.sh` à la racine du dépôt) :
1. Installe pnpm si absent
2. Lance `pnpm install` sur tout le monorepo
3. Build le dashboard → `artifacts/admin-dashboard/dist/public/`

---

## Étape 5 — Connecter GitHub

**Hébergement web → Git → Ajouter un dépôt**
- URL : `https://github.com/TON_COMPTE/TON_REPO.git`
- Branche : `main`

---

## Étape 6 — Déployer (et toutes les mises à jour futures)

```
① Git → Pull
② Git → Deploy Now    ← exécute deploy.sh
③ Node.js → Restart   ← démarre le bot
```

---

## Étape 7 — Adsgram Reward URL

Champ **Reward URL** dans partner.adsgram.ai :

```
http://zoksilll.online/api/adsgram/reward?userid=[userId]
```

---

## Vérifications

| Test | Résultat attendu |
|---|---|
| `http://zoksilll.online/api/health` | `{"status":"ok"}` |
| `http://zoksilll.online/` | Page de connexion dashboard |
| `/start` dans Telegram | Bot répond |

---

## Structure après déploiement

```
/ (racine dépôt Git)
├── deploy.sh                          ← script Git deployment
├── public/                            ← Document root Plesk (placeholder)
├── artifacts/
│   ├── api-server/                    ← Application root Plesk
│   │   ├── bot/index.js              ← Application startup file
│   │   └── node_modules/             ← installé par npm (Plesk) + pnpm
│   └── admin-dashboard/
│       └── dist/public/              ← généré par deploy.sh
└── ...
```
