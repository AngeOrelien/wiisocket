const { isDevelopment } = require('../config/env');

// Logs de debug uniquement en développement (silence la prod, réduit le bruit sur Vercel)
// Les erreurs restent toujours loggées, quel que soit l'environnement.
module.exports = {
    info: (...args) => {
        if (isDevelopment) console.log(...args);
    },
    error: (...args) => console.error(...args),
};
