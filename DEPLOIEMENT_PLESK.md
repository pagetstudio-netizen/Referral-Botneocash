# 🚀 Guide de déploiement — Moon Crypto Bot sur Plesk

## Architecture en production

Un seul processus Node.js gère tout :
- 🤖 Le bot Telegram (long-polling)
- 🔌 L'API Express (`/api/*`)
- 🖥️ Le dashboard admin (fichiers statiques servis depuis `artifacts/admin-dashboard/dist/public/`)

---

## Étape 1 — GitHub : pousser le code

```bash
git add .
git commit -m "deploy: Moon Crypto Bot"
git push origin main
```

---

## Étape 2 — Plesk : Configurer l'application Node.js

Dans Plesk, va sur **zoksilll.online → Node.js** (dans la section "Hébergement web").

### Paramètres Node.js

| Champ Plesk | Valeur à saisir |
|---|---|
| **Node.js version** | `20` (ou 20.x la plus récente disponible) |
| **Application mode** | `production` |
| **Application root** | `/` *(racine du dépôt Git)* |
| **Application startup file** | `artifacts/api-server/bot/index.js` |
| **Document root** | `public` *(laisser par défaut, non utilisé)* |

---

## Étape 3 — Plesk : Variables d'environnement

Dans **Node.js → Environment Variables**, ajoute ces variables :

| Variable | Valeur |
|---|---|
| `NODE_ENV` | `production` |
| `APP_URL` | `http://zoksilll.online` |
| `BOT_TOKEN` | *(ton token BotFather)* |
| `SUPABASE_DB_URL` | *(ton URL PostgreSQL Supabase)* |
| `ADMIN_EMAIL` | *(email de connexion au dashboard)* |
| `ADMIN_PASSWORD` | *(mot de passe dashboard)* |
| `ADMIN_JWT_SECRET` | *(chaîne aléatoire longue, ex: 64 caractères)* |
| `ADSGRAM_BLOCK_ID` | *(ID du bloc Adsgram, chiffres seulement)* |
| `ADSGRAM_TOKEN` | *(token Adsgram depuis ton profil)* |

> **`PORT`** : ne pas le définir — Plesk/Passenger le fixe automatiquement.

---

## Étape 4 — Plesk : Script de déploiement personnalisé

Dans **Plesk → Git → Dépôt** (ou dans les paramètres Node.js sous "Custom deployment script") :

**Deployment script** :
```
bash deploy.sh
```

Ce script (fourni à la racine du projet) fait automatiquement :
1. Installe `pnpm`
2. Installe toutes les dépendances
3. Build le dashboard admin → `artifacts/admin-dashboard/dist/public/`

---

## Étape 5 — Plesk : Connecter GitHub

1. **Hébergement web → Git → Ajouter un dépôt**
2. URL du dépôt : `https://github.com/TON_COMPTE/TON_REPO.git`
3. Branche : `main`
4. Cocher **"Déployer automatiquement"** si tu veux que chaque push déclenche le déploiement

---

## Étape 6 — Premier déploiement

1. Clique **"Pull"** → Plesk récupère le code depuis GitHub
2. Clique **"Deploy Now"** → exécute `deploy.sh` (installe + build)
3. Clique **"Restart"** dans la section Node.js → démarre le bot

✅ Le bot est maintenant en ligne sur `http://zoksilll.online`

---

## Workflow pour les mises à jour futures

```
1. Modifier le code localement
2. git push origin main
3. Sur Plesk : Pull → Deploy Now → Restart
```

---

## Vérification que tout fonctionne

| Test | URL / Action |
|---|---|
| API en ligne | `http://zoksilll.online/api/health` → doit retourner `{"status":"ok"}` |
| Dashboard admin | `http://zoksilll.online/` → page de connexion |
| Bot actif | Envoie `/start` à ton bot sur Telegram |

---

## Structure des fichiers après déploiement

```
/ (racine du dépôt = Application root Plesk)
├── deploy.sh                          ← script exécuté par Plesk
├── artifacts/
│   ├── api-server/
│   │   ├── bot/index.js              ← Application startup file
│   │   └── ...
│   └── admin-dashboard/
│       └── dist/public/              ← créé par deploy.sh (build)
│           ├── index.html
│           └── assets/
└── ...
```

---

## ⚠️ Points importants

- **Ne jamais committer le dossier `dist/`** — il est généré par `deploy.sh` sur Plesk
- **Le `PORT` est géré par Plesk/Passenger** — ne pas le fixer manuellement
- **`APP_URL=http://zoksilll.online`** est essentiel pour que le bot reste actif (keep-alive ping)
- Si Plesk n'a pas `pnpm`, le script `deploy.sh` l'installe automatiquement via `npm install -g pnpm`
