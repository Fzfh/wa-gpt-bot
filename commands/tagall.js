const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = async function tagall(sock, msg, text, isGroup) {
  const groupId = msg.key.remoteJid;
  const userId = msg.key.participant || msg.key.remoteJid;

  if (!isGroup) {
    return sock.sendMessage(groupId, {
      text: '❌ Perintah ini hanya bisa digunakan di grup.'
    }, { quoted: msg });
  }

  try {
    const metadata = await sock.groupMetadata(groupId);

    if (!metadata || !Array.isArray(metadata.participants)) {
      return sock.sendMessage(groupId, {
        text: '❌ Tidak bisa ambil data grup. Pastikan bot sudah masuk dan jadi admin.'
      }, { quoted: msg });
    }

    const isSenderAdmin = metadata.participants.some(p =>
      p.id === userId && (p.admin === 'admin' || p.admin === 'superadmin')
    );

    if (!isSenderAdmin) {
      return sock.sendMessage(groupId, {
        text: '❌ Hanya admin grup WhatsApp yang bisa pakai perintah ini yaa~'
      }, { quoted: msg });
    }

    const mentions = metadata.participants.map(p => p.id);
    const tagger = '@' + userId.split('@')[0];
    const customMsg = text.split(' ').slice(1).join(' ') || `📢 Di tag oleh ${tagger}`;

    const messageContent = msg.message || {};
    const contextInfo = messageContent?.extendedTextMessage?.contextInfo || {};
    const quoted = contextInfo?.quotedMessage;
    if (quoted?.imageMessage) {
      const buffer = await downloadMediaMessage({
        message: { imageMessage: quoted.imageMessage }
      }, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage });

      return sock.sendMessage(groupId, {
        image: buffer,
        caption: customMsg,
        mentions
      }, { quoted: msg });
    }
    if (quoted?.videoMessage) {
      const buffer = await downloadMediaMessage({
        message: { videoMessage: quoted.videoMessage }
      }, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage });

      return sock.sendMessage(groupId, {
        video: buffer,
        caption: customMsg,
        mentions
      }, { quoted: msg });
    }
    if (messageContent?.imageMessage) {
      const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
        logger: console,
        reuploadRequest: sock.updateMediaMessage
      });

      return sock.sendMessage(groupId, {
        image: buffer,
        caption: customMsg,
        mentions
      }, { quoted: msg });
    }
    if (messageContent?.videoMessage) {
      const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
        logger: console,
        reuploadRequest: sock.updateMediaMessage
      });

      return sock.sendMessage(groupId, {
        video: buffer,
        caption: customMsg,
        mentions
      }, { quoted: msg });
    }
    return sock.sendMessage(groupId, {
      text: customMsg,
      mentions
    }, { quoted: msg });

  } catch (err) {
    console.error('❌ Gagal tagall:', err);
    return sock.sendMessage(groupId, {
      text: '❌ Error saat tagall. Apakah bot admin grup?',
    }, { quoted: msg });
  }
};
