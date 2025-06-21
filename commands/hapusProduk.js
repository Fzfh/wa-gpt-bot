const fs = require('fs');
const path = require('path');
const sessionMap = require('../core/sessionStore');

const DATA_PATHS = {
  topup: path.join(__dirname, '../data/topup.json'),
  pulsa: path.join(__dirname, '../data/pulsa.json'),
  kouta: path.join(__dirname, '../data/kouta.json'),
};

module.exports = async function hapusProduk(sock, msg, from, body) {
  const chat = msg.key.remoteJid;
  const sender = msg.key.participant || from;
  const textAsli =
    (msg.message?.conversation) ||
    (msg.message?.extendedTextMessage?.text) ||
    (msg.message?.imageMessage?.caption) ||
    body || '';
  const lower = textAsli.toLowerCase().trim();

  const isGroup = chat.endsWith('@g.us');
  let isAdmin = false;

  if (isGroup) {
    try {
      const metadata = await sock.groupMetadata(chat);
      const participant = metadata.participants.find(p => p.id === sender);
      isAdmin = participant?.admin !== undefined;
    } catch (e) {
      console.error('❌ Gagal ambil metadata grup:', e);
    }
  } else {
    isAdmin = true; // ✨ PRIVATE CHAT BOLEH SEMUA ORANG
  }

  if (!isAdmin) {
    return sock.sendMessage(chat, {
      text: `🚫 Fitur *Hapus Produk* hanya bisa digunakan oleh *Admin Grup WhatsApp* yaa 😘`,
    }, { quoted: msg });
  }

  const sesi = sessionMap.get(sender);

  if (!sesi && lower === '/hapus') {
    sessionMap.set(sender, { stage: 'pilih_jenis', type: 'hapus' });
    return sock.sendMessage(chat, {
      text: `🗑️ *Hapus Produk*\n\n1. Topup Game\n2. Pulsa\n3. Kouta\n\n✏️ Ketik angka *1*, *2*, atau *3* untuk memilih.`,
    }, { quoted: msg });
  }

  if (!sesi || sesi.type !== 'hapus') return;

  if (sesi.stage === 'pilih_jenis') {
    const jenisMap = { '1': 'topup', '2': 'pulsa', '3': 'kouta' };
    const jenis = jenisMap[lower];
    if (!jenis) return;

    sesi.jenis = jenis;
    sesi.stage = 'pilih_target';
    sessionMap.set(sender, sesi);

    const data = JSON.parse(fs.readFileSync(DATA_PATHS[jenis]));

    if (jenis === 'topup') {
      const listGame = data.map((item, index) => `${index + 1}. ${item.game}`).join('\n');
      return sock.sendMessage(chat, {
        text: `🎮 *Pilih game yang ingin dihapus:*\n${listGame}\n\nKetik angkanya, contoh: *2*`,
      }, { quoted: msg });
    } else {
      const list = data.map(item => `${item.id}. ${item.provider} - ${item.produk}`).join('\n');
      return sock.sendMessage(chat, {
        text: `📄 *Pilih produk yang ingin dihapus:*\n${list}\n\nKetik ID-nya, misal: *3*`,
      }, { quoted: msg });
    }
  }

  if (sesi.stage === 'pilih_target') {
    const jenis = sesi.jenis;
    const data = JSON.parse(fs.readFileSync(DATA_PATHS[jenis]));

    if (jenis === 'topup') {
      const index = parseInt(lower) - 1;
      if (isNaN(index) || index < 0 || index >= data.length) {
        return sock.sendMessage(chat, { text: `❌ Nomor tidak valid.` }, { quoted: msg });
      }

      const removed = data.splice(index, 1);
      fs.writeFileSync(DATA_PATHS[jenis], JSON.stringify(data, null, 2));
      sessionMap.delete(sender);

      return sock.sendMessage(chat, {
        text: `✅ Produk dari *${removed[0].game}* berhasil dihapus.`,
      }, { quoted: msg });

    } else {
      const id = parseInt(lower);
      const index = data.findIndex(item => item.id === id);
      if (index === -1) {
        return sock.sendMessage(chat, { text: `❌ ID tidak ditemukan.` }, { quoted: msg });
      }

      const removed = data.splice(index, 1);
      fs.writeFileSync(DATA_PATHS[jenis], JSON.stringify(data, null, 2));
      sessionMap.delete(sender);

      return sock.sendMessage(chat, {
        text: `✅ Produk *${removed[0].produk}* berhasil dihapus.`,
      }, { quoted: msg });
    }
  }
};
