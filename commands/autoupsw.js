// autoupsw.js
const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { tmpdir } = require('os');
const { v4: uuidv4 } = require('uuid');

async function uploadStatus(sock, m, caption) {
  const quoted = m.quoted;

  async function saveQuotedMedia() {
    const mime = (quoted?.message?.imageMessage && 'image') ||
                 (quoted?.message?.videoMessage && 'video');
    if (!mime) return null;

    const mediaBuffer = await downloadMediaMessage(
      quoted,
      'buffer',
      {},
      { logger: console, reuploadRequest: sock.updateMediaMessage }
    );

    const ext = mime === 'image' ? '.jpg' : '.mp4';
    const filePath = path.join(tmpdir(), uuidv4() + ext);
    fs.writeFileSync(filePath, mediaBuffer);
    return { filePath, mime };
  }

  if (quoted) {
    const media = await saveQuotedMedia();
    if (!media) {
      return await sock.sendMessage(m.key.remoteJid, { text: '❌ Reply harus ke gambar atau video.' }, { quoted: m });
    }

    const buffer = fs.readFileSync(media.filePath);
    const payload = media.mime === 'image'
      ? { image: buffer }
      : { video: buffer };

    if (caption) payload.caption = caption;

    await sock.sendMessage('status@broadcast', payload);
    fs.unlinkSync(media.filePath);

    return await sock.sendMessage(m.key.remoteJid, { text: '✅ Status berhasil diupload!' }, { quoted: m });
  } else {
    if (!caption) {
      return await sock.sendMessage(m.key.remoteJid, { text: '❌ Ketik teks atau reply ke media.' }, { quoted: m });
    }

    await sock.sendMessage('status@broadcast', { text: caption });
    return await sock.sendMessage(m.key.remoteJid, { text: '✅ Status teks berhasil diupload!' }, { quoted: m });
  }
}

module.exports = { uploadStatus };
