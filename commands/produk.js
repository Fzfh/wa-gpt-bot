const fs = require('fs')
const path = require('path')

function getProdukDariTabel(tabel) {
  const allowedTables = ['pulsa', 'kouta']
  if (!allowedTables.includes(tabel)) {
    return Promise.reject(new Error('Tabel tidak diizinkan!'))
  }

  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, `../data/${tabel}.json`)
    if (!fs.existsSync(filePath)) {
      return reject(new Error('File produk tidak ditemukan!'))
    }

    try {
      const raw = fs.readFileSync(filePath)
      const data = JSON.parse(raw)
      resolve(data)
    } catch (err) {
      reject(err)
    }
  })
}

module.exports = { getProdukDariTabel }
