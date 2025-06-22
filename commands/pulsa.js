const fs = require('fs');
const path = require('path');
const { produkPulsaMap, selectedPulsaMap, lastPulsaMap } = require('../core/state');

async function handlePulsa(sock, msg, lowerText, userId, from) {
  // 1. Exit session
  if (lowerText === '/keluar') {
    if (produkPulsaMap.has(userId)) {
      produPulsaMap.delete(userId);
      selectedPulsaMap.delete(userId);
      lastPulsaMap.delete(userId);
      await sock.sendMessage(from, {
        text: '❌ Kamu telah keluar dari sesi pembelian pulsa.'
      }, { quoted: msg });
    }
    return true;
  }

  // 2. Jika masih dalam sesi, cegah buka ulang list dan proses angka
  if (produkPulsaMap.has(userId)) {
    if (lowerText === '.pulsa' || lowerText === 'beli pulsa') {
      await sock.sendMessage(from, {
        text: '⚠️ Kamu sedang dalam sesi pembelian pulsa.\nKetik */keluar* untuk keluar dari sesi ini.'
      }, { quoted: msg });
      return true;
    }
    // Proses pilihan angka
    const pilihIndex = parseInt(lowerText);
    if (!isNaN(pilihIndex)) {
      const list = produkPulsaMap.get(userId);
      const item = list.find(i => i.nomor === pilihIndex);
      if (item) {
        const harga = parseInt(item.harga) || 0;
        selectedPulsaMap.set(userId, harga);
        lastPulsaMap.set(userId, `${item.provider} ${item.nominal}`);
        produkPulsaMap.delete(userId);

        const info = `✅ Kamu memilih *${item.provider} - ${item.nominal}*\n` +
          `💰 Harga: Rp${harga.toLocaleString('id-ID')}\n\n` +
          `💳 Silakan transfer ke metode berikut:\n` +
          `• Dana: 08xxxxxxxxxx\n` +
          `• Gopay: 08xxxxxxxxxx\n` +
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

  // 3. Trigger list pulsa
  if (lowerText === '.pulsa' || lowerText === 'beli pulsa') {
    // Baca JSON array
    let dataArr;
    try {
      const raw = fs.readFileSync(path.join(__dirname, '../data/pulsa.json'), 'utf-8');
      dataArr = JSON.parse(raw);
    } catch {
      dataArr = [];
    }
    if (!Array.isArray(dataArr) || dataArr.length === 0) {
      await sock.sendMessage(from, {
        text: '❌ Tidak ada produk pulsa tersedia.'
      }, { quoted: msg });
      return true;
    }
    // Group by provider
    const grouped = {};
    dataArr.forEach(item => {
      const prov = (item.provider || 'Lainnya').toUpperCase();
      if (!grouped[prov]) grouped[prov] = [];
      grouped[prov].push(item);
    });
    // Build flatList
    const flatList = [];
    let output = '📱 *Daftar Pulsa Tersedia:*\n\n';
    let count = 1;
    for (const prov in grouped) {
      output += `📡 *${prov}*\n`;
      grouped[prov].forEach(item => {
        // gunakan properti `produk` jika nama field di JSON "produk"
        const nama = item.produk || item.nominal || '';
        const hargaNum = parseInt(item.harga) || 0;
        output += `${count}. ${nama} - Rp${hargaNum.toLocaleString('id-ID')}\n`;
        flatList.push({
          provider: item.provider,
          nominal: nama,
          harga: hargaNum,
          nomor: count
        });
        count++;
      });
      output += '\n';
    }
    output += `Ketik angka (contoh: 3) untuk memilih pulsa.\nAtau ketik */keluar* untuk membatalkan.`;
    produkPulsaMap.set(userId, flatList);
    await sock.sendMessage(from, { text: output }, { quoted: msg });
    return true;
  }

  return false;
}

module.exports = {
  handlePulsa,
  selectedPulsaMap,
  lastPulsaMap
};
