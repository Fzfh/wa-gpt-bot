const { getInvoiceByMsgIdAsync, setPaidByMsgId } = require('../invoices');
const { adminList } = require('../setting/setting');

async function handleMarkPaid(sock, msg, lowerText, userId, sender) {
  if (lowerText !== 'done') return false;

  const authorId = msg.key.participant || msg.participant || sender;

  if (!adminList.includes(authorId)) {
    await sock.sendMessage(sender, {
      text: '❌ Hanya admin bot yang boleh mengetik *done* untuk verifikasi pembayaran.',
    }, { quoted: msg });
    return true;
  }

  const targetMsgId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
  if (!targetMsgId) return true;

  const invoice = await getInvoiceByMsgIdAsync(targetMsgId);

  if (invoice && invoice.status === 'unpaid') {
    setPaidByMsgId(targetMsgId);

    await sock.sendMessage(sender, {
      text: `╭━━━[ ✅ *INVOICE TELAH DIBAYAR* ]━━━╮\n┃\n┃ 👤 *User:* @${invoice.user.split('@')[0]}\n┃ 📦 *Produk:* ${invoice.produk}\n┃ 💰 *Harga:* Rp${invoice.nominal.toLocaleString('id-ID')}\n┃ 📌 *Status:* ✅ PAID\n┃\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n🎉 *Terima kasih!* Pembayaran berhasil diverifikasi.`,
      mentions: [invoice.user]
    }, { quoted: msg });
  } else {
    await sock.sendMessage(sender, {
      text: '❌ Tidak ada invoice *UNPAID* yang cocok dengan pesan ini.'
    }, { quoted: msg });
  }

  return true;
}

module.exports = {
  handleMarkPaid
};
