#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# NeoCash Bot — Script de déploiement Plesk
# Exécuté automatiquement après git pull
#
# Sur Plesk : Git → Déploiement → script de déploiement
# Renseigne le chemin de ce fichier : ./deploy.sh
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$ROOT_DIR/artifacts/api-server"
DASHBOARD_DIR="$ROOT_DIR/artifacts/admin-dashboard"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  NeoCash Bot — Déploiement Plesk"
echo "  Racine : $ROOT_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─── 1. Installer pnpm si absent ───────────────────────────────────────────────
if ! command -v pnpm &> /dev/null; then
  echo "📦 Installation de pnpm..."
  npm install -g pnpm@latest
fi
echo "✔ pnpm $(pnpm --version)"

# ─── 2. Installer toutes les dépendances du workspace ─────────────────────────
echo ""
echo "📦 Installation des dépendances..."
cd "$ROOT_DIR"
pnpm install --frozen-lockfile

# ─── 3. Build du tableau de bord admin ────────────────────────────────────────
echo ""
echo "🔨 Build du tableau de bord admin..."
cd "$DASHBOARD_DIR"
BASE_PATH=/admin PORT=3000 pnpm run build
echo "✔ Admin dashboard → artifacts/admin-dashboard/dist/public/"

# ─── 4. Créer le dossier logs ─────────────────────────────────────────────────
mkdir -p "$API_DIR/logs"

# ─── 5. Redémarrer via PM2 ────────────────────────────────────────────────────
echo ""
echo "🔄 Redémarrage de l'application via PM2..."
cd "$API_DIR"

if pm2 list | grep -q "neocash-bot"; then
  pm2 restart neocash-bot --update-env
else
  pm2 start ecosystem.config.cjs --env production
  pm2 save
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Déploiement terminé !"
echo ""
echo "   Bot + API  → http://localhost:5000/api/health"
echo "   Dashboard  → http://localhost:5000/admin"
echo ""
echo "   Statut PM2 : pm2 status neocash-bot"
echo "   Logs PM2   : pm2 logs neocash-bot"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
