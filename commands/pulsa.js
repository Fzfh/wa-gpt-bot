const { getProdukDariTabel } = require('./produk')
const {
  produkPulsaMap,
  selectedPulsaMap,
  lastPulsaMap
} = require('../core/state')
const { clearKoutaSession } = require('../core/clearhelper')

async function handlePulsa(sock, msg, lowerText, userId, from) {
  const text = (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    ''
  ).toLowerCase().trim()

  // Step 1: Handle keluar
  if (text === '/keluar') {
    produkPulsaMap.delete(userId)
    selectedPulsaMap.delete(userId)
    lastPulsaMap.delete(userId)
    await sock.sendMessage(from, { text: '❌ Kamu telah keluar dari sesi pembelian pulsa.' }, { quoted: msg })
    return true
  }

  // Step 2: Jika user masih dalam sesi
  if (produkPulsaMap.has(userId)) {
    await sock.sendMessage(from, { text: '⚠️ Kamu masih dalam sesi pembelian pulsa. Ketik */keluar* untuk keluar.' }, { quoted: msg })
    return true
  }

  // Step 3: Jika command awal .pulsa / beli pulsa
  if (text === '.pulsa' || text === 'beli pulsa') {
    clearKoutaSession(userId)
    console.log('🔥 PULSA command diterima:', text)

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
        const produk = item.produk || ''
        const harga = parseInt(item.harga) || 0
        output += `${counter}. ${produk} - Rp${harga.toLocaleString('id-ID')}\n`
        flatList.push({ ...item, nomor: counter })
        counter++
      })
      output += '\n'
    }

    output += `Ketik angka (contoh: 2) untuk memilih nominal pulsa.\nKetik */keluar* untuk membatalkan sesi ini.`

    produkPulsaMap.set(userId, flatList)
    await sock.sendMessage(from, { text: output }, { quoted: msg })
    return true
  }

  // Step 4: Tangani input angka setelah daftar dikirim
  const list = produkPulsaMap.get(userId)
  if (!Array.isArray(list) || list.length === 0) return false

  if (!/^\d+$/.test(text)) return false
  const pilihIndex = parseInt(text)
  const item = list.find(i => i.nomor === pilihIndex)

  if (!item) return false

  selectedPulsaMap.set(userId, parseInt(item.harga) || 0)
  lastPulsaMap.set(userId, `${item.provider} ${item.produk}`)
  produkPulsaMap.delete(userId)

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

module.exports = {
  handlePulsa,
  selectedPulsaMap,
  lastPulsaMap
}
