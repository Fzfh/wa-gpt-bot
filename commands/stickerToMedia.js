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
      const mp4Path = path.join(tmpdir(), `${fileName}.mp4`);
      const ffmpegCmd = `ffmpeg -y -i "${webpPath}" -movflags faststart -pix_fmt yuv420p "${mp4Path}"`;

      exec(ffmpegCmd, async (err) => {
        if (err) {
          console.error('❌ Gagal konversi WebP ke MP4:', err);
          await sock.sendMessage(sender, {
            text: '⚠️ Gagal konversi stiker animasi ke video. Pastikan VPS sudah install ffmpeg!',
          }, { quoted: msg });
          return;
        }

        await sock.sendMessage(sender, {
          video: { url: mp4Path },
          caption: '🎥 Ini dia video dari stiker kamu~',
        }, { quoted: msg });

        setTimeout(() => {
          if (fs.existsSync(webpPath)) fs.unlinkSync(webpPath);
          if (fs.existsSync(mp4Path)) fs.unlinkSync(mp4Path);
        }, 10_000);
      });

    } else {
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
