const fs = require('fs');
const path = require('path');

const greetedRecently = new Set();
const farewelledRecently = new Set(); 

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
        console.warn(`⚠️ Gagal ambil PP untuk ${user}, pake fallback.`);
        const fallbackPath = path.resolve('./media/g.png'); 
        if (fs.existsSync(fallbackPath)) {
          profilePicture = fallbackPath;
        } else {
          console.warn('⚠️ Gambar fallback gak ditemukan:', fallbackPath);
          profilePicture = null;
        }
      }

      const textWelcome = `👋 Selamat datang @${userName} di grup kami!

📜 *Rules Grup:*
1. Tidak spam atau promosi
2. Sopan & santun
3. Tidak kirim link sembarangan
4. Hormati sesama member

📌 Yang melanggar bisa dikeluarkan ❌

🧠 Ketik */menu* untuk melihat fitur-fitur bot AURA!`;

      if (profilePicture) {
        await sock.sendMessage(id, {
          image: { url: profilePicture },
          caption: textWelcome,
          mentions: [user],
        });
      } else {
        await sock.sendMessage(id, {
          text: `👋 Selamat datang @${userName}!\n(Yahh kamu ga pake Foto 😞)\n\n` + textWelcome,
          mentions: [user],
        });
      }
    }
  }

  if (action === 'remove') {
    for (const user of participants) {
      if (farewelledRecently.has(user)) continue;

      farewelledRecently.add(user);
      setTimeout(() => farewelledRecently.delete(user), 30_000); 

      const userName = user.split('@')[0];
      let profilePicture;

      try {
        profilePicture = await sock.profilePictureUrl(user, 'image');
      } catch (err) {
        const fallbackPath = path.resolve('./media/g.png');
        if (fs.existsSync(fallbackPath)) {
          profilePicture = fallbackPath;
        } else {
          profilePicture = null;
        }
      }

      const goodbyeText = `👋 Selamat tinggal @${userName}, semoga sukses di luar sana ya! 🌈✨`;

      if (profilePicture) {
        await sock.sendMessage(id, {
          image: { url: profilePicture },
          caption: goodbyeText,
          mentions: [user],
        });
      } else {
        await sock.sendMessage(id, {
          text: `👋 Selamat tinggal @${userName} (Yahh kamu ga pake Foto 😞)\n\n` + goodbyeText,
          mentions: [user],
        });
      }
    }
  }
};
