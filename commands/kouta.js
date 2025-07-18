const fs = require('fs')
const path = require('path')

const {
  produkKoutaMap,
  selectedKoutaMap,
  lastKoutaMap
} = require('../core/state')
const { clearPulsaSession } = require('../core/clearhelper')

// Load data kouta dari file JSON
function getKoutaList() {
  const filePath = path.join(__dirname, '../data/kouta.json')
  try {
    const rawData = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(rawData)
  } catch (err) {
    console.error('❌ Gagal load kouta.json:', err)
    return []
  }
}

async function handlekouta(sock, msg, lowerText, userId, from) {
  const text = (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    ''
  ).toLowerCase().trim()

  // ❌ Keluar dari sesi
  if (text === '/keluar' && produkKoutaMap.has(userId)) {
    produkKoutaMap.delete(userId)
    selectedKoutaMap.delete(userId)
    lastKoutaMap.delete(userId)
    await sock.sendMessage(from, {
      text: '❌ Kamu telah keluar dari sesi pembelian kouta.'
    }, { quoted: msg })
    return true
  }

  // ✅ Tangani input angka jika masih dalam sesi
  if (produkKoutaMap.has(userId)) {
    const list = produkKoutaMap.get(userId)
    if (Array.isArray(list) && /^\d+$/.test(text)) {
      const pilihIndex = parseInt(text)
      const item = list.find(i => i.nomor === pilihIndex)

      if (!item) return false

      const harga = parseInt(item.harga) || 0
      selectedKoutaMap.set(userId, harga)
      lastKoutaMap.set(userId, `${item.provider} ${item.produk}`)
      produkKoutaMap.delete(userId)

      const info = `✅ Kamu memilih *${item.provider} - ${item.produk}*
💰 Harga: Rp${harga.toLocaleString('id-ID')}

Silakan transfer ke metode berikut:
💸 Dana: \`0895326679840\`
💳 Gopay: \`0895326679840\`
📱 OVO: \`0895326679840\`
🛍 ShopeePay: \`0895326679840\`
🏦 BCA: *BELUM TERSEDIA*

📷 QRIS Allpay tersedia di bawah ini!

Setelah transfer, kirim:
- Nomor HP tujuan
- Bukti transfer

======= *CONTOH* =======
Nomor: 08123456789
Bukti TF: (foto)`

      await sock.sendMessage(from, { text: info }, { quoted: msg })
      await sock.sendMessage(from, {
        image: { url: './media/q.jpg' },
        caption: `💳 Total: Rp${harga.toLocaleString('id-ID')}`,
      }, { quoted: msg })

      return true
    }

    // ⛔ User dalam sesi tapi bukan angka
    await sock.sendMessage(from, {
      text: '⚠️ Kamu masih dalam sesi pembelian kuota. Ketik angka untuk memilih atau */keluar* untuk keluar.',
      quoted: msg
    })
    return true
  }

  // 🟢 Mulai sesi baru
  if (text === '.kouta' || text === 'beli kouta') {
    clearPulsaSession(userId)

    const list = getKoutaList()
    if (!Array.isArray(list) || list.length === 0) {
      await sock.sendMessage(from, {
        text: '❌ Tidak ada produk kuota tersedia.'
      }, { quoted: msg })
      return true
    }

    const grouped = {}
    list.forEach(item => {
      const provider = (item.provider || 'Lainnya').toUpperCase()
      if (!grouped[provider]) grouped[provider] = []
      grouped[provider].push(item)
    })

    let output = `📶 *Daftar Kuota Tersedia:*\n*Mohon Ketik \`/keluar\` Ketika Sudah*\n*Selesai Transaksi Atau Tidak jadi Beli*\n\n`
    let flatList = []
    let counter = 1

    for (const provider in grouped) {
      output += `📡 *${provider}*\n`
      grouped[provider].forEach(item => {
        const produk = item.produk || ''
        const harga = parseInt(item.harga) || 0
        output += `${counter}. ${produk} - Rp${harga.toLocaleString('id-ID')}\n`
        flatList.push({ ...item, nomor: counter })
        counter++
      })
      output += '\n'
    }

    output += `Ketik angka (contoh: 3) untuk memilih kuota.`
    output += `\nKetik */keluar* untuk membatalkan sesi ini.`

    produkKoutaMap.set(userId, flatList)
    await sock.sendMessage(from, { text: output }, { quoted: msg })
    return true
  }

  return false
}

module.exports = {
  handlekouta,
  selectedKoutaMap,
  lastKoutaMap
}
