# WiiSocket - Backend

## Installation
```bash
npm install
cp .env.example .env   # puis remplir MONGO_URI, JWT_SECRET, EMAIL_USER, EMAIL_PASS
npm run dev
```

## Configurer l'envoi d'OTP par Gmail
1. Activer la validation en 2 étapes sur le compte Gmail utilisé.
2. Générer un "mot de passe d'application" : https://myaccount.google.com/apppasswords
3. Renseigner `EMAIL_USER` (l'adresse Gmail) et `EMAIL_PASS` (le mot de passe d'application, 16 caractères) dans `.env`.

## Photos de profil
Stockées pour l'instant localement dans `/uploads`, servies via `http://<host>/uploads/<fichier>`.
Pour migrer vers Cloudflare R2, voir les instructions dans `services/storageService.js`.

## Endpoints principaux
- `POST /api/auth/register` `{ username, email, password }`
- `POST /api/auth/verify-otp` `{ email, otp }`
- `POST /api/auth/resend-otp` `{ email }`
- `POST /api/auth/login` `{ email, password }`
- `GET  /api/users/me` (auth)
- `PUT  /api/users/me` (auth, multipart: `bio`, `photo`)
- `GET  /api/users/search?q=` (auth)
- `GET  /api/users/:username` (auth)
- `GET  /api/chat/messages/:user1/:user2` (auth)
- WebSocket : connexion avec `auth: { token }`, events `send_private_message`, `receive_private_message`, `typing`, `user_typing`
