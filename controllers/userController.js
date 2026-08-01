const User = require('../models/User');
const { getLocalFileUrl } = require('../services/storageService');

// GET /api/users/me
exports.getMe = async (req, res) => {
    res.status(200).json({ user: req.user });
};

// PUT /api/users/me   (multipart/form-data : bio, fullName, location, website, statusMessage, photo)
exports.updateMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

        const { bio, fullName, location, website, statusMessage } = req.body;
        if (typeof bio === 'string') user.bio = bio.slice(0, 200);
        if (typeof fullName === 'string') user.fullName = fullName.slice(0, 60);
        if (typeof location === 'string') user.location = location.slice(0, 60);
        if (typeof website === 'string') user.website = website.slice(0, 120);
        if (typeof statusMessage === 'string') user.statusMessage = statusMessage.slice(0, 40);

        if (req.file) {
            user.profileImage = getLocalFileUrl(req, req.file.filename);
        }

        await user.save();
        res.status(200).json({ message: 'Profil mis à jour', user: user.toPublicJSON() });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du profil' });
    }
};

// GET /api/users/search?q=xxx  -> recherche par nom d'utilisateur OU email
exports.searchUsers = async (req, res) => {
    try {
        const query = (req.query.q || '').trim();
        if (!query) return res.status(200).json({ users: [] });

        const users = await User.find({
            $and: [
                { _id: { $ne: req.user._id } },
                { isVerified: true },
                {
                    $or: [
                        { username: { $regex: query, $options: 'i' } },
                        { email: { $regex: query, $options: 'i' } },
                    ],
                },
            ],
        })
            .select('username bio profileImage statusMessage')
            .limit(20);

        res.status(200).json({ users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur lors de la recherche' });
    }
};

// GET /api/users/:username  -> profil public complet d'un utilisateur
exports.getProfileByUsername = async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username.toLowerCase() })
            .select('username bio fullName location website statusMessage profileImage createdAt');
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

        res.status(200).json({ user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};
