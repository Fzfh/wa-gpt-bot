// core/botresponse.js
const spamTracker = new Map();
const mutedUsers = new Map();
const memoryMap = new Map();
const muteDuration = 2 * 60 * 1000; // 2 menit
const add = require('../commands/add');
// const { handleAutoKick } = require('../commands/auto_kick')
const { handleTopupInput } = require('../core/handler/topupHandler');
const { handleInvoiceTopupWrapper } = require('../core/handler/invoiceHandler');
const { handleMarkPaid } = require('../core/handler/paid');
const { handleStaticCommand } = require('../core/handler/staticCommand');
const { handleCommand } = require('../core/handler/commandHandler');
const tagall = require('../commands/tagall');
const kick = require('../commands/kick');
const menfess = require('../commands/menfess');
const handleWelcome = require('../commands/welcome');
const { adminList } = require('../setting/setting');
const askOpenAI = require('../core/utils/openai');
const { createStickerFromMessage, createStickerFromText } = require('../core/stickerHelper');
const { listTopup } = require('../commands/topup');
const { handlePulsa } = require('../commands/pulsa');
const { handlekouta } = require('../commands/kouta');
const greetedUsers = new Set();

// Delay util
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Bersihkan timestamp spam yang lebih tua dari 10 detik
function cleanSpamTimestamps(userId) {
  const now = Date.now();
  const arr = spamTracker.get(userId) || [];
  const filtered = arr.filter(t => now - t < 10 * 1000);
  spamTracker.set(userId, filtered);
}

// Cek apakah user muted sekarang
function isUserMuted(userId) {
  const until = mutedUsers.get(userId);
  if (!until) return false;
  if (Date.now() > until) {
    mutedUsers.delete(userId);
    return false;
  }
  return true;
}

// Daftarkan listener group-participants.update sekali per socket instance
function registerGroupUpdateListener(sock) {
  sock.ev.removeAllListeners('group-participants.update');
  sock.ev.on('group-participants.update', async (update) => {
    try {
      await handleWelcome(sock, update);
    } catch (err) {
      console.error('❌ Error di handleWelcome:', err);
    }
  });
}

async function botFirstResponse({ sock, sender, msg }, options = {}) {
  const botName = options.botBehavior?.botName || 'Bot';
  const botMenu = options.botBehavior?.botMenu || '/menu';
  const greetingText = `Halo! Saya *${botName}* 🤖.\nKetik *${botMenu}* untuk melihat menu yang tersedia yaa~`;
  try {
    await sock.sendMessage(sender, { text: greetingText }, { quoted: msg });
  } catch (err) {
    console.error('❌ Gagal kirim botFirstResponse:', err);
  }
}

async function handleResponder(sock, msg) {
  try {
    if (!msg || !msg.message) return;
    const sender = msg.key.remoteJid;
    const userId = sender;

    // Cek mute di awal
    if (isUserMuted(userId)) {
      console.log(`User ${userId} masih muted, skip processing.`);
      return;
    }

    // Extract text
    const content = msg.message?.viewOnceMessageV2?.message || msg.message;
    const text =
      content?.conversation ||
      content?.extendedTextMessage?.text ||
      content?.imageMessage?.caption ||
      content?.videoMessage?.caption ||
      '';
    if (!text || text.trim() === '') return;
    const body = text.trim();
    const lowerText = body.toLowerCase();

    // Spam tracker untuk slash-command
    if (body.startsWith('/')) {
      cleanSpamTimestamps(userId);
      const now = Date.now();
      const arr = spamTracker.get(userId) || [];
      arr.push(now);
      spamTracker.set(userId, arr);
      if (arr.length > 5 && !adminList.includes(userId)) {
        mutedUsers.set(userId, now + muteDuration);
        try {
          await sock.sendMessage(sender, { text: '🔇 Kamu terlalu banyak mengirim command! Bot diam 2 menit.' }, { quoted: msg });
        } catch (err) {
          console.error('❌ Gagal kirim mute notification:', err);
        }
        console.log(`User ${userId} muted karena spam slash-command.`);
        return;
      }
    }

    // Greeting logic sekali per user
    const botNumber = sock.user?.id.split(':')[0];
    const botJid = botNumber.includes('@s.whatsapp.net') ? botNumber : `${botNumber}@s.whatsapp.net`;
    const contextInfo = content?.extendedTextMessage?.contextInfo || {};
    const mentionedJids = contextInfo.mentionedJid || [];
    const isMentioned = mentionedJids.includes(botJid);
    const isGroup = sender.endsWith('@g.us');
    if ((!isGroup || isMentioned) && !greetedUsers.has(userId)) {
      greetedUsers.add(userId);
      await botFirstResponse({ sock, sender, msg }, {
        botBehavior: { botName: 'AuraBot', botMenu: '/menu' }
      });
      // lanjut saja, bukan return
    }

    // Prepare command & args
    const parts = body.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Static commands
    const handledStatic = await handleStaticCommand(sock, msg, lowerText, userId, sender, body);
    if (handledStatic) return;

    // Dynamic commands
    const handledCommand = await handleCommand(sock, msg, lowerText, userId, sender, body);
    if (handledCommand) return;

    // Mark paid
    const handledPaid = await handleMarkPaid(sock, msg, lowerText, userId, sender, adminList);
    if (handledPaid) return;

    // Topup input
    const handledTopup = await handleTopupInput(sock, msg, lowerText, userId, sender);
    if (handledTopup) return;

    // Invoice wrapper
    const handledInvoice = await handleInvoiceTopupWrapper(sock, msg, lowerText, userId, sender);
    if (handledInvoice) return;

    // Menfess
    const handledMenfess = await menfess(sock, msg, text);
    if (handledMenfess) return;

    // /kick, /tagall, /add
    if (body.startsWith('/kick')) {
      try {
        return await kick(sock, msg, body, isGroup);
      } catch (err) {
        console.error('❌ Error di /kick command:', err);
        return;
      }
    }
    if (body.startsWith('/tagall')) {
      try {
        return await tagall(sock, msg, body, isGroup);
      } catch (err) {
        console.error('❌ Error di /tagall command:', err);
        return;
      }
    }
    if (body.startsWith('/add')) {
      try {
        return await add(sock, msg, command, args, sender, userId);
      } catch (err) {
        console.error('❌ Error di /add command:', err);
        return;
      }
    }

    // Keyword topup tanpa slash juga bisa, atau pakai '/topup'
    // Jika ingin konsisten, gunakan '/topup'
    if (lowerText.startsWith('/topup')) {
      const parts2 = body.split(/\s+/);
      const game = parts2[1]?.toLowerCase();
      if (!game) {
        try {
          return await sock.sendMessage(sender, { text: 'Pilih game:\n- /topup ff\n- /topup ml\n- /topup genshin' }, { quoted: msg });
        } catch (err) {
          console.error('❌ Gagal kirim pilihan /topup:', err);
          return;
        }
      }
      try {
        return await listTopup(sock, msg, game);
      } catch (err) {
        console.error('❌ Error di listTopup:', err);
        return;
      }
    }

    // Pulsa/Kouta jika bukan slash-command OR jika ingin konsisten, pakai '/pulsa' atau '/kouta'
    if (!body.startsWith('/')) {
      // kalau masih ingin respons kata kunci tanpa slash:
      const handledKouta = await handlekouta(sock, msg);
      if (handledKouta) return;
      const handledPulsa = await handlePulsa(sock, msg, lowerText, userId, sender);
      if (handledPulsa) return;
    }

    // Sticker dari pesan: konsisten pakai '/s' atau '/sticker'
    if (lowerText === '/s' || lowerText === '/sticker') {
      try {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const hasMediaQuoted = quoted?.imageMessage || quoted?.videoMessage;
        const hasMediaDirect = msg.message?.imageMessage || msg.message?.videoMessage;
        const caption = msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || '';
        const captionMatch = caption.toLowerCase() === '/s' || caption.toLowerCase() === '/sticker';

        if (hasMediaQuoted || hasMediaDirect || captionMatch) {
          await createStickerFromMessage(sock, msg);
        } else {
          await sock.sendMessage(sender, {
            text: 'Kirim gambar/video lalu reply dengan "/s", atau kirim gambar/video langsung dengan caption "/s" atau "/sticker"',
          }, { quoted: msg });
        }
      } catch (err) {
        console.error('❌ Gagal buat stiker:', err);
        try {
          await sock.sendMessage(sender, { text: 'Ups! Gagal bikin stiker 😖 Coba lagi ya~' }, { quoted: msg });
        } catch (_) {}
      }
      return;
    }

    // Sticker from text: '/stickertext' atau '/st'
    if (command === '/stickertext' || command === '/st') {
      if (!args[0]) {
        try {
          return await sock.sendMessage(sender, { text: 'Ketik: /stickertext Halo dunia!' }, { quoted: msg });
        } catch (_) { return; }
      }
      const txt = args.join(' ');
      try {
        const stickerBuffer = await createStickerFromText(txt);
        return await sock.sendMessage(sender, { sticker: stickerBuffer }, { quoted: msg });
      } catch (err) {
        console.error('❌ Error createStickerFromText:', err);
        try {
          await sock.sendMessage(sender, { text: 'Gagal bikin stiker dari teks 😢' }, { quoted: msg });
        } catch (_) {}
        return;
      }
    }

    // OpenAI reply: '/jawab'
    if (body.startsWith('/jawab ')) {
      const query = body.slice(7).trim();
      if (!query) return;
      const userHist = memoryMap.get(userId) || [];
      userHist.push({ role: 'user', content: query });
      let aiReply;
      try {
        await sock.sendPresenceUpdate('composing', sender);
        aiReply = await askOpenAI(userHist);
      } catch (err) {
        console.error('❌ Error askOpenAI:', err);
        try {
          await sock.sendMessage(sender, { text: 'Maaf, AI sedang sibuk 😖 Coba lagi nanti.' }, { quoted: msg });
        } catch (_) {}
        return;
      }
      userHist.push({ role: 'assistant', content: aiReply });
      memoryMap.set(userId, userHist.slice(-15));
      try {
        return await sock.sendMessage(sender, { text: aiReply }, { quoted: msg });
      } catch (err) {
        console.error('❌ Gagal kirim AI reply:', err);
        return;
      }
    }

    // Reset memory: '/reset'
    if (body === '/reset') {
      memoryMap.delete(sender);
      try {
        return await sock.sendMessage(sender, { text: 'Ingatan Serra tentang kamu dihapus... 😢 Tapi kamu tetap spesial di hati aku~' });
      } catch (_) {}
      return;
    }

    // Default unknown slash-command
    // Daftar slash-command yang dikenali: misalnya '/menu', '/reset', '/riwayat', '/clear', dsb. 
    // Pastikan handleStaticCommand meng-handle '/menu' dll.
    if (body.startsWith('/') && !['/menu', '/reset', '/riwayat', '/clear'].includes(lowerText)) {
      try {
        return await sock.sendMessage(sender, { text: 'Maaf, aku gak ngerti perintah itu 😵. Coba ketik /menu yaa!' }, { quoted: msg });
      } catch (err) {
        console.error('❌ Gagal kirim default unknown command:', err);
      }
      return;
    }

    // Jika sampai sini, tidak ada handler: skip
  } catch (error) {
    console.error('❌ Error di handleResponder (catch-all):', error);
  }
}

module.exports = {
  handleResponder,
  registerGroupUpdateListener,
  // expose jika perlu
  spamTracker,
  mutedUsers,
  memoryMap,
  greetedUsers,
};
