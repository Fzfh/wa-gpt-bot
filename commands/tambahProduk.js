// 📁 commands/tambahProduk.js
const fs = require('fs');
const path = require('path');
const sessionMap = require('../core/sessionStore');

// Path ke file topup.json, pulsa.json, dan kouta.json
const TOPUP_FILE_PATH = path.join(__dirname, '../data/topup.json');
const PULSA_FILE_PATH = path.join(__dirname, '../data/pulsa.json');
const KOUTA_FILE_PATH = path.join(__dirname, '../data/kouta.json'); // 🔧 ubah nama file

// Mapping alias game ke nama game persis di JSON
const gameAliasMap = {
  ml: 'Mobile Legends',
  mobilelegend: 'Mobile Legends',
  mobilelegends: 'Mobile Legends',
  'mobile legends': 'Mobile Legends',
  ff: 'Free Fire',
  freefire: 'Free Fire',
  'free fire': 'Free Fire',
  genshin: 'Genshin Impact',
  gc: 'Genshin Impact',
  'genshin impact': 'Genshin Impact',
  pubg: 'PUBG Mobile',
  'pubg mobile': 'PUBG Mobile',
  valorant: 'Valorant',
  valo: 'Valorant',
  radianite: 'Valorant'
};

// Load & save topup.json
function loadTopupData() {
  try {
    if (!fs.existsSync(TOPUP_FILE_PATH)) {
      fs.writeFileSync(TOPUP_FILE_PATH, JSON.stringify([], null, 2));
    }
    const raw = fs.readFileSync(TOPUP_FILE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('❌ Gagal load topup.json:', err);
    return [];
  }
}
function saveTopupData(data) {
  try {
    fs.writeFileSync(TOPUP_FILE_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Gagal simpan topup.json:', err);
    throw err;
  }
}

// Tambah produk ke topup.json sesuai struktur
function addProductToTopup(gameAliasInput, namaProduk, hargaAngka) {
  const data = loadTopupData();
  const key = gameAliasInput.toLowerCase().trim();
  const gameName = gameAliasMap[key] || capitalizeWords(gameAliasInput);
  let gameObj = data.find(item => item.game.toLowerCase() === gameName.toLowerCase());
  if (!gameObj) {
    gameObj = { game: gameName, items: [] };
    data.push(gameObj);
  }
  gameObj.items.push({
    nominal: namaProduk,
    harga: hargaAngka
  });
  saveTopupData(data);
  return gameName;
}

// Helper: capitalize setiap kata
function capitalizeWords(str) {
  return str
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
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
      text: `📦 *Tambah Produk*\n1. Topup Game\n2. Pulsa\n3. Kouta\n\n✏️ Ketik angka *1*, *2*, atau *3* untuk memilih.`, // 🔧 ubah tampilan ke "Kouta"
    }, { quoted: msg });
  }

  // Jika tidak ada sesi aktif atau bukan sesi 'tambah', abaikan
  if (!sesi || sesi.type !== 'tambah') return;

  // === Step 1: Pilih Jenis Produk ===
  if (sesi.stage === 'pilih_jenis') {
    const jenisMap = { '1': 'topup', '2': 'pulsa', '3': 'kouta' }; // 🔧 'kouta'
    const pilihan = lower;
    const jenis = jenisMap[pilihan];

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

    sesi.jenis = jenis; // 'topup' / 'pulsa' / 'kouta'
    sesi.stage = 'pilih_kategori';
    sessionMap.set(from, sesi);

    const contohKategori = sesi.jenis === 'topup'
      ? 'mobilelegends / pubg / ml'
      : sesi.jenis === 'pulsa'
        ? 'Three / Indosat'
        : 'Three / Indosat'; // contoh untuk kouta, sama provider
    return sock.sendMessage(chat, {
      text: `🗂️ Ketik kategori/provider untuk produk *${jenis.toUpperCase()}*.\nContoh: ${contohKategori}` 
    }, { quoted: msg });
  }

  // === Step 2: Pilih Kategori ===
  if (sesi.stage === 'pilih_kategori') {
    const kategoriInput = textAsli.trim();
    sesi.kategori = kategoriInput; // simpan alias
    sesi.stage = 'isi_data';
    sessionMap.set(from, sesi);

    const contoh = sesi.jenis === 'topup'
      ? 'nama_produk, harga\nContoh:\n- 10 UC, 15000'
      : 'provider, nama_produk, harga\nContoh:\n- Three, 5000, 5500';

    return sock.sendMessage(chat, {
      text: `📝 Kirim data produk dengan format:\n${contoh}`
    }, { quoted: msg });
  }

  // === Step 3: Input Data Produk ===
  if (sesi.stage === 'isi_data') {
    const bagian = textAsli.split(',').map(p => p.trim());
    let dataNama = '';
    let dataHarga = 0;

    if (sesi.jenis === 'topup') {
      if (bagian.length !== 2 || isNaN(parseInt(bagian[1].replace(/\D/g,'')))) {
        return sock.sendMessage(chat, {
          text: `❌ Format salah!\nContoh: 10 UC, 15000`
        }, { quoted: msg });
      }
      dataNama = bagian[0];
      dataHarga = parseInt(bagian[1].replace(/\D/g,''));
      try {
        const gameAliasInput = sesi.kategori;
        const gameName = addProductToTopup(gameAliasInput, dataNama, dataHarga);
        sessionMap.delete(from);
        return sock.sendMessage(chat, {
          text: `✅ Produk berhasil ditambahkan ke *${gameName}*\n📦 ${dataNama} - Rp${dataHarga.toLocaleString('id-ID')}`
        }, { quoted: msg });
      } catch (e) {
        sessionMap.delete(from);
        return sock.sendMessage(chat, {
          text: `❌ Gagal menyimpan produk topup: ${e.message}`
        }, { quoted: msg });
      }
    }

    // pulsa atau kouta
    if (sesi.jenis === 'pulsa') {
      // provider, nama, harga
      if (bagian.length !== 3 || isNaN(parseInt(bagian[2].replace(/\D/g,'')))) {
        return sock.sendMessage(chat, {
          text: `❌ Format salah!\nContoh: Three, 5000, 5500`
        }, { quoted: msg });
      }
      const provider = bagian[0];
      const namaProdukPulsa = bagian[1];
      const hargaPulsa = parseInt(bagian[2].replace(/\D/g,''));
      try {
        let jsonPulsa = [];
        if (fs.existsSync(PULSA_FILE_PATH)) {
          jsonPulsa = JSON.parse(fs.readFileSync(PULSA_FILE_PATH, 'utf-8'));
        }
        let objProv = jsonPulsa.find(o => o.provider.toLowerCase() === provider.toLowerCase());
        if (!objProv) {
          objProv = { provider, items: [] };
          jsonPulsa.push(objProv);
        }
        objProv.items.push({ nominal: namaProdukPulsa, harga: hargaPulsa });
        fs.writeFileSync(PULSA_FILE_PATH, JSON.stringify(jsonPulsa, null, 2));
        sessionMap.delete(from);
        return sock.sendMessage(chat, {
          text: `✅ Produk pulsa berhasil ditambahkan ke *${provider}*\n📦 ${namaProdukPulsa} - Rp${hargaPulsa.toLocaleString('id-ID')}`
        }, { quoted: msg });
      } catch (e) {
        sessionMap.delete(from);
        return sock.sendMessage(chat, {
          text: `❌ Gagal menyimpan data pulsa: ${e.message}`
        }, { quoted: msg });
      }
    }

    if (sesi.jenis === 'kouta') { // 🔧 ganti 'kuota' jadi 'kouta'
      if (bagian.length !== 3 || isNaN(parseInt(bagian[2].replace(/\D/g,'')))) {
        return sock.sendMessage(chat, {
          text: `❌ Format salah!\nContoh: Three, 5GB, 7000`
        }, { quoted: msg });
      }
      const provider = bagian[0];
      const namaProdukKouta = bagian[1];
      const hargaKouta = parseInt(bagian[2].replace(/\D/g,''));
      try {
        let jsonKouta = [];
        if (fs.existsSync(KOUTA_FILE_PATH)) {
          jsonKouta = JSON.parse(fs.readFileSync(KOUTA_FILE_PATH, 'utf-8'));
        }
        let objProv = jsonKouta.find(o => o.provider.toLowerCase() === provider.toLowerCase());
        if (!objProv) {
          objProv = { provider, items: [] };
          jsonKouta.push(objProv);
        }
        objProv.items.push({ nominal: namaProdukKouta, harga: hargaKouta });
        fs.writeFileSync(KOUTA_FILE_PATH, JSON.stringify(jsonKouta, null, 2));
        sessionMap.delete(from);
        return sock.sendMessage(chat, {
          text: `✅ Produk kouta berhasil ditambahkan ke *${provider}*\n📦 ${namaProdukKouta} - Rp${hargaKouta.toLocaleString('id-ID')}`
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
