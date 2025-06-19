const fs = require('fs')
const path = require('path')

const produkMap = new Map()
const selectedKoutaNominalMap = new Map()
const lastKoutaCommandMap = new Map()

// 🔄 Load data kouta dari file JSON
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

async function handlekouta(sock, msg) {
  const from = msg.key.remoteJid
  const userId = msg.key.participant || msg.key.remoteJid
  const text = (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    ''
  ).toLowerCase().trim()

  // STEP 1: Tampilkan daftar kuota
  if (text === '.kouta' || text === 'beli kouta') {
    console.log('🔥 KOUTA command diterima:', text)
    console.log('📁 Isi kouta.json:', getKoutaList())

    const list = getKoutaList()
    if (!Array.isArray(list) || list.length === 0) {
      return sock.sendMessage(from, { text: '❌ Tidak ada produk kuota tersedia.' }, { quoted: msg })
    }

    const grouped = {}
    list.forEach(item => {
      const provider = (item.provider || 'Lainnya').toUpperCase()
      if (!grouped[provider]) grouped[provider] = []
      grouped[provider].push(item)
    })

    let output = `📶 *Daftar Kuota Tersedia:*\n\n`
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

    produkMap.set(userId, flatList)
    await sock.sendMessage(from, { text: output }, { quoted: msg })
    return true
  }

  // STEP 2: Tangani input pilihan angka
  const list = produkMap.get(userId)
  if (!Array.isArray(list) || list.length === 0) return false

  const pilihIndex = parseInt(text)
  const item = list.find(i => i.nomor === pilihIndex)

  if (!item) return false

  selectedKoutaNominalMap.set(userId, parseInt(item.harga) || 0)
  lastKoutaCommandMap.set(userId, `${item.provider} ${item.produk}`)
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
  handlekouta,
  selectedKoutaNominalMap,
  lastKoutaCommandMap
}
