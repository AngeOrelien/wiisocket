const Message = require('../models/Message');

// GET /api/chat/messages/:user1/:user2 -> historique d'une conversation 1-1
exports.getMessages = async (req, res) => {
    try {
        const { user1, user2 } = req.params;
        const roomId = Message.buildRoomId(user1, user2);

        const messages = await Message.find({ roomId }).sort({ createdAt: 1 });
        res.status(200).json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération des messages' });
    }
};
