const greetedRecently = new Set();

module.exports = async function handleWelcome(sock, update) {
  const { id, participants, action } = update;

  if (action === 'add') {
    for (const user of participants) {
      if (greetedRecently.has(user)) continue;

      greetedRecently.add(user);
      setTimeout(() => greetedRecently.delete(user), 30_000);

      const userName = user.split('@')[0];
      let profilePicture;

      try {
        profilePicture = await sock.profilePictureUrl(user, 'image');
      } catch (err) {
        profilePicture = './media/g.png';
      }

      const textWelcome = `👋 Selamat datang @${userName} di grup kami!

📜 *Rules Grup:*
1. Tidak spam atau promosi
2. Sopan & santun
3. Tidak kirim link sembarangan
4. Hormati sesama member

📌 Yang melanggar bisa dikeluarkan ❌

🧠 Ketik */menu* untuk melihat fitur-fitur bot AURA!`;

      await sock.sendMessage(id, {
        image: { url: profilePicture },
        caption: textWelcome,
        mentions: [user],
      });
    }
  }
}
