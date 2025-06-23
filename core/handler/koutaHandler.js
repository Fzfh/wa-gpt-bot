const fs = require('fs')
const path = require('path')

// Maps untuk simpan session user
const produkMap = new Map()
const selectedNominalMap = new Map()
const lastCommandMap = new Map()

async function handleKouta(sock, msg) {
  const from = msg.key.remoteJid
  const userId = msg.key.participant || msg.key.remoteJid
  const text = (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    ''
  ).toLowerCase().trim()

  // STEP 1: Jika user ketik `.kouta` atau `beli kouta`
  if (text === '.kouta' || text === 'beli kouta') {
    const rawData = fs.readFileSync(path.join(__dirname, '../data/kouta.json'), 'utf-8')
    const koutaData = JSON.parse(rawData)

    let flatList = []
    let output = '📶 *Daftar Kuota Tersedia:*\n\n'
    let count = 1

    for (const provider in koutaData) {
      output += `📡 *${provider.toUpperCase()}*\n`
      koutaData[provider].forEach(item => {
        output += `${count}. ${item.nominal} - Rp${item.harga.toLocaleString('id-ID')}\n`
        flatList.push({ provider, ...item, nomor: count })
        count++
      })
      output += '\n'
    }

    output += `Ketik angka (contoh: 3) untuk memilih kuota.`

    produkMap.set(userId, flatList)
    await sock.sendMessage(from, { text: output }, { quoted: msg })
    return true
  }

  // STEP 2: Jika user mengetik angka untuk memilih kuota
  const list = produkMap.get(userId)
  if (!Array.isArray(list) || list.length === 0) return false

  const pilihIndex = parseInt(text)
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

  await sock.sendMessage(from, {
    image: { url: './media/q.jpg' },
    caption: `💳 Total: Rp${item.harga.toLocaleString('id-ID')}`
  }, { quoted: msg })

  return true
}

module.exports = {
  handleKouta,
  selectedNominalMap,
  lastCommandMap
}
