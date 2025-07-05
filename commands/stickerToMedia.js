const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');

module.exports = async function stickerToMedia(sock, msg) {
  const sender = msg.key.remoteJid;
  const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
  const quoted = contextInfo?.quotedMessage;

  if (!quoted || !quoted.stickerMessage) {
    await sock.sendMessage(sender, {
      text: '❌ Balas *sticker* dengan perintah *.sm* yaa~',
    }, { quoted: msg });
    return;
  }

  await sock.sendMessage(sender, {
    text: '🎬 Sedang mengambil media dari stiker...',
  }, { quoted: msg });

  try {
    const stanzaId = contextInfo?.stanzaId;
    const participant = contextInfo?.participant;

    const mediaBuffer = await downloadMediaMessage(
      {
        key: stanzaId && participant
          ? {
              remoteJid: sender,
              id: stanzaId,
              fromMe: false,
              participant,
            }
          : msg.key,
        message: quoted,
      },
      'buffer',
      {}
    );

    const fileName = uuidv4();
    const isAnimated = quoted.stickerMessage.isAnimated;
    const webpPath = path.join(tmpdir(), `${fileName}.webp`);
    fs.writeFileSync(webpPath, mediaBuffer);

    if (isAnimated) {
  // Langsung kirim aja .webp nya
  await sock.sendMessage(sender, {
    document: { url: webpPath },
    mimetype: 'image/webp',
    fileName: 'sticker_animated.webp',
    caption: '🎞️ Ini dia animasi stiker kamu dalam format asli (webp)',
  }, { quoted: msg });

  setTimeout(() => fs.existsSync(webpPath) && fs.unlinkSync(webpPath), 10000);
}
 else {
      await sock.sendMessage(sender, {
        image: { url: webpPath },
        caption: '🖼️ Ini dia gambar dari stiker kamu~',
      }, { quoted: msg });

      setTimeout(() => {
        if (fs.existsSync(webpPath)) fs.unlinkSync(webpPath);
      }, 10_000);
    }

  } catch (err) {
    console.error('❌ Gagal ambil media dari sticker:', err);
    await sock.sendMessage(sender, {
      text: '⚠️ Gagal mengambil media dari sticker. Coba lagi yaa~',
    }, { quoted: msg });
  }
};
