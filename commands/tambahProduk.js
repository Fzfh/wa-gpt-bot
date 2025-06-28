const fs = require('fs');
const path = require('path');
const sessionMap = require('../core/sessionStore');
const { adminList } = require('../setting/setting');

const DATA_PATHS = {
  topup: path.join(__dirname, '../data/topup.json'),
  pulsa: path.join(__dirname, '../data/pulsa.json'),
  kouta: path.join(__dirname, '../data/kouta.json'),
};

function saveToJsonFlatArray(filePath, newObj) {
  let arr = [];
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      arr = Array.isArray(parsed) ? parsed : [];
    } catch {
      arr = [];
    }
  }
  const nextId = arr.reduce((max, item) => {
    const idNum = parseInt(item.id);
    return isNaN(idNum) ? max : Math.max(max, idNum);
  }, 0) + 1;
  newObj.id = nextId;
  arr.push(newObj);
  fs.writeFileSync(filePath, JSON.stringify(arr, null, 2));
}

function saveToTopupJson(game, namaProduk, harga) {
  const filePath = DATA_PATHS.topup;
  let data = [];

  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      data = JSON.parse(raw);
    } catch (err) {
      data = [];
    }
  }

  const gameIndex = data.findIndex(item => item.game.toLowerCase() === game.toLowerCase());
  const newItem = { nominal: namaProduk, harga };

  if (gameIndex !== -1) {
    data[gameIndex].items.push(newItem);
  } else {
    data.push({ game, items: [newItem] });
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = async function tambahProduk(sock, msg, from, body) {
  const chat = msg.key.remoteJid;
  const textAsli =
    (msg.message?.conversation) ||
    (msg.message?.extendedTextMessage?.text) ||
    (msg.message?.imageMessage?.caption) ||
    body || '';
  const lower = textAsli.toLowerCase().trim();
   const sender = msg.key.participant || from;

   const isSuperAdmin = adminList.includes(sender);
  if (!isSuperAdmin) {
    return sock.sendMessage(chat, {
      text: `🚫 Maaf yaa, fitur *Tambah Produk* hanya untuk admin utama 😎`,
    }, { quoted: msg });
  }


  // Jika user ketik /keluar dari sesi tambah
  const sesi = sessionMap.get(from);
  if (sesi && sesi.type === 'tambah' && lower === '/keluar') {
    sessionMap.delete(from);
    return sock.sendMessage(chat, {
      text: `✅ Sesi *tambah produk* telah dibatalkan.\nKetik */tambah* lagi kalau ingin mulai ulang yaa 💖`
    }, { quoted: msg });
  }

  // ❗ FIXED: Jika user ketik /tambah, reset apapun itu
  if (lower === '/tambah') {
    sessionMap.set(from, { stage: 'pilih_jenis', type: 'tambah' });
    return sock.sendMessage(chat, {
      text: `📦 *Tambah Produk*\n1. Topup Game\n2. Pulsa\n3. Kouta\n\n✏️ Ketik angka *1*, *2*, atau *3* untuk memilih.`,
    }, { quoted: msg });
  }

  // Jika tidak ada sesi aktif atau bukan sesi tambah, abaikan
  if (!sesi || sesi.type !== 'tambah') return;

  // Step 1: Pilih jenis
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
    sessionMap.set(from, sesi);
    const contoh = jenis === 'topup' ? 'Mobile Legends / PUBG' : 'Three / Telkomsel';
    return sock.sendMessage(chat, {
      text: `🗂️ Ketik nama *${jenis === 'topup' ? 'game' : 'provider'}*.\nContoh: ${contoh}`,
    }, { quoted: msg });
  }

  // Step 2: Simpan kategori
  if (sesi.stage === 'pilih_kategori') {
    sesi.kategori = textAsli.trim();
    sesi.stage = 'isi_data';
    sessionMap.set(from, sesi);

    const format = sesi.jenis === 'topup'
      ? 'nama_produk, harga\nContoh: 10 UC, 15000'
      : 'provider, produk, harga\nContoh: Three, Pulsa 10K, 12000';

    return sock.sendMessage(chat, {
      text: `📝 Kirim data produk dengan format:\n${format}`,
    }, { quoted: msg });
  }

  // Step 3: Input data produk
  if (sesi.stage === 'isi_data') {
    const bagian = textAsli.split(',').map(x => x.trim());
    const jenis = sesi.jenis;

    if (jenis === 'topup') {
      if (bagian.length !== 2 || isNaN(parseInt(bagian[1]))) {
        return sock.sendMessage(chat, {
          text: `❌ Format salah!\nContoh: 10 UC, 15000`
        }, { quoted: msg });
      }
      const nama = bagian[0];
      const harga = parseInt(bagian[1]);
      try {
        saveToTopupJson(sesi.kategori, nama, harga);
        sessionMap.delete(from);
        return sock.sendMessage(chat, {
          text: `✅ Produk berhasil ditambahkan ke *${sesi.kategori}*\n📦 ${nama} - Rp${harga.toLocaleString('id-ID')}`,
        }, { quoted: msg });
      } catch (e) {
        sessionMap.delete(from);
        return sock.sendMessage(chat, {
          text: `❌ Gagal menyimpan produk topup: ${e.message}`
        }, { quoted: msg });
      }
    }

    if (jenis === 'pulsa' || jenis === 'kouta') {
      if (bagian.length !== 3 || isNaN(parseInt(bagian[2]))) {
        return sock.sendMessage(chat, {
          text: `❌ Format salah!\nContoh: Three, Pulsa 10K, 12000`
        }, { quoted: msg });
      }
      const provider = bagian[0];
      const produk = bagian[1];
      const harga = parseInt(bagian[2]);
      try {
        saveToJsonFlatArray(DATA_PATHS[jenis], { provider, produk, harga });
        sessionMap.delete(from);
        return sock.sendMessage(chat, {
          text: `✅ Produk ${jenis} berhasil ditambahkan ke *${provider}*\n📦 ${produk} - Rp${harga.toLocaleString('id-ID')}`,
        }, { quoted: msg });
      } catch (e) {
        sessionMap.delete(from);
        return sock.sendMessage(chat, {
          text: `❌ Gagal menyimpan produk: ${e.message}`
        }, { quoted: msg });
      }
    }
  }
};
