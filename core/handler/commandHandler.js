const fs = require('fs');
const path = require('path');
const { listTopup } = require('../../commands/topup');
const tambahProduk = require('../../commands/tambahProduk');
const hapusProduk = require('../../commands/hapusProduk');
const { adminList } = require('../../setting/setting');
const { sessionMap } = require('./staticCommand');

const greetedUsers = new Map();
const selectedNominalMap = new Map();
const lastCommandMap = new Map();

const topupData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/topup.json'), 'utf-8'));
const invoiceDataPath = path.join(__dirname, '../../data/invoices.json');
const topupGames = [...new Set(topupData.map(item => item.game))];

function readInvoices() {
  if (!fs.existsSync(invoiceDataPath)) return [];
  return JSON.parse(fs.readFileSync(invoiceDataPath, 'utf-8'));
}

function writeInvoices(data) {
  fs.writeFileSync(invoiceDataPath, JSON.stringify(data, null, 2));
}

function clearAllInvoices() {
  writeInvoices([]);
}

async function handleCommand(sock, msg, lowerText, from, body, sender) {
  // ⛳️ FIX: Gunakan actual user ID dari participant jika ada
  const actualUserId =
    msg.key.participant ||
    msg.participant ||
    msg.message?.extendedTextMessage?.contextInfo?.participant ||
    sender;

  const userId = actualUserId.includes('@s.whatsapp.net') ? actualUserId : `${actualUserId}@s.whatsapp.net`;

  // ✅ Topup Command by game name (misal: "topup ml")
  if (topupGames.includes(lowerText.replace('topup ', ''))) {
    const game = lowerText.replace('topup ', '');
    lastCommandMap.set(userId, game);
    return await listTopup(sock, msg, game);
  }

  // ✅ Sesi Tambah / Hapus Produk
  if (sessionMap.has(from) || body.toLowerCase().startsWith('/tambah')) {
    return await tambahProduk(sock, msg, from, body, userId);
  }

  if (sessionMap.has(from) || body.toLowerCase().startsWith('/hapus')) {
    return await hapusProduk(sock, msg, from, body, userId);
  }

  switch (lowerText) {
    case '/menu':
      return sock.sendMessage(sender, {
        text: `📜 *Menu tersedia...*\n\n➤ topup ml\n➤ topup ff\n➤ topup genshin\n➤ beli pulsa\n➤ beli kuota\n➤ /riwayat\n➤ /reset\n➤ /clear (admin)`
      }, { quoted: msg });

    case '.carabeli':
      return sock.sendMessage(sender, {
        text: `📖 *Cara Beli:*\n1. Ketik: topup ml / topup ff / topup genshin\n2. Pilih nominal\n3. Kirim ID & bukti transfer`
      }, { quoted: msg });

    case 'admin':
      return sock.sendMessage(sender, {
        text: `👩‍💻 Admin: wa.me/62895326679840`
      }, { quoted: msg });

    case '/reset':
      greetedUsers.delete(userId);
      selectedNominalMap.delete(userId);
      return sock.sendMessage(sender, { text: '🔄 Reset berhasil! Obrolan baru siap dimulai ✨' }, { quoted: msg });

    case '/riwayat': {
      const data = readInvoices();
      if (!data.length) {
        return sock.sendMessage(sender, { text: '📂 Belum ada invoice.' }, { quoted: msg });
      }

      let text = '📋 *RIWAYAT INVOICE:*\n\n';
      const mentions = [];

      for (let i of data.slice(-20).reverse()) {
        const tag = `@${i.user.split('@')[0]}`;
        text += `🧾 ID: ${i.invoiceId}\n👤: ${tag}\n📦: ${i.produk}\n💰: Rp${i.nominal.toLocaleString('id-ID')}\n📌: ${i.status.toUpperCase()}\n⏰: ${i.waktu}\n---------------------------\n`;
        mentions.push(i.user);
      }

      text += '\n📌 Menampilkan 20 invoice terakhir';
      return sock.sendMessage(sender, { text, mentions }, { quoted: msg });
    }

    case '/clear':
      if (!adminList.includes(userId)) {
        return sock.sendMessage(sender, {
          text: `⛔ Maaf, hanya *admin* yang bisa menghapus semua invoice.`,
          quoted: msg
        });
      }

      clearAllInvoices();
      return sock.sendMessage(sender, {
        text: '✅ Semua invoice telah dihapus oleh admin.',
        quoted: msg
      });

    case 'topup':
      return sock.sendMessage(sender, {
        text: `🎮 *Daftar Game Topup:*\n\n` + topupGames.map(g => `- topup ${g}`).join('\n')
      }, { quoted: msg });

    case 'beli bot':
      return sock.sendMessage(sender, {
        text: '🤖 Beli Bot:\n- Premium: Rp70.000\n- Responder: Rp50.000\n\nKetik: *admin* untuk pemesanan.'
      }, { quoted: msg });
  }

  return false; // ⛔ Command tidak ditangani
}

module.exports = {
  handleCommand,
  lastCommandMap,
  greetedUsers
};
