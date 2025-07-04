const fs = require('fs')
const path = require('path')

const {
  selectedTopupNominalMap,
  lastTopupCommandMap,
  getHargaFromJSON
} = require('../../commands/topup')

const blessingKeywords = ['blessing', 'welkin', 'moon', 'blessingofthewelkinmoon']
const { qrisImagePath, paymentList } = require('../payment/payment')

const validGames = [
  'Mobile Legends',
  'Free Fire',
  'Genshin Impact',
  'PUBG Mobile',
  'Valorant'
]

async function handleTopupInput(sock, msg, lowerText, actualUserId, sender) {
    if (lowerText === '/keluar') {
    if (lastTopupCommandMap.has(actualUserId) || selectedTopupNominalMap.has(actualUserId)) {
      lastTopupCommandMap.delete(actualUserId)
      selectedTopupNominalMap.delete(actualUserId)
      await sock.sendMessage(sender, {
        text: `✅ Sesi *topup* telah dibatalkan.`
      }, { quoted: msg })
      return true
    }
    // jika tidak dalam sesi topup, biarkan lanjut ke handler lain
    return false
  }
  // 🌟 STEP 1: PILIH GAME
  if (lowerText.startsWith('topup ')) {
    const inputGame = lowerText.replace('topup ', '').trim().toLowerCase()
    const aliasMap = {
      ml: 'Mobile Legends',
      mobilelegend: 'Mobile Legends',
      mobilelegends: 'Mobile Legends',
      ff: 'Free Fire',
      freefire: 'Free Fire',
      genshin: 'Genshin Impact',
      gc: 'Genshin Impact',
      pubg: 'PUBG Mobile',
      valorant: 'Valorant',
      valo: 'Valorant',
      radianite: 'Valorant'
    }
    
    const normalizedGame = aliasMap[inputGame] || capitalizeWords(inputGame)
    lastTopupCommandMap.set(actualUserId, normalizedGame)

    await sock.sendMessage(sender, {
      text: `✅ Game *${normalizedGame.toUpperCase()}* dipilih.\nKetik nominalnya, contoh: *86dm*, *963 diamond*, *gc 60*`
    }, { quoted: msg })

    return true
  }

  // 🌙 STEP 2: WELKIN / BLESSING GENSHIN
  const cleanedText = lowerText.replace(/\s+/g, '')
  if (blessingKeywords.includes(cleanedText)) {
    lastTopupCommandMap.set(actualUserId, 'Genshin Impact')
    selectedTopupNominalMap.set(actualUserId, 60000)

    const teks = formatInvoice('Blessing of the Welkin Moon', 60000, 'Genshin Impact')
    await sock.sendMessage(sender, { text: teks }, { quoted: msg })

    const buffer = fs.readFileSync(qrisImagePath)
    await sock.sendMessage(sender, {
      image: buffer,
      caption: '🔻 Scan QRIS ini untuk semua metode pembayaran 🔻\nMendukung Dana, Gopay, OVO, ShopeePay, dll'
    }, { quoted: msg })

    lastTopupCommandMap.delete(actualUserId)
    return true
  }

  // 🧾 STEP 3: PILIH NOMINAL
  const gameKey = lastTopupCommandMap.get(actualUserId || '')
  if (!gameKey || !validGames.includes(gameKey)) return false

  const harga = await getHargaFromJSON(lowerText, gameKey)
  if (!harga) return false

  selectedTopupNominalMap.set(actualUserId, harga)

  const teks = formatInvoice(lowerText, harga, gameKey)
  await sock.sendMessage(sender, { text: teks }, { quoted: msg })

  const buffer = fs.readFileSync(qrisImagePath)
  await sock.sendMessage(sender, {
    image: buffer,
    caption: '🔻 Scan QRIS ini untuk semua metode pembayaran 🔻\nMendukung Dana, Gopay, OVO, ShopeePay, dll'
  }, { quoted: msg })

  lastTopupCommandMap.delete(actualUserId)
  return true
}

function formatInvoice(namaProduk, harga, game) {
  const instruksiMap = {
    'Genshin Impact': {
      instruksi: `- ID Game\n- Server (Asia/America/etc)\n- Bukti transfer`,
      contoh: `ID: 812345678\nServer: Asia\nBukti TF: (foto transfer)`
    },
    'Mobile Legends': {
      instruksi: `- ID Game\n- Zone ID\n- Bukti transfer`,
      contoh: `ID: 812345678\nZone: 1234\nBukti TF: (foto transfer)`
    },
    'PUBG Mobile': {
      instruksi: `- ID Game\n- Bukti transfer`,
      contoh: `ID: 812345678\nBukti TF: (foto transfer)`
    },
    'Free Fire': {
      instruksi: `- ID Game\n- Bukti transfer`,
      contoh: `ID: 812345678\nBukti TF: (foto transfer)`
    },
    'Valorant': {
      instruksi: `- ID Game\n- Bukti transfer`,
      contoh: `ID: 812345678\nBukti TF: (foto transfer)`
    }
  }

  const { instruksi, contoh } = instruksiMap[game] || {
    instruksi: '- ID Game\n- Bukti transfer',
    contoh: 'ID: 812345678\nBukti TF: (foto transfer)'
  }

  return `✅ Kamu memilih *${namaProduk}*\n💰 Harga: Rp${harga.toLocaleString('id-ID')}

💳 *Silakan transfer ke salah satu metode berikut:*
${paymentList.join('\n')}

📷 *QRIS Allpay tersedia di bawah ini!*

Setelah transfer, kirimkan:
${instruksi}

======= *CONTOH* =======
${contoh}`
}

function capitalizeWords(str) {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

module.exports = { handleTopupInput }
