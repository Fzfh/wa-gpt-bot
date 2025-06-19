const { handlePulsa, selectedNominalMap: pulsaNominalMap, lastCommandMap: pulsaCommandMap } = require('../../commands/pulsa')
const { handleKouta, selectedKoutaNominalMap: koutaNominalMap, lastKoutaCommandMap: koutaCommandMap } = require('../../commands/kouta')
const { listTopup, getHargaFromDB, selectedTopupNominalMap: topupNominalMap, lastTopupCommandMap: topupCommandMap } = require('../../commands/topup')

const { 
  addInvoice, getInvoiceByMsgId, setPaidByMsgId,
  getAllInvoices, generateInvoiceId, clearAllInvoices 
} = require ('../invoices')

async function handleInvoiceTopupWrapper(sock, msg, lowerText, userId, sender) {
  return await handleInvoiceTopup(sock, msg, lowerText, userId, sender, {
    pulsaNominalMap,
    koutaNominalMap,
    pulsaCommandMap,
    koutaCommandMap,
    topupNominalMap,
    topupCommandMap
  })
}

const getUserNominal = (userId) =>
  pulsaNominalMap.get(userId) ||
  koutaNominalMap.get(userId) ||
  topupNominalMap.get(userId)

const getUserProduk = (userId) =>
  pulsaCommandMap.get(userId) ||
  koutaCommandMap.get(userId) ||
  topupCommandMap.get(userId)


async function handleInvoiceTopup(sock, msg, text, userId, sender) {
  if (!/(id|uid|zone|server|nomor|no|hp|no tujuan)/i.test(text) || !/(bukti|tf|transfer|done)/i.test(text) || !/\d{5,}/.test(text)) return false

  const nominal = getUserNominal(userId)
  const produk = getUserProduk(userId) || 'Transaksi'


  if (!nominal) {
    await sock.sendMessage(sender, {
      text: '⚠️ Kamu belum memilih nominal!\nKetik jumlah seperti: *2* untuk pilih pulsa, atau *86dm* untuk topup, sebelum kirim ID & bukti tf.'
    }, { quoted: msg })
    return true
  }

  const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
  const invoiceId = generateInvoiceId()

  const message = await sock.sendMessage(sender, {
    text: `╭━━━[ 🧾 *INVOICE BARU* ]━━━╮\n┃\n┃ 🆔 *Invoice ID:* ${invoiceId}\n┃ 👤 *User:* @${userId.split('@')[0]}\n┃ 📦 *Produk:* ${produk}\n┃ 💰 *Harga:* Rp${nominal.toLocaleString('id-ID')}\n┃ ⏰ *Waktu:* ${waktu}\n┃ 📌 *Status:* ❌ UNPAID\n┃\n╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n📥 *Silakan selesaikan pembayaran kamu yaa!*\n📸 Kirim bukti transfer & ID/nomor HP bila belum.\nKetik */menu* untuk bantuan lebih lanjut.`,
    mentions: [userId]
  }, { quoted: msg })

  addInvoice({
    invoiceId,
    user: userId,
    produk,
    nominal,
    status: 'unpaid',
    waktu,
    msgId: message.key.id
  })

  pulsaNominalMap.delete(userId)
  koutaNominalMap.delete(userId)
  topupNominalMap.delete(userId)

  pulsaCommandMap.delete(userId)
  koutaCommandMap.delete(userId)
  topupCommandMap.delete(userId)

  return true
}

module.exports = {
  handleInvoiceTopup,
  handleInvoiceTopupWrapper
}