const axios = require('axios');
const path = require('path');
const spamTracker = new Map();

const WAIFU_SPAM_TIMEOUT = 10 * 1000;

const allowedTags = [
  'waifu', 'maid', 'marin-kitagawa', 'mori-calliope', 'raiden-shogun',
  'oppai', 'selfies', 'uniform', 'kamisato-ayaka'
];

module.exports = async function waifu(sock, msg, text) {
  try {
    const sender = msg.key.remoteJid;
    const userId = msg.key.participant || sender;

    const now = Date.now();
    const lastRequest = spamTracker.get(userId) || 0;

    if (now - lastRequest < WAIFU_SPAM_TIMEOUT) {
      return sock.sendMessage(sender, {
        text: '🕓 Tunggu sebentar ya... jangan spam waifuuu~ 😵‍💫',
      }, { quoted: msg });
    }

    const type = text?.toLowerCase()?.trim();
    if (!type) {
      return sock.sendMessage(sender, {
        text: `💡Contoh:\n.waifu maid\n.waifu raiden-shogun\n\n📜 List tag SFW:\n• ${allowedTags.join('\n• ')}`,
      }, { quoted: msg });
    }

    if (!allowedTags.includes(type)) {
      return sock.sendMessage(sender, {
        text: `❌ Tag *${type}* gak ditemukan. Coba:\n• ${allowedTags.join('\n• ')}`,
      }, { quoted: msg });
    }

    spamTracker.set(userId, now);

    const res = await axios.get(`https://api.waifu.im/search`, {
      params: {
        included_tags: type,
        is_nsfw: false,
        limit: 5 // tanpa filter GIF yaa
      },
      headers: { 'Accept-Version': 'v5' }
    });

    const images = res.data?.images || [];
    if (!images.length) {
      return sock.sendMessage(sender, {
        text: `❌ Gak nemu waifu dengan tag *${type}*. Coba tag lain yaa~ 💔`,
      }, { quoted: msg });
    }

    const image = images[Math.floor(Math.random() * images.length)];
    const mediaUrl = image.url;
    const ext = path.extname(mediaUrl).toLowerCase();
    const caption = `🖼️ ${type.replace(/-/g, ' ')} by AuraBot`;

    if (['.gif', '.mp4', '.webm'].includes(ext)) {
      await sock.sendMessage(sender, {
        video: { url: mediaUrl },
        caption,
        gifPlayback: true
      }, { quoted: msg });
    } else {
      await sock.sendMessage(sender, {
        image: { url: mediaUrl },
        caption
      }, { quoted: msg });
    }

  } catch (err) {
    console.error('[WAIFU.IM ERROR]', err?.response?.data || err.message);
    await sock.sendMessage(msg.key.remoteJid, {
      text: '❌ Gagal ambil waifu. Coba lagi nanti yaa 🥹',
    }, { quoted: msg });
  }
};
