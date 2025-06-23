const fs = require('fs')
const path = require('path')

const produkPulsaMap = globalThis.produkPulsaMap
const selectedPulsaMap = globalThis.selectedPulsaMap
const lastPulsaMap = globalThis.lastPulsaMap


// Clear langsung, tanpa import helper
function clearPulsaSession(userId) {
  produkPulsaMap.delete(userId)
  selectedPulsaMap.delete(userId)
  lastPulsaMap.delete(userId)
  console.log('🧹 [CLEAR_LOCAL] clearPulsaSession for:', userId)
}

function getPulsaList() {
  const filePath = path.join(__dirname, '../data/pulsa.json')
  try {
    const rawData = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(rawData)
  } catch (err) {
    console.error('❌ Gagal load pulsa.json:', err)
    return []
  }
}

async function handlePulsa(sock, msg, lowerText, from) {
  const isGroup = msg.key.remoteJid.endsWith('@g.us')
  const userId = isGroup ? msg.key.participant : msg.key.remoteJid
  const text = (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    ''
  ).toLowerCase().trim()

  console.log('[Pulsa] userId:', userId)
  console.log('[Pulsa] Session exists:', produkPulsaMap.has(userId))

  if (text === '/keluar') {
    clearPulsaSession(userId)
    console.log('[CHECK] After /keluar -> produkPulsaMap.has:', produkPulsaMap.has(userId))
    await sock.sendMessage(from, {
      text: '❌ Kamu telah keluar dari sesi pembelian pulsa.'
    }, { quoted: msg })
    return true
  }

  if (produkPulsaMap.has(userId)) {
    const list = produkPulsaMap.get(userId)
    console.log('[DEBUG MAPS]', {
  produkPulsaMap,
  hasProduk: produkPulsaMap?.has(userId),
  type: typeof produkPulsaMap
})

    if (Array.isArray(list) && /^\d+$/.test(text)) {
      const pilihIndex = parseInt(text)
      const item = list.find(i => i.nomor === pilihIndex)
      if (!item) return false

      const harga = parseInt(item.harga) || 0
      selectedPulsaMap.set(userId, harga)
      lastPulsaMap.set(userId, `${item.provider} ${item.produk}`)
      clearPulsaSession(userId)

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
        caption: `💳 Total: Rp${harga.toLocaleString('id-ID')}`
      }, { quoted: msg })

      return true
    }

    await sock.sendMessage(from, {
      text: '⚠️ Kamu masih dalam sesi pembelian pulsa. Ketik angka atau */keluar*.',
      quoted: msg
    })
    return true
  }

  if (text === '.pulsa' || text === 'beli pulsa') {
    clearPulsaSession(userId)

    const list = getPulsaList()
    if (!Array.isArray(list) || list.length === 0) {
      await sock.sendMessage(from, {
        text: '❌ Tidak ada produk pulsa tersedia.'
      }, { quoted: msg })
      return true
    }

    const grouped = {}
    let flatList = []
    let output = '🔋 *Daftar Pulsa Tersedia:*\n\n'
    let nomor = 1

    list.forEach(item => {
      const provider = (item.provider || 'Lainnya').toUpperCase()
      if (!grouped[provider]) grouped[provider] = []
      grouped[provider].push(item)
    })

    for (const provider in grouped) {
      output += `📡 *${provider}*\n`
      grouped[provider].forEach(item => {
        const harga = parseInt(item.harga) || 0
        output += `${nomor}. ${item.produk} - Rp${harga.toLocaleString('id-ID')}\n`
        flatList.push({ ...item, nomor })
        nomor++
      })
      output += '\n'
    }

    output += `Ketik angka (contoh: 2) untuk memilih pulsa.\nKetik */keluar* untuk membatalkan sesi.`

    produkPulsaMap.set(userId, flatList)
    console.log('[Pulsa] Sesi baru set:', userId)
    await sock.sendMessage(from, { text: output }, { quoted: msg })
    return true
  }

  return false
}

module.exports = { handlePulsa }
