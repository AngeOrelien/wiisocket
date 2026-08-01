require('dotenv').config();

// Un seul interrupteur pour tout le comportement dev/prod : ENV=development | production dans .env
// (fallback sur NODE_ENV puis 'development' si rien n'est défini)
const ENV = process.env.ENV || process.env.NODE_ENV || 'development';
const isProduction = ENV === 'production';
const isDevelopment = !isProduction;

// Origines autorisées en CORS pour la prod (URLs de ton app web/admin si tu en as une).
// Ex: CLIENT_ORIGINS=https://wiisocket.app,https://admin.wiisocket.app
const clientOrigins = (process.env.CLIENT_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

module.exports = {
    ENV,
    isProduction,
    isDevelopment,
    port: process.env.PORT || 3000,
    // true seulement quand le code tourne réellement sur l'infra Vercel
    // (Vercel définit cette variable automatiquement, pas besoin de la mettre dans .env)
    isVercel: !!process.env.VERCEL,
    clientOrigins,
};
