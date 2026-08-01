const nodemailer = require('nodemailer');

// Transporteur Gmail : utilise une adresse Gmail + un "mot de passe d'application"
// (à générer depuis https://myaccount.google.com/apppasswords)
// EMAIL_USER = adresse gmail complète, EMAIL_PASS = mot de passe d'application (16 caractères)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false,
    }
});

async function sendOtpEmail(toEmail, username, otpCode) {
    const mailOptions = {
        from: `"WiiSocket" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Votre code de vérification WiiSocket',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
                <h2 style="color:#013BFF;">WiiSocket</h2>
                <p>Bonjour <strong>${username}</strong>,</p>
                <p>Voici votre code de vérification. Il est valable pendant 10 minutes :</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color:#001C80; margin: 20px 0;">
                    ${otpCode}
                </div>
                <p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.</p>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);
}

module.exports = { sendOtpEmail };
