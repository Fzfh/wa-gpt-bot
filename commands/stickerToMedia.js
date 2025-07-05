const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { v4: uuidv4 } = require('uuid');

module.exports = async function stickerToMedia(sock, msg) {
  const sender = msg.key.remoteJid;
  const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
  const quoted = contextInfo?.quotedMessage;

  if (!quoted || !quoted.stickerMessage) {
    await sock.sendMessage(sender, {
      text: '❌ Balas *sticker* dengan perintah *.sm* ya~',
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
    const isVideo = quoted.stickerMessage.isAnimated;
    const extension = isVideo ? 'mp4' : 'jpg';
    const filePath = path.join(tmpdir(), `${fileName}.${extension}`);

    fs.writeFileSync(filePath, mediaBuffer);

    if (isVideo) {
      await sock.sendMessage(sender, {
        video: { url: filePath },
        caption: '🎥 Ini dia media dari stiker kamu~',
      }, { quoted: msg });
    } else {
      await sock.sendMessage(sender, {
        image: { url: filePath },
        caption: '🖼️ Ini dia media dari stiker kamu~',
      }, { quoted: msg });
    }

    setTimeout(() => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }, 10_000);

  } catch (err) {
    console.error('❌ Gagal ambil media dari sticker:', err);
    await sock.sendMessage(sender, {
      text: '⚠️ Gagal mengambil media dari sticker. Coba lagi yaa~',
    }, { quoted: msg });
  }
};
