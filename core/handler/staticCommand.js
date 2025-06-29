const { listTopup, lastTopupCommandMap, selectedTopupNominalMap } = require('../../commands/topup')
const { handlePulsa, selectedNominalMap: pulsaNominalMap, lastCommandMap: pulsaLastMap } = require('../../commands/pulsa')
const { handlekouta, selectedNominalMap: koutaNominalMap, lastCommandMap: koutaLastMap } = require('../../commands/kouta')
const hapusProduk = require('../../commands/hapusProduk');
const tambahProduk = require('../../commands/tambahProduk');
const { adminList } = require('../../setting/setting')
const sessionMap = require('../../core/sessionStore');

function setSession(userId, sessionName) {
  sessionMap.set(userId, sessionName)
}

function clearSession(userId) {
  sessionMap.delete(userId)
}

function getSession(userId) {
  return sessionMap.get(userId)
}

const topupGames = ['ff', 'ml', 'genshin', 'pubg', 'valo']

async function handleStaticCommand(sock, msg, lowerText, userId, body) {
  const from = msg.key.remoteJid
  const sender = from
  const currentSession = getSession(userId)

  // ===== Tangani "beli pulsa" =====
if (lowerText === 'beli pulsa') {
  if (currentSession === 'pulsa') {
    await sock.sendMessage(sender, {
      text: `⚠️ Kamu sedang dalam sesi *pulsa*! Ketik */keluar* untuk keluar dulu ya.`
    }, { quoted: msg })
    return true
  }
  setSession(userId, 'pulsa')
  return await handlePulsa(sock, msg, lowerText, userId, sender)
}

// ===== Tangani "beli kuota" =====
if (lowerText === 'beli kuota') {
  if (currentSession === 'kouta') {
    await sock.sendMessage(sender, {
      text: `⚠️ Kamu sedang dalam sesi *kuota*! Ketik */keluar* untuk keluar dulu ya.`
    }, { quoted: msg })
    return true
  }
  setSession(userId, 'kouta')
  return await handlekouta(sock, msg)
}

  // Khusus menangani input "Topup Game"
  if (lowerText === 'topup game') {
    await sock.sendMessage(sender, {
      text: `🎮 *Game Tersedia:*\n• topup ff\n• topup ml\n• topup genshin\n• topup pubg\n• topup valo\n\n📌 Ketik contoh: *topup ff* untuk mulai.`
    }, { quoted: msg })
    return true
  }

  // Command Admin untuk tambah produk
  if (body.toLowerCase().startsWith('/tambah')) {
    return await tambahProduk(sock, msg, from, body,userId)
  }
  if (body.toLowerCase().startsWith('/hapus')) {
    return await hapusProduk(sock, msg, from, body, userId)
  }

  switch (lowerText) {
    case '/menu':
    case 'menu':
      await sock.sendMessage(sender, {
        text: 
`╭━━━[ ✨ *AURA BOT MENU* ✨ ]━━━╮  
┃  
┃ 🖼️ *Sticker dari Gambar/Video*  
┃   ➤ Kirim media (foto/video)  
┃   ➤ Tambahkan caption: *s* atau *sticker*  
┃  
┃ ✍️ *Sticker dari Teks*  
┃   ➤ Ketik: *stickertext teks*  
┃   ➤ Contoh: stickertext AuraBot  
┃  
┃ 💌 *Menfess Anonim*  
┃   ➤ /menfess  
┃  
┃ ⬇ *Download VT Tiktok*  
┃   ➤ .d link tiktok  
┃   ➤ Contoh: .d https://www.tiktok.com/linkKamu  
┃  
┃ ⬇ *Download Sound VT Tiktok*  
┃   ➤ .ds link tiktok  
┃   ➤ Contoh: .ds https://www.tiktok.com/linkKamu  
┃  
┃ ⬇ *Download Foto VT Tiktok*  
┃   ➤ .df link tiktok  
┃   ➤ Contoh: .df https://www.tiktok.com/linkKamu  
┃  
┃ ⬇ *Download Reels Instagram*  
┃   ➤ .dig link instagram 
┃   ➤ Contoh: .dig https://www.instagram.com/linkKamu
┃
┃ 🎮 *Top Up Game*  
┃   ➤ topup ff  
┃   ➤ topup ml  
┃   ➤ topup genshin  
┃   ➤ topup pubg  
┃   ➤ topup valo  
┃  
┃ 📱 *Isi Pulsa & Kuota*  
┃   ➤ .pulsa (beli pulsa)  
┃   ➤ beli kuota  
┃ 
┃ 👥 *Tag All Group Members*
┃   ➤ .tagall
┃   ➤ Contoh: .tagall Halo semua  
┃   ➤ (Admin Only)
┃  
┃ 🛍️ *Tambah Produk (Admin)*  
┃   ➤ /tambah  
┃   ➤ Tambah produk: topup / pulsa / kuota  
┃  
┃ 📜 *Riwayat Transaksi*  
┃   ➤ /riwayat — Tampilkan 20 invoice terakhir  
┃   ➤ /clear — Hapus semua invoice (Admin)  
┃  
┃ 🤖 *Beli Bot WA*  
┃   ➤ beli bot — Lihat harga & fitur bot  
┃  
┃ ❓ *BINGUNG?? KETIK COMMAND INI AJA!!*  
┃   ➤ tutorial  
┃   ➤ admin — Hubungi langsung via WA  
╰━━━━━━━━━━━━━━━━━━━━━━━╯  

🧠 *Ketik sesuai menu ya adick-adickk!*  
📌 _Hindari typo biar AURA gak Misskom_ 🤖🔥
`
      }, { quoted: msg })
      return true

    case 'Tutorial':
    case 'Tutor':
    case 'tutorial':
    case 'tutor':
      await sock.sendMessage(sender, {
        text: `📖 *Petunjuk Cara Pembelian & Command di AURA BOT*

1️⃣ *Topup Game*
   ➤ Ketik: topup ff / ml / genshin / pubg / valo
   ➤ Pilih nominal: contoh: 86dm / 60gc
   ➤ Kirim Dengan Ketik ID game + bukti transfer

2️⃣ *Beli Pulsa*
   ➤ Ketik: beli pulsa
   ➤ Pilih nominal: ketik angka misal 2
   ➤ Kirim Dengan Ketik nomor HP & bukti transfer

3️⃣ *Beli Kuota*
   ➤ Ketik: beli kuota
   ➤ Pilih paket kuota: ketik angka misal 3
   ➤ Kirim Dengan Ketik nomor HP & bukti transfer

   📌 *Contoh Format Transfer:*
  Nomor: 08xxxxxxxxxx
  Bukti TF: (kirim foto)
  
   📌 *Contoh Format Transfer Topup:*
  ID: 8384895 (ID SERVER JIKA ML)
  server: asia (JIKA GENSHIN)
  Bukti TF: (kirim foto)

4️⃣ *Menfess*
   ➤ Ketik: /menfess
   ➤ ketik nomor, nomor yang bisa di deteksi (62895, +6289-9889-xxx, 089879)
   ➤ Ketik /batal jika tidak jadi
   
5️⃣ *Download Tiktok*
   ➤ Ketik: .d (*UNTUK VIDEO)*
   ➤ Ketik: .ds (*UNTUK SOUND)*
   ➤ Ketik: .df (*UNTUK FOTO)*
   ➤ ketik .d, .ds, .df sesuai kemauan kamu lalu paste link tiktok kamu


💡 *Tips:*
- Jangan lupa pilih produk dulu sebelum transfer
- Jika invoice muncul, simpan ID-nya!

🛟 Butuh bantuan langsung? Ketik: *admin* 😎`
      }, { quoted: msg })
      return true

    case 'admin':
      await sock.sendMessage(sender, {
        text: `👩‍💻 *Hubungi Admin AURA BOT:*

📞 WhatsApp: wa.me/62895326679840
🕐 Online: 09.00 - 22.00 WIB

Butuh bantuan soal topup, pulsa, atau invoice?
Tinggal chat admin yaa, fast respon ✨`
      }, { quoted: msg })
      return true

  case '/keluar':
  // Kalau ada sesi topup/pulsa/kuota
  if (['topup', 'kouta'].includes(currentSession)) {
    clearSession(userId)
    lastTopupCommandMap.delete(userId)
    selectedTopupNominalMap.delete(userId)
    await sock.sendMessage(sender, {
      text: `✅ Sesi *${currentSession}* kamu sudah diakhiri.`
    }, { quoted: msg })
    return true
  }

  // Kalau ada sesi tambahan dari fitur tambahProduk
  if (sessionMap.has(userId)) {
    sessionMap.delete(userId)
    await sock.sendMessage(sender, {
      text: `✅ Sesi *tambah produk* telah dibatalkan.`
    }, { quoted: msg })
    return true
  }

  return false


    case 'beli bot':
      await sock.sendMessage(sender, {
        text: `🤖 Beli Bot:\nPremium - Rp70.000\nResponder - Rp50.000`
      }, { quoted: msg })
      return true
  }
  // ✅ Tambahkan ini di paling akhir!
if (sessionMap.get(userId)?.type === 'hapus') {
  return await hapusProduk(sock, msg, from, body,  userId)
}

  // Topup Game - Deteksi topup [namaGame]
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
