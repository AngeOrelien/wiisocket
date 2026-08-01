// Couche d'abstraction pour le stockage des photos de profil.
//
// Le comportement change automatiquement selon ENV (voir config/env.js) :
//   - development -> fichier écrit dans /uploads, servi par Express
//   - production  -> fichier envoyé vers Cloudflare R2 (S3-compatible)
//
// Rien à changer manuellement : userController appelle juste saveProfilePhoto(req).

const path = require('path');
const crypto = require('crypto');
const { isProduction } = require('../config/env');
const logger = require('../utils/logger');

function getLocalFileUrl(req, filename) {
    return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
}

async function uploadToR2(fileBuffer, originalName, mimetype) {
    // Chargé seulement en prod, pour ne pas exiger le package @aws-sdk/client-s3 en dev
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

    const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length) {
        throw new Error(`Variables R2 manquantes dans .env : ${missing.join(', ')}`);
    }

    const r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
    });

    const filename = `${crypto.randomBytes(16).toString('hex')}${path.extname(originalName)}`;
    await r2Client.send(
        new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: filename,
            Body: fileBuffer,
            ContentType: mimetype,
        })
    );

    return `${process.env.R2_PUBLIC_URL}/${filename}`;
}

// Point d'entrée unique utilisé par le controller.
// Reçoit req (après passage par le middleware upload) et renvoie l'URL publique finale,
// quel que soit l'environnement. Renvoie null si aucun fichier n'a été envoyé.
async function saveProfilePhoto(req) {
    if (!req.file) return null;

    if (isProduction) {
        logger.info('Upload photo -> Cloudflare R2');
        return uploadToR2(req.file.buffer, req.file.originalname, req.file.mimetype);
    }

    logger.info('Upload photo -> stockage local /uploads');
    return getLocalFileUrl(req, req.file.filename);
}

module.exports = { saveProfilePhoto };
