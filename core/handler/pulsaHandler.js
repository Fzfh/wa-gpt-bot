const fs = require('fs')
const path = require('path')

const { produkMap, selectedNominalMap, lastCommandMap } = require('../core/state')

async function handlePulsa(sock, msg) {
  const from = msg.key.remoteJid
  const userId = msg.key.participant || msg.key.remoteJid
  const text = (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    ''
  ).toLowerCase().trim()
  
  // STEP 1: Jika user ketik `.pulsa` atau `beli pulsa`
  if (text === '.pulsa' || text === 'beli pulsa') {
    const rawData = fs.readFileSync(path.join(__dirname, '../../data/pulsa.json'), 'utf-8')
    const pulsaData = JSON.parse(rawData)

    let flatList = []
    let output = '📱 *Daftar Pulsa Tersedia:*\n\n'
    let count = 1

    for (const provider in pulsaData) {
      output += `📡 *${provider.toUpperCase()}*\n`
      pulsaData[provider].forEach(item => {
        output += `${count}. ${item.nominal} - Rp${item.harga.toLocaleString('id-ID')}\n`
        flatList.push({ provider, ...item, nomor: count })
        count++
      })
      output += '\n'
    }

    output += `Ketik angka (contoh: 3) untuk memilih pulsa.`

    produkMap.set(userId, flatList)
    await sock.sendMessage(from, { text: output }, { quoted: msg })
    return true
  }
if (text === '/keluar') {
  if (produkMap.has(userId)) {
    produkMap.delete(userId)
    selectedNominalMap.delete(userId)
    lastCommandMap.delete(userId)
    await sock.sendMessage(from, { text: '❌ Kamu telah keluar dari sesi pembelian pulsa.' }, { quoted: msg })
  }
  return true // Tetap return true supaya command dianggap selesai
}


  // STEP 2: Jika user mengetik angka untuk memilih pulsa
  const list = produkMap.get(userId)
  if (!Array.isArray(list) || list.length === 0) return false

  const pilihIndex = parseInt(text)
  if (isNaN(pilihIndex)) return false

  const item = list.find(i => i.nomor === pilihIndex)
  if (!item) return false

  // Simpan produk pilihan user
  selectedNominalMap.set(userId, item.harga)
  lastCommandMap.set(userId, `${item.provider} ${item.nominal}`)
  produkMap.delete(userId)

  const teks = `✅ Kamu memilih *${item.provider.toUpperCase()} - ${item.nominal}*
💰 Harga: Rp${item.harga.toLocaleString('id-ID')}

💳 Silakan transfer ke salah satu metode berikut:
• Dana: 08xxxxxxxxxx
• Gopay: 08xxxxxxxxxx
• BCA: 1234567890 a.n. AURA SHOP

📸 Kirim:
- Nomor HP tujuan
- Bukti transfer

======= *CONTOH* =======
Nomor: 08123456789
Bukti TF: (foto transfer)`

  await sock.sendMessage(from, { text: teks }, { quoted: msg })

  // Kirim gambar QRIS (optional, sesuaikan path dan file)
  await sock.sendMessage(from, {
    image: { url: './media/q.jpg' },
    caption: `💳 Total: Rp${item.harga.toLocaleString('id-ID')}`
  }, { quoted: msg })

  return true
}

module.exports = {
  handlePulsa,
  selectedNominalMap,
  lastCommandMap
}
