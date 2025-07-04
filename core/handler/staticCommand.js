const { listTopup, lastTopupCommandMap, selectedTopupNominalMap } = require('../../commands/topup')
const { handlePulsa, selectedPulsaMap, lastPulsaMap } = require('../../commands/pulsa')
const { handlekouta, selectedKoutaMap, lastKoutaMap } = require('../../commands/kouta')
const hapusProduk = require('../../commands/hapusProduk');
const tambahProduk = require('../../commands/tambahProduk');
const { adminList } = require('../../setting/setting')
const sessionMap = require('../../core/sessionStore');
const { addInvoice, getInvoiceByMsgId, setPaidByMsgId, getAllInvoices, generateInvoiceId, clearAllInvoices, deleteInvoiceById } = require('../invoices');

function setSession(userId, sessionName) {
  sessionMap.set(userId, sessionName)
}

function clearSession(userId) {
  sessionMap.delete(userId)
}

function getSession(userId) {
  return sessionMap.get(userId)
}

const topupGames = ['ff', 'ml', 'genshin', 'pubg', 'valo','valorant', 'roblox', 'ROBLOX', 'robux']

async function handleStaticCommand(sock, msg, lowerText, userId, body) {
  const from = msg.key.remoteJid
  const sender = from
  const actualUserId = msg.key.participant || msg.participant || userId;
  const currentSession = getSession(userId)

  // Menampilkan daftar game
  if (lowerText === 'topup game') {
    await sock.sendMessage(sender, {
      text: `🎮 *Game Tersedia:*\n• topup ff\n• topup ml\n• topup genshin\n• topup pubg\n• topup valo\n\n📌 Ketik contoh: *topup ff* untuk mulai.`
    }, { quoted: msg })
    return true
  }

  //  Admin Tambah / Hapus Produk
  if (body.toLowerCase().startsWith('/tambah')) {
    return await tambahProduk(sock, msg, from, body, userId)
  }

  if (body.toLowerCase().startsWith('/hapus')) {
    return await hapusProduk(sock, msg, from, body, userId)
  }
if (body.toLowerCase().startsWith('/clearid')) {
  const parts = body.trim().split(' ')
  const id = parts[1]?.trim()
  const actualUserId = msg.key.participant || msg.participant || userId;
  const fullUserId = actualUserId.includes('@s.whatsapp.net') ? actualUserId : `${actualUserId}@s.whatsapp.net`

  if (!adminList.includes(fullUserId)) {
    await sock.sendMessage(sender, {
      text: `⛔ Maaf, hanya *admin* yang bisa menghapus invoice ID tertentu.`,
      quoted: msg
    })
    return true
  }

  if (!id) {
    await sock.sendMessage(sender, {
      text: `❌ Format salah!\nContoh: /clearid INV123456`,
      quoted: msg
    })
    return true
  }

  const success = deleteInvoiceById(id)
  await sock.sendMessage(sender, {
    text: success
      ? `✅ Invoice *${id}* berhasil dihapus.`
      : `⚠️ Invoice *${id}* tidak ditemukan.`,
    quoted: msg
  })
  return true
}

  // Handle command statis
  switch (lowerText) {
    case '/menu':
    case 'menu':
      await sock.sendMessage(sender, {
        text: `╭━━━[ ✨ AURA BOT MENU ✨ ]━━━╮  
┃  
┃ 🖼 Sticker dari Gambar/Video  
┃   ➤ Kirim media (foto/video)  
┃   ➤ Tambahkan caption: \`s\` atau \`sticker\`
┃  
┃ ✍ Sticker dari Teks  
┃   ➤ Ketik: \`stickertext\` teks  
┃   ➤ Contoh: \`stickertext\` AuraBot  
┃  
┃ 💌 Menfess Anonim  
┃   ➤ \`/menfess\` 
┃  
┃  🗺️ Cari Lokasi Google Maps
┃   ➤ \`.linkmap\` <nama daerah> 
┃   ➤ Contoh: \`.linkmap\` monas Jakarta
┃
┃  👰🏻 Cari Waifu Kamu!
┃   ➤ \`.waifu\` <jenis waifu>
┃   ➤ Contoh: \`.waifu\` neko
┃
┃ ⬇ Download VT Tiktok  
┃   ➤ \`.d\` link tiktok  
┃   ➤ Contoh: .d https://tiktok.com/linkKamu  
┃ 
┃ ⬇ Download Sound VT Tiktok  
┃   ➤ \`.ds\` link tiktok  
┃   ➤ Contoh: \`.ds\` https://tiktok.com/linkKamu  
┃  
┃ ⬇ Download Foto VT Tiktok  
┃   ➤ \`.df\` link tiktok  
┃   ➤ Contoh: \`.df\` https://tiktok.com/linkKamu  
┃  
┃ ⬇ Download Reels Instagram  
┃  \`IG DOWNLOAD 1 MENIT, JANGAN SPAM!\`
┃   ➤ \`.dig\` link instagram 
┃   ➤ Contoh: \`.dig\` https://instagram.com/linkKamu
┃
┃ 🎮 Top Up Game  
┃   ➤ topup ff  
┃   ➤ topup ml  
┃   ➤ topup genshin  
┃   ➤ topup pubg  
┃   ➤ topup valo  
┃  
┃ 📱 Isi Pulsa & Kuota  
┃   ➤ beli pulsa  
┃   ➤ beli kuota  
┃ 
┃ 👥 Tag All Group Members
┃   ➤ .tagall
┃   ➤ Contoh: .tagall Halo semua  
┃   ➤ (Admin Only)
┃  
┃ 🛍 Tambah Produk (Admin)  
┃   ➤ /tambah  
┃   ➤ Tambah produk: topup / pulsa / kuota  
┃  
┃ 📜 Riwayat Transaksi  
┃   ➤ /riwayat — Tampilkan 20 invoice terakhir  
┃   ➤ /clear — Hapus semua invoice (Admin)  
┃  
┃ 🤖 Beli Bot WA  
┃   ➤ beli bot — Lihat harga & fitur bot  
┃  
┃ ❓ BINGUNG?? KETIK COMMAND INI AJA!!  
┃   ➤ tutorial  
┃   ➤ admin — Hubungi langsung via WA  
╰━━━━━━━━━━━━━━━━━━━━━━━╯  

🧠 Ketik sesuai menu ya adick-adickk!  
📌 Hindari typo biar AURABOT gak Misskom 🤖🔥
`
      }, { quoted: msg })
      return true

    case 'tutorial':
    case 'tutor':
    case 'Tutorial':
    case 'Tutor':
      await sock.sendMessage(sender, {
        text: `📖 *Petunjuk Penggunaan AURA BOT*\n\n1️⃣ Topup Game\n➤ Ketik: topup ff/ml/genshin/pubg/valo\n➤ Pilih nominal\n➤ Kirim ID & bukti TF\n\n2️⃣ Beli Pulsa/Kuota\n➤ Ketik: beli pulsa / beli kuota\n➤ Pilih nominal (1, 2, 3...)\n➤ Kirim nomor HP + bukti transfer\n\n3️⃣ Menfess\n➤ Ketik: /menfess\n➤ Isi nomor & pesan\n➤ Ketik: /batal untuk batal\n\n4️⃣ Download Video\n➤ .d / .ds / .df + link\n\n❗ Jangan lupa ketik */keluar* kalau sedang dalam sesi!`
      }, { quoted: msg })
      return true

    case 'admin':
      await sock.sendMessage(sender, {
        text: `👩‍💻 *Hubungi Admin AURA BOT:*\n\n📞 wa.me/62895326679840\n🕐 Online: 09.00 - 22.00 WIB\n\nButuh bantuan? Ketik aja "admin" yaa! ✨`
      }, { quoted: msg })
      return true

    case '/keluar':
      if (['topup', 'kouta'].includes(currentSession)) {
        clearSession(userId)
        lastTopupCommandMap.delete(userId)
        selectedTopupNominalMap.delete(userId)
        await sock.sendMessage(sender, {
          text: `✅ Sesi *${currentSession}* kamu sudah diakhiri.`
        }, { quoted: msg })
        return true
      }
      return false

    case 'beli bot':
      await sock.sendMessage(sender, {
        text: `🤖 *Harga Bot AURA:*\n• Premium - Rp70.000\n• Responder - Rp50.000`
      }, { quoted: msg })
      return true
  }
  // Sesi hapus produk
  if (sessionMap.get(userId)?.type === 'hapus') {
    return await hapusProduk(sock, msg, from, body, userId)
  }

  // Mulai Topup Game
  if (lowerText.startsWith('topup ')) {
    const game = lowerText.split(' ')[1]
    if (topupGames.includes(game)) {
      if (currentSession === 'topup') {
        await sock.sendMessage(sender, {
          text: `⚠️ Kamu sedang dalam sesi *topup*! Ketik */keluar* untuk keluar dulu yaa.`
        }, { quoted: msg })
        return true
      }

      setSession(userId, 'topup')
      await listTopup(sock, msg, game)
      return true
    } else {
      await sock.sendMessage(sender, {
        text: `❌ Game *${game}* tidak tersedia.\nKetik */menu* untuk lihat list game yang tersedia.`
      }, { quoted: msg })
      return true
    }
  }

  return false
}

module.exports = {
  handleStaticCommand,
  setSession,
  getSession,
  clearSession,
  sessionMap
}
