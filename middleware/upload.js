const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { isProduction } = require('../config/env');

function fileFilter(req, file, cb) {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
        return cb(new Error("Format d'image non supporté (jpg, jpeg, png, webp uniquement)"));
    }
    cb(null, true);
}

// PRODUCTION : pas de disque persistant sur Vercel -> le fichier reste en mémoire (buffer)
// et part directement vers Cloudflare R2 (voir services/storageService.js).
// DEVELOPPEMENT : écriture directe dans /uploads, plus simple, pas besoin de credentials R2.
const storage = isProduction
    ? multer.memoryStorage()
    : multer.diskStorage({
          destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
          filename: (req, file, cb) => {
              const uniqueName = crypto.randomBytes(16).toString('hex') + path.extname(file.originalname);
              cb(null, uniqueName);
          },
      });

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
});

module.exports = upload;
