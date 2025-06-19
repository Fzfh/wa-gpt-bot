// staticCommand.js
const { listTopup } = require('../../commands/topup')
const { handlePulsa } = require('../../commands/pulsa')
const { handlekouta } = require('../../commands/kouta')

const sessionMap = new Map()

function setSession(userId, sessionName) {
  sessionMap.set(userId, sessionName)
}

function clearSession(userId) {
  sessionMap.delete(userId)
}

function getSession(userId) {
  return sessionMap.get(userId)
}

// Tambahkan game baru
const topupGames = ['ff', 'ml', 'genshin', 'pubg', 'valo']

async function handleStaticCommand(sock, msg, lowerText, userId) {
  const sender = msg.key.remoteJid
  const currentSession = getSession(userId)

  // Handle Pulsa
  if (await handlePulsa(sock, msg, lowerText, userId, sender)) return true

  // Handle Kuota
  if (await handlekouta(sock, msg)) return true

  switch (lowerText) {
    case '/menu':
      await sock.sendMessage(sender, {
        text: `╭━━━[ ✨ *AURA BOT MENU* ✨ ]━━━╮
┃
┃ 🖼️ *Sticker dari Gambar/Video*
┃   ➤ Kirim media (foto/video)
┃   ➤ Tambahkan caption: *s* atau *sticker*
┃
┃ 📝 *Sticker dari Text*
┃   ➤ Ketik: *stickertext teks kamu*
┃   ➤ Contoh: stickertext Aura Jago Coding jirs
┃
┃ 💌 *Menfess Anonim*
┃   ➤ /menfess
┃
┃ 🎮 *Top Up Game*
┃   ➤ topup ff
┃   ➤ topup ml
┃   ➤ topup genshin
┃   ➤ topup pubg
┃   ➤ topup valo
┃
┃ 📱 *Isi Pulsa & Kuota*
┃   ➤ beli pulsa
┃   ➤ beli kuota
┃
┃ 🤖 *Beli Bot*
┃   ➤ beli bot
┃
┃ 📜 *Admin Command*
┃   ➤ /riwayat
┃   ➤ /reset
┃
┃ ❓ *Petunjuk Pembelian*
┃   ➤ .carabeli
╰━━━━━━━━━━━━━━━━━━━━━━━╯

🧠 *Ketik sesuai yang tersedia yaa adik-adik!*
📌 _Jangan typo biar AURA gak bingung 😵_`
      }, { quoted: msg })
      return true

    case '.carabeli':
      await sock.sendMessage(sender, {
        text: `📖 *Petunjuk Cara Pembelian di AURA BOT*

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
      clearSession(userId)
      await sock.sendMessage(sender, {
        text: `✅ Sesi kamu sudah diakhiri! Ketik menu lain seperti *topup*, *beli pulsa*, atau lainnya.`
      }, { quoted: msg })
      return true

    case 'beli bot':
      await sock.sendMessage(sender, {
        text: `🤖 Beli Bot:\nPremium - Rp70.000\nResponder - Rp50.000`
      }, { quoted: msg })
      return true
  }

  // Topup Game - Cek jika mulai dengan "topup namaGame"
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
      await listTopup(sock, msg, game) // listTopup akan handle file list game (pakai json/manual)
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
  clearSession
}
