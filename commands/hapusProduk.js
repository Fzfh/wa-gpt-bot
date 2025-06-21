// 📁 commands/hapusProduk.js
const fs = require('fs');
const path = require('path');
const sessionMap = require('../core/sessionStore');
const { adminList } = require('../setting/setting');

const DATA_PATHS = {
  topup: path.join(__dirname, '../data/topup.json'),
  pulsa: path.join(__dirname, '../data/pulsa.json'),
  kouta: path.join(__dirname, '../data/kouta.json'),
};

module.exports = async function hapusProduk(sock, msg, from, body) {
  const chat = msg.key.remoteJid;
  const textAsli =
    (msg.message?.conversation) ||
    (msg.message?.extendedTextMessage?.text) ||
    (msg.message?.imageMessage?.caption) ||
    body || '';
  const lower = textAsli.toLowerCase().trim();

  if (!adminList.includes(from)) {
    return sock.sendMessage(chat, {
      text: `🚫 Maaf ya, fitur *Hapus Produk* hanya untuk admin saja 😘`,
    }, { quoted: msg });
  }

  const sesi = sessionMap.get(from);

  if (!sesi && lower === '/hapus') {
    sessionMap.set(from, { stage: 'pilih_jenis', type: 'hapus' });
    return sock.sendMessage(chat, {
      text: `🗑️ *Hapus Produk*
1. Topup Game
2. Pulsa
3. Kouta

✏️ Ketik angka *1*, *2*, atau *3* untuk memilih.`
    }, { quoted: msg });
  }

  if (!sesi || sesi.type !== 'hapus') return;

  if (sesi.stage === 'pilih_jenis') {
    const jenisMap = { '1': 'topup', '2': 'pulsa', '3': 'kouta' };
    const jenis = jenisMap[lower];
    if (!jenis) return;

    sesi.jenis = jenis;
    sesi.stage = 'pilih_target';
    sessionMap.set(from, sesi);

    const data = JSON.parse(fs.readFileSync(DATA_PATHS[jenis]));

    if (jenis === 'topup') {
      let listGame = data.map((item, index) => `${index + 1}. ${item.game}`).join('\n');
      return sock.sendMessage(chat, {
        text: `🎮 Pilih game:
${listGame}\n\nKetik angka game yang ingin dihapus produknya.`
      }, { quoted: msg });
    } else {
      let list = data.map(item => `${item.id}. ${item.provider} - ${item.produk}`).join('\n');
      return sock.sendMessage(chat, {
        text: `📄 Pilih ID produk yang ingin dihapus:
${list}\n\nKetik ID-nya, misal: 3`
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
      sessionMap.delete(from);
      return sock.sendMessage(chat, {
        text: `✅ Produk dari *${removed[0].game}* berhasil dihapus.`
      }, { quoted: msg });
    } else {
      const id = parseInt(lower);
      const index = data.findIndex(item => item.id === id);
      if (index === -1) {
        return sock.sendMessage(chat, { text: `❌ ID tidak ditemukan.` }, { quoted: msg });
      }
      const removed = data.splice(index, 1);
      fs.writeFileSync(DATA_PATHS[jenis], JSON.stringify(data, null, 2));
      sessionMap.delete(from);
      return sock.sendMessage(chat, {
        text: `✅ Produk *${removed[0].produk}* berhasil dihapus.`
      }, { quoted: msg });
    }
  }
};
