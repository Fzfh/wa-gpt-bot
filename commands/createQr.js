const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const { adminList } = require('../setting/setting');

module.exports = async function buatQR(sock, msg, text) {
  try {
    const sender = msg.key.participant || msg.key.remoteJid;
    if (!adminList.includes(sender)) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: '❌ Fitur ini hanya untuk admin ya~ 😌',
      }, { quoted: msg });
    }

    const qrText = text.trim();
    if (!qrText) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: '❌ Format salah!\nKetik: *.cqr teks_kamu*',
      }, { quoted: msg });
    }

    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const qrPath = path.join(tempDir, `qr-${Date.now()}.png`);
    const logoPath = path.join(__dirname, '../media/logo.png');

    // Buat QR Code dulu
    await QRCode.toFile(qrPath, qrText, {
      scale: 15,
      margin: 5,
      errorCorrectionLevel: 'H',
    });

    // Buka QR dan logo
    const qrImage = await Jimp.read(qrPath);
    const logo = await Jimp.read(logoPath);

    // Resize logo agar tidak nutupi terlalu besar
    logo.resize(qrImage.bitmap.width / 4, Jimp.AUTO);

    const x = (qrImage.bitmap.width - logo.bitmap.width) / 2;
    const y = (qrImage.bitmap.height - logo.bitmap.height) / 2;

    // Gabungkan logo ke QR
    qrImage.composite(logo, x, y, {
      mode: Jimp.BLEND_SOURCE_OVER,
      opacitySource: 1,
    });

    // Simpan ulang
    await qrImage.writeAsync(qrPath);

    const media = fs.readFileSync(qrPath);
    await sock.sendMessage(msg.key.remoteJid, {
      image: media,
      caption: `✅ QR Code dengan logo berhasil dibuat`,
    }, { quoted: msg });

    fs.unlinkSync(qrPath);
  } catch (err) {
    console.error('❌ Error generate QR:', err);
    await sock.sendMessage(msg.key.remoteJid, {
      text: '⚠️ Gagal membuat QR Code, Mungkin Kamu terlalu Banyak Karakter',
    }, { quoted: msg });
  }
};
