const fs = require('fs');
const path = require('path');
const sessionMap = require('../core/sessionStore');

const DATA_PATHS = {
  topup: path.join(__dirname, '../data/topup.json'),      // misal tetap array of game objects
  pulsa: path.join(__dirname, '../data/pulsa.json'),      // flat array
  kouta: path.join(__dirname, '../data/kouta.json'),      // flat array
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
  // cari next id
  const nextId = arr.reduce((max, item) => {
    const idNum = parseInt(item.id);
    return isNaN(idNum) ? max : Math.max(max, idNum);
  }, 0) + 1;
  newObj.id = nextId;
  arr.push(newObj);
  fs.writeFileSync(filePath, JSON.stringify(arr, null, 2));
}

module.exports = async function tambahProduk(sock, msg, from, body) {
  const chat = msg.key.remoteJid;
  const textAsli =
    (msg.message?.conversation) ||
    (msg.message?.extendedTextMessage?.text) ||
    (msg.message?.imageMessage?.caption) ||
    body || '';
  const lower = textAsli.toLowerCase().trim();

  // Tangani /keluar dalam sesi tambah
  const sesi = sessionMap.get(from);
  if (sesi && sesi.type === 'tambah' && lower === '/keluar') {
    sessionMap.delete(from);
    return sock.sendMessage(chat, {
      text: `✅ Sesi *tambah produk* telah dibatalkan. Ketik */tambah* lagi kalau ingin mulai ulang yaa 💖`
    }, { quoted: msg });
  }

  // Jika belum ada sesi dan user ketik /tambah
  if (!sesi && lower === '/tambah') {
    sessionMap.set(from, { stage: 'pilih_jenis', type: 'tambah' });
    return sock.sendMessage(chat, {
      text: `📦 *Tambah Produk*\n1. Topup Game\n2. Pulsa\n3. Kouta\n\n✏️ Ketik angka *1*, *2*, atau *3* untuk memilih.`,
    }, { quoted: msg });
  }

  // Jika tidak ada sesi aktif atau bukan sesi 'tambah', abaikan
  if (!sesi || sesi.type !== 'tambah') return;

  // === Step 1: Pilih Jenis Produk ===
  if (sesi.stage === 'pilih_jenis') {
    const jenisMap = { '1': 'topup', '2': 'pulsa', '3': 'kouta' };
    const jenis = jenisMap[lower];
    if (!jenis) {
      if (!sesi.notified) {
        sesi.notified = true;
        sessionMap.set(from, sesi);
        return sock.sendMessage(chat, {
          text: `❌ Pilih angka *1*, *2*, atau *3* ya sayang~ 😘`
        }, { quoted: msg });
      }
      return;
    }
    sesi.jenis = jenis;
    sesi.stage = 'pilih_kategori';
    sessionMap.set(from, sesi);
    const contohKategori = sesi.jenis === 'topup'
      ? 'mobilelegends / pubg / ml'
      : sesi.jenis === 'pulsa'
        ? 'Three / Telkomsel'
        : 'Three / Indosat';
    return sock.sendMessage(chat, {
      text: `🗂️ Ketik kategori/provider untuk produk *${jenis.toUpperCase()}*.\nContoh: ${contohKategori}`
    }, { quoted: msg });
  }

  // === Step 2: Pilih Kategori ===
  if (sesi.stage === 'pilih_kategori') {
    const kategoriInput = textAsli.trim();
    sesi.kategori = kategoriInput; // simpan provider atau kategori
    sesi.stage = 'isi_data';
    sessionMap.set(from, sesi);
    const contoh = sesi.jenis === 'topup'
      ? 'nama_produk, harga\nContoh:\n- 10 UC, 15000'
      : 'provider, produk, harga\nContoh:\n- Three, Pulsa 10K, 12000';
    return sock.sendMessage(chat, {
      text: `📝 Kirim data produk dengan format:\n${contoh}`
    }, { quoted: msg });
  }

  // === Step 3: Input Data Produk ===
  if (sesi.stage === 'isi_data') {
    const bagian = textAsli.split(',').map(p => p.trim());
    // TOPUP: struktur terserah handler topup Anda
    if (sesi.jenis === 'topup') {
      if (bagian.length !== 2 || isNaN(parseInt(bagian[1].replace(/\D/g,'')))) {
        return sock.sendMessage(chat, {
          text: `❌ Format salah!\nContoh: 10 UC, 15000`
        }, { quoted: msg });
      }
      const namaProduk = bagian[0];
      const harga = parseInt(bagian[1].replace(/\D/g,''));
      // logic simpan topup sesuai struktur JSON topup Anda...
      // Misal ada fungsi addProductToTopup
      try {
        // contoh: addProductToTopup(sesi.kategori, namaProduk, harga)
        sessionMap.delete(from);
        return sock.sendMessage(chat, {
          text: `✅ Produk berhasil ditambahkan ke *${sesi.kategori}*\n📦 ${namaProduk} - Rp${harga.toLocaleString('id-ID')}`
        }, { quoted: msg });
      } catch (e) {
        sessionMap.delete(from);
        return sock.sendMessage(chat, {
          text: `❌ Gagal menyimpan produk topup: ${e.message}`
        }, { quoted: msg });
      }
    }

    // PULSA: flat array [{id, provider, produk, harga}, ...]
    if (sesi.jenis === 'pulsa') {
      if (bagian.length !== 3 || isNaN(parseInt(bagian[2].replace(/\D/g,'')))) {
        return sock.sendMessage(chat, {
          text: `❌ Format salah!\nContoh: Three, Pulsa 10K, 12000`
        }, { quoted: msg });
      }
      const provider = bagian[0];
      const produk = bagian[1];
      const harga = parseInt(bagian[2].replace(/\D/g,''));
      try {
        saveToJsonFlatArray(DATA_PATHS.pulsa, { provider, produk, harga });
        sessionMap.delete(from);
        return sock.sendMessage(chat, {
          text: `✅ Produk pulsa berhasil ditambahkan ke *${provider}*\n📦 ${produk} - Rp${harga.toLocaleString('id-ID')}`
        }, { quoted: msg });
      } catch (e) {
        sessionMap.delete(from);
        return sock.sendMessage(chat, {
          text: `❌ Gagal menyimpan data pulsa: ${e.message}`
        }, { quoted: msg });
      }
    }

    // KOUTA: flat array [{id, provider, produk, harga}, ...]
    if (sesi.jenis === 'kouta') {
      if (bagian.length !== 3 || isNaN(parseInt(bagian[2].replace(/\D/g,'')))) {
        return sock.sendMessage(chat, {
          text: `❌ Format salah!\nContoh: Three, 5GB, 7000`
        }, { quoted: msg });
      }
      const provider = bagian[0];
      const produk = bagian[1];
      const harga = parseInt(bagian[2].replace(/\D/g,''));
      try {
        saveToJsonFlatArray(DATA_PATHS.kouta, { provider, produk, harga });
        sessionMap.delete(from);
        return sock.sendMessage(chat, {
          text: `✅ Produk kouta berhasil ditambahkan ke *${provider}*\n📦 ${produk} - Rp${harga.toLocaleString('id-ID')}`
        }, { quoted: msg });
      } catch (e) {
        sessionMap.delete(from);
        return sock.sendMessage(chat, {
          text: `❌ Gagal menyimpan data kouta: ${e.message}`
        }, { quoted: msg });
      }
    }
  }
};
