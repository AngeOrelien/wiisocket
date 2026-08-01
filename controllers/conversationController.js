const Conversation = require('../models/Conversation');

// GET /api/conversations -> liste des discussions de l'utilisateur connecté,
// triées par dernière activité, avec les infos de l'autre participant.
exports.getConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find({ participants: req.user._id })
            .populate('participants', 'username profileImage bio statusMessage')
            .sort({ updatedAt: -1 });

        res.status(200).json({ conversations });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération des discussions' });
    }
};
