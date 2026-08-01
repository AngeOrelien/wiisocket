const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    // Même format que Message.roomId : les deux userId triés et joints
    roomId: { type: String, required: true, unique: true },
    lastMessage: {
        text: { type: String, default: '' },
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date },
    },
    updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Conversation', conversationSchema);
