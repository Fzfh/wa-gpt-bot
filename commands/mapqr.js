const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { adminList } = require('../setting/setting');

module.exports = async function mapsQR(sock, msg, text) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (!adminList.includes(sender)) {
    return sock.sendMessage(from, {
      text: '❌ Fitur ini khusus admin aja ya 😎',
    }, { quoted: msg });
  }

  // Cek apakah reply ke lokasi
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const locationMsg = quoted?.locationMessage;

  let input = text.trim();

  if (locationMsg) {
    // Kalau reply ke lokasi
    const lat = locationMsg.degreesLatitude;
    const lon = locationMsg.degreesLongitude;
    input = `${lat},${lon}`;
  }

  if (!input) {
    return sock.sendMessage(from, {
      text: '❌ Format salah!\nBalas lokasi dengan *.mapsqr* atau ketik manual seperti:\n.mapsqr Monas Jakarta\natau .mapsqr -6.2,106.8',
    }, { quoted: msg });
  }

  try {
    let mapsURL = '';
    if (/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(input)) {
      mapsURL = `https://www.google.com/maps?q=${input}`;
    } else {
      const query = encodeURIComponent(input);
      mapsURL = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }

    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const filePath = path.join(tempDir, `mapsqr-${Date.now()}.png`);
    await QRCode.toFile(filePath, mapsURL, {
      width: 600,
      margin: 2,
    });

    const media = fs.readFileSync(filePath);
    await sock.sendMessage(from, {
      image: media,
      caption: `📍 QR untuk lokasi:\n${mapsURL}`,
    }, { quoted: msg });

    fs.unlinkSync(filePath);
  } catch (err) {
    console.error('❌ Gagal buat QR Maps:', err);
    return sock.sendMessage(from, {
      text: '⚠️ Gagal buat QR Maps. Coba lagi ya!',
    }, { quoted: msg });
  }
};
