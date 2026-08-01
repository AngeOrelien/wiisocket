const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateOtp = require('../utils/generateOtp');
const generateToken = require('../utils/generateToken');
const { sendOtpEmail } = require('../services/mailer');

// POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Nom d\'utilisateur, email et mot de passe sont requis' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
        }

        const existing = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
        });
        if (existing) {
            return res.status(409).json({
                error: existing.email === email.toLowerCase()
                    ? 'Cet email est déjà utilisé'
                    : "Ce nom d'utilisateur est déjà pris",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const { code, expiresAt } = generateOtp();

        const user = await User.create({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: hashedPassword,
            otpCode: code,
            otpExpiresAt: expiresAt,
        });

        try {
            await sendOtpEmail(user.email, user.username, code);
        } catch (mailError) {
            console.error("Erreur d'envoi de l'email OTP :", mailError.message);
            // On ne bloque pas l'inscription si l'email échoue, mais on prévient le client
            return res.status(201).json({
                message: 'Compte créé, mais l\'envoi de l\'email a échoué. Utilisez "renvoyer le code".',
                userId: user._id,
                emailSent: false,
            });
        }

        res.status(201).json({
            message: 'Compte créé. Un code de vérification a été envoyé par email.',
            userId: user._id,
            emailSent: true,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur lors de l\'inscription' });
    }
};

// POST /api/auth/verify-otp   { email, otp }
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email: email?.toLowerCase() });

        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
        if (user.isVerified) return res.status(400).json({ error: 'Ce compte est déjà vérifié' });

        if (!user.otpCode || user.otpCode !== otp) {
            return res.status(400).json({ error: 'Code incorrect' });
        }
        if (user.otpExpiresAt < new Date()) {
            return res.status(400).json({ error: 'Code expiré, veuillez en redemander un' });
        }

        user.isVerified = true;
        user.otpCode = null;
        user.otpExpiresAt = null;
        await user.save();

        const token = generateToken(user._id);
        res.status(200).json({ message: 'Compte vérifié avec succès', token, user: user.toPublicJSON() });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur lors de la vérification' });
    }
};

// POST /api/auth/resend-otp   { email }
exports.resendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email?.toLowerCase() });

        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
        if (user.isVerified) return res.status(400).json({ error: 'Ce compte est déjà vérifié' });

        const { code, expiresAt } = generateOtp();
        user.otpCode = code;
        user.otpExpiresAt = expiresAt;
        await user.save();

        await sendOtpEmail(user.email, user.username, code);
        res.status(200).json({ message: 'Nouveau code envoyé par email' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur lors du renvoi du code" });
    }
};

// POST /api/auth/login   { email, password }
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email et mot de passe requis' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

        if (!user.isVerified) {
            // On renvoie un code pour que le client puisse rediriger vers l'écran OTP
            const { code, expiresAt } = generateOtp();
            user.otpCode = code;
            user.otpExpiresAt = expiresAt;
            await user.save();
            await sendOtpEmail(user.email, user.username, code);

            return res.status(403).json({
                error: 'Compte non vérifié. Un nouveau code vient de vous être envoyé.',
                requiresVerification: true,
            });
        }

        const token = generateToken(user._id);
        res.status(200).json({ message: 'Connexion réussie', token, user: user.toPublicJSON() });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
    }
};
