const fs = require('fs');
const path = require('path');
const sessionMap = require('../core/sessionStore');

const DATA_PATHS = {
  topup: path.join(__dirname, '../data/topup.json'),
  pulsa: path.join(__dirname, '../data/pulsa.json'),
  kouta: path.join(__dirname, '../data/kouta.json'),
};

async function isUserAdmin(sock, jid, userId) {
  try {
    const metadata = await sock.groupMetadata(jid)
    const participant = metadata.participants.find(p => p.id === userId)
    return participant && ['admin', 'superadmin'].includes(participant.admin)
  } catch (err) {
    return false
  }
}

module.exports = async function hapusProduk(sock, msg, from, body) {
  const chat = msg.key.remoteJid
  const sender = msg.key.participant || msg.key.remoteJid
  const lower = (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    body || ''
  ).toLowerCase().trim()

  // ✅ Cek admin jika dari grup, skip kalau dari private chat
  const isGroup = chat.endsWith('@g.us')
  if (isGroup) {
    const isAdmin = await isUserAdmin(sock, chat, sender)
    if (!isAdmin) {
      return sock.sendMessage(chat, { text: '❌ Hanya admin grup yang bisa pakai perintah ini!' }, { quoted: msg })
    }
  }

  const sesi = sessionMap.get(sender)

  if (!sesi && lower === '/hapus') {
    sessionMap.set(sender, { stage: 'pilih_jenis', type: 'hapus' })
    return sock.sendMessage(chat, {
      text: `🗑️ *Hapus Produk*\n1. Topup Game\n2. Pulsa\n3. Kouta\n\n✏️ Ketik angka *1*, *2*, atau *3* untuk memilih.`
    }, { quoted: msg })
  }

  if (!sesi || sesi.type !== 'hapus') return

  if (sesi.stage === 'pilih_jenis') {
    const jenisMap = { '1': 'topup', '2': 'pulsa', '3': 'kouta' }
    const jenis = jenisMap[lower]
    if (!jenis) return

    sesi.jenis = jenis
    sesi.stage = 'pilih_target'
    sessionMap.set(sender, sesi)

    const data = JSON.parse(fs.readFileSync(DATA_PATHS[jenis]))

    if (jenis === 'topup') {
      const list = data.map((g, i) => `${i + 1}. ${g.game}`).join('\n')
      return sock.sendMessage(chat, {
        text: `🎮 Pilih game:\n${list}\n\nKetik angka game yang ingin dihapus.`
      }, { quoted: msg })
    } else {
      const list = data.map(p => `${p.id}. ${p.provider} - ${p.produk}`).join('\n')
      return sock.sendMessage(chat, {
        text: `📱 Pilih ID produk:\n${list}\n\nKetik ID-nya, misal: 4`
      }, { quoted: msg })
    }
  }

  if (sesi.stage === 'pilih_target') {
    const jenis = sesi.jenis
    const data = JSON.parse(fs.readFileSync(DATA_PATHS[jenis]))

    if (jenis === 'topup') {
      const index = parseInt(lower) - 1
      if (isNaN(index) || index < 0 || index >= data.length) {
        return sock.sendMessage(chat, { text: '❌ Nomor tidak valid.' }, { quoted: msg })
      }
      const removed = data.splice(index, 1)
      fs.writeFileSync(DATA_PATHS[jenis], JSON.stringify(data, null, 2))
      sessionMap.delete(sender)
      return sock.sendMessage(chat, { text: `✅ Game *${removed[0].game}* berhasil dihapus.` }, { quoted: msg })
    } else {
      const id = parseInt(lower)
      const index = data.findIndex(p => p.id === id)
      if (index === -1) {
        return sock.sendMessage(chat, { text: '❌ ID tidak ditemukan.' }, { quoted: msg })
      }
      const removed = data.splice(index, 1)
      fs.writeFileSync(DATA_PATHS[jenis], JSON.stringify(data, null, 2))
      sessionMap.delete(sender)
      return sock.sendMessage(chat, { text: `✅ Produk *${removed[0].produk}* berhasil dihapus.` }, { quoted: msg })
    }
  }
}
