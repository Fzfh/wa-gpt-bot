// commands/admin/invoiceCommands.js
const {
  getAllInvoices,
  markInvoicePaid,
  deleteInvoiceById,
  clearAllInvoices
} = require('../../core/jsonInvoice')

async function handleAdminCommand(sock, msg, text, userId, isAdmin) {
  if (!isAdmin) return false

  const sender = msg.key.remoteJid
  const args = text.trim().split(' ')

  // ✅ /riwayat
  if (text === '/riwayat') {
    const invoices = await getAllInvoices()
    if (invoices.length === 0) {
      return sock.sendMessage(sender, { text: '📭 Tidak ada invoice yang tersimpan.' }, { quoted: msg })
    }

    const list = invoices.map((inv, i) => `#${i + 1}
🧾 ID: ${inv.invoiceId}
👤: ${inv.user}
📦: ${inv.produk}
💰: Rp${inv.nominal.toLocaleString('id-ID')}
📌: ${inv.status.toUpperCase()}
🕒: ${inv.waktu}`).join('\n\n')

    return sock.sendMessage(sender, { text: `📋 *Riwayat Invoice:*

${list}` }, { quoted: msg })
  }

  // ✅ /done [id]
  if (args[0] === '/done' && args[1]) {
    const id = args[1].toUpperCase()
    const success = await markInvoicePaid(id)
    if (success) {
      return sock.sendMessage(sender, { text: `✅ Invoice ${id} ditandai sebagai *PAID*.` }, { quoted: msg })
    } else {
      return sock.sendMessage(sender, { text: `❌ Invoice ID ${id} tidak ditemukan.` }, { quoted: msg })
    }
  }

  // ✅ /hapus [id]
  if (args[0] === '/hapus' && args[1]) {
    const id = args[1].toUpperCase()
    const success = await deleteInvoiceById(id)
    if (success) {
      return sock.sendMessage(sender, { text: `🗑️ Invoice ${id} berhasil dihapus.` }, { quoted: msg })
    } else {
      return sock.sendMessage(sender, { text: `❌ Gagal hapus, ID ${id} tidak ditemukan.` }, { quoted: msg })
    }
  }

  // ✅ /bersihkan
  if (text === '/bersihkan') {
    await clearAllInvoices()
    return sock.sendMessage(sender, { text: '🧹 Semua data invoice berhasil dibersihkan.' }, { quoted: msg })
  }

  return false
}

module.exports = handleAdminCommand
