module.exports = async function tagall(sock, msg, text, isGroup) {
  const groupId = msg.key.remoteJid
  const userId = msg.key.participant || msg.key.remoteJid

  if (!isGroup) {
    return sock.sendMessage(groupId, {
      text: '❌ Perintah ini hanya bisa digunakan di grup.'
    }, { quoted: msg })
  }

  try {
    const metadata = await sock.groupMetadata(groupId)

    if (!metadata || !Array.isArray(metadata.participants)) {
      return sock.sendMessage(groupId, {
        text: '❌ Tidak bisa ambil data grup. Pastikan bot sudah masuk dan jadi admin.'
      }, { quoted: msg })
    }

    // ✅ Cek apakah pengirim adalah admin grup WA
    const isSenderAdmin = metadata.participants.some(p =>
      p.id === userId && (p.admin === 'admin' || p.admin === 'superadmin')
    )

    if (!isSenderAdmin) {
      return sock.sendMessage(groupId, {
        text: '❌ Hanya admin grup WhatsApp yang bisa pakai perintah ini yaa~'
      }, { quoted: msg })
    }

    const mentions = metadata.participants.map(p => p.id)
    const customMsg = text.split(' ').slice(1).join(' ') || '📢 Hai semua, yuk kumpul dulu!'

    return sock.sendMessage(groupId, {
      text: customMsg,
      mentions
    }, { quoted: msg })

  } catch (err) {
    console.error('❌ Gagal tagall:', err)
    return sock.sendMessage(groupId, {
      text: '❌ Error saat tagall. Apakah bot admin grup?',
    }, { quoted: msg })
  }
}
