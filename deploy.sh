#!/bin/bash
# =============================================================================
#  Moon Crypto Bot — Script de déploiement Plesk
#  Lancé depuis la racine du dépôt Git (Deploy Now)
#  Le dashboard est déjà buildé et commité → seul npm install est nécessaire
# =============================================================================
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

echo "🚀 [deploy] Dossier : $REPO_ROOT"
echo "📦 [deploy] Installation des dépendances bot..."

cd "$REPO_ROOT/artifacts/api-server"
npm install --ignore-scripts --omit=dev 2>&1 | tail -5

echo "✅ [deploy] Dépendances installées"
echo "✅ [deploy] Dashboard déjà présent dans artifacts/admin-dashboard/dist/public/"
echo "🎉 [deploy] Prêt — clique sur Restart pour lancer le bot"
