module.exports = async function (sock, msg, command, args, sender, userId) {
  const nomor = args[0]?.replace(/[^0-9]/g, '')
  const jid = `${nomor}@s.whatsapp.net`
  const groupId = msg.key.remoteJid
  const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net'

  if (!nomor) {
    return sock.sendMessage(groupId, {
      text: '❗ Format salah, contoh: */add 6281234567890*'
    }, { quoted: msg })
  }

  try {
    const [check] = await sock.onWhatsApp(jid)
    if (!check?.exists) {
      return sock.sendMessage(groupId, {
        text: `❌ Nomor ${nomor} tidak terdaftar di WhatsApp.`
      }, { quoted: msg })
    }

    const metadata = await sock.groupMetadata(groupId)

    const code = await sock.groupInviteCode(groupId)
      await sock.sendMessage(jid, {
        text: `Halo! Kamu diundang gabung ke grup, nih~ Klik link ini: https://chat.whatsapp.com/${code}`
      })

    const alreadyInGroup = metadata.participants.some(p => p.id === jid)
    if (alreadyInGroup) {
      return sock.sendMessage(groupId, {
        text: `ℹ️ @${nomor} sudah ada di grup kok~`,
        mentions: [jid]
      }, { quoted: msg })
    }

    const isBotAdmin = metadata.participants.some(p => p.id === botNumber && p.admin)

    if (!isBotAdmin) {
      return sock.sendMessage(groupId, {
        text: '❌ Bot bukan admin grup, jadi gak bisa nambahin member.',
      }, { quoted: msg })
    }

    await sock.groupParticipantsUpdate(groupId, [jid], 'add')

    return sock.sendMessage(groupId, {
      text: `✅ @${nomor} berhasil ditambahkan ke grup!`,
      mentions: [jid]
    }, { quoted: msg })

  } catch (err) {
    console.error('❌ Gagal menambahkan member:', err)
    return sock.sendMessage(groupId, {
      text: '⚠️ Gagal menambahkan. Mungkin privasi pengguna tidak mengizinkan ditambahkan ke grup atau terjadi error. Coba pakai link grup aja yaa~',
    }, { quoted: msg })
  }
}
