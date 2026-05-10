#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# NeoCash Bot — Script de déploiement Plesk
# Exécuté automatiquement après git pull
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
set -e

APP_DIR="$(cd "$(dirname "$0")/artifacts/api-server" && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  NeoCash Bot — Déploiement"
echo "  Dossier : $APP_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Installer les dépendances Node.js
echo "📦 Installation des dépendances..."
cd "$APP_DIR"
npm install --omit=dev --no-audit --no-fund

# 2. Créer le dossier logs si absent
mkdir -p logs

# 3. Redémarrer via PM2 (ou démarrer si pas encore lancé)
echo "🔄 Redémarrage de l'application via PM2..."
if pm2 list | grep -q "neocash-bot"; then
  pm2 restart neocash-bot --update-env
else
  pm2 start ecosystem.config.cjs --env production
  pm2 save
fi

echo "✅ Déploiement terminé !"
echo "   Statut : pm2 status neocash-bot"
echo "   Logs   : pm2 logs neocash-bot"
