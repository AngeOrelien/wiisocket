const jwt = require('jsonwebtoken');

// Génère un JWT valable 30 jours pour l'utilisateur donné
function generateToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

module.exports = generateToken;
