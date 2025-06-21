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
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
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
      console.error('Gagal ambil metadata grup:', e);
    }
  } else {
    isAdmin = true;
  }

  if (!isAdmin) {
    return sock.sendMessage(chat, {
      text: `❌ Fitur *hapus produk* hanya untuk *admin grup*!`,
    }, { quoted: msg });
  }

  const sesi = sessionMap.get(sender);

  if (!sesi && lower === '/hapus') {
    sessionMap.set(sender, { stage: 'pilih_jenis', type: 'hapus' });
    return sock.sendMessage(chat, {
      text: `🗑️ *Hapus Produk*\n\n1. Topup Game\n2. Pulsa\n3. Kouta\n\nKetik angka: *1*, *2*, atau *3*`,
    }, { quoted: msg });
  }

  if (!sesi || sesi.type !== 'hapus') return;

  // Pilih jenis
  if (sesi.stage === 'pilih_jenis') {
    const jenisMap = { '1': 'topup', '2': 'pulsa', '3': 'kouta' };
    const jenis = jenisMap[lower];
    if (!jenis) return;
    sesi.jenis = jenis;
    sesi.stage = 'pilih_kategori';
    sessionMap.set(sender, sesi);

    return sock.sendMessage(chat, {
      text: `📌 Ketik nama *${jenis === 'topup' ? 'game' : 'provider'}* yang ingin kamu hapus produknya.\nContoh: *ML* atau *Three*`,
    }, { quoted: msg });
  }

  // Pilih kategori game/provider
  if (sesi.stage === 'pilih_kategori') {
    const jenis = sesi.jenis;
    sesi.kategori = lower;
    sesi.stage = 'pilih_produk';
    sessionMap.set(sender, sesi);

    const data = JSON.parse(fs.readFileSync(DATA_PATHS[jenis]));

    if (jenis === 'topup') {
      const game = data.find(g => g.game.toLowerCase() === lower);
      if (!game) {
        sessionMap.delete(sender);
        return sock.sendMessage(chat, { text: `❌ Game *${lower}* tidak ditemukan.` }, { quoted: msg });
      }
      sesi.listProduk = game.produk;
      sesi.indexGame = data.findIndex(g => g.game.toLowerCase() === lower);
      sessionMap.set(sender, sesi);
      const list = game.produk.map((p, i) => `${i + 1}. ${p.nama} - Rp${p.harga}`).join('\n');
      return sock.sendMessage(chat, {
        text: `🎮 *${game.game}*\n\nPilih produk yang ingin dihapus:\n${list}\n\nKetik angkanya, misal: *2*`,
      }, { quoted: msg });
    } else {
      const list = data
        .filter(p => p.provider.toLowerCase() === lower)
        .map((p, i) => `${i + 1}. ${p.produk} - Rp${p.harga} (ID: ${p.id})`);

      if (list.length === 0) {
        sessionMap.delete(sender);
        return sock.sendMessage(chat, {
          text: `❌ Tidak ada produk dengan provider *${lower}*`,
        }, { quoted: msg });
      }

      sesi.filteredProduk = data.filter(p => p.provider.toLowerCase() === lower);
      sessionMap.set(sender, sesi);

      return sock.sendMessage(chat, {
        text: `📱 *${lower.toUpperCase()}*\n\nPilih produk untuk dihapus:\n${list.join('\n')}\n\nKetik angkanya, misal: *1*`,
      }, { quoted: msg });
    }
  }

  // Pilih produk yang ingin dihapus
  if (sesi.stage === 'pilih_produk') {
    const jenis = sesi.jenis;
    const index = parseInt(lower) - 1;
    if (isNaN(index) || index < 0) {
      return sock.sendMessage(chat, { text: `❌ Input tidak valid.` }, { quoted: msg });
    }

    if (jenis === 'topup') {
      const data = JSON.parse(fs.readFileSync(DATA_PATHS.topup));
      const game = data[sesi.indexGame];
      const produkList = game.produk;
      if (!produkList[index]) return sock.sendMessage(chat, { text: `❌ Nomor tidak valid.` }, { quoted: msg });

      const removed = produkList.splice(index, 1);
      fs.writeFileSync(DATA_PATHS.topup, JSON.stringify(data, null, 2));
      sessionMap.delete(sender);
      return sock.sendMessage(chat, {
        text: `✅ Produk *${removed[0].nama}* dari *${game.game}* berhasil dihapus.`,
      }, { quoted: msg });
    } else {
      const produkList = sesi.filteredProduk;
      if (!produkList[index]) return sock.sendMessage(chat, { text: `❌ Nomor tidak valid.` }, { quoted: msg });

      const idTarget = produkList[index].id;
      let data = JSON.parse(fs.readFileSync(DATA_PATHS[jenis]));
      const indexData = data.findIndex(p => p.id === idTarget);
      const removed = data.splice(indexData, 1);
      fs.writeFileSync(DATA_PATHS[jenis], JSON.stringify(data, null, 2));
      sessionMap.delete(sender);
      return sock.sendMessage(chat, {
        text: `✅ Produk *${removed[0].produk}* dari *${removed[0].provider}* berhasil dihapus.`,
      }, { quoted: msg });
    }
  }
};
