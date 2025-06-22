const fs = require('fs');
const path = require('path');
const { produkPulsaMap, selectedPulsaMap, lastPulsaMap } = require('../core/state');
const sessionMap = require('../core/sessionStore'); // ✅ Tambahan penting!

async function handlePulsa(sock, msg, lowerText, userId, from) {
  // ✅ 2. Kalau masih dalam sesi, proses input angka
  if (sessionMap.has(userId) && sessionMap.get(userId).type === 'pulsa') {
    if (lowerText === 'beli pulsa' || lowerText === '.pulsa') {
      await sock.sendMessage(from, {
        text: '⚠️ Kamu sedang dalam sesi pembelian pulsa.\nKetik */keluar* untuk keluar dari sesi ini.'
      }, { quoted: msg });
      return true;
    }

    const pilih = parseInt(lowerText);
    if (!isNaN(pilih)) {
      const list = produkPulsaMap.get(userId) || [];
      const item = list.find(i => i.nomor === pilih);
      if (item) {
        selectedPulsaMap.set(userId, parseInt(item.harga));
        lastPulsaMap.set(userId, `${item.provider} ${item.nominal}`);
        produkPulsaMap.delete(userId);
        sessionMap.delete(userId); // ✅ Hapus sesi setelah selesai

        const info = `✅ Kamu memilih *${item.provider} - ${item.nominal}*\n` +
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

  // ✅ 3. Memulai sesi baru
  if (lowerText === 'beli pulsa' || lowerText === '.pulsa') {
    let dataArr = [];
    try {
      const raw = fs.readFileSync(path.join(__dirname, '../data/pulsa.json'), 'utf-8');
      dataArr = JSON.parse(raw);
    } catch {}

    if (!Array.isArray(dataArr) || dataArr.length === 0) {
      await sock.sendMessage(from, {
        text: '❌ Tidak ada produk pulsa tersedia.'
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
    let output = '📱 *Daftar Pulsa Tersedia:*\n\n';
    let count = 1;

    for (const prov in grouped) {
      output += `📡 *${prov}*\n`;
      grouped[prov].forEach(item => {
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
    sessionMap.set(userId, { type: 'pulsa' }); // ✅ Simpan sesi baru

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
