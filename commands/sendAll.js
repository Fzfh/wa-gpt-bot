const { adminList } = require('../setting/setting');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function sendAll(sock, senderJid, text) {
  if (!adminList.includes(senderJid)) {
    await sock.sendMessage(senderJid, { text: '❌ Kamu tidak punya izin untuk menjalankan perintah ini.' });
    return;
  }

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
          showAdAttribution: true, 
          title: 'WhatsApp Business',
          body: 'WA BOT BY AURA BOT',
          mediaType: 1,
          sourceUrl: 'https://wa.me/' + senderJid.split('@')[0],
        }
      }
    });

    await delay(1200); // delay biar aman
  }
}

module.exports = sendAll;
