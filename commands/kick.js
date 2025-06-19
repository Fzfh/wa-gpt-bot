module.exports = async function kick(sock, msg, text, isGroup) {
  const groupId = msg.key.remoteJid
  const userId = msg.key.participant

  if (!isGroup) {
    return sock.sendMessage(groupId, {
      text: '❌ Perintah ini hanya bisa digunakan di grup yaa~'
    }, { quoted: msg })
  }

  try {
    const metadata = await sock.groupMetadata(groupId)

    if (!metadata || !Array.isArray(metadata.participants)) {
      return sock.sendMessage(groupId, {
        text: '❌ Gagal mengambil data grup.'
      }, { quoted: msg })
    }

    const isSenderAdmin = metadata.participants.some(p =>
      p.id === userId && (p.admin === 'admin' || p.admin === 'superadmin')
    )

    if (!isSenderAdmin) {
      return sock.sendMessage(groupId, {
        text: '❌ Hanya admin grup yang boleh mengeluarkan member yaa~'
      }, { quoted: msg })
    }

    // 🔍 Cek apakah reply ke pesan user
    const quotedInfo = msg.message?.extendedTextMessage?.contextInfo
    const repliedUser = quotedInfo?.participant
    let target = repliedUser

    if (!target) {
      const nomor = text.split(' ')[1]
      if (!nomor) {
        return sock.sendMessage(groupId, {
          text: '❗ Gunakan dengan reply pesan *atau* ketik manual: .kick 628xxxx'
        }, { quoted: msg })
      }
      target = nomor.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    }

    await sock.groupParticipantsUpdate(groupId, [target], 'remove')

    return sock.sendMessage(groupId, {
      text: `👋 @${target.split('@')[0]} telah dikeluarkan dari grup!`,
      mentions: [target]
    }, { quoted: msg })

  } catch (err) {
    console.error('❌ Gagal kick member:', err)
    return sock.sendMessage(groupId, {
      text: '❌ Gagal mengeluarkan anggota. Pastikan bot adalah admin!'
    }, { quoted: msg })
  }
}
