const { getInvoiceByMsgIdAsync, setPaidByMsgId } = require('../invoices')

async function handleMarkPaid(sock, msg, lowerText, userId, sender) {
  if (lowerText !== 'done') return false

  const isGroup = sender.endsWith('@g.us')
  const authorId = msg.key.participant || msg.participant || sender
  let isAdmin = true // default: true kalau bukan grup

  if (isGroup) {
    try {
      const metadata = await sock.groupMetadata(sender)
      const groupAdmins = metadata.participants
        .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
        .map(p => p.id)

      console.log('🔍 Admin Grup:', groupAdmins)
      console.log('👤 Author:', authorId)

      isAdmin = groupAdmins.includes(authorId)
    } catch (err) {
      console.error('❌ Gagal ambil metadata grup:', err)
      isAdmin = false
    }

    if (!isAdmin) {
      await sock.sendMessage(sender, {
        text: '❌ Hanya admin yang boleh mengetik *done*.'
      }, { quoted: msg })
      return true
    }
  }

  const targetMsgId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId
  if (!targetMsgId) {
    await sock.sendMessage(sender, {
      text: '⚠️ Balas pesan invoice yang ingin di-mark sebagai *PAID* lalu ketik *done*.'
    }, { quoted: msg })
    return true
  }

  const invoice = await getInvoiceByMsgIdAsync(targetMsgId)
  if (invoice && invoice.status === 'unpaid') {
    setPaidByMsgId(targetMsgId)
    await sock.sendMessage(sender, {
      text: `╭━━━[ ✅ *INVOICE TELAH DIBAYAR* ]━━━╮\n┃\n┃ 👤 *User:* @${invoice.user.split('@')[0]}\n┃ 📦 *Produk:* ${invoice.produk}\n┃ 💰 *Harga:* Rp${invoice.nominal.toLocaleString('id-ID')}\n┃ 📌 *Status:* ✅ PAID\n┃\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n🎉 *Terima kasih!* Pembayaran berhasil diverifikasi.`,
      mentions: [invoice.user]
    }, { quoted: msg })
  } else {
    await sock.sendMessage(sender, {
      text: '❌ Tidak ada invoice *UNPAID* yang cocok dengan pesan ini.'
    }, { quoted: msg })
  }

  return true
}

module.exports = {
  handleMarkPaid
}
