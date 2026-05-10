#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# NeoCash Bot — Script de déploiement Plesk
#
# Sur Plesk → Git → "Script de déploiement" → ./deploy.sh
#
# Ce script s'exécute automatiquement après chaque "Deploy Now".
# Le dashboard admin est pré-construit dans git → aucun build requis.
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

# ─── 1. Dépendances du bot ─────────────────────────────────────────────────────
echo ""
echo "📦 Installation des dépendances..."
cd "$API_DIR"
npm install --omit=dev --no-audit --no-fund --ignore-scripts
echo "✔ Dépendances installées"

# ─── 2. Dossier logs ───────────────────────────────────────────────────────────
mkdir -p "$API_DIR/logs"

# ─── 3. Démarrage / redémarrage ────────────────────────────────────────────────
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
  echo "   → PM2 non trouvé : Plesk gérera le redémarrage."
  echo "   → Clique sur 'Restart' dans le panneau Node.js Plesk."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Déploiement terminé !"
echo "   Santé API  : /api/health"
echo "   Dashboard  : /admin"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
