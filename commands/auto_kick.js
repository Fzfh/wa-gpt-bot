const toxicWords = [''] // Contoh, bisa kamu ubah
const bannedLinkKeywords = ['bokep', 'hentai', 'jav', 'xxx', '18+', 'judol', 'vn viral', 'tante', 'sex']

async function handleAutoKick(sock, msg) {
  const isGroup = !!msg.key.remoteJid.endsWith('@g.us')
  if (!isGroup) return

  const sender = msg.key.remoteJid
  const userId = msg.key.participant || msg.key.remoteJid
  const lowerText = msg.message?.conversation?.toLowerCase() || ''

  const containsBadLink =
    /https?:\/\/[^\s]+/gi.test(lowerText) &&
    bannedLinkKeywords.some(word => lowerText.includes(word))

  const isToxic = toxicWords.some(word => lowerText.includes(word))

  if (containsBadLink || isToxic) {
    try {
      await sock.groupParticipantsUpdate(sender, [userId], 'remove')
      await sock.sendMessage(sender, {
        text: `@${userId.split('@')[0]} dikeluarkan karena melanggar aturan! 🚫`,
        mentions: [userId]
      })
    } catch (err) {
      console.error('❌ Gagal kick member:', err)
    }
  }
}

module.exports = { handleAutoKick }