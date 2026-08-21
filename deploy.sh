#!/bin/bash
# =============================================================================
#  Moon Crypto Bot — Script de déploiement Plesk
#  Appelé automatiquement par Plesk après chaque "Pull & Deploy"
# =============================================================================
set -e

echo "🚀 [deploy] Démarrage du déploiement Moon Crypto Bot..."

# ─── 1. Installer pnpm si absent ─────────────────────────────────────────────
if ! command -v pnpm &> /dev/null; then
  echo "📦 [deploy] Installation de pnpm..."
  npm install -g pnpm
fi

echo "✅ [deploy] pnpm version : $(pnpm --version)"

# ─── 2. Installer les dépendances ────────────────────────────────────────────
echo "📦 [deploy] Installation des dépendances..."
pnpm install

# ─── 3. Build du dashboard admin ─────────────────────────────────────────────
echo "🏗️  [deploy] Build du dashboard admin..."
cd artifacts/admin-dashboard
BASE_PATH=/ pnpm run build
cd ../..

echo "✅ [deploy] Dashboard buildé → artifacts/admin-dashboard/dist/public/"

# ─── 4. Vérification ─────────────────────────────────────────────────────────
if [ ! -f "artifacts/admin-dashboard/dist/public/index.html" ]; then
  echo "❌ [deploy] ERREUR : index.html introuvable après le build !"
  exit 1
fi

echo ""
echo "✅ =============================================="
echo "   Déploiement terminé avec succès !"
echo "   → Redémarre l'application Node.js dans Plesk"
echo "=============================================="
