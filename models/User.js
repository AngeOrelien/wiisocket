const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        minlength: 3,
        maxlength: 20,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    bio: {
        type: String,
        default: '',
        maxlength: 200,
    },
    // Champs de profil complémentaires (proposés en plus de la bio)
    fullName: {
        type: String,
        default: '',
        maxlength: 60,
    },
    location: {
        type: String,
        default: '',
        maxlength: 60,
    },
    website: {
        type: String,
        default: '',
        maxlength: 120,
    },
    // Statut personnalisé affiché sous le pseudo, ex: "Disponible", "En réunion"...
    statusMessage: {
        type: String,
        default: '',
        maxlength: 40,
    },
    // Chemin/URL de la photo de profil.
    // Pour l'instant : fichier local servi via /uploads/xxx.jpg
    // Plus tard : URL publique Cloudflare R2 (voir services/storageService.js)
    profileImage: {
        type: String,
        default: '',
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    otpCode: {
        type: String,
        default: null,
    },
    otpExpiresAt: {
        type: Date,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Ne jamais renvoyer le mot de passe / OTP au client
userSchema.methods.toPublicJSON = function () {
    return {
        id: this._id,
        username: this.username,
        email: this.email,
        bio: this.bio,
        fullName: this.fullName,
        location: this.location,
        website: this.website,
        statusMessage: this.statusMessage,
        profileImage: this.profileImage,
        isVerified: this.isVerified,
        createdAt: this.createdAt,
    };
};

module.exports = mongoose.model('User', userSchema);
