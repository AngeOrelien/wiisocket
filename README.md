# WiiSocket - Backend

## Installation
```bash
npm install
cp .env.example .env   # puis remplir MONGO_URI, JWT_SECRET, EMAIL_USER, EMAIL_PASS
npm run dev
```

## Basculer dev / production
Tout est piloté par UNE seule variable dans `.env` : `ENV=development` ou `ENV=production`.
Rien d'autre à changer dans le code — voir `config/env.js` pour la logique centrale.

Ce qui change automatiquement selon `ENV` :
| Comportement            | development                        | production                              |
|--------------------------|-------------------------------------|------------------------------------------|
| CORS                     | toutes origines autorisées          | restreint à `CLIENT_ORIGINS`             |
| Logs                     | `logger.info` affichés              | `logger.info` silencieux (erreurs gardées) |
| Photos de profil         | écrites dans `/uploads` (local)     | envoyées vers Cloudflare R2              |
| Erreurs renvoyées au client | message détaillé                | message générique ("Erreur serveur")     |

Sur Vercel, `ENV=production` doit être défini dans les Environment Variables du projet
(Vercel > Settings > Environment Variables), pas seulement dans un fichier `.env` local.

## Déploiement sur Vercel
1. `vercel.json` est déjà configuré pour router toutes les requêtes vers `server.js`.
2. Dans Vercel > Settings > Environment Variables, ajouter : `ENV=production`, `MONGO_URI`,
   `JWT_SECRET`, `EMAIL_USER`, `EMAIL_PASS`, `CLIENT_ORIGINS`, et les variables `R2_*`.
3. **Important : le chat temps réel (Socket.IO) ne fonctionne pas de façon fiable sur Vercel.**
   Vercel exécute le backend comme des fonctions serverless sans process persistant, alors que
   Socket.IO a besoin d'une connexion WebSocket longue durée. Si le temps réel doit fonctionner
   en prod, héberge au moins cette partie sur une plateforme à process persistant
   (Render, Railway, Fly.io, un VPS...). Le reste de l'API (auth, profils, recherche, historique
   des messages) fonctionne normalement sur Vercel.

## Configurer l'envoi d'OTP par Gmail
1. Activer la validation en 2 étapes sur le compte Gmail utilisé.
2. Générer un "mot de passe d'application" : https://myaccount.google.com/apppasswords
3. Renseigner `EMAIL_USER` et `EMAIL_PASS` dans `.env` (ou les variables d'environnement Vercel).

## Photos de profil
- `ENV=development` -> stockées localement dans `/uploads`, servies via `http://<host>/uploads/<fichier>`.
- `ENV=production` -> envoyées vers Cloudflare R2 automatiquement (`services/storageService.js`).
  Nécessite `npm install @aws-sdk/client-s3` (déjà dans `package.json`) et les variables `R2_*` renseignées.

## Endpoints principaux
- `POST /api/auth/register` `{ username, email, password }`
- `POST /api/auth/verify-otp` `{ email, otp }`
- `POST /api/auth/resend-otp` `{ email }`
- `POST /api/auth/login` `{ email, password }`
- `GET  /api/users/me` (auth)
- `PUT  /api/users/me` (auth, multipart: `bio`, `fullName`, `location`, `website`, `statusMessage`, `photo`)
- `GET  /api/users/search?q=` (auth, par pseudo ou email)
- `GET  /api/users/:username` (auth)
- `GET  /api/conversations` (auth)
- `GET  /api/chat/messages/:user1/:user2` (auth)
- WebSocket : connexion avec `auth: { token }`, events `send_private_message`, `receive_private_message`,
  `conversation_updated`, `typing`, `user_typing`
