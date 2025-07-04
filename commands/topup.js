const fs = require('fs')
const path = require('path')

const selectedTopupNominalMap = new Map()
const lastTopupCommandMap = new Map()

const gameAliasMap = {
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

// Alias untuk jenis nominal
const nominalAliasMap = {
  diamond: ['dm', 'diamond'],
  'genesis crystal': ['gc', 'genesiscrystal', 'genesis'],
  welkin: ['welkin', 'welkinmoon'],
  uc: ['uc'],
  radianite: ['radianite', 'rp'],
  robux: ['robux', 'rb']
}

function cocokkanAlias(inputHuruf, nominal) {
  for (const [nama, aliasArr] of Object.entries(nominalAliasMap)) {
    if (nominal.toLowerCase().includes(nama)) {
      if (aliasArr.includes(inputHuruf)) return true
    }
  }
  return false
}

// Load data topup.json
function getTopupList() {
  const filePath = path.join(__dirname, '../data/topup.json')
  try {
    const rawData = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(rawData)
  } catch (err) {
    console.error('❌ Gagal load topup.json:', err)
    return []
  }
}

// Fungsi untuk menampilkan daftar topup berdasarkan game
async function listTopup(sock, msg, inputGame) {
  const topupData = getTopupList()
  const aliasFixed = gameAliasMap[inputGame.toLowerCase()] || inputGame
  const gameData = topupData.find(item => item.game.toLowerCase() === aliasFixed.toLowerCase())

  if (!gameData || !Array.isArray(gameData.items) || gameData.items.length === 0) {
    const availableGames = topupData.map(item => `- ${item.game}`).join('\n')
    return sock.sendMessage(msg.key.remoteJid, {
      text: `❌ Game *${inputGame}* tidak tersedia.\n\n🎮 Game yang tersedia:\n${availableGames}`
    }, { quoted: msg })
  }

  let list = `🛒 *Daftar Produk ${gameData.game.toUpperCase()}*\n*Mohon Ketik /keluar Ketika Sudah*\n*Selesai Transaksi Atau Tidak jadi Beli*\n\n`
  gameData.items.forEach((item, i) => {
    const nominal = item.nominal || 'Tidak diketahui'
    const harga = isNaN(parseInt(item.harga)) ? 0 : parseInt(item.harga)
    list += `${i + 1}. ${nominal} = Rp${harga.toLocaleString('id-ID')}\n`
  })
  list += `\nKetik *nominal produk* terlebih dahulu, lalu kirim *${gameData.game} ID kamu* untuk membeli.`

  await sock.sendMessage(msg.key.remoteJid, { text: list }, { quoted: msg })

  // Simpan command terakhir
  lastTopupCommandMap.set(msg.key.remoteJid, gameData.game)
}

//  Cocokkan nominal dengan data topup
async function getHargaFromJSON(nominalInput, game) {
  const topupData = getTopupList()

  // Cari game-nya secara toleran
  const gameData = topupData.find(item => item.game.toLowerCase() === game.toLowerCase())
  if (!gameData || !Array.isArray(gameData.items)) {
    console.log('❌ Game tidak ditemukan atau tidak valid:', game)
    return null
  }

  const input = nominalInput.toLowerCase().replace(/\s+/g, '')
  const inputAngka = input.replace(/\D/g, '')
  const inputHuruf = input.replace(/\d+/g, '')

  console.log(`🔍 Cari nominal: "${nominalInput}" untuk game "${game}"`)
  console.log('📄 Data yang tersedia:', gameData.items.map(i => i.nominal))

  const found = gameData.items.find(item => {
    const nominalRaw = (item.nominal || '').toLowerCase()
    const nominalClean = nominalRaw.replace(/\s+/g, '')
    const nominalAngka = nominalClean.replace(/\D/g, '')
    const nominalHuruf = nominalClean.replace(/\d+/g, '')

    const match =
      input === nominalClean ||
      nominalRaw === nominalInput.toLowerCase() ||
      (inputAngka === nominalAngka &&
        (nominalHuruf.includes(inputHuruf) || cocokkanAlias(inputHuruf, item.nominal))) ||
      nominalRaw.replace(/\s+/g, '').includes(input) ||
      input.includes(nominalRaw.replace(/\s+/g, ''))

    if (match) console.log('✅ Cocok dengan:', item.nominal)
    return match
  })

  if (!found) {
    console.log('❌ Tidak ditemukan. Input:', nominalInput, '| Game:', game)
  }

  return found ? parseInt(found.harga) : null
}

module.exports = {
  listTopup,
  getHargaFromJSON,
  getTopupList,
  selectedTopupNominalMap,
  lastTopupCommandMap
}
