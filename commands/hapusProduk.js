const fs = require('fs');
const path = require('path');
const sessionMap = require('../core/sessionStore');

const DATA_PATHS = {
  topup: path.join(__dirname, '../data/topup.json'),
  pulsa: path.join(__dirname, '../data/pulsa.json'),
  kouta: path.join(__dirname, '../data/kouta.json'),
};

module.exports = async function hapusProduk(sock, msg, from, body,  userId) {
  const chat = msg.key.remoteJid;
  const sender = msg.key.participant || from;
  const textAsli =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    body || '';
  const lower = textAsli.toLowerCase().trim();

  // Admin check
  if (from.endsWith('@g.us')) {
    const metadata = await sock.groupMetadata(from);
    const isAdmin = metadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));
    if (!isAdmin) {
      return sock.sendMessage(chat, {
        text: `🚫 Maaf yaa, fitur *Hapus Produk* cuma bisa dipake admin grup 😎`
      }, { quoted: msg });
    }
  }

  // 🌟 Keluar dari sesi
  if (lower === '/keluar') {
    if (sessionMap.has(userId)) {
      sessionMap.delete(userId);
      return sock.sendMessage(chat, { text: `🚪 Sesi *hapus produk* telah dibatalkan.` }, { quoted: msg });
    }
  }

  // 🌟 Mulai sesi baru
  if (lower === '/hapus') {
    sessionMap.set(userId, { stage: 'pilih_jenis', type: 'hapus' });
    return sock.sendMessage(chat, {
      text: `🗑️ *Hapus Produk*\n\n1. Topup Game\n2. Pulsa\n3. Kouta\n\n📝 Ketik angka *1*, *2*, atau *3* untuk memilih.`,
    }, { quoted: msg });
  }

  const sesi = sessionMap.get(userId);
  if (!sesi || sesi.type !== 'hapus') return;

  // Step 1
  if (sesi.stage === 'pilih_jenis') {
    const jenisMap = { '1': 'topup', '2': 'pulsa', '3': 'kouta' };
    const jenis = jenisMap[lower];
    if (!jenis) {
      return sock.sendMessage(chat, {
        text: `❌ Pilih angka *1*, *2*, atau *3* yaa 😘`,
      }, { quoted: msg });
    }
    sesi.jenis = jenis;
    sesi.stage = 'pilih_kategori';
    sessionMap.set(userId, sesi);
    const contoh = jenis === 'topup' ? 'Mobile Legends' : 'Three / Telkomsel';
    return sock.sendMessage(chat, {
      text: `🗂️ Ketik nama *${jenis === 'topup' ? 'game' : 'provider'}* yang ingin dihapus.\nContoh: *${contoh}*`,
    }, { quoted: msg });
  }

  // Step 2
  if (sesi.stage === 'pilih_kategori') {
    const jenis = sesi.jenis;
    const kategori = lower;
    const data = JSON.parse(fs.readFileSync(DATA_PATHS[jenis], 'utf-8'));

    sesi.kategori = kategori;
    sesi.stage = 'pilih_produk';

    if (jenis === 'topup') {
      const gameIndex = data.findIndex(g => g.game.toLowerCase() === kategori);
      const game = data[gameIndex];
      if (!game) {
        sessionMap.delete(userId);
        return sock.sendMessage(chat, { text: `❌ Game *${kategori}* tidak ditemukan.` }, { quoted: msg });
      }

      sesi.indexGame = gameIndex;
      sesi.produkList = game.items;
      sessionMap.set(userId, sesi);

      const list = game.items.map((item, i) => `${i + 1}. ${item.nominal} - Rp${item.harga.toLocaleString('id-ID')}`).join('\n');

      return sock.sendMessage(chat, {
        text: `🎮 *${game.game}*\n\nPilih produk yang ingin dihapus:\n${list}\n\nKetik angkanya, misal: *2*`,
      }, { quoted: msg });
    } else {
      const filtered = data.filter(p => p.provider.toLowerCase() === kategori);
      if (filtered.length === 0) {
        sessionMap.delete(userId);
        return sock.sendMessage(chat, {
          text: `❌ Tidak ada produk dengan provider *${kategori}*`,
        }, { quoted: msg });
      }

      sesi.filteredProduk = filtered;
      sessionMap.set(userId, sesi);

      const list = filtered.map((p, i) => `${i + 1}. ${p.produk} - Rp${p.harga.toLocaleString('id-ID')} (ID: ${p.id})`).join('\n');

      return sock.sendMessage(chat, {
        text: `📱 *${kategori.toUpperCase()}*\n\nPilih produk untuk dihapus:\n${list}\n\nKetik angka, misal: *1*`,
      }, { quoted: msg });
    }
  }

  // Step 3
  if (sesi.stage === 'pilih_produk') {
    const jenis = sesi.jenis;
    const index = parseInt(lower) - 1;
    if (isNaN(index) || index < 0) {
      return sock.sendMessage(chat, { text: `❌ Pilihan tidak valid.` }, { quoted: msg });
    }

    if (jenis === 'topup') {
      const data = JSON.parse(fs.readFileSync(DATA_PATHS.topup));
      const game = data[sesi.indexGame];
      const produkList = game.items;

      if (!produkList[index]) {
        return sock.sendMessage(chat, { text: `❌ Nomor produk tidak valid.` }, { quoted: msg });
      }

      const removed = produkList.splice(index, 1);
      fs.writeFileSync(DATA_PATHS.topup, JSON.stringify(data, null, 2));
      sessionMap.delete(userId);

      return sock.sendMessage(chat, {
        text: `✅ Produk *${removed[0].nominal}* dari *${game.game}* berhasil dihapus.`,
      }, { quoted: msg });
    } else {
      const produkList = sesi.filteredProduk;
      if (!produkList[index]) {
        return sock.sendMessage(chat, { text: `❌ Nomor tidak valid.` }, { quoted: msg });
      }

      const idTarget = produkList[index].id;
      const data = JSON.parse(fs.readFileSync(DATA_PATHS[jenis]));
      const indexData = data.findIndex(p => p.id === idTarget);

      const removed = data.splice(indexData, 1);
      fs.writeFileSync(DATA_PATHS[jenis], JSON.stringify(data, null, 2));
      sessionMap.delete(userId);

      return sock.sendMessage(chat, {
        text: `✅ Produk *${removed[0].produk}* dari *${removed[0].provider}* berhasil dihapus.`,
      }, { quoted: msg });
    }
  }
};
