const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function sendAll(sock, senderJid, text) {
  const botNumber = sock.user.id;
  const groups = await sock.groupFetchAllParticipating();
  const groupIds = Object.keys(groups);
  const uniqueContacts = new Set();

  for (const gid of groupIds) {
    const group = groups[gid];

    // Hanya kirim jika pengirim adalah anggota grup tsb
    const isSenderInGroup = group.participants.some(p => p.id === senderJid);
    if (!isSenderInGroup) continue;

    for (const participant of group.participants) {
      const jid = participant.id;

      // Hindari kirim ke diri sendiri & bot
      if (jid !== senderJid && jid !== botNumber) {
        uniqueContacts.add(jid);
      }
    }
  }

  let count = 0;

  for (const jid of uniqueContacts) {
    try {
      await sock.sendMessage(jid, { text });
      count++;
    } catch (err) {
      console.error(`Γ¥î Gagal kirim ke ${jid}:`, err);
    }

    await delay(2000); // Delay antar pesan agar tidak dianggap spam
  }

  // Balas ke pengirim sebagai notifikasi
  await sock.sendMessage(senderJid, {
    text: `Γ£à Pesan berhasil dikirim ke ${count} kontak dari grup yang kamu ikuti!`
  });
}

module.exports = sendAll;
