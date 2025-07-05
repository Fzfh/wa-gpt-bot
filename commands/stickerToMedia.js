const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { v4: uuidv4 } = require('uuid');

module.exports = async function stickerToMedia(sock, msg) {
  const sender = msg.key.remoteJid;
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  if (!quoted || (!quoted.stickerMessage)) {
    await sock.sendMessage(sender, {
      text: '❌ Reply ke sticker yang ingin dikonversi!',
    }, { quoted: msg });
    return;
  }

  await sock.sendMessage(sender, {
    text: '🎬 Sedang mengambil media dari stiker...',
  }, { quoted: msg });

  try {
    const mediaBuffer = await downloadMediaMessage(
      { key: msg.message.extendedTextMessage.contextInfo.stanzaId 
        ? {
            remoteJid: sender,
            id: msg.message.extendedTextMessage.contextInfo.stanzaId,
            fromMe: false,
            participant: msg.message.extendedTextMessage.contextInfo.participant,
          }
        : msg.key,
        message: quoted
      },
      'buffer',
      { },
    );

    const fileName = uuidv4();
    const isVideo = quoted.stickerMessage.isAnimated;

    const filePath = path.join(tmpdir(), `${fileName}.${isVideo ? 'mp4' : 'jpg'}`);
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

    setTimeout(() => fs.unlinkSync(filePath), 10_000);
  } catch (err) {
    console.error('❌ Gagal ambil media dari sticker:', err);
    await sock.sendMessage(sender, {
      text: '⚠️ Gagal mengambil media dari sticker.',
    }, { quoted: msg });
  }
};
