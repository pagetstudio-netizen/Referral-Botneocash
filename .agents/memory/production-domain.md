---
name: Production domain
description: URL de production Plesk du projet Moon Crypto Bot
---

# Domaine de production

**URL** : http://zoksilll.online  
**Hébergement** : Plesk (long-polling, pas de webhook Telegram)

## URLs importantes à retenir
- API / bot : `http://zoksilll.online/api`
- Dashboard admin : `http://zoksilll.online/`
- Health check : `http://zoksilll.online/api/health`

**Why:** L'utilisateur a confirmé ce domaine comme URL de production. À utiliser pour toute configuration externe (Adsgram, CORS, etc.) nécessitant une URL publique.

**How to apply:** Quand une intégration externe demande une URL de callback/webhook/postback, utiliser `http://zoksilll.online/api/...`
