const express = require('express');
const http = require('http');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');

connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Fichiers uploadés (photos de profil) servis statiquement
// -> quand R2 sera branché, cette ligne ne servira plus que d'ancien fallback
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationRoutes);

app.get('/', (req, res) => res.send('WiiSocket API en ligne'));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Authentification du socket via le JWT envoyé par le client (query ou auth)
io.use((socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) return next(new Error('Token manquant'));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        next();
    } catch (err) {
        next(new Error('Token invalide'));
    }
});

io.on('connection', (socket) => {
    console.log(`Utilisateur connecté : ${socket.userId}`);

    // Chaque utilisateur possède sa propre "room" personnelle (= son userId)
    // -> permet de lui envoyer un message privé où qu'il soit connecté
    socket.join(socket.userId);

    // Message privé 1-1
    socket.on('send_private_message', async (data) => {
        const { receiverId, text } = data;
        if (!receiverId || !text || !text.trim()) return;

        try {
            const roomId = Message.buildRoomId(socket.userId, receiverId);
            const newMessage = await Message.create({
                senderId: socket.userId,
                receiverId,
                roomId,
                text: text.trim(),
            });

            // Envoyé au destinataire ET à l'expéditeur (pour synchroniser ses autres sessions)
            io.to(receiverId).to(socket.userId).emit('receive_private_message', newMessage);

            // Crée la discussion si elle n'existe pas encore, ou met à jour le dernier message
            // -> c'est ce qui fait apparaître la conversation chez le destinataire (et l'expéditeur)
            const conversation = await Conversation.findOneAndUpdate(
                { roomId },
                {
                    roomId,
                    participants: [socket.userId, receiverId],
                    lastMessage: { text: newMessage.text, senderId: socket.userId, createdAt: newMessage.createdAt },
                    updatedAt: newMessage.createdAt,
                },
                { upsert: true, new: true }
            ).populate('participants', 'username profileImage bio statusMessage');

            io.to(receiverId).to(socket.userId).emit('conversation_updated', conversation);
        } catch (error) {
            console.error("Erreur lors de l'envoi du message privé :", error);
        }
    });

    // Indicateur "en train d'écrire..."
    socket.on('typing', ({ receiverId }) => {
        if (receiverId) io.to(receiverId).emit('user_typing', { userId: socket.userId });
    });

    socket.on('disconnect', () => {
        console.log(`Utilisateur déconnecté : ${socket.userId}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
