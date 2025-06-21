const fs = require('fs');
const path = require('path');
const sessionMap = new Map();

const DATA_PATHS = {
  topup: path.join(__dirname, '../data/topupdata.json'),
  pulsa: path.join(__dirname, '../data/pulsa.json'),
  kuota: path.join(__dirname, '../data/kuota.json'),
};

function saveToJson(filePath, kategori, dataBaru) {
  const json = fs.existsSync(filePath)
    ? JSON.parse(fs.readFileSync(filePath))
    : {};

  if (!json[kategori]) json[kategori] = [];
  const nextId = json[kategori].length + 1;
  dataBaru.id = nextId;
  json[kategori].push(dataBaru);

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
}

module.exports = async function tambahProduk(sock, msg, from, body) {
  const chat = msg.key.remoteJid;
  const lower = body.toLowerCase().trim();

  // Jika belum ada sesi
  if (!sessionMap.has(from) && lower === '/tambah') {
    sessionMap.set(from, { stage: 'pilih_jenis' });
    return sock.sendMessage(chat, {
      text: `📦 *Tambah Produk*\n1. Topup Game\n2. Pulsa\n3. Kuota\n\n✏️ Ketik angka *1*, *2*, atau *3* untuk memilih.`,
    }, { quoted: msg });
  }

  // Ambil sesi user
  const sesi = sessionMap.get(from);
  if (!sesi) return;

  // === Step 1: Pilih Jenis Produk ===
  if (sesi.stage === 'pilih_jenis') {
    const jenisMap = { '1': 'topup', '2': 'pulsa', '3': 'kuota' };
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

    return sock.sendMessage(chat, {
      text: `🗂️ Ketik kategori atau provider untuk produk *${jenis.toUpperCase()}*.\nContoh: mobilelegends / three / indosat`
    }, { quoted: msg });
  }

  // === Step 2: Pilih Kategori ===
  if (sesi.stage === 'pilih_kategori') {
    sesi.kategori = lower;
    sesi.stage = 'isi_data';
    sessionMap.set(from, sesi);

    const contoh = sesi.jenis === 'topup'
      ? 'nama_produk, harga\nContoh:\n- 199dm, 50000'
      : 'provider, nama_produk, harga\nContoh:\n- Three, 5GB 1hr, 7000';

    return sock.sendMessage(chat, {
      text: `📝 Kirim data produk dengan format:\n${contoh}`
    }, { quoted: msg });
  }

  // === Step 3: Input Data Produk ===
  if (sesi.stage === 'isi_data') {
    const bagian = body.split(',').map(p => p.trim());

    let data = {};
    if (sesi.jenis === 'topup') {
      if (bagian.length !== 2) {
        return sock.sendMessage(chat, {
          text: `❌ Format salah!\nContoh: 199dm, 50000`
        }, { quoted: msg });
      }
      data = { nama: bagian[0], harga: parseInt(bagian[1]) };
    } else {
      if (bagian.length !== 3) {
        return sock.sendMessage(chat, {
          text: `❌ Format salah!\nContoh: Three, 5GB 1hr, 7000`
        }, { quoted: msg });
      }
      sesi.kategori = bagian[0].toLowerCase();
      data = { nama: bagian[1], harga: parseInt(bagian[2]) };
    }

    try {
      saveToJson(DATA_PATHS[sesi.jenis], sesi.kategori, data);
      sessionMap.delete(from);
      return sock.sendMessage(chat, {
        text: `✅ Produk berhasil ditambahkan ke *${sesi.kategori}*\n📦 ${data.nama} - Rp${data.harga.toLocaleString()}`
      }, { quoted: msg });
    } catch (e) {
      sessionMap.delete(from);
      return sock.sendMessage(chat, {
        text: `❌ Gagal menyimpan data: ${e.message}`
      }, { quoted: msg });
    }
  }
};
