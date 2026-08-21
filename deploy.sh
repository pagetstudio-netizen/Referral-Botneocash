#!/bin/bash
# =============================================================================
#  Moon Crypto Bot — Script de déploiement Plesk
#  Exécuté automatiquement après "Git → Deploy Now" dans Plesk
# =============================================================================
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

echo "======================================================"
echo " Moon Crypto Bot — Déploiement"
echo " Dossier : $REPO_ROOT"
echo "======================================================"

# ─── Installer les dépendances du bot ────────────────────────────────────────
echo ""
echo "📦 Installation des dépendances npm..."
cd "$REPO_ROOT/artifacts/api-server"

# ignore-scripts évite les erreurs husky/postinstall
# omit=dev : pas de devDependencies en production
npm install --ignore-scripts --omit=dev

echo "✅ Dépendances installées"

# ─── Vérifier que le dashboard existe ────────────────────────────────────────
DASHBOARD="$REPO_ROOT/artifacts/admin-dashboard/dist/public/index.html"
if [ ! -f "$DASHBOARD" ]; then
  echo "❌ ERREUR : Dashboard introuvable : $DASHBOARD"
  echo "   Vérifiez que le build a bien été commité dans git."
  exit 1
fi

echo "✅ Dashboard présent : artifacts/admin-dashboard/dist/public/"
echo ""
echo "🎉 Déploiement terminé — clique sur Restart dans Plesk"
echo "======================================================"
