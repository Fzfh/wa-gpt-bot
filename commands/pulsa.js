const fs = require('fs');
const path = require('path');
const { produkMap, selectedNominalMap, lastCommandMap } = require('../core/state');

async function handlePulsa(sock, msg, lowerText, userId, from) {
  // 1. Exit session
  if (lowerText === '/keluar') {
    if (produkMap.has(userId)) {
      produkMap.delete(userId);
      selectedNominalMap.delete(userId);
      lastCommandMap.delete(userId);
      await sock.sendMessage(from, { text: '❌ Kamu telah keluar dari sesi pembelian pulsa.' }, { quoted: msg });
    }
    return true;
  }

  // 2. Kalau masih di sesi, cegah buka lagi list
  if (produkMap.has(userId)) {
    if (lowerText === '.pulsa' || lowerText === 'beli pulsa') {
      await sock.sendMessage(from, { text: '⚠️ Kamu sedang dalam sesi pembelian pulsa.\nKetik */keluar* untuk keluar dari sesi ini.' }, { quoted: msg });
      return true;
    }
    // Proses angka pemilihan
    const pilihIndex = parseInt(lowerText);
    if (!isNaN(pilihIndex)) {
      const list = produkMap.get(userId);
      const item = list.find(i => i.nomor === pilihIndex);
      if (item) {
        const harga = parseInt(item.harga) || 0;
        selectedNominalMap.set(userId, harga);
        lastCommandMap.set(userId, `${item.provider} ${item.nominal}`);
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

  // 3. Trigger list pulsa
  if (lowerText === '.pulsa' || lowerText === 'beli pulsa') {
    // Baca file JSON
    let pulsaData;
    try {
      const raw = fs.readFileSync(path.join(__dirname, '../data/pulsa.json'), 'utf-8');
      pulsaData = JSON.parse(raw);
    } catch {
      pulsaData = {};
    }
    const flatList = [];
    let output = '📱 *Daftar Pulsa Tersedia:*\n\n';
    let count = 1;
    for (const provider in pulsaData) {
      output += `📡 *${provider.toUpperCase()}*\n`;
      pulsaData[provider].forEach(item => {
        output += `${count}. ${item.nominal} - Rp${item.harga.toLocaleString('id-ID')}\n`;
        flatList.push({ provider, nominal: item.nominal, harga: item.harga, nomor: count });
        count++;
      });
      output += '\n';
    }
    if (flatList.length === 0) {
      await sock.sendMessage(from, { text: '❌ Tidak ada produk pulsa tersedia.' }, { quoted: msg });
      return true;
    }
    output += `Ketik angka (contoh: 3) untuk memilih pulsa.\nAtau ketik */keluar* untuk membatalkan.`;
    produkMap.set(userId, flatList);
    await sock.sendMessage(from, { text: output }, { quoted: msg });
    return true;
  }

  return false;
}

module.exports = {
  handlePulsa,
  selectedNominalMap,
  lastCommandMap
};
