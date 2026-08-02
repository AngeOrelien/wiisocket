const User = require('../models/User');
const { saveProfilePhoto } = require('../services/storageService');

const PUBLIC_PROFILE_FIELDS =
    'username bio fullName location website statusMessage specialty jobTitle company experienceLevel skills githubUrl linkedinUrl profileImage createdAt';

// GET /api/users/me
exports.getMe = async (req, res) => {
    res.status(200).json({ user: req.user });
};

// PUT /api/users/me   (multipart/form-data)
exports.updateMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

        const { bio, fullName, location, website, statusMessage, specialty, jobTitle, company, experienceLevel, githubUrl, linkedinUrl, skills } = req.body;

        if (typeof bio === 'string') user.bio = bio.slice(0, 200);
        if (typeof fullName === 'string') user.fullName = fullName.slice(0, 60);
        if (typeof location === 'string') user.location = location.slice(0, 60);
        if (typeof website === 'string') user.website = website.slice(0, 120);
        if (typeof statusMessage === 'string') user.statusMessage = statusMessage.slice(0, 40);
        if (typeof specialty === 'string') user.specialty = specialty.slice(0, 60);
        if (typeof jobTitle === 'string') user.jobTitle = jobTitle.slice(0, 60);
        if (typeof company === 'string') user.company = company.slice(0, 80);
        if (typeof githubUrl === 'string') user.githubUrl = githubUrl.slice(0, 120);
        if (typeof linkedinUrl === 'string') user.linkedinUrl = linkedinUrl.slice(0, 120);
        if (typeof experienceLevel === 'string' && ['', 'Étudiant', 'Junior', 'Confirmé', 'Senior', 'Expert'].includes(experienceLevel)) {
            user.experienceLevel = experienceLevel;
        }
        // "skills" arrive en JSON stringifié depuis le client (multipart ne supporte pas les tableaux nativement)
        if (typeof skills === 'string') {
            try {
                const parsed = JSON.parse(skills);
                if (Array.isArray(parsed)) {
                    user.skills = parsed.map((s) => String(s).trim().slice(0, 30)).filter(Boolean).slice(0, 20);
                }
            } catch (_) {
                // ignoré si mal formé, on garde les compétences précédentes
            }
        }

        const photoUrl = await saveProfilePhoto(req);
        if (photoUrl) user.profileImage = photoUrl;

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
            .select('username bio profileImage statusMessage specialty jobTitle')
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
        const user = await User.findOne({ username: req.params.username.toLowerCase() }).select(PUBLIC_PROFILE_FIELDS);
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

        res.status(200).json({ user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};
