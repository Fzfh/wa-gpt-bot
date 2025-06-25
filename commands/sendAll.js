const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function sendAll(sock, senderJid, text) {
  const botNumber = sock.user.id;
  const groups = await sock.groupFetchAllParticipating();
  const groupIds = Object.keys(groups);
  const uniqueContacts = new Set();

  for (const gid of groupIds) {
    const group = groups[gid];
    const isSenderInGroup = group.participants.some(p => p.id === senderJid);
    if (!isSenderInGroup) continue;

    for (const participant of group.participants) {
      const jid = participant.id;
      if (jid !== senderJid && jid !== botNumber) {
        uniqueContacts.add(jid);
      }
    }
  }

  for (const jid of uniqueContacts) {
    await sock.sendMessage(jid, {
      text: text,
      contextInfo: {
        externalAdReply: {
          title: "🟢 AURABOT",
          body: "Automatic Aura Bot",
          mediaType: 1,
          renderLargerThumbnail: true,
          thumbnailUrl: 'https://imgur.com/gallery/aura-zr4HtdT',
          sourceUrl: 'https://wa.me/' + senderJid.split('@')[0]
        }
      }
    });

    await delay(1200); 
  }
}

module.exports = sendAll;
