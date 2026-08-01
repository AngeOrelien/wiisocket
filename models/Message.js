const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Identifiant unique de la conversation = les deux userId triés et joints.
    // Permet de retrouver rapidement l'historique d'une discussion 1-1.
    roomId: { type: String, required: true, index: true },
    text: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

// Construit un roomId stable et identique quel que soit l'ordre des deux ids
messageSchema.statics.buildRoomId = function (idA, idB) {
    return [idA.toString(), idB.toString()].sort().join('_');
};

module.exports = mongoose.model('Message', messageSchema);
