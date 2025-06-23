const fs = require('fs')
const path = require('path')

const {
  produkPulsaMap,
  selectedPulsaMap,
  lastPulsaMap
} = require('../core/state')
const { clearKoutaSession, clearPulsaSession } = require('../core/clearhelper')

// Ambil data pulsa dari JSON lokal
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
  console.log('[Pulsa] userId:', userId)
  console.log('[Pulsa] Session exists:', produkPulsaMap.has(userId))
  console.log('[Debug] remoteJid:', msg.key.remoteJid)
  console.log('[Debug] participant:', msg.key.participant)

  const text = (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    ''
  ).toLowerCase().trim()

  // Keluar dari sesi
  if (text === '/keluar') {
    clearPulsaSession(userId)
    console.log('[Pulsa] clearPulsaSession triggered via /keluar for:', userId)
    await sock.sendMessage(from, {
      text: '❌ Kamu telah keluar dari sesi pembelian pulsa.'
    }, { quoted: msg })
    return true
  }

  // Kalau user dalam sesi dan kirim angka
  if (produkPulsaMap.has(userId)) {
    const list = produkPulsaMap.get(userId)

    if (Array.isArray(list) && /^\d+$/.test(text)) {
      const pilihIndex = parseInt(text)
      const item = list.find(i => i.nomor === pilihIndex)

      if (!item) return false

      const harga = parseInt(item.harga) || 0
      selectedPulsaMap.set(userId, harga)
      lastPulsaMap.set(userId, `${item.provider} ${item.produk}`)
      clearPulsaSession(userId) // Hapus sesi setelah milih

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

    // User dalam sesi tapi bukan angka valid
    await sock.sendMessage(from, {
      text: '⚠️ Kamu masih dalam sesi pembelian pulsa. Ketik angka untuk memilih atau */keluar* untuk keluar.',
      quoted: msg
    })
    return true
  }

  // Mulai sesi baru
  if (text === '.pulsa' || text === 'beli pulsa') {
    clearKoutaSession(userId)  // Biar gak tumpang tindih
    clearPulsaSession(userId)  // Pastikan sesi baru bersih

    const list = getPulsaList()
    if (!Array.isArray(list) || list.length === 0) {
      await sock.sendMessage(from, {
        text: '❌ Tidak ada produk pulsa tersedia.'
      }, { quoted: msg })
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

    output += `Ketik angka (contoh: 3) untuk memilih pulsa.\n`
    output += `Ketik */keluar* untuk membatalkan sesi ini.`

    produkPulsaMap.set(userId, flatList)
    console.log('[Pulsa] Mulai sesi pulsa, set produkPulsaMap:', userId)
    await sock.sendMessage(from, { text: output }, { quoted: msg })
    return true
  }

  return false
}

module.exports = {
  handlePulsa,
  selectedPulsaMap,
  lastPulsaMap
}
