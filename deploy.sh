#!/bin/bash
# =============================================================================
#  Moon Crypto Bot — Script de déploiement Plesk
#  Lancé depuis la racine du dépôt Git après chaque Pull
# =============================================================================
set -e

# Aller à la racine du dépôt (au cas où Plesk lance depuis un sous-dossier)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

echo "🚀 [deploy] Dossier : $REPO_ROOT"

# ─── 1. Installer pnpm si absent ─────────────────────────────────────────────
if ! command -v pnpm &> /dev/null; then
  echo "📦 [deploy] Installation de pnpm..."
  npm install -g pnpm
fi
echo "✅ pnpm $(pnpm --version)"

# ─── 2. Installer toutes les dépendances (monorepo complet) ──────────────────
echo "📦 [deploy] pnpm install..."
pnpm install

# ─── 3. Build du dashboard admin ─────────────────────────────────────────────
echo "🏗️  [deploy] Build du dashboard..."
cd "$REPO_ROOT/artifacts/admin-dashboard"
BASE_PATH=/ pnpm run build
cd "$REPO_ROOT"

# ─── 4. Vérification ─────────────────────────────────────────────────────────
if [ ! -f "$REPO_ROOT/artifacts/admin-dashboard/dist/public/index.html" ]; then
  echo "❌ ERREUR : index.html introuvable après le build !"
  exit 1
fi

echo ""
echo "✅ Déploiement terminé — Redis Node.js dans Plesk."
