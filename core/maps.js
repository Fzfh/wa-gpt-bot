// Untuk simpan command terakhir user, misal: 'topup ff'
const lastCommandMap = new Map()

// Untuk menyimpan nominal yang dipilih user (harga)
const selectedNominalMap = new Map()

// Map spesifik untuk pulsa dan kuota
const pulsaCommandMap = new Map()
const koutaCommandMap = new Map()
const pulsaNominalMap = new Map()
const koutaNominalMap = new Map()

// Tambahan map lain kalau butuh nanti
const blacklistMap = new Map()
const invoiceStatusMap = new Map() // Bisa dipakai untuk tracking status unpaid/paid

// Ekspor semua map
module.exports = {
  lastCommandMap,
  selectedNominalMap,
  pulsaCommandMap,
  koutaCommandMap,
  pulsaNominalMap,
  koutaNominalMap,
  blacklistMap,
  invoiceStatusMap
}
