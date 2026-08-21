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
| **Application startup file** | `bot/loader.cjs` |

> ⚠️ **Startup file = `bot/loader.cjs`** (pas `bot/index.js`).
> Ce fichier CJS est compatible avec toutes les versions de Passenger/Plesk.

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

`deploy.sh` installe les dépendances npm dans `artifacts/api-server/`.
Le dashboard est déjà buildé et commité dans git — aucun build nécessaire.

---

## Étape 5 — Connecter GitHub

**Hébergement web → Git → Ajouter un dépôt**
- URL : `https://github.com/TON_COMPTE/TON_REPO.git`
- Branche : `main`

---

## Étape 6 — Déployer (et toutes les mises à jour futures)

```
① Git → Pull
② Git → Deploy Now    ← exécute deploy.sh (npm install)
③ Node.js → Restart   ← démarre le bot via loader.cjs
```

---

## Étape 7 — Vérifications

| Test | Résultat attendu |
|---|---|
| `http://zoksilll.online/api/health` | `{"status":"ok","dbConnected":true,"botRunning":true}` |
| `http://zoksilll.online/` | Page de connexion dashboard |
| `/start` dans Telegram | Bot répond |

---

## En cas de problème : lire le log d'erreur

Si l'app plante au démarrage, un fichier `artifacts/api-server/startup-error.log`
est créé. Lire son contenu via SSH Plesk :

```bash
cat /var/www/vhosts/zoksilll.online/httpdocs/artifacts/api-server/startup-error.log
```

---

## Adsgram Reward URL

Champ **Reward URL** dans partner.adsgram.ai :

```
http://zoksilll.online/api/adsgram/reward?userid=[userId]
```
