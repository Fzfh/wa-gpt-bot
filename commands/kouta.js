const fs = require('fs');
const path = require('path');
const { produkMap, selectedKoutaNominalMap, lastKoutaCommandMap } = require('../core/state');

async function handleKouta(sock, msg, lowerText, userId, from) {
  // 1. Exit session
  if (lowerText === '/keluar') {
    if (produkMap.has(userId)) {
      produkMap.delete(userId);
      selectedKoutaNominalMap.delete(userId);
      lastKoutaCommandMap.delete(userId);
      await sock.sendMessage(from, { text: '❌ Kamu telah keluar dari sesi pembelian kuota.' }, { quoted: msg });
    }
    return true;
  }

  // 2. Kalau masih di sesi, cegah buka list lagi & proses angka
  if (produkMap.has(userId)) {
    if (lowerText === '.kouta' || lowerText === 'beli kouta') {
      await sock.sendMessage(from, { text: '⚠️ Kamu sedang dalam sesi pembelian kuota.\nKetik */keluar* untuk keluar dari sesi ini.' }, { quoted: msg });
      return true;
    }
    const pilihIndex = parseInt(lowerText);
    if (!isNaN(pilihIndex)) {
      const list = produkMap.get(userId);
      const item = list.find(i => i.nomor === pilihIndex);
      if (item) {
        const harga = parseInt(item.harga) || 0;
        selectedKoutaNominalMap.set(userId, harga);
        lastKoutaCommandMap.set(userId, `${item.provider} ${item.nominal}`);
        produkMap.delete(userId);
        const info = `✅ Kamu memilih *${item.provider} - ${item.nominal}*\n💰 Harga: Rp${harga.toLocaleString('id-ID')}\n\n💳 Silakan transfer ke metode berikut:\n• Dana: 08xxxxxxxxxx\n• Gopay: 08xxxxxxxxxx\n• BCA: 1234567890 a.n. AURA SHOP\n\n📸 Kirim:\n- Nomor HP tujuan\n- Bukti transfer\n\n======= *CONTOH* =======\nNomor: 08123456789\nBukti TF: (foto transfer)`;
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

  // 3. Trigger list kuota
  if (lowerText === '.kouta' || lowerText === 'beli kouta') {
    let koutaData;
    try {
      const raw = fs.readFileSync(path.join(__dirname, '../data/kouta.json'), 'utf-8');
      koutaData = JSON.parse(raw);
    } catch {
      koutaData = {};
    }
    const flatList = [];
    let output = '📶 *Daftar Kuota Tersedia:*\n\n';
    let count = 1;
    for (const provider in koutaData) {
      output += `📡 *${provider.toUpperCase()}*\n`;
      koutaData[provider].forEach(item => {
        output += `${count}. ${item.nominal} - Rp${item.harga.toLocaleString('id-ID')}\n`;
        flatList.push({ provider, nominal: item.nominal, harga: item.harga, nomor: count });
        count++;
      });
      output += '\n';
    }
    if (flatList.length === 0) {
      await sock.sendMessage(from, { text: '❌ Tidak ada produk kuota tersedia.' }, { quoted: msg });
      return true;
    }
    output += `Ketik angka (contoh: 3) untuk memilih kuota.\nAtau ketik */keluar* untuk membatalkan.`;
    produkMap.set(userId, flatList);
    await sock.sendMessage(from, { text: output }, { quoted: msg });
    return true;
  }

  return false;
}

module.exports = {
  handleKouta,
  selectedKoutaNominalMap,
  lastKoutaCommandMap
};
