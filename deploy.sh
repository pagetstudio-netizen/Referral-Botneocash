#!/bin/bash
# =============================================================================
#  Moon Crypto Bot — Script de déploiement Plesk
#  Exécuté après "Git → Deploy Now"
#
#  Application Root : /zoksilll.online (racine du repo)
#  Startup File     : artifacts/api-server/bot/loader.cjs
# =============================================================================
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOT_DIR="$REPO_ROOT/artifacts/api-server"

echo "======================================================"
echo " Moon Crypto Bot — Déploiement"
echo " Dossier : $REPO_ROOT"
echo " Node    : $(node --version)"
echo " NPM     : $(npm --version)"
echo "======================================================"

# ─── 1. npm install à la racine (Plesk le fait normalement automatiquement) ───
# On le relance ici en cas de besoin — idempotent.
echo ""
echo "📦 [1/3] npm install à la racine..."
cd "$REPO_ROOT"
npm install --ignore-scripts --omit=dev --prefer-offline 2>&1 | tail -5
echo "✅ npm install racine OK"

# ─── 2. npm install dans artifacts/api-server (double sécurité) ───────────────
echo ""
echo "📦 [2/3] npm install dans artifacts/api-server..."
cd "$BOT_DIR"
npm install --ignore-scripts --omit=dev --prefer-offline 2>&1 | tail -5
echo "✅ npm install api-server OK"

# ─── 3. Vérifications finales ─────────────────────────────────────────────────
echo ""
echo "🔍 [3/3] Vérifications..."

# Vérifier les dépendances critiques (au moins l'une des deux locations)
for pkg in telegraf express pg pino dotenv; do
  if [ -d "$REPO_ROOT/node_modules/$pkg" ] || [ -d "$BOT_DIR/node_modules/$pkg" ]; then
    echo "  ✅ $pkg"
  else
    echo "  ❌ $pkg MANQUANT"
    exit 1
  fi
done

# Vérifier le dashboard
DASHBOARD="$REPO_ROOT/artifacts/admin-dashboard/dist/public/index.html"
if [ ! -f "$DASHBOARD" ]; then
  echo "  ❌ Dashboard introuvable : $DASHBOARD"
  exit 1
fi
echo "  ✅ Dashboard présent"

echo ""
echo "🎉 Déploiement réussi — clique sur Restart dans Plesk"
echo "======================================================"
