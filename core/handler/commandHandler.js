const { listTopup } = require('../../commands/topup')
const tambahProduk = require('../../commands/tambahProduk');
const hapusProduk = require('../../commands/hapusProduk');
const { adminList } = require('../../setting/setting')
const { sessionMap } = require('./staticCommand')
const fs = require('fs')
const path = require('path')

const greetedUsers = new Map()
const selectedNominalMap = new Map()
const lastCommandMap = new Map()

// Ambil list game dari topup.json
const topupData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/topup.json'), 'utf-8'))
const invoiceDataPath = path.join(__dirname, '../../data/invoices.json')
const topupGames = [...new Set(topupData.map(item => item.game))]

function readInvoices() {
  if (!fs.existsSync(invoiceDataPath)) return []
  return JSON.parse(fs.readFileSync(invoiceDataPath, 'utf-8'))
}

function writeInvoices(data) {
  fs.writeFileSync(invoiceDataPath, JSON.stringify(data, null, 2))
}

function clearAllInvoices() {
  writeInvoices([])
}

async function handleCommand(sock, msg, lowerText, userId, from, body, sender) 
 {
  if (topupGames.includes(lowerText.replace('topup ', ''))) {
    const game = lowerText.replace('topup ', '')
    lastCommandMap.set(userId, game)
    return await listTopup(sock, msg, game)
  }
   if (sessionMap.has(from) || body.toLowerCase().startsWith('/tambah')) {
      return await tambahProduk(sock, msg, from, body, userId);
    }
  if (sessionMap.has(from) || body.toLowerCase().startsWith('/hapus')) {
      return await hapusProduk(sock, msg, from, body, userId);
    }

  switch (lowerText) {
    case '/menu':
      return sock.sendMessage(sender, {
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
┃   ➤ Contoh: .d https://www.tiktok.com/linkKamu
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
┃ ❓ *Cara Pembelian*
┃   ➤ .carabeli
┃   ➤ admin — Hubungi langsung via WA
╰━━━━━━━━━━━━━━━━━━━━━━━╯

🧠 *Ketik sesuai menu ya adik-adik manis!*
📌 _Hindari typo biar AURA gak Misskom 🤖🔥_
`
      }, { quoted: msg })

    case '.carabeli':
      return sock.sendMessage(sender, {
        text: `📖 *Petunjuk Cara Pembelian di AURA BOT*

1️⃣ *Topup Game*
   ➤ Ketik: topup ${topupGames.join(' / ')}
   ➤ Pilih nominal: contoh: 60 UC / 125 VP
   ➤ Kirim Dengan ID game + bukti transfer

2️⃣ *Beli Pulsa*
   ➤ Ketik: beli pulsa
   ➤ Pilih nominal: ketik angka misal 2
   ➤ Kirim nomor HP + bukti transfer

3️⃣ *Beli Kuota*
   ➤ Ketik: beli kuota
   ➤ Pilih paket: ketik angka misal 3
   ➤ Kirim nomor HP + bukti transfer

📌 *Format Transfer:*
Nomor: 08xxxxxxxxxx
Bukti: kirim foto transfer

🛟 Butuh bantuan langsung? Ketik: *admin* 😎`
      }, { quoted: msg })

    case 'admin':
      return sock.sendMessage(sender, {
        text: `👩‍💻 *Hubungi Admin AURA BOT:*

📞 wa.me/62895326679840
🕐 Online: 09.00 - 22.00 WIB

Ketik aja yaa, admin siap bantuin topup-mu ✨`
      }, { quoted: msg })

    case '/reset':
      greetedUsers.delete(userId)
      selectedNominalMap.delete(userId)
      return sock.sendMessage(sender, { text: 'Reset berhasil!' }, { quoted: msg })

    case '/riwayat': {
      const data = readInvoices()
      if (!data.length) {
        return sock.sendMessage(sender, { text: 'Belum ada invoice.' }, { quoted: msg })
      }

      let text = '╭━━━[ 📋 *RIWAYAT INVOICE* ]━━━╮\n\n'
      const mentions = []

      for (let i of data.slice(-20).reverse()) {
        const tag = `@${i.user.split('@')[0]}`
        text += `🧾 *Invoice ID:* ${i.invoiceId}\n👤 *User:* ${tag}\n📦 *Produk:* ${i.produk}\n💰 *Harga:* Rp${i.nominal.toLocaleString('id-ID')}\n📌 *Status:* ${i.status.toUpperCase()}\n⏰ *Waktu:* ${i.waktu}\n──────────────────────────────\n`
        mentions.push(i.user)
      }

      text += '\n📌 Menampilkan 20 invoice terakhir'
      return sock.sendMessage(sender, { text, mentions }, { quoted: msg })
    }

    case '/clear':
      clearAllInvoices()
      return sock.sendMessage(sender, { text: '✅ Semua invoice telah dihapus.' }, { quoted: msg })

    case 'beli pulsa':
    case 'beli kuota':
      lastCommandMap.set(userId, lowerText)
      return sock.sendMessage(sender, {
        text: `📱 *${lowerText === 'beli pulsa' ? 'Pulsa' : 'Kuota'} tersedia:*\n\n` +
          `- 10k\n- 25k\n- 50k\n- 100k\n\nKetik nominal seperti *10k* atau *50k* untuk melanjutkan!\n\nSetelah itu kirim:\n- Nomor HP\n- Bukti transfer.`
      }, { quoted: msg })

    case 'topup':
      return sock.sendMessage(sender, {
        text: `🎮 *Daftar Game Topup:*\n\n` + topupGames.map(g => `- topup ${g}`).join('\n'),
      }, { quoted: msg })

    case 'beli bot':
      return sock.sendMessage(sender, {
        text: '🤖 Beli Bot:\n- Premium: Rp70.000\n- Responder: Rp50.000\n\nKetik: *admin* untuk pemesanan.',
      }, { quoted: msg })
  }

  return false
}

module.exports = { handleCommand, lastCommandMap, greetedUsers }
