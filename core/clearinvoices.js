const { invoiceMap } = require('./invoices') // Pastikan kamu punya Map ini di invoices.js

function clearAllInvoices() {
  invoiceMap.clear()
}

module.exports = { clearAllInvoices }
