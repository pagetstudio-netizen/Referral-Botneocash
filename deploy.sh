#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# NeoCash Bot — Script de déploiement Plesk
#
# Sur Plesk → Git → "Script de déploiement" → ./deploy.sh
#
# Ce script s'exécute automatiquement après chaque "Deploy Now".
# Les fichiers dist/ sont pré-construits dans git (pas besoin de pnpm).
# Seul npm est nécessaire — aucun pnpm requis sur le serveur.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$ROOT_DIR/artifacts/api-server"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  NeoCash — Déploiement Plesk"
echo "  Répertoire : $ROOT_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─── 1. Dépendances du bot (production uniquement) ─────────────────────────────
echo ""
echo "📦 Installation des dépendances..."
cd "$API_DIR"
npm install --omit=dev --no-audit --no-fund --ignore-scripts
echo "✔ Dépendances installées"

# ─── 2. Vérification des fichiers dist ─────────────────────────────────────────
echo ""
echo "🔍 Vérification des fichiers de build..."

if [ ! -f "$API_DIR/dist/index.mjs" ]; then
  echo "❌ ERREUR : dist/index.mjs introuvable !"
  echo "   → Lance le build depuis Replit et re-push sur GitHub."
  exit 1
fi

echo "✔ dist/index.mjs présent ($(du -sh "$API_DIR/dist/index.mjs" | cut -f1))"

ADMIN_DIST="$ROOT_DIR/artifacts/admin-dashboard/dist/public/index.html"
if [ -f "$ADMIN_DIST" ]; then
  echo "✔ Dashboard admin présent"
else
  echo "⚠️  Dashboard admin absent (optionnel)"
fi

# ─── 3. Dossier logs ───────────────────────────────────────────────────────────
mkdir -p "$API_DIR/logs"

# ─── 4. Démarrage / redémarrage ────────────────────────────────────────────────
echo ""
echo "🔄 Gestion du processus..."

if command -v pm2 &>/dev/null; then
  echo "   → PM2 détecté"
  cd "$API_DIR"
  if pm2 list 2>/dev/null | grep -q "neocash-bot"; then
    pm2 restart neocash-bot --update-env
    echo "✔ PM2 : application redémarrée"
  else
    pm2 start ecosystem.config.cjs --env production
    pm2 save --force
    echo "✔ PM2 : application démarrée"
  fi
else
  echo "   → PM2 non trouvé : Plesk gérera le redémarrage via le bouton 'Restart'."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Déploiement terminé !"
echo "   Santé API  : /api/health"
echo "   Dashboard  : /admin"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
