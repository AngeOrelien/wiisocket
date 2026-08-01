const express = require('express');
const http = require('http');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const cors = require('cors');

const { isProduction, isVercel, port, clientOrigins } = require('./config/env');
const logger = require('./utils/logger');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');

connectDB();

const app = express();

// CORS : ouvert en dev, restreint aux origines déclarées (CLIENT_ORIGINS) en prod
app.use(
    cors({
        origin: isProduction && clientOrigins.length ? clientOrigins : true,
        credentials: true,
    })
);
app.use(express.json());

// Stockage local des photos : uniquement pertinent en dev (voir services/storageService.js).
// En prod, le filesystem n'est pas persistant sur Vercel -> les photos passent par R2.
if (!isProduction) {
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationRoutes);

app.get('/', (req, res) => res.send('WiiSocket API en ligne'));

// Gestion d'erreurs centralisée : détail complet en dev, message générique en prod
app.use((err, req, res, next) => {
    logger.error(err);
    res.status(err.status || 500).json({
        error: isProduction ? 'Erreur serveur' : err.message,
    });
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: isProduction && clientOrigins.length ? clientOrigins : '*', methods: ['GET', 'POST'] },
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
    logger.info(`Utilisateur connecté : ${socket.userId}`);

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
                { upsert: true, returnDocument: 'after' }
            ).populate('participants', 'username profileImage bio statusMessage');

            io.to(receiverId).to(socket.userId).emit('conversation_updated', conversation);
        } catch (error) {
            logger.error("Erreur lors de l'envoi du message privé :", error);
        }
    });

    // Indicateur "en train d'écrire..."
    socket.on('typing', ({ receiverId }) => {
        if (receiverId) io.to(receiverId).emit('user_typing', { userId: socket.userId });
    });

    socket.on('disconnect', () => {
        logger.info(`Utilisateur déconnecté : ${socket.userId}`);
    });
});

// Sur Vercel, il n'y a pas de process persistant : la plateforme importe directement
// `module.exports` comme handler de requêtes et ignore .listen(). L'appeler quand même
// ne casse rien, mais on l'évite pour rester explicite sur ce qui tourne où.
// ATTENTION : Socket.IO a besoin d'un serveur persistant (WebSocket) ce que Vercel ne
// fournit pas nativement -> le chat temps réel doit être hébergé sur une plateforme
// qui garde un process actif (Render, Railway, Fly.io, VPS...) si tu restes sur Vercel pour le reste.
if (!isVercel) {
    server.listen(port, () => {
        logger.info(`Serveur démarré sur le port ${port} (ENV=${isProduction ? 'production' : 'development'})`);
    });
}

module.exports = app;
