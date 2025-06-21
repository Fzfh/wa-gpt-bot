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
  const sessionId = sender;

  const textAsli =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    body || '';
  const lower = textAsli.toLowerCase().trim();

  // Reset jika /hapus
  if (lower === '/hapus') {
    sessionMap.set(sessionId, { stage: 'pilih_jenis', type: 'hapus' });
    return sock.sendMessage(chat, {
      text: `🗑️ *Hapus Produk*\n\n1. Topup Game\n2. Pulsa\n3. Kouta\n\n📝 Ketik angka *1*, *2*, atau *3* untuk memilih.`,
    }, { quoted: msg });
  }

  // Reset jika /keluar
  if (lower === '/keluar') {
    sessionMap.delete(sessionId);
    return sock.sendMessage(chat, {
      text: `✅ Sesi hapus produk dibatalkan. Ketik /hapus untuk memulai lagi.`,
    }, { quoted: msg });
  }

  const sesi = sessionMap.get(sessionId);
  if (!sesi || sesi.type !== 'hapus') return;

  // Step 1: Pilih jenis
  if (sesi.stage === 'pilih_jenis') {
    const jenisMap = { '1': 'topup', '2': 'pulsa', '3': 'kouta' };
    const jenis = jenisMap[lower];
    if (!jenis) return;

    sesi.jenis = jenis;
    sesi.stage = 'pilih_kategori';
    sessionMap.set(sessionId, sesi);

    return sock.sendMessage(chat, {
      text: `📌 Ketik nama *${jenis === 'topup' ? 'game' : 'provider'}* yang ingin kamu hapus produknya.`,
    }, { quoted: msg });
  }

  // Step 2: Pilih kategori
  if (sesi.stage === 'pilih_kategori') {
    const jenis = sesi.jenis;
    const kategori = lower;
    const data = JSON.parse(fs.readFileSync(DATA_PATHS[jenis], 'utf-8'));
    sesi.kategori = kategori;
    sesi.stage = 'pilih_produk';

    if (jenis === 'topup') {
      const indexGame = data.findIndex(g => g.game.toLowerCase() === kategori);
      if (indexGame === -1) {
        sessionMap.delete(sessionId);
        return sock.sendMessage(chat, { text: `❌ Game tidak ditemukan.` }, { quoted: msg });
      }

      const game = data[indexGame];
      sesi.indexGame = indexGame;
      sesi.produkList = game.items;
      sessionMap.set(sessionId, sesi);

      const list = game.items.map((item, i) => `${i + 1}. ${item.nominal} - Rp${item.harga}`).join('\n');
      return sock.sendMessage(chat, {
        text: `🎮 *${game.game}*\n\nPilih produk yang ingin dihapus:\n${list}\n\nKetik angka misal: *1*`,
      }, { quoted: msg });
    } else {
      const filtered = data.filter(p => p.provider.toLowerCase() === kategori);
      if (!filtered.length) {
        sessionMap.delete(sessionId);
        return sock.sendMessage(chat, { text: `❌ Provider tidak ditemukan.` }, { quoted: msg });
      }

      sesi.filteredProduk = filtered;
      sessionMap.set(sessionId, sesi);

      const list = filtered.map((p, i) => `${i + 1}. ${p.produk} - Rp${p.harga}`).join('\n');
      return sock.sendMessage(chat, {
        text: `📱 *${kategori}*\n\nPilih produk untuk dihapus:\n${list}\n\nKetik angka misal: *1*`,
      }, { quoted: msg });
    }
  }

  // Step 3: Pilih produk
  if (sesi.stage === 'pilih_produk') {
    const jenis = sesi.jenis;
    const index = parseInt(lower) - 1;
    if (isNaN(index) || index < 0) return;

    if (jenis === 'topup') {
      const data = JSON.parse(fs.readFileSync(DATA_PATHS.topup));
      const game = data[sesi.indexGame];
      if (!game.items[index]) return;

      const removed = game.items.splice(index, 1);
      fs.writeFileSync(DATA_PATHS.topup, JSON.stringify(data, null, 2));
      sessionMap.delete(sessionId);

      return sock.sendMessage(chat, {
        text: `✅ Produk *${removed[0].nominal}* dari *${game.game}* berhasil dihapus.`,
      }, { quoted: msg });
    } else {
      const data = JSON.parse(fs.readFileSync(DATA_PATHS[jenis]));
      const produk = sesi.filteredProduk[index];
      if (!produk) return;

      const indexReal = data.findIndex(p => p.id === produk.id);
      const removed = data.splice(indexReal, 1);
      fs.writeFileSync(DATA_PATHS[jenis], JSON.stringify(data, null, 2));
      sessionMap.delete(sessionId);

      return sock.sendMessage(chat, {
        text: `✅ Produk *${removed[0].produk}* dari *${removed[0].provider}* berhasil dihapus.`,
      }, { quoted: msg });
    }
  }
};
