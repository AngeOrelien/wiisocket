// Couche d'abstraction pour le stockage des fichiers (photos de profil, etc.)
//
// Mode actuel : stockage LOCAL dans le dossier /uploads du backend,
// servi statiquement via Express (voir server.js -> app.use('/uploads', ...)).
//
// Migration future vers Cloudflare R2 (compatible S3) :
//   npm install @aws-sdk/client-s3
//   -> décommenter le bloc R2 ci-dessous, renseigner les variables .env :
//      R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
//   -> remplacer l'appel à saveLocalFile par uploadToR2 dans userController.js

const path = require('path');

function getLocalFileUrl(req, filename) {
    // Construit l'URL publique complète du fichier uploadé localement
    return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
}

/*
// --- Exemple d'implémentation Cloudflare R2 (S3-compatible), à activer plus tard ---
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

async function uploadToR2(fileBuffer, filename, mimetype) {
    await r2Client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: filename,
        Body: fileBuffer,
        ContentType: mimetype,
    }));
    return `${process.env.R2_PUBLIC_URL}/${filename}`;
}
*/

module.exports = { getLocalFileUrl };
