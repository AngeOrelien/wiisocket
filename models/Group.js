const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 50 },
    description: { type: String, default: '', maxlength: 200 },
    avatar: { type: String, default: '' },
    members: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            role: { type: String, enum: ['admin', 'member'], default: 'member' },
            joinedAt: { type: Date, default: Date.now },
        },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastMessage: {
        text: { type: String, default: '' },
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date },
    },
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Group', groupSchema);
