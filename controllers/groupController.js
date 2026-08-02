const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
const { saveProfilePhoto } = require('../services/storageService');

const MEMBER_FIELDS = 'members.user';
const POPULATE_MEMBERS = 'username profileImage bio specialty jobTitle';

function isMember(group, userId) {
    return group.members.some((m) => m.user.toString() === userId.toString());
}

function isAdmin(group, userId) {
    return group.members.some((m) => m.user.toString() === userId.toString() && m.role === 'admin');
}

// POST /api/groups   (multipart : name, description, memberIds = JSON.stringify([...]), avatar)
exports.createGroup = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'Le nom du groupe est requis' });

        let memberIds = [];
        try {
            memberIds = JSON.parse(req.body.memberIds || '[]');
        } catch (_) {
            return res.status(400).json({ error: 'memberIds invalide' });
        }

        const uniqueMemberIds = [...new Set(memberIds.filter((id) => id && id !== req.user._id.toString()))];

        const members = [
            { user: req.user._id, role: 'admin' },
            ...uniqueMemberIds.map((id) => ({ user: id, role: 'member' })),
        ];

        const group = await Group.create({
            name: name.trim().slice(0, 50),
            description: (description || '').trim().slice(0, 200),
            members,
            createdBy: req.user._id,
            updatedAt: new Date(),
        });

        const avatarUrl = await saveProfilePhoto(req);
        if (avatarUrl) {
            group.avatar = avatarUrl;
            await group.save();
        }

        await group.populate('members.user', POPULATE_MEMBERS);

        // Prévenir en temps réel les membres ajoutés (s'ils sont connectés)
        const io = req.app.get('io');
        if (io) {
            const memberIds2 = group.members.map((m) => m.user._id.toString());
            io.to(memberIds2).emit('group_updated', group);
        }

        res.status(201).json({ group });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur lors de la création du groupe' });
    }
};

// GET /api/groups -> groupes dont l'utilisateur connecté est membre
exports.getGroups = async (req, res) => {
    try {
        const groups = await Group.find({ [MEMBER_FIELDS]: req.user._id })
            .populate('members.user', POPULATE_MEMBERS)
            .sort({ updatedAt: -1 });

        res.status(200).json({ groups });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération des groupes' });
    }
};

// GET /api/groups/:id
exports.getGroupById = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id).populate('members.user', POPULATE_MEMBERS);
        if (!group) return res.status(404).json({ error: 'Groupe introuvable' });
        if (!isMember(group, req.user._id)) return res.status(403).json({ error: "Vous n'êtes pas membre de ce groupe" });

        res.status(200).json({ group });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// PUT /api/groups/:id   (multipart : name, description, avatar) - admin uniquement
exports.updateGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ error: 'Groupe introuvable' });
        if (!isAdmin(group, req.user._id)) return res.status(403).json({ error: 'Seul un admin peut modifier le groupe' });

        const { name, description } = req.body;
        if (typeof name === 'string' && name.trim()) group.name = name.trim().slice(0, 50);
        if (typeof description === 'string') group.description = description.slice(0, 200);

        const avatarUrl = await saveProfilePhoto(req);
        if (avatarUrl) group.avatar = avatarUrl;

        group.updatedAt = new Date();
        await group.save();
        await group.populate('members.user', POPULATE_MEMBERS);

        const io = req.app.get('io');
        if (io) io.to(group.members.map((m) => m.user._id.toString())).emit('group_updated', group);

        res.status(200).json({ group });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du groupe' });
    }
};

// POST /api/groups/:id/members   { memberIds: [...] } - admin uniquement
exports.addMembers = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ error: 'Groupe introuvable' });
        if (!isAdmin(group, req.user._id)) return res.status(403).json({ error: 'Seul un admin peut ajouter des membres' });

        const { memberIds } = req.body;
        if (!Array.isArray(memberIds)) return res.status(400).json({ error: 'memberIds doit être un tableau' });

        const existingIds = new Set(group.members.map((m) => m.user.toString()));
        const toAdd = memberIds.filter((id) => !existingIds.has(id));
        toAdd.forEach((id) => group.members.push({ user: id, role: 'member' }));

        group.updatedAt = new Date();
        await group.save();
        await group.populate('members.user', POPULATE_MEMBERS);

        const io = req.app.get('io');
        if (io) io.to(group.members.map((m) => m.user._id.toString())).emit('group_updated', group);

        res.status(200).json({ group });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur serveur lors de l'ajout de membres" });
    }
};

// DELETE /api/groups/:id/members/:userId - un admin retire quelqu'un, ou un membre se retire lui-même
exports.removeMember = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ error: 'Groupe introuvable' });

        const targetId = req.params.userId;
        const isSelf = targetId === req.user._id.toString();
        if (!isSelf && !isAdmin(group, req.user._id)) {
            return res.status(403).json({ error: 'Seul un admin peut retirer un autre membre' });
        }

        const previousMemberIds = group.members.map((m) => m.user.toString());
        group.members = group.members.filter((m) => m.user.toString() !== targetId);
        group.updatedAt = new Date();
        await group.save();

        const io = req.app.get('io');
        if (io) io.to(previousMemberIds).emit('group_member_removed', { groupId: group._id, userId: targetId });

        res.status(200).json({ message: isSelf ? 'Vous avez quitté le groupe' : 'Membre retiré' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// GET /api/groups/:id/messages
exports.getGroupMessages = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ error: 'Groupe introuvable' });
        if (!isMember(group, req.user._id)) return res.status(403).json({ error: "Vous n'êtes pas membre de ce groupe" });

        const messages = await GroupMessage.find({ groupId: req.params.id }).sort({ createdAt: 1 });
        res.status(200).json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération des messages' });
    }
};
