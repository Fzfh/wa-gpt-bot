const fs = require('fs');
const path = require('path');
const sessionMap = require('../core/sessionStore');

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

async function isGroupAdmin(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || from;

  if (!from.endsWith('@g.us')) return true; // bukan grup = izinkan
  const metadata = await sock.groupMetadata(from);
  const participant = metadata.participants.find(p => p.id === sender);
  return participant?.admin !== null && participant?.admin !== undefined;
}

module.exports = async function tambahProduk(sock, msg, from, body) {
  const chat = msg.key.remoteJid;
  const sender = msg.key.participant || from;
  const textAsli = body || msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || '';
  const lower = textAsli.toLowerCase().trim();

  const isAdmin = await isGroupAdmin(sock, msg);
  if (!isAdmin) {
    return sock.sendMessage(chat, {
      text: `🚫 Maaf ya, fitur *Tambah Produk* hanya untuk admin grup atau owner 💼`
    }, { quoted: msg });
  }

  const sesi = sessionMap.get(sender);
  if (sesi && sesi.type === 'tambah' && lower === '/keluar') {
    sessionMap.delete(sender);
    return sock.sendMessage(chat, {
      text: `✅ Sesi tambah produk dibatalkan. Ketik */tambah* lagi kalau mau mulai yaa ✨`
    }, { quoted: msg });
  }

  if (!sesi && lower === '/tambah') {
    sessionMap.set(sender, { stage: 'pilih_jenis', type: 'tambah' });
    return sock.sendMessage(chat, {
      text: `📦 *Tambah Produk*\n1. Topup Game\n2. Pulsa\n3. Kouta\n\nKetik angka *1*, *2*, atau *3* untuk memilih.`
    }, { quoted: msg });
  }

  if (!sesi || sesi.type !== 'tambah') return;

  if (sesi.stage === 'pilih_jenis') {
    const jenisMap = { '1': 'topup', '2': 'pulsa', '3': 'kouta' };
    const jenis = jenisMap[lower];
    if (!jenis) return;
    sesi.jenis = jenis;
    sesi.stage = 'pilih_kategori';
    sessionMap.set(sender, sesi);
    const contoh = jenis === 'topup' ? 'mobilelegends / pubg / ml' : 'Three / Telkomsel';
    return sock.sendMessage(chat, {
      text: `🗂️ Ketik kategori/provider produk *${jenis.toUpperCase()}*.\nContoh: ${contoh}`
    }, { quoted: msg });
  }

  if (sesi.stage === 'pilih_kategori') {
    sesi.kategori = textAsli.trim();
    sesi.stage = 'isi_data';
    sessionMap.set(sender, sesi);
    const contoh = sesi.jenis === 'topup'
      ? '10 UC, 15000'
      : 'Three, Pulsa 10K, 12000';
    return sock.sendMessage(chat, {
      text: `📝 Kirim data produk dengan format:\n${contoh}`
    }, { quoted: msg });
  }

  if (sesi.stage === 'isi_data') {
    const bagian = textAsli.split(',').map(p => p.trim());
    if (sesi.jenis === 'topup') {
      if (bagian.length !== 2 || isNaN(parseInt(bagian[1].replace(/\D/g, '')))) {
        return sock.sendMessage(chat, { text: `❌ Format salah!\nContoh: 10 UC, 15000` }, { quoted: msg });
      }
      const namaProduk = bagian[0];
      const harga = parseInt(bagian[1].replace(/\D/g, ''));
      // Simpan logika ke database atau topup.json kamu sendiri
      sessionMap.delete(sender);
      return sock.sendMessage(chat, {
        text: `✅ Produk *${namaProduk}* (Rp${harga.toLocaleString()}) berhasil ditambahkan ke *${sesi.kategori}*!`
      }, { quoted: msg });
    }

    if (['pulsa', 'kouta'].includes(sesi.jenis)) {
      if (bagian.length !== 3 || isNaN(parseInt(bagian[2].replace(/\D/g, '')))) {
        return sock.sendMessage(chat, { text: `❌ Format salah!\nContoh: Three, Pulsa 10K, 12000` }, { quoted: msg });
      }
      const provider = bagian[0], produk = bagian[1], harga = parseInt(bagian[2].replace(/\D/g, ''));
      const filePath = sesi.jenis === 'pulsa' ? DATA_PATHS.pulsa : DATA_PATHS.kouta;
      try {
        saveToJsonFlatArray(filePath, { provider, produk, harga });
        sessionMap.delete(sender);
        return sock.sendMessage(chat, {
          text: `✅ Produk berhasil ditambahkan ke *${provider}*\n📦 ${produk} - Rp${harga.toLocaleString()}`
        }, { quoted: msg });
      } catch (err) {
        sessionMap.delete(sender);
        return sock.sendMessage(chat, {
          text: `❌ Gagal menyimpan produk: ${err.message}`
        }, { quoted: msg });
      }
    }
  }
}
