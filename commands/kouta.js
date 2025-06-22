const fs = require('fs');
const path = require('path');
const { produkKoutaMap, selectedKoutaMap, lastKoutaMap } = require('../core/state');

async function handleKouta(sock, msg, lowerText, userId, from) {
  // 1. Exit session
  if (lowerText === '/keluar') {
    if (produkKoutaMap.has(userId)) {
      produkKoutaMap.delete(userId);
      selectedKoutaMap.delete(userId);
      lastKoutaMap.delete(userId);
      await sock.sendMessage(from, {
        text: '❌ Kamu telah keluar dari sesi pembelian kuota.'
      }, { quoted: msg });
    }
    return true;
  }

  // 2. Jika masih dalam sesi
  if (produkKoutaMap.has(userId)) {
    if (lowerText === '.kouta' || lowerText === 'beli kouta') {
      await sock.sendMessage(from, {
        text: '⚠️ Kamu sedang dalam sesi pembelian kuota.\nKetik */keluar* untuk keluar dari sesi ini.'
      }, { quoted: msg });
      return true;
    }

    const pilihIndex = parseInt(lowerText);
    if (!isNaN(pilihIndex)) {
      const list = produkKoutaMap.get(userId);
      const item = list.find(i => i.nomor === pilihIndex);
      if (item) {
        const harga = parseInt(item.harga) || 0;
        selectedKoutaMap.set(userId, harga);
        lastKoutaMap.set(userId, `${item.provider} ${item.produk}`);
        produkKoutaMap.delete(userId);

        const info = `✅ Kamu memilih *${item.provider} - ${item.produk}*\n` +
          `💰 Harga: Rp${harga.toLocaleString('id-ID')}\n\n` +
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
          caption: `💳 Total: Rp${harga.toLocaleString('id-ID')}`
        }, { quoted: msg });
        return true;
      }
    }

    return false;
  }

  // 3. Trigger menu kuota
  if (lowerText === '.kouta' || lowerText === 'beli kouta') {
    let dataArr;
    try {
      const raw = fs.readFileSync(path.join(__dirname, '../data/kouta.json'), 'utf-8');
      dataArr = JSON.parse(raw);
    } catch {
      dataArr = [];
    }

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
