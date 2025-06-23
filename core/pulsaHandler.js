// core/handler/pulsaHandler.js
const fs = require('fs')
const path = require('path')

// Maps untuk simpan session user
const produkMap = new Map()
const selectedNominalMap = new Map()
const lastCommandMap = new Map()

// sessionStore global
const sessionMap = require('../sessionStore')

async function handlePulsa(sock, msg) {
  const from = msg.key.remoteJid
  const userId = msg.key.participant || msg.key.remoteJid
  const text = (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    ''
  ).toLowerCase().trim()

  // ─── 1. Tangani /keluar ───
  if (text === '/keluar') {
    if (produkMap.has(userId)) {
      // clear semua state pulsa
      produkMap.delete(userId)
      selectedNominalMap.delete(userId)
      lastCommandMap.delete(userId)
      sessionMap.delete(userId)

      await sock.sendMessage(from, {
        text: '✅ Sesi pembelian pulsa kamu sudah diakhiri.'
      }, { quoted: msg })
      return true
    }
    return false
  }

  // ─── 2. Jika dalam sesi, warning atau proses pilihan ───
  if (produkMap.has(userId)) {
    // kalau user minta list lagi
    if (text === '.pulsa' || text === 'beli pulsa') {
      await sock.sendMessage(from, {
        text: '⚠️ Kamu masih dalam sesi pembelian pulsa.\nKetik */keluar* untuk membatalkan.'
      }, { quoted: msg })
      return true
    }

    // proses nomor pilihan
    const list = produkMap.get(userId)
    const idx = parseInt(text)
    if (isNaN(idx)) return false

    const item = list.find(i => i.nomor === idx)
    if (!item) return false

    // simpan pilihan & clear sesi
    selectedNominalMap.set(userId, item.harga)
    lastCommandMap.set(userId, `${item.provider} ${item.nominal}`)
    produkMap.delete(userId)
    sessionMap.delete(userId)

    // kirim detail pembayaran
    const info = `✅ Kamu memilih *${item.provider.toUpperCase()} - ${item.nominal}*\n` +
      `💰 Harga: Rp${item.harga.toLocaleString('id-ID')}\n\n` +
      `💳 Silakan transfer ke:\n` +
      `• Dana: 08xxxxxxxxxx\n` +
      `• Gopay: 08xxxxxxxxxx\n` +
      `• BCA: 1234567890 a.n. AURA SHOP\n\n` +
      `📸 Kirim:\n- Nomor HP tujuan\n- Bukti transfer (foto)\n\n` +
      `======= *CONTOH* =======\n` +
      `Nomor: 08123456789\n` +
      `Bukti TF: (foto)`

    await sock.sendMessage(from, { text: info }, { quoted: msg })
    await sock.sendMessage(from, {
      image: { url: './media/q.jpg' },
      caption: `💳 Total: Rp${item.harga.toLocaleString('id-ID')}`
    }, { quoted: msg })

    return true
  }

  // ─── 3. Mulai sesi baru ───
  if (text === '.pulsa' || text === 'beli pulsa') {
    sessionMap.set(userId, { type: 'pulsa' })

    // load data pulsa.json
    const rawData = fs.readFileSync(path.join(__dirname, '../../data/pulsa.json'), 'utf-8')
    const pulsaData = JSON.parse(rawData)

    // build daftar flatList
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
    output += 'Ketik angka (contoh: 3) untuk memilih pulsa.\nKetik */keluar* untuk membatalkan.'

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
