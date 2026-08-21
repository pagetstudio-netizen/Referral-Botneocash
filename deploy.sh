#!/bin/bash
# =============================================================================
#  Moon Crypto Bot — Script de déploiement Plesk
#  Exécuté après "Git → Deploy Now"
# =============================================================================
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOT_DIR="$REPO_ROOT/artifacts/api-server"

echo "======================================================"
echo " Moon Crypto Bot — Déploiement"
echo " Repo : $REPO_ROOT"
echo "======================================================"

# ─── Installer les dépendances du bot ─────────────────────────────────────────
# OBLIGATOIRE : le bot est dans un sous-dossier, Plesk ne fait npm install
# qu'à la racine du repo. On installe les deps du bot ici explicitement.
echo ""
echo "📦 npm install dans artifacts/api-server..."
cd "$BOT_DIR"
npm install --ignore-scripts --omit=dev

echo ""
echo "✅ Vérification des dépendances critiques..."
for pkg in telegraf express pg pino dotenv; do
  if [ -d "$BOT_DIR/node_modules/$pkg" ]; then
    echo "  ✅ $pkg"
  else
    echo "  ❌ $pkg MANQUANT — npm install a échoué"
    exit 1
  fi
done

# ─── Vérifier le dashboard ────────────────────────────────────────────────────
echo ""
DASHBOARD="$REPO_ROOT/artifacts/admin-dashboard/dist/public/index.html"
if [ ! -f "$DASHBOARD" ]; then
  echo "❌ Dashboard introuvable : $DASHBOARD"
  exit 1
fi
echo "✅ Dashboard présent"

echo ""
echo "🎉 Déploiement terminé — clique sur Restart dans Plesk"
echo "======================================================"
