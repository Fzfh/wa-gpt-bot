const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { adminList } = require('../setting/setting');

module.exports = async function show(sock, msg) {
  const sender = msg.key.participant || msg.key.remoteJid;
  const chatId = msg.key.remoteJid;
  const isGroup = chatId.endsWith('@g.us');

  if (!adminList.includes(sender)) {
    return sock.sendMessage(chatId, {
      text: '❌ Hanya Admin Bot yang boleh menggunakan fitur ini',
    }, { quoted: msg });
  }

  try {
    const messageContent = msg.message || {};
    const contextInfo = messageContent?.extendedTextMessage?.contextInfo || {};
    const quoted = contextInfo?.quotedMessage;

    if (!quoted) {
      return sock.sendMessage(chatId, {
        text: '❌ Balas media (foto/video) sekali lihat yang mau diambil dulu ya',
      }, { quoted: msg });
    }

    if (quoted?.imageMessage) {
      const buffer = await downloadMediaMessage(
        { message: { imageMessage: quoted.imageMessage } },
        'buffer',
        {},
        { logger: console, reuploadRequest: sock.updateMediaMessage }
      );

      return sock.sendMessage(chatId, {
        image: buffer,
        caption: '📸 Foto berhasil diambil ulang',
      }, { quoted: msg });
    }

    if (quoted?.videoMessage) {
      const buffer = await downloadMediaMessage(
        { message: { videoMessage: quoted.videoMessage } },
        'buffer',
        {},
        { logger: console, reuploadRequest: sock.updateMediaMessage }
      );

      return sock.sendMessage(chatId, {
        video: buffer,
        caption: '🎥 Video berhasil diambil ulang',
      }, { quoted: msg });
    }

    return sock.sendMessage(chatId, {
      text: '❌ Itu bukan media (foto/video) yang bisa diambil ulang',
    }, { quoted: msg });

  } catch (err) {
    console.error('❌ Gagal ambil media:', err);
    return sock.sendMessage(chatId, {
      text: '❌ Ada error saat ambil media. Coba lagi yaa~',
    }, { quoted: msg });
  }
};
