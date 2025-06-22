const { getProdukDariTabel } = require('./produk')
const { produkMap, selectedNominalMap, lastCommandMap } = require('../core/state')


async function handlePulsa(sock, msg, lowerText, userId, from) {
  // Keluar dari sesi
  if (lowerText === '/keluar') {
    if (produkMap.has(userId)) {
      produkMap.delete(userId)
      selectedNominalMap.delete(userId)
      lastCommandMap.delete(userId)
      await sock.sendMessage(from, { text: '❌ Kamu telah keluar dari sesi pembelian pulsa.' }, { quoted: msg })
      return true
    }
    return false
  }

  // Jika user masih dalam sesi
  if (produkMap.has(userId)) {
    if (lowerText === '.pulsa' || lowerText === 'beli pulsa') {
      await sock.sendMessage(from, { text: '⚠️ Kamu sedang dalam sesi pembelian pulsa.\nKetik */keluar* untuk keluar dari sesi ini.' }, { quoted: msg })
      return true
    }

    const list = produkMap.get(userId)
    const pilihIndex = parseInt(lowerText)
    const item = list.find(i => i.nomor === pilihIndex)

    if (!item) return false

    selectedNominalMap.set(userId, parseInt(item.harga) || 0)
    lastCommandMap.set(userId, `${item.provider} ${item.produk}`)
    produkMap.delete(userId)

    const harga = parseInt(item.harga) || 0

    const info = `✅ Kamu memilih *${item.provider} - ${item.produk}*
💰 Harga: Rp${harga.toLocaleString('id-ID')}

Silakan transfer ke metode berikut:
• Dana: 08xxxxxxxxxx
• Gopay: 08xxxxxxxxxx
• BCA: 1234567890 a.n. AURA SHOP

📷 QRIS Allpay tersedia di bawah ini!

Setelah transfer, kirim:
- Nomor HP tujuan
- Bukti transfer

======= CONTOH =======
Nomor: 08123456789
Bukti TF: (foto)`

    await sock.sendMessage(from, { text: info }, { quoted: msg })

    await sock.sendMessage(from, {
      image: { url: './media/q.jpg' },
      caption: `💳 Total: Rp${harga.toLocaleString('id-ID')}`,
    }, { quoted: msg })

    return true
  }

  if (lowerText === '.pulsa' || lowerText === 'beli pulsa') {
    const list = await getProdukDariTabel('pulsa')
    if (!Array.isArray(list) || list.length === 0) {
      await sock.sendMessage(from, { text: '❌ Tidak ada produk pulsa tersedia.' }, { quoted: msg })
      return true
    }

    const grouped = {}
    list.forEach(item => {
      const provider = (item.provider || 'Lainnya').toUpperCase()
      if (!grouped[provider]) grouped[provider] = []
      grouped[provider].push(item)
    })

    let output = `🔋 *Daftar Pulsa Tersedia:*\n\n`
    let flatList = []
    let counter = 1

    for (const provider in grouped) {
      output += `📡 *${provider}*\n`
      grouped[provider].forEach(item => {
        const produk = item.produk
        const harga = parseInt(item.harga) || 0
        output += `${counter}: ${produk} - Rp${harga.toLocaleString('id-ID')}\n`
        flatList.push({ ...item, nomor: counter })
        counter++
      })
      output += '\n'
    }

    output += `Ketik angka (contoh: 2) untuk memilih nominal pulsa.\nAtau ketik */keluar* untuk membatalkan.`

    produkMap.set(userId, flatList)
    await sock.sendMessage(from, { text: output }, { quoted: msg })
    return true
  }

  return false
}

module.exports = {
  handlePulsa,
  selectedNominalMap,
  lastCommandMap
}
