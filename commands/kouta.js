const fs = require('fs');
const path = require('path');
const { produkKoutaMap, selectedKoutaMap, lastKoutaMap } = require('../core/state');
const { clearKoutaSession } = require('../core/clearhelper')
const sessionMap = require('../core/sessionStore'); // ✅ Tambahan!

async function handleKouta(sock, msg, lowerText, userId, from) {
    // ✅ 1. Tangani perintah /keluar
  if (lowerText === '/keluar') {
    const sesi = sessionMap.get(userId);
    if (sesi?.type === 'kouta') {
      sessionMap.delete(userId);
     clearKoutaSession(userId);

      await sock.sendMessage(from, {
        text: '✅ Sesi pulsa kamu sudah diakhiri.'
      }, { quoted: msg });
      return true;
    }
  }

  // ✅ 2. Kalau masih dalam sesi kouta
  if (sessionMap.has(userId) && sessionMap.get(userId).type === 'kouta') {
    if (lowerText === 'beli kouta' || lowerText === '.kouta') {
      await sock.sendMessage(from, {
        text: '⚠️ Kamu sedang dalam sesi pembelian kuota.\nKetik */keluar* untuk keluar dari sesi ini.'
      }, { quoted: msg });
      return true;
    }

    const pilih = parseInt(lowerText);
    if (!isNaN(pilih)) {
      const list = produkKoutaMap.get(userId);
      const item = list.find(i => i.nomor === pilih);
      if (item) {
        selectedKoutaMap.set(userId, parseInt(item.harga));
        lastKoutaMap.set(userId, `${item.provider} ${item.produk}`);
        produkKoutaMap.delete(userId);
        sessionMap.delete(userId); // ✅ Sesi selesai

        const info = `✅ Kamu memilih *${item.provider} - ${item.produk}*\n` +
          `💰 Harga: Rp${item.harga.toLocaleString('id-ID')}\n\n` +
          `💳 Silakan transfer ke metode berikut:\n` +
          `• Dana: *0895326679840*\n` +
          `• Gopay: *0895326679840*\n` +
          `• BCA: 1234567890 a.n. AURA SHOP\n\n` +
          `📸 Kirim:\n- Nomor HP tujuan\n- Bukti transfer\n\n` +
          `======= *CONTOH* =======\n` +
          `Nomor: 08123456789\nBukti TF: (foto transfer)`;

        await sock.sendMessage(from, { text: info }, { quoted: msg });
        await sock.sendMessage(from, {
          image: { url: './media/q.jpg' },
          caption: `💳 Total: Rp${item.harga.toLocaleString('id-ID')}`
        }, { quoted: msg });
        return true;
      }
    }

    return false;
  }

  // ✅ 3. Memulai sesi kouta baru
  if (lowerText === 'beli kouta' || lowerText === '.kouta') {
    let dataArr = [];
    try {
      const raw = fs.readFileSync(path.join(__dirname, '../data/kouta.json'), 'utf-8');
      dataArr = JSON.parse(raw);
    } catch {}

    if (!Array.isArray(dataArr) || dataArr.length === 0) {
      await sock.sendMessage(from, {
        text: '❌ Tidak ada produk kuota tersedia.'
      }, { quoted: msg });
      return true;
    }

    const grouped = {};
    dataArr.forEach(item => {
      const prov = (item.provider || 'Lainnya').toUpperCase();
      if (!grouped[prov]) grouped[prov] = [];
      grouped[prov].push(item);
    });

    const flatList = [];
    let output = '📶 *Daftar Kuota Tersedia:*\n\n';
    let count = 1;
    for (const prov in grouped) {
      output += `📡 *${prov}*\n`;
      grouped[prov].forEach(item => {
        const nama = item.produk || item.nominal || '';
        const hargaNum = parseInt(item.harga) || 0;
        output += `${count}. ${nama} - Rp${hargaNum.toLocaleString('id-ID')}\n`;
        flatList.push({
          provider: item.provider,
          produk: nama,
          harga: hargaNum,
          nomor: count
        });
        count++;
      });
      output += '\n';
    }

    output += `Ketik angka (contoh: 3) untuk memilih kuota.\nAtau ketik */keluar* untuk membatalkan.`;
    produkKoutaMap.set(userId, flatList);
    sessionMap.set(userId, { type: 'kouta' }); // ✅ Simpan sesi kouta
    await sock.sendMessage(from, { text: output }, { quoted: msg });
    return true;
  }

  return false;
}

module.exports = {
  handleKouta,
  selectedKoutaMap,
  lastKoutaMap
};
