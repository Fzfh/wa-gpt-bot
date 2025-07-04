const fs = require('fs')
const path = require('path')

const INVOICE_PATH = path.join(__dirname, '../data/invoices.json')

// Helper buat baca data
function readInvoices() {
  if (!fs.existsSync(INVOICE_PATH)) return []
  const raw = fs.readFileSync(INVOICE_PATH)
  return JSON.parse(raw)
}

// Helper buat simpan data
function writeInvoices(data) {
  fs.writeFileSync(INVOICE_PATH, JSON.stringify(data, null, 2))
}

// Tambah invoice baru
function addInvoice({ invoiceId, user, produk, nominal, status, waktu, msgId }) {
  const invoices = readInvoices()
  invoices.push({ invoiceId, user, produk, nominal, status, waktu, msgId })
  writeInvoices(invoices)
  console.log('✅ Invoice berhasil disimpan ke JSON.')
}

// Ambil invoice berdasarkan msgId
function getInvoiceByMsgId(msgId, callback) {
  const invoices = readInvoices()
  const invoice = invoices.find(i => i.msgId === msgId && i.status === 'unpaid')
  callback(invoice || null)
}

// Versi async/Promise
function getInvoiceByMsgIdAsync(msgId) {
  return new Promise((resolve) => {
    const invoices = readInvoices()
    const invoice = invoices.find(i => i.msgId === msgId && i.status === 'unpaid')
    resolve(invoice || null)
  })
}

// Generate ID Invoice unik
function generateInvoiceId() {
  const now = new Date()
  return 'INV' + now.getTime().toString().slice(-6) + Math.floor(Math.random() * 1000)
}

// Ambil semua invoice (callback)
function getAllInvoices(callback) {
  const invoices = readInvoices()
  callback(invoices.sort((a, b) => new Date(b.waktu) - new Date(a.waktu)))
}

// Hapus semua invoice
function clearAllInvoices() {
  writeInvoices([])
  console.log('✅ Semua invoice telah dihapus dari JSON.')
}

// Ambil invoice terakhir (unpaid) dari user tertentu
function getLastUnpaidInvoice(userId, callback) {
  const invoices = readInvoices()
    .filter(i => i.user === userId && i.status === 'unpaid')
    .sort((a, b) => new Date(b.waktu) - new Date(a.waktu))
  callback(invoices[0] || null)
}

// Ubah status jadi paid berdasarkan msgId
function setPaidByMsgId(msgId) {
  const invoices = readInvoices()
  const idx = invoices.findIndex(i => i.msgId === msgId)
  if (idx !== -1) {
    invoices[idx].status = 'paid'
    writeInvoices(invoices)
    console.log('✅ Status invoice berhasil diubah jadi PAID.')
  } else {
    console.log('⚠️ Invoice tidak ditemukan.')
  }
}
// Hapus satu invoice berdasarkan ID
function deleteInvoiceById(invoiceId) {
  const invoices = readInvoices()
  const filtered = invoices.filter(i => i.invoiceId !== invoiceId)

  if (filtered.length === invoices.length) {
    console.log('⚠️ Invoice ID tidak ditemukan:', invoiceId)
    return false
  }

  writeInvoices(filtered)
  console.log('🗑 Invoice', invoiceId, 'berhasil dihapus.')
  return true
}


module.exports = {
  readInvoices,
  addInvoice,
  getInvoiceByMsgId,
  setPaidByMsgId,
  getInvoiceByMsgIdAsync,
  getAllInvoices,
  generateInvoiceId,
  getLastUnpaidInvoice,
  clearAllInvoices,
  deleteInvoiceById
}
