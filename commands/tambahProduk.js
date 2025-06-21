// 📁 File: commands/tambahProduk.js
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
  const isSession = sessionMap.has(from);

  // Step 1: Awal - /tambah
  if (!isSession && body.toLowerCase() === '/tambah') {
    sessionMap.set(from, { stage: 'pilih_jenis' });
    return await sock.sendMessage(chat, {
      text: `📦 Tambah Produk
1. Topup Game
2. Pulsa
3. Kuota`
    }, { quoted: msg });
  }

  // Step 2: Pilih Jenis
  if (isSession && sessionMap.get(from).stage === 'pilih_jenis') {
    const pilih = body.trim();
    const jenisMap = { '1': 'topup', '2': 'pulsa', '3': 'kuota' };
    const jenis = jenisMap[pilih];

    if (!jenis) return sock.sendMessage(chat, { text: '❌ Pilih 1, 2, atau 3 ya~' }, { quoted: msg });

    sessionMap.set(from, { stage: 'pilih_kategori', jenis });
    return sock.sendMessage(chat, {
      text: `Ketik kategori atau provider-nya:
Contoh: mobilelegends / three / indosat`
    }, { quoted: msg });
  }

  // Step 3: Pilih Kategori (ml, ff, dll / three / indosat)
  if (isSession && sessionMap.get(from).stage === 'pilih_kategori') {
    const sesi = sessionMap.get(from);
    sesi.kategori = body.trim().toLowerCase();
    sesi.stage = 'isi_data';
    sessionMap.set(from, sesi);

    let contohInput = 'nama_produk, harga';
    if (sesi.jenis !== 'topup') contohInput = 'provider, nama_produk, harga';

    return sock.sendMessage(chat, {
      text: `📝 Kirim data produk dengan format:
${contohInput}

Contoh:
- 199dm, 50000
- Three, 10000, 11000`
    }, { quoted: msg });
  }

  // Step 4: Input Data
  if (isSession && sessionMap.get(from).stage === 'isi_data') {
    const sesi = sessionMap.get(from);
    const bagian = body.split(',').map(p => p.trim());

    let data = {};
    if (sesi.jenis === 'topup') {
      if (bagian.length !== 2) return sock.sendMessage(chat, { text: '❌ Format salah! Contoh: 199dm, 50000' }, { quoted: msg });
      data = { nama: bagian[0], harga: parseInt(bagian[1]) };
    } else {
      if (bagian.length !== 3) return sock.sendMessage(chat, { text: '❌ Format salah! Contoh: Three, 5GB 1hr, 7000' }, { quoted: msg });
      sesi.kategori = bagian[0].toLowerCase();
      data = { nama: bagian[1], harga: parseInt(bagian[2]) };
    }

    try {
      saveToJson(DATA_PATHS[sesi.jenis], sesi.kategori, data);
      sessionMap.delete(from);
      return sock.sendMessage(chat, {
        text: `✅ Produk berhasil ditambahkan ke *${sesi.kategori}*
📦 ${data.nama} - Rp${data.harga.toLocaleString()}`
      }, { quoted: msg });
    } catch (e) {
      sessionMap.delete(from);
      return sock.sendMessage(chat, {
        text: `❌ Gagal menyimpan data: ${e.message}`
      }, { quoted: msg });
    }
  }
};
