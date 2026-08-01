const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Vérifie le token JWT envoyé dans le header "Authorization: Bearer <token>"
async function protect(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: "Accès refusé, token manquant" });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select('-password -otpCode -otpExpiresAt');
        if (!user) {
            return res.status(401).json({ error: "Utilisateur introuvable" });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Token invalide ou expiré" });
    }
}

module.exports = protect;
