const fs = require('fs')
const path = require('path')

const {
  selectedTopupNominalMap,
  lastTopupCommandMap,
  getHargaFromJSON
} = require('../../commands/topup')

const blessingKeywords = ['blessing', 'welkin', 'moon', 'blessingofthewelkinmoon']
const { qrisImagePath, paymentList } = require('../payment/payment')

async function handleTopupInput(sock, msg, lowerText, userId, sender) {
  // Step 1: Pilih Game
  if (lowerText.startsWith('topup ')) {
    const inputGame = lowerText.replace('topup ', '').trim().toLowerCase()
    const aliasMap = {
      ml: 'ml',
      mobilelegends: 'ml',
      ff: 'ff',
      freefire: 'ff',
      genshin: 'genshin',
      pubg: 'pubg',
      valorant: 'valorant',
      valo: 'valorant'
    }

    const normalizedGame = aliasMap[inputGame] || inputGame
    lastTopupCommandMap.set(userId, normalizedGame)

    await sock.sendMessage(sender, {
      text: `✅ Game *${normalizedGame.toUpperCase()}* dipilih.\nSekarang ketik nominal, misal: *86dm*, *diamond 344*, *gc 60*`
    }, { quoted: msg })

    return true
  }

  // Step 2: Blessing Genshin
  const cleanedText = lowerText.replace(/\s+/g, '').toLowerCase()
  if (blessingKeywords.includes(cleanedText)) {
    lastTopupCommandMap.set(userId, 'genshin')
    selectedTopupNominalMap.set(userId, 60000)

    const teks = formatInvoice('Blessing of the Welkin Moon', 60000, 'genshin')
    await sock.sendMessage(sender, { text: teks }, { quoted: msg })

    const buffer = fs.readFileSync(qrisImagePath)
    await sock.sendMessage(sender, {
      image: buffer,
      caption: '🔻 Scan QRIS ini untuk semua metode pembayaran 🔻\nMendukung Dana, Gopay, OVO, ShopeePay, dll'
    }, { quoted: msg })

    // Hapus sesi setelah blessing
    lastTopupCommandMap.delete(userId)
    return true
  }

  // Step 3: Cek nominal (pakai engine dari topup.js)
  const gameKey = (lastTopupCommandMap.get(userId) || '').toLowerCase()
  const validGames = ['ml', 'ff', 'genshin', 'pubg', 'valorant']
  if (!gameKey || !validGames.includes(gameKey)) {
    return false // ❌ Biar gak spam balasan kalau user ngetik sembarang
  }

  const harga = await getHargaFromJSON(lowerText, gameKey)
  if (!harga) {
    return false // ❌ Biarkan handler lain yang proses kalau gagal cocok
  }

  selectedTopupNominalMap.set(userId, harga)

  const teks = formatInvoice(lowerText, harga, gameKey)
  await sock.sendMessage(sender, { text: teks }, { quoted: msg })

  const buffer = fs.readFileSync(qrisImagePath)
  await sock.sendMessage(sender, {
    image: buffer,
    caption: '🔻 Scan QRIS ini untuk semua metode pembayaran 🔻\nMendukung Dana, Gopay, OVO, ShopeePay, dll'
  }, { quoted: msg })

  // 🧹 Selesai topup, hapus sesi
  lastTopupCommandMap.delete(userId)

  return true
}

function formatInvoice(namaProduk, harga, game) {
  const instruksiMap = {
    genshin: `- ID Game\n- Server (Asia/America/etc)\n- Bukti transfer`,
    ml: `- ID Game\n- Zone ID\n- Bukti transfer`,
    pubg: `- ID Game\n- Bukti transfer`,
    ff: `- ID Game\n- Bukti transfer`,
    valorant: `- ID Game\n- Bukti transfer`
  }

  const instruksi = instruksiMap[game] || '- ID Game\n- Bukti transfer'

  return `✅ Kamu memilih *${namaProduk}*\n💰 Harga: Rp${harga.toLocaleString('id-ID')}

💳 *Silakan transfer ke salah satu metode berikut:*
${paymentList.join('\n')}

📷 *QRIS Allpay tersedia di bawah ini!*

Setelah transfer, kirimkan:
${instruksi}

======= *CONTOH* =======
ID: 812345678
Server: Asia
Bukti TF: (foto transfer)`
}

module.exports = { handleTopupInput }
