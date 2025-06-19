const menfessState = new Map()

const kataTerlarang = [
  "slot", "jp maxwin", "judi", "bo terpercaya", "zeus", "maxwin", "bet", "high return", "rtp", "pragmatic", "scatter", "spin", "link", "deposit"
]

module.exports = async function menfess(sock, msg, text) {
  if (typeof text !== 'string') return false

  const sender = msg.key.remoteJid
  const userId = msg.key.participant || sender
  const fromBot = msg.key.fromMe
  const messageId = msg.key.id

  if (menfessState.has(userId)) {
    const input = text.trim()
    const lowerInput = input.toLowerCase()

    if (lowerInput === '/batal' || lowerInput.startsWith('/')) {
      menfessState.delete(userId)
      await sock.sendMessage(sender, {
        text: '❌ Menfess dibatalkan.'
      }, { quoted: msg })
      return true
    }

    const lines = input.split(/\r?\n/)

    if (lines.length < 2) {
      await sock.sendMessage(sender, {
        text: '⚠ Format salah. Kirim dengan format:\n 628xxxxxxx\nIsi pesan menfess'
      }, { quoted: msg })
      return true
    }

    const nomorTujuan = lines[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    const isiPesan = lines.slice(1).join('\n').trim()

    if (!isiPesan) {
      await sock.sendMessage(sender, {
        text: '⚠ Isi pesan tidak boleh kosong!' }, { quoted: msg })
      return true
    }

    const terdeteksi = kataTerlarang.some(kata => isiPesan.toLowerCase().includes(kata))
    if (terdeteksi) {
      await sock.sendMessage(sender, {
        text: '🚫 Menfess gagal dikirim! Sistem mendeteksi kata terlarang atau promosi yang dilarang.'
      }, { quoted: msg })

      menfessState.delete(userId)
      return true
    }

    await sock.sendMessage(nomorTujuan, {
      text: `📩 *Pesan Menfess Masuk!*\n\n💬 *Isi:* ${isiPesan}\n🔒 *Pengirim dirahasiakan oleh sistem.*`
    });

    await sock.sendMessage(sender, {
      text: '✅ Menfess berhasil dikirim *RAHASIA, GA AKAN DIBERI TAU DARI SIAPA*!' }, { quoted: msg })

    menfessState.delete(userId)
    return true
  }

  if (typeof text === 'string' && text.toLowerCase() === '/menfess') {
    menfessState.set(userId, true)

    await sock.sendMessage(sender, {
      text: '💌 Silakan kirim nomor tujuan dan isi pesan seperti ini:\n 6289xxxxxxx\nIsi pesan menfess...\n\nKetik */batal* untuk membatalkan.'
    }, { quoted: msg })

    return true
  }

  return false
}
